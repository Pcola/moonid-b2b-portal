import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Health endpoint pre uptime monitor (UptimeRobot/BetterStack). Verejné, ale
// neodhaľuje nič citlivé — len up/down + DB ping. Nikdy necachovať.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", db: "up", time: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { status: "error", db: "down" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
