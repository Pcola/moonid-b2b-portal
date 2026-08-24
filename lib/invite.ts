import "server-only";

import type { Prisma } from "@prisma/client";
import { auditRequestContext, writeAuditRequired } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { isInternalRole, normalizeInternalEmail } from "@/lib/internal-user-policy";
import { reportError } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { withUserLifecycleLock } from "@/lib/user-lifecycle-lock";

export async function inviteOrigin() {
  return SITE_URL;
}

export type CustomerInviteActor =
  | { id: string; kind: "STAFF" }
  | { id: string; kind: "COMPANY_ADMIN" };

export type CustomerInviteResult = {
  ok: boolean;
  error?: string;
  warning?: string;
  inviteLink?: string | null;
  emailSent?: boolean;
};

class CustomerInviteError extends Error {}

const MAX_COMPANY_MEMBERS = 250;
const MAX_PENDING_FIRST_LOGINS = 25;

function existingCustomerError(
  user: { role: string; companyId: string | null; active: boolean } | null,
  companyId: string,
  role: "CUSTOMER_ADMIN" | "CUSTOMER_USER",
): string | null {
  if (!user) return null;
  if (isInternalRole(user.role)) return "Tento e-mail patrí internému Moonid účtu a nemožno ho priradiť zákazníkovi.";
  if (user.companyId && user.companyId !== companyId) return "Tento e-mail už patrí inej firme.";
  if (user.companyId === companyId && !user.active) return "Konto je deaktivované. Najprv ho aktivujte v správe používateľov.";
  if (user.companyId === companyId && user.role !== role) return "Konto už patrí firme s inou rolou. Rolu zmeňte v správe používateľov.";
  return null;
}

async function requireCustomerInviteActor(
  tx: Prisma.TransactionClient,
  actor: CustomerInviteActor,
  companyId: string,
  role: "CUSTOMER_ADMIN" | "CUSTOMER_USER",
): Promise<void> {
  const currentActor = await tx.user.findUnique({
    where: { id: actor.id },
    select: { role: true, active: true, companyId: true },
  });
  const actorAllowed = actor.kind === "STAFF"
    ? !!currentActor && currentActor.active && currentActor.companyId === null && isInternalRole(currentActor.role)
    : !!currentActor
      && currentActor.active
      && currentActor.role === "CUSTOMER_ADMIN"
      && currentActor.companyId === companyId
      && role === "CUSTOMER_USER";
  if (!actorAllowed) throw new CustomerInviteError("Vaše oprávnenie na pozvanie už nie je aktívne.");
}

async function customerInviteGate(actor: CustomerInviteActor, companyId: string, email: string): Promise<boolean> {
  const actorLimit = actor.kind === "COMPANY_ADMIN" ? 10 : 100;
  const [byActor, byCompany, byRecipient] = await Promise.all([
    rateLimit(rateLimitKey("customer-invite-actor", actor.id), { limit: actorLimit, windowSec: 3600 }),
    rateLimit(rateLimitKey("customer-invite-company", companyId), { limit: 50, windowSec: 3600 }),
    rateLimit(rateLimitKey("customer-invite-recipient", email), { limit: 5, windowSec: 3600 }),
  ]);
  return byActor.ok && byCompany.ok && byRecipient.ok;
}

async function generateCustomerAccessLink(email: string, org: string): Promise<{ authId: string; accessUrl: string }> {
  const admin = createAdminClient();
  const redirectTo = `${org}/auth/callback?next=/nastav-heslo`;
  const makeLink = (tokenHash: string | undefined, type: "invite" | "recovery") =>
    tokenHash ? `${org}/potvrdit-pristup#token_hash=${encodeURIComponent(tokenHash)}&type=${type}` : null;

  const generated = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });
  if (!generated.error && generated.data?.user?.id) {
    const accessUrl = makeLink(generated.data.properties?.hashed_token, "invite");
    if (!accessUrl) throw new Error("Customer invite token hash is missing");
    return { authId: generated.data.user.id, accessUrl };
  }

  const recovered = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });
  const accessUrl = makeLink(recovered.data?.properties?.hashed_token, "recovery");
  if (recovered.error || !recovered.data?.user?.id || !accessUrl) {
    throw new Error("Customer recovery link could not be generated");
  }
  return { authId: recovered.data.user.id, accessUrl };
}

/**
 * Pozve zákaznícke konto bez zmeny identity realm alebo Auth väzby. Provider I/O prebieha
 * mimo globálneho lifecycle locku; krátke transakcie pred a po ňom robia rezerváciu a
 * revalidáciu. Raw bearer link sa vracia iba staffu, iba po zlyhaní e-mailu a required audite.
 */
export async function inviteUser(
  email: string,
  name: string | null,
  role: "CUSTOMER_ADMIN" | "CUSTOMER_USER",
  companyId: string,
  companyName: string,
  actor: CustomerInviteActor,
): Promise<CustomerInviteResult> {
  const normalizedEmail = normalizeInternalEmail(email);
  const org = await inviteOrigin();

  try {
    if (!(await customerInviteGate(actor, companyId, normalizedEmail))) {
      return { ok: false, error: "Dosiahli ste bezpečnostný limit pozvánok. Skúste to neskôr." };
    }

    const reservation = await withUserLifecycleLock(async (tx) => {
      await requireCustomerInviteActor(tx, actor, companyId, role);
      const company = await tx.company.findUnique({ where: { id: companyId }, select: { active: true } });
      if (!company?.active) throw new CustomerInviteError("Firma neexistuje alebo nie je aktívna.");

      const byEmail = await tx.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: "insensitive" } },
        select: {
          id: true, authId: true, role: true, companyId: true, active: true,
          updatedAt: true,
        },
      });
      const conflict = existingCustomerError(byEmail, companyId, role);
      if (conflict) throw new CustomerInviteError(conflict);

      if (!byEmail || byEmail.companyId !== companyId) {
        const [memberCount, pendingCount] = await Promise.all([
          tx.user.count({ where: { companyId } }),
          tx.user.count({ where: { companyId, active: true, lastLoginAt: null } }),
        ]);
        if (memberCount >= MAX_COMPANY_MEMBERS) {
          throw new CustomerInviteError(`Firma dosiahla limit ${MAX_COMPANY_MEMBERS} používateľov.`);
        }
        if (pendingCount >= MAX_PENDING_FIRST_LOGINS) {
          throw new CustomerInviteError(`Firma má priveľa neaktivovaných pozvánok. Najprv vyriešte existujúcich ${MAX_PENDING_FIRST_LOGINS}.`);
        }
      }

      return {
        existing: byEmail
          ? { id: byEmail.id, authId: byEmail.authId, updatedAt: byEmail.updatedAt.getTime() }
          : null,
      };
    });

    // Pomalý externý provider nikdy nedrží globálny DB lifecycle lock.
    const access = await generateCustomerAccessLink(normalizedEmail, org);
    const auditCtx = await auditRequestContext();
    const provisioned = await withUserLifecycleLock(async (tx) => {
      await requireCustomerInviteActor(tx, actor, companyId, role);
      const company = await tx.company.findUnique({ where: { id: companyId }, select: { active: true } });
      if (!company?.active) throw new CustomerInviteError("Firma už nie je aktívna.");

      const current = await tx.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: "insensitive" } },
        select: {
          id: true, authId: true, email: true, name: true, role: true, companyId: true,
          active: true, updatedAt: true,
        },
      });
      const expected = reservation.existing;
      const reservationChanged = expected
        ? !current
          || current.id !== expected.id
          || current.authId !== expected.authId
          || current.updatedAt.getTime() !== expected.updatedAt
        : current !== null;
      if (reservationChanged) {
        throw new CustomerInviteError("Konto sa počas pozývania zmenilo. Obnovte stránku a skúste to znova.");
      }

      const conflict = existingCustomerError(current, companyId, role);
      if (conflict) throw new CustomerInviteError(conflict);
      if (current && current.authId !== access.authId) {
        throw new CustomerInviteError("E-mail je naviazaný na inú Auth identitu; automatická oprava je zablokovaná.");
      }

      // Rezervácia pred provider callom nie je sama o sebe alokácia kapacity. Dve
      // pozvánky pre rozdielne e-maily môžu obe prejsť prvým countom, preto limit
      // overujeme znova pod serializujúcim lifecycle lockom tesne pred INSERT/linkom.
      if (!current || current.companyId !== companyId) {
        const [memberCount, pendingCount] = await Promise.all([
          tx.user.count({ where: { companyId } }),
          tx.user.count({ where: { companyId, active: true, lastLoginAt: null } }),
        ]);
        if (memberCount >= MAX_COMPANY_MEMBERS) {
          throw new CustomerInviteError(`Firma dosiahla limit ${MAX_COMPANY_MEMBERS} používateľov.`);
        }
        if (pendingCount >= MAX_PENDING_FIRST_LOGINS) {
          throw new CustomerInviteError(`Firma má priveľa neaktivovaných pozvánok. Najprv vyriešte existujúcich ${MAX_PENDING_FIRST_LOGINS}.`);
        }
      }

      const authCollision = await tx.user.findUnique({
        where: { authId: access.authId },
        select: { id: true },
      });
      if (authCollision && authCollision.id !== current?.id) {
        throw new CustomerInviteError("Auth identita je už naviazaná na iné konto.");
      }

      const target = current
        ? await tx.user.update({
            where: { id: current.id },
            data: current.companyId === null
              ? { email: normalizedEmail, name: current.name ?? name ?? undefined, role, companyId, active: true }
              : { email: normalizedEmail, name: current.name ?? name ?? undefined },
            select: { id: true },
          })
        : await tx.user.create({
            data: { authId: access.authId, email: normalizedEmail, name: name ?? undefined, role, companyId },
            select: { id: true },
          });

      await writeAuditRequired(tx, {
        userId: actor.id,
        companyId,
        action: current ? "CUSTOMER_USER_ACCESS_RESEND" : "CUSTOMER_USER_INVITE",
        entity: "User",
        entityId: target.id,
        meta: { role, actorKind: actor.kind },
      }, auditCtx);
      return target;
    });

    const sent = await sendEmail({
      to: normalizedEmail,
      subject: "Prístup do Moonid B2B portálu",
      text: [
        "Dobrý deň,",
        "",
        `pripravili sme vám prístup do B2B portálu Moonid pre firmu ${companyName}.`,
        "Heslo si nastavte cez tento jednorazový odkaz:",
        access.accessUrl,
        "",
        `Potom sa prihlásite na ${org}/login.`,
        "",
        "Tím Moonid",
      ].join("\n"),
    });
    if (sent.ok) return { ok: true, emailSent: true, inviteLink: null };

    try {
      const fallbackCtx = await auditRequestContext();
      await prisma.$transaction((tx) => writeAuditRequired(tx, {
        userId: actor.id,
        companyId,
        action: "CUSTOMER_USER_INVITE_EMAIL_FALLBACK",
        entity: "User",
        entityId: provisioned.id,
        meta: {
          role,
          actorKind: actor.kind,
          linkDisclosed: actor.kind === "STAFF",
          reason: sent.skipped ? "email_not_configured" : "email_send_failed",
        },
      }, fallbackCtx));
    } catch (auditError) {
      reportError("customerInvite.fallbackAudit", auditError, { action: "access_link_withheld" });
      return {
        ok: false,
        emailSent: false,
        inviteLink: null,
        error: "Konto vzniklo, ale e-mail ani bezpečnostný audit doručenia sa nedokončili. Jednorazový odkaz nebol zobrazený; skúste odoslanie znova.",
      };
    }

    if (actor.kind === "STAFF") {
      return {
        ok: true,
        emailSent: false,
        inviteLink: access.accessUrl,
        warning: "E-mail sa neodoslal. Jednorazový odkaz odovzdajte používateľovi bezpečným kanálom.",
      };
    }
    return {
      ok: true,
      emailSent: false,
      inviteLink: null,
      warning: "Konto vzniklo, ale e-mail sa neodoslal. Z bezpečnostných dôvodov sa prístupový odkaz nezobrazuje; skúste odoslanie znova zo zoznamu členov.",
    };
  } catch (error) {
    if (error instanceof CustomerInviteError) return { ok: false, error: error.message };
    reportError("customerInvite.provision", error, { action: "customer_invite" });
    return { ok: false, error: "Používateľa sa nepodarilo bezpečne pozvať. Skúste to znova." };
  }
}
