"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditRequestContext, writeAuditRequired } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import {
  createInternalInviteLink,
  createInternalRecoveryLink,
  ExternalAuthBanError,
  InternalMfaResetError,
  resetInternalAuthMfa,
  setInternalAuthBlocked,
} from "@/lib/internal-auth-admin";
import {
  internalTargetError,
  internalTransitionError,
  isInternalRole,
  normalizeInternalEmail,
  type InternalRole,
} from "@/lib/internal-user-policy";
import { reportError } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site-url";
import { withUserLifecycleLock } from "@/lib/user-lifecycle-lock";

export type TeamActionResult = {
  ok: boolean;
  error?: string;
  warning?: string;
  inviteLink?: string | null;
  emailSent?: boolean;
};

const ID = z.string().min(1).max(100);
const INTERNAL_ROLE = z.enum(["STAFF", "ADMIN"]);
const inviteSchema = z.object({
  email: z.string().trim().email("Zadajte platný e-mail.").max(160),
  name: z.string().trim().max(120, "Meno môže mať najviac 120 znakov.").optional().default(""),
  role: INTERNAL_ROLE,
});
class ActionError extends Error {}

/** Revalidácia autorizácie až PO získaní lifecycle locku zatvára demotion/deactivation TOCTOU. */
async function requireFreshAdmin(tx: Prisma.TransactionClient, actorId: string): Promise<void> {
  const current = await tx.user.findUnique({
    where: { id: actorId },
    select: { role: true, active: true, companyId: true },
  });
  if (!current || current.role !== "ADMIN" || !current.active || current.companyId !== null) {
    throw new ActionError("Vaše administrátorské oprávnenie už nie je aktívne. Obnovte stránku.");
  }
}

function failure(scope: string, error: unknown): TeamActionResult {
  if (error instanceof ActionError) return { ok: false, error: error.message };
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { ok: false, error: "Konto s týmto e-mailom už existuje." };
  }
  reportError(scope, error, { action: scope });
  return { ok: false, error: "Operáciu sa nepodarilo bezpečne dokončiť. Skúste to znova." };
}

async function invitationGate(actorId: string, target: string): Promise<boolean> {
  const [actor, recipient] = await Promise.all([
    rateLimit(rateLimitKey("internal-invite-actor", actorId), { limit: 30, windowSec: 3600 }),
    rateLimit(rateLimitKey("internal-invite-target", target), { limit: 5, windowSec: 3600 }),
  ]);
  return actor.ok && recipient.ok;
}

async function deliverAccessLink(args: {
  actorId: string;
  targetId: string;
  to: string;
  name: string | null;
  role: InternalRole;
  url: string;
  resend: boolean;
}): Promise<TeamActionResult> {
  const salutation = args.name ? `Dobrý deň, ${args.name},` : "Dobrý deň,";
  const roleLabel = args.role === "ADMIN" ? "administrátora" : "člena interného tímu";
  const sent = await sendEmail({
    to: args.to,
    subject: args.resend ? "Nový prístupový odkaz do Moonid B2B" : "Prístup pre interný tím Moonid B2B",
    text: [
      salutation,
      "",
      args.resend
        ? "Na žiadosť správcu vám posielame nový jednorazový odkaz na nastavenie hesla."
        : `Bol vám vytvorený interný prístup s oprávnením ${roleLabel}.`,
      "Heslo si nastavte cez tento jednorazový odkaz:",
      args.url,
      "",
      "Pri prvom vstupe do administrácie vás portál požiada o nastavenie dvojfaktorového overenia v autentifikačnej aplikácii.",
      "Odkaz nikomu nepreposielajte. Ak ste o prístup nežiadali, kontaktujte správcu Moonid.",
      "",
      `Prihlásenie: ${SITE_URL}/login`,
      "",
      "Tím Moonid",
    ].join("\n"),
  });

  if (sent.ok) return { ok: true, emailSent: true, inviteLink: null };

  try {
    const ctx = await auditRequestContext();
    await prisma.$transaction((tx) => writeAuditRequired(tx, {
      userId: args.actorId,
      action: "INTERNAL_USER_INVITE_EMAIL_FALLBACK",
      entity: "User",
      entityId: args.targetId,
      meta: { resend: args.resend, reason: sent.skipped ? "email_not_configured" : "email_send_failed" },
    }, ctx));
  } catch (error) {
    // Bearer link sa nesmie zobraziť bez trvalej auditnej stopy o jeho manuálnom vydaní.
    reportError("internalUsers.invite.fallbackAudit", error, { action: "access_link_withheld" });
    return {
      ok: false,
      emailSent: false,
      inviteLink: null,
      error: "E-mail sa neodoslal a jednorazový odkaz sa pre zlyhanie bezpečnostného auditu nezobrazí. Skúste to znova.",
    };
  }
  return {
    ok: true,
    emailSent: false,
    inviteLink: args.url,
    warning: "E-mail sa neodoslal. Jednorazový odkaz skopírujte a odovzdajte používateľovi bezpečným kanálom.",
  };
}

/** Pozve nové interné STAFF/ADMIN konto bez dočasného hesla. */
export async function inviteInternalUser(input: unknown): Promise<TeamActionResult> {
  const actor = await requireAdmin();
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Skontrolujte údaje." };
  const email = normalizeInternalEmail(parsed.data.email);
  const name = parsed.data.name || null;
  const role = parsed.data.role;

  if (!(await invitationGate(actor.id, email))) {
    return { ok: false, error: "Dosiahli ste limit pozvánok. Skúste to neskôr." };
  }

  try {
    await withUserLifecycleLock(async (tx) => {
      await requireFreshAdmin(tx, actor.id);
      const existing = await tx.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { role: true, companyId: true },
      });
      if (existing) {
        throw new ActionError(isInternalRole(existing.role) && existing.companyId === null
          ? "Interné konto s týmto e-mailom už existuje. Použite odoslanie nového prístupového odkazu."
          : "Tento e-mail už patrí zákazníckemu alebo nekonzistentnému kontu; automatické povýšenie je zablokované.");
      }
    });

    // Provider I/O nedrží globálny DB lock. Pred zápisom sa admin, e-mail aj Auth
    // väzba znova overia; orphan Auth identita nemá bez User záznamu app oprávnenie.
    const access = await createInternalInviteLink(email);
    const ctx = await auditRequestContext();
    const user = await withUserLifecycleLock(async (tx) => {
      await requireFreshAdmin(tx, actor.id);
      const existing = await tx.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { role: true, companyId: true },
      });
      if (existing) {
        throw new ActionError(isInternalRole(existing.role) && existing.companyId === null
          ? "Interné konto s týmto e-mailom už existuje. Použite odoslanie nového prístupového odkazu."
          : "Tento e-mail už patrí zákazníckemu alebo nekonzistentnému kontu; automatické povýšenie je zablokované.");
      }
      const collision = await tx.user.findFirst({
        where: { OR: [{ authId: access.authId }, { email: { equals: email, mode: "insensitive" } }] },
        select: { role: true, companyId: true },
      });
      if (collision) {
        throw new ActionError(isInternalRole(collision.role) && collision.companyId === null
          ? "Interné konto s týmto e-mailom už existuje. Použite odoslanie nového prístupového odkazu."
          : "Auth identita je už naviazaná na iné konto; pozvánka bola bezpečne zastavená.");
      }
      const user = await tx.user.create({
        data: {
          authId: access.authId,
          email,
          name,
          role,
          companyId: null,
          active: true,
          mfaEnabled: false,
          canOrderDirectly: true,
          approverId: null,
        },
        select: { id: true },
      });
      await writeAuditRequired(tx, {
        userId: actor.id,
        action: "INTERNAL_USER_INVITE",
        entity: "User",
        entityId: user.id,
        meta: { role, authFlow: access.createdAuthUser ? "invite" : "recovery", mfaRequired: true },
      }, ctx);
      return user;
    });

    revalidatePath("/staff/pristupy");
    return deliverAccessLink({
      actorId: actor.id,
      targetId: user.id,
      to: email,
      name,
      role,
      url: access.url,
      resend: false,
    });
  } catch (error) {
    return failure("internalUsers.invite", error);
  }
}

/** Pošle aktívnemu internému kontu nový recovery/setup link. */
export async function resendInternalUserAccess(userId: string): Promise<TeamActionResult> {
  const actor = await requireAdmin();
  if (!ID.safeParse(userId).success) return { ok: false, error: "Neplatný vstup." };

  try {
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, authId: true, email: true, name: true, role: true, active: true, companyId: true,
        authSyncPending: true,
      },
    });
    const invalid = internalTargetError(target);
    if (invalid) throw new ActionError(invalid);
    if (target!.authSyncPending) throw new ActionError("Konto má rozpracovanú Auth synchronizáciu. Najprv ju dokončite.");
    if (!target!.active) throw new ActionError("Deaktivované konto najprv aktivujte.");
    if (!(await invitationGate(actor.id, target!.email))) {
      return { ok: false, error: "Dosiahli ste limit odoslaní. Skúste to neskôr." };
    }

    const reservation = await withUserLifecycleLock(async (tx) => {
      await requireFreshAdmin(tx, actor.id);
      const current = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true, authId: true, email: true, name: true, role: true, active: true,
          companyId: true, authSyncPending: true,
        },
      });
      const currentInvalid = internalTargetError(current);
      if (currentInvalid) throw new ActionError(currentInvalid);
      if (current!.authSyncPending) throw new ActionError("Konto má rozpracovanú Auth synchronizáciu. Najprv ju dokončite.");
      if (!current!.active) throw new ActionError("Konto bolo medzitým deaktivované; odkaz sa neodoslal.");
      return { authId: current!.authId, email: normalizeInternalEmail(current!.email) };
    });

    const access = await createInternalRecoveryLink(reservation.email);
    if (reservation.authId !== access.authId) throw new Error("Auth identity changed during recovery link generation");
    const ctx = await auditRequestContext();
    const current = await withUserLifecycleLock(async (tx) => {
      await requireFreshAdmin(tx, actor.id);
      const revalidated = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true, authId: true, email: true, name: true, role: true, active: true,
          companyId: true, authSyncPending: true,
        },
      });
      const currentInvalid = internalTargetError(revalidated);
      if (currentInvalid) throw new ActionError(currentInvalid);
      if (revalidated!.authSyncPending) throw new ActionError("Konto má rozpracovanú Auth synchronizáciu. Najprv ju dokončite.");
      if (!revalidated!.active) throw new ActionError("Konto bolo medzitým deaktivované; odkaz sa neodoslal.");
      if (revalidated!.authId !== reservation.authId || normalizeInternalEmail(revalidated!.email) !== reservation.email) {
        throw new ActionError("Konto sa počas odosielania zmenilo. Obnovte stránku a skúste to znova.");
      }
      await writeAuditRequired(tx, {
        userId: actor.id,
        action: "INTERNAL_USER_ACCESS_RESEND",
        entity: "User",
        entityId: userId,
        meta: { role: revalidated!.role },
      }, ctx);
      return revalidated!;
    });

    return deliverAccessLink({
      actorId: actor.id,
      targetId: current.id,
      to: current.email,
      name: current.name,
      role: current.role as InternalRole,
      url: access.url,
      resend: true,
    });
  } catch (error) {
    return failure("internalUsers.resend", error);
  }
}

/** Zmení STAFF ↔ ADMIN pod race-safe ochranou posledného admina. */
export async function setInternalUserRole(userId: string, nextRole: string): Promise<TeamActionResult> {
  const actor = await requireAdmin();
  const id = ID.safeParse(userId);
  const role = INTERNAL_ROLE.safeParse(nextRole);
  if (!id.success || !role.success) return { ok: false, error: "Neplatný vstup." };

  try {
    const ctx = await auditRequestContext();
    await withUserLifecycleLock(async (tx) => {
      await requireFreshAdmin(tx, actor.id);
      const target = await tx.user.findUnique({ where: { id: id.data }, select: { id: true, role: true, active: true, companyId: true, authSyncPending: true } });
      const invalid = internalTargetError(target);
      if (invalid) throw new ActionError(invalid);
      if (target!.authSyncPending) throw new ActionError("Konto má rozpracovanú Auth synchronizáciu. Najprv ju dokončite.");
      const activeAdminCount = await tx.user.count({ where: { role: "ADMIN", active: true, companyId: null } });
      const policyError = internalTransitionError({
        actorId: actor.id,
        targetId: target!.id,
        currentRole: target!.role,
        currentActive: target!.active,
        nextRole: role.data,
        nextActive: target!.active,
        activeAdminCount,
      });
      if (policyError) throw new ActionError(policyError);
      if (target!.role === role.data) return;
      await tx.user.update({ where: { id: target!.id }, data: { role: role.data } });
      await writeAuditRequired(tx, {
        userId: actor.id,
        action: "INTERNAL_USER_ROLE",
        entity: "User",
        entityId: target!.id,
        meta: { from: target!.role, to: role.data },
      }, ctx);
    });
    revalidatePath("/staff/pristupy");
    return { ok: true };
  } catch (error) {
    return failure("internalUsers.role", error);
  }
}

/** Aktivuje/deaktivuje app konto a zároveň blokuje/odblokuje Supabase Auth identitu. */
export async function setInternalUserActive(userId: string, nextActive: boolean): Promise<TeamActionResult> {
  const actor = await requireAdmin();
  const id = ID.safeParse(userId);
  const active = z.boolean().safeParse(nextActive);
  if (!id.success || !active.success) return { ok: false, error: "Neplatný vstup." };

  let reservation: { targetId: string; authId: string; desiredActive: boolean } | null = null;
  try {
    const ctx = await auditRequestContext();
    reservation = await withUserLifecycleLock(async (tx) => {
      await requireFreshAdmin(tx, actor.id);
      const target = await tx.user.findUnique({
        where: { id: id.data },
        select: {
          id: true, authId: true, role: true, active: true, companyId: true,
          authSyncPending: true, authDesiredActive: true,
        },
      });
      const invalid = internalTargetError(target);
      if (invalid) throw new ActionError(invalid);
      if (target!.authSyncPending) {
        if (target!.authDesiredActive !== active.data) {
          throw new ActionError("Konto má rozpracovanú inú Auth zmenu. Najprv dokončite jej synchronizáciu.");
        }
        return { targetId: target!.id, authId: target!.authId, desiredActive: active.data };
      }
      const activeAdminCount = await tx.user.count({ where: { role: "ADMIN", active: true, companyId: null } });
      const policyError = internalTransitionError({
        actorId: actor.id,
        targetId: target!.id,
        currentRole: target!.role,
        currentActive: target!.active,
        nextRole: target!.role,
        nextActive: active.data,
        activeAdminCount,
      });
      if (policyError) throw new ActionError(policyError);

      // Pri deaktivácii je app DB fail-safe autorita: active=false sa commituje ešte
      // pred provider callom. Pri aktivácii ostáva false až do úspešného Auth unbanu.
      await tx.user.update({
        where: { id: target!.id },
        data: {
          active: active.data ? target!.active : false,
          authSyncPending: true,
          authDesiredActive: active.data,
        },
      });
      await writeAuditRequired(tx, {
        userId: actor.id,
        action: "INTERNAL_USER_ACTIVE_REQUESTED",
        entity: "User",
        entityId: target!.id,
        meta: { from: target!.active, to: active.data },
      }, ctx);
      return { targetId: target!.id, authId: target!.authId, desiredActive: active.data };
    });

    let provider: { managedBan: boolean; externalBan: boolean };
    try {
      provider = await setInternalAuthBlocked(reservation.authId, !reservation.desiredActive);
    } catch (providerError) {
      if (!(providerError instanceof ExternalAuthBanError)) {
        reportError("internalUsers.active.provider", providerError, { action: "auth_sync_pending" });
      }
      revalidatePath("/staff/pristupy");
      return {
        ok: false,
        error: providerError instanceof ExternalAuthBanError
          ? "Supabase Auth účet má nezávislú bezpečnostnú blokáciu. Najprv ju musí preveriť správca v Supabase; portál účet ponechal neaktívny."
          : "Zmena je bezpečne uložená, ale Supabase Auth synchronizácia čaká. Použite tlačidlo Dokončiť synchronizáciu.",
      };
    }

    try {
      await withUserLifecycleLock(async (tx) => {
        const current = await tx.user.findUnique({
          where: { id: reservation!.targetId },
          select: { authId: true, authSyncPending: true, authDesiredActive: true },
        });
        if (!current || current.authId !== reservation!.authId || !current.authSyncPending || current.authDesiredActive !== reservation!.desiredActive) {
          throw new Error("Auth lifecycle reservation changed before finalize");
        }
        await tx.user.update({
          where: { id: reservation!.targetId },
          data: {
            active: reservation!.desiredActive,
            authSyncPending: false,
            authDesiredActive: null,
            authManagedBan: provider.managedBan,
            authSyncedAt: new Date(),
          },
        });
        await writeAuditRequired(tx, {
          userId: actor.id,
          action: "INTERNAL_USER_ACTIVE",
          entity: "User",
          entityId: reservation!.targetId,
          meta: {
            to: reservation!.desiredActive,
            authBlocked: !reservation!.desiredActive,
            managedBan: provider.managedBan,
            externalBan: provider.externalBan,
          },
        }, ctx);
      });
    } catch (finalizeError) {
      reportError("internalUsers.active.finalize", finalizeError, { action: "auth_sync_pending" });
      revalidatePath("/staff/pristupy");
      return {
        ok: false,
        error: "Supabase stav sa zmenil, ale DB finalizácia čaká. Operáciu bezpečne zopakujte tlačidlom Dokončiť synchronizáciu.",
      };
    }
    revalidatePath("/staff/pristupy");
    return { ok: true };
  } catch (error) {
    return failure("internalUsers.active", error);
  }
}

/** Admin recovery pri strate autentifikátora; vlastné MFA sa spravuje v Bezpečnosti konta. */
export async function resetInternalUserMfa(userId: string): Promise<TeamActionResult> {
  const actor = await requireAdmin();
  const id = ID.safeParse(userId);
  if (!id.success) return { ok: false, error: "Neplatný vstup." };
  if (actor.id === id.data) return { ok: false, error: "Vlastné MFA spravujte v sekcii Bezpečnosť konta." };

  let targetAuthId: string | null = null;
  let intentCommitted = false;
  let providerStarted = false;
  let providerCompleted = false;
  try {
    const ctx = await auditRequestContext();
    targetAuthId = await withUserLifecycleLock(async (tx) => {
      await requireFreshAdmin(tx, actor.id);
      const target = await tx.user.findUnique({ where: { id: id.data }, select: { id: true, authId: true, role: true, companyId: true, authSyncPending: true } });
      const invalid = internalTargetError(target);
      if (invalid) throw new ActionError(invalid);
      if (target!.authSyncPending) throw new ActionError("Konto má rozpracovanú Auth synchronizáciu. Najprv ju dokončite.");
      // Intent sa commituje ešte pred nevratným odstránením TOTP faktorov.
      await writeAuditRequired(tx, {
        userId: actor.id,
        action: "INTERNAL_USER_MFA_RESET_REQUESTED",
        entity: "User",
        entityId: target!.id,
        meta: { role: target!.role },
      }, ctx);
      return target!.authId;
    });
    intentCommitted = true;

    await withUserLifecycleLock(async (tx) => {
      await requireFreshAdmin(tx, actor.id);
      const current = await tx.user.findUnique({ where: { id: id.data }, select: { id: true, authId: true, role: true, companyId: true, authSyncPending: true } });
      const invalid = internalTargetError(current);
      if (invalid) throw new ActionError(invalid);
      if (current!.authSyncPending) throw new ActionError("Konto má rozpracovanú Auth synchronizáciu. Najprv ju dokončite.");
      if (current!.authId !== targetAuthId) throw new Error("Auth identity changed during MFA reset");

      // Lock ostáva držaný aj počas provider operácie, takže súbežná demócia admina
      // ani zmena cieľového účtu nemôže preskočiť medzi revalidáciu a odstránenie faktorov.
      providerStarted = true;
      const factorCount = await resetInternalAuthMfa(current!.authId);
      providerCompleted = true;
      await tx.user.update({ where: { id: current!.id }, data: { mfaEnabled: false } });
      await writeAuditRequired(tx, {
        userId: actor.id,
        action: "INTERNAL_USER_MFA_RESET",
        entity: "User",
        entityId: current!.id,
        meta: { factorsRemoved: factorCount, sessionsRevoked: factorCount > 0 },
      }, ctx);
    });
    revalidatePath("/staff/pristupy");
    return { ok: true };
  } catch (error) {
    const partiallyRemoved = error instanceof InternalMfaResetError ? error.removedCount : 0;
    if (intentCommitted && targetAuthId) {
      try {
        const failedCtx = await auditRequestContext();
        await prisma.$transaction((tx) => writeAuditRequired(tx, {
          userId: actor.id,
          action: "INTERNAL_USER_MFA_RESET_FAILED",
          entity: "User",
          entityId: id.data,
          meta: {
            reason: providerCompleted
              ? "db_incomplete"
              : partiallyRemoved > 0
                ? "provider_partial"
                : providerStarted
                  ? "provider_error"
                  : "precondition_changed",
            factorsRemoved: partiallyRemoved,
          },
        }, failedCtx));
      } catch (auditError) {
        reportError("internalUsers.mfa.failureAudit", auditError, { action: "mfa_reset_failed" });
      }
    }
    if (providerCompleted || partiallyRemoved > 0) {
      reportError("internalUsers.mfa.partial", error, {
        action: providerCompleted ? "provider_complete_db_incomplete" : "provider_partial",
        factorsRemoved: partiallyRemoved,
      });
      return {
        ok: false,
        error: "MFA bolo úplne alebo čiastočne odstránené, ale operáciu sa nepodarilo dokončiť. Zopakujte reset; používateľ bude musieť MFA nastaviť znova.",
      };
    }
    return failure("internalUsers.mfa", error);
  }
}
