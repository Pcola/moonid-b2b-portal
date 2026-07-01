import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export async function inviteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

/**
 * Vytvorí/pozve používateľa pre firmu (Supabase invite, alebo recovery ak konto už existuje) +
 * upsertne User záznam. Vráti pozvánkový odkaz (volajúci ho môže zobraziť; e-mail ide best-effort).
 * Zdieľané: staff onboarding (app/staff/zakaznici) aj zákaznícka správa členov (app/(portal)/nastavenia).
 */
export async function inviteUser(
  email: string,
  name: string | null,
  role: "CUSTOMER_ADMIN" | "CUSTOMER_USER",
  companyId: string,
  companyName: string,
): Promise<{ ok: boolean; error?: string; inviteLink?: string | null }> {
  const admin = createAdminClient();
  const redirectTo = `${await inviteOrigin()}/auth/callback?next=/nastav-heslo`;
  let authId: string | null = null;
  let inviteLink: string | null = null;

  const { data: gen, error: genErr } = await admin.auth.admin.generateLink({ type: "invite", email, options: { redirectTo } });
  if (gen?.user) {
    authId = gen.user.id;
    inviteLink = gen.properties?.action_link ?? null;
  } else {
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = list.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!found) return { ok: false, error: "Nepodarilo sa vytvoriť konto: " + (genErr?.message ?? "neznáma chyba") };
    authId = found.id;
    const { data: rec } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
    inviteLink = rec?.properties?.action_link ?? null;
  }

  await prisma.user.upsert({
    where: { email },
    update: { authId: authId!, role, companyId, active: true },
    create: { authId: authId!, email, name: name ?? undefined, role, companyId },
  });

  if (inviteLink) {
    await sendEmail({
      to: email,
      subject: "Prístup do Moonid B2B portálu",
      text: [`Dobrý deň,`, "", `pripravili sme vám prístup do B2B portálu Moonid pre firmu ${companyName}.`, "Heslo si nastavte cez tento odkaz:", inviteLink, "", `Potom sa prihlásite na ${await inviteOrigin()}/login.`, "", "Tím Moonid"].join("\n"),
    });
  }
  return { ok: true, inviteLink };
}
