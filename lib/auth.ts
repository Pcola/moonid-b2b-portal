import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Aktuálny prihlásený používateľ (Supabase auth → náš User záznam).
// cache() = jeden lookup per request. Vráti null ak neprihlásený alebo
// auth konto ešte nie je napojené na User (čaká na onboarding).
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;
  return prisma.user.findUnique({
    where: { authId: authUser.id },
    include: { company: { include: { priceTier: true } } },
  });
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

function isStaff(role: string) {
  return role === "STAFF" || role === "ADMIN";
}

/** Vyžaduje prihláseného zákazníka (alebo staff). Inak redirect. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.active) redirect("/login?disabled=1");
  // zákazník musí mať priradenú firmu; staff/admin nie
  if (!user.companyId && !isStaff(user.role)) redirect("/cakajuce");
  return user;
}

/** Vyžaduje STAFF/ADMIN. */
export async function requireStaff(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isStaff(user.role)) redirect("/dashboard");
  return user;
}

/** Vyžaduje ADMIN. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
