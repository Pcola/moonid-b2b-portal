import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSystemReadiness } from "@/lib/readiness";

// Health endpoint pre uptime monitor (UptimeRobot/BetterStack). Verejné, ale
// neodhaľuje detaily — len liveness/readiness. Stará skladová/Pohoda synchronizácia musí
// zhodiť externý monitor, hoci samotný SELECT 1 ešte funguje. Nikdy necachovať.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const readiness = await getSystemReadiness();
    return NextResponse.json(
      { status: readiness.ok ? "ok" : "degraded", db: "up", dependencies: readiness.ok ? "ready" : "degraded", time: new Date().toISOString() },
      { status: readiness.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { status: "error", db: "down", dependencies: "unknown" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
