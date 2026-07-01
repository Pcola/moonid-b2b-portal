import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// DOČASNÝ overovací endpoint pre Sentry pipeline. Po overení ZMAZAŤ.
// GET /api/sentry-test?trigger=sentry  → vyvolá chybu, ktorú má zachytiť Sentry.
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("trigger") === "sentry") {
    throw new Error("Sentry pipeline test — bezpečné ignorovať (dočasný overovací endpoint).");
  }
  return NextResponse.json({ hint: "Pridaj ?trigger=sentry na vyvolanie testovacej chyby." });
}
