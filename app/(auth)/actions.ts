"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { rateLimit, rateLimitKey, clientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site-url";

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

/** Server-side reset s canonical redirectom a vždy rovnakou odpoveďou proti enumerácii. */
export async function requestPasswordReset(email: unknown): Promise<void> {
  const parsed = z.string().trim().email().max(160).safeParse(email);
  if (!parsed.success) return;
  const ip = clientIp(await headers());
  const byIp = await rateLimit(rateLimitKey("reset-ip", ip), { limit: 10, windowSec: 3600 });
  const byEmail = await rateLimit(rateLimitKey("reset-email", parsed.data), { limit: 3, windowSec: 3600 });
  if (!byIp.ok || !byEmail.ok) return;
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.toLowerCase(), {
    redirectTo: `${SITE_URL}/auth/callback?next=/nastav-heslo`,
  });
}

/** Odhlásenie — audit LOGOUT. */
export async function recordLogout(): Promise<void> {
  const user = await getCurrentUser();
  await writeAudit({ userId: user?.id ?? null, companyId: user?.companyId ?? null, action: "LOGOUT", entity: "Auth", entityId: user?.id ?? null });
}
