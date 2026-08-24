"use server";

import { randomInt } from "node:crypto";
import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { createInternalRecoveryLink } from "@/lib/internal-auth-admin";
import { normalizeInternalEmail } from "@/lib/internal-user-policy";
import { reportError } from "@/lib/observability";
import { rateLimit, rateLimitKey, clientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site-url";

const RESET_MIN_RESPONSE_MS = 1_800;
const RESET_JITTER_MS = 400;

async function equalizeResetResponse(startedAt: number): Promise<void> {
  const targetDuration = RESET_MIN_RESPONSE_MS + randomInt(RESET_JITTER_MS + 1);
  const remaining = targetDuration - (Date.now() - startedAt);
  if (remaining > 0) await new Promise<void>((resolve) => setTimeout(resolve, remaining));
}

const credentialsSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(1024),
});

/**
 * Prihlásenie vlastnené serverom. Klient už nemôže samostatne falšovať LOGIN_FAILURE ani
 * uzamknúť cudziu adresu. Toto je doplnok k povinným Supabase/edge rate-limit a CAPTCHA
 * kontrolám — verejný Auth provider endpoint musí byť chránený aj vo svojom dashboarde.
 */
export async function authenticate(input: unknown): Promise<{ ok: boolean; error?: "invalid" | "rate_limited" }> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const ip = clientIp(await headers());
  const gate = await rateLimit(rateLimitKey("login-ip", ip), { limit: 30, windowSec: 600 });
  if (!gate.ok) return { ok: false, error: "rate_limited" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
  });

  if (error || !data.user) {
    const auditGate = await rateLimit(rateLimitKey("login-audit-ip", ip), { limit: 5, windowSec: 600 });
    if (auditGate.ok) {
      await writeAudit({ action: "LOGIN_FAILURE", entity: "Auth", meta: { reason: "invalid_credentials" } });
    }
    return { ok: false, error: "invalid" };
  }

  const user = await prisma.user.findUnique({
    where: { authId: data.user.id },
    select: { id: true, companyId: true, active: true, company: { select: { active: true } } },
  });
  if (!user || !user.active || user.company?.active === false) {
    await supabase.auth.signOut();
    await writeAudit({ userId: user?.id, companyId: user?.companyId, action: "LOGIN_DENIED", entity: "Auth", entityId: user?.id, meta: { reason: "inactive_or_unprovisioned" } });
    return { ok: false, error: "invalid" };
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await writeAudit({ userId: user.id, companyId: user.companyId, action: "LOGIN_SUCCESS", entity: "Auth", entityId: user.id });
  return { ok: true };
}

/** Scanner-safe reset s rovnakou verejnou odpoveďou pre existujúci aj neexistujúci účet. */
export async function requestPasswordReset(email: unknown): Promise<void> {
  const parsed = z.string().trim().email().max(160).safeParse(email);
  if (!parsed.success) return;
  const ip = clientIp(await headers());
  const byIp = await rateLimit(rateLimitKey("reset-ip", ip), { limit: 10, windowSec: 3600 });
  const byEmail = await rateLimit(rateLimitKey("reset-email", parsed.data), { limit: 3, windowSec: 3600 });
  if (!byIp.ok || !byEmail.ok) return;
  const normalizedEmail = normalizeInternalEmail(parsed.data);
  const startedAt = Date.now();
  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      select: { id: true, authId: true, email: true, active: true, companyId: true, company: { select: { active: true } } },
    });
    // Navonok nič neprezradíme; neaktívne/neprovisionované konto nedostane recovery token.
    if (!user?.active || user.company?.active === false) return;

    const access = await createInternalRecoveryLink(normalizedEmail);
    if (access.authId !== user.authId) {
      reportError("auth.passwordReset.identityMismatch", new Error("Recovery Auth identity mismatch"), { action: "reset_withheld" });
      return;
    }
    const sent = await sendEmail({
      to: user.email,
      subject: "Obnova hesla do Moonid B2B",
      text: [
        "Dobrý deň,",
        "",
        "dostali sme žiadosť o obnovu hesla do Moonid B2B portálu.",
        "Pokračujte cez tento jednorazový odkaz:",
        access.url,
        "",
        "Ak ste o obnovu nežiadali, tento e-mail ignorujte.",
        `Prihlásenie: ${SITE_URL}/login`,
        "",
        "Tím Moonid",
      ].join("\n"),
    });
    if (!sent.ok) {
      reportError("auth.passwordReset.email", new Error("Password reset email was not accepted"), { action: "reset_email_failed" });
      return;
    }
    await writeAudit({
      userId: user.id,
      companyId: user.companyId,
      action: "PASSWORD_RESET_REQUESTED",
      entity: "User",
      entityId: user.id,
    });
  } catch (error) {
    // Rovnaká odpoveď chráni pred enumeráciou; interná chyba je viditeľná iba v observability.
    reportError("auth.passwordReset", error, { action: "reset_failed" });
  } finally {
    // DB-only negatívna vetva a provider/email vetva majú spoločnú minimálnu dobu s jitterom.
    // Rate limit vyššie bráni zneužitiu oneskorenia na lacný serverless DoS.
    await equalizeResetResponse(startedAt);
  }
}

/** Odhlásenie — audit LOGOUT. */
export async function recordLogout(): Promise<void> {
  const user = await getCurrentUser();
  await writeAudit({ userId: user?.id ?? null, companyId: user?.companyId ?? null, action: "LOGOUT", entity: "Auth", entityId: user?.id ?? null });
}
