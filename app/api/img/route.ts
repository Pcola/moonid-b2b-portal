import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Proxy obrázkov dodávateľa pre staff match-review. Berie OPAQUE id ProductSource
// (nie URL) — dodávateľská URL sa tak nezobrazí ani v zdroji staff stránky.
// LEN pre STAFF, LEN presný host (anti-SSRF).
const ALLOWED_HOST = "www.partner.humed.sk";

export async function GET(req: NextRequest) {
  await requireStaff(); // non-staff → redirect (obrázok sa nenačíta)

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return new NextResponse("missing id", { status: 400 });

  const src = await prisma.productSource.findUnique({ where: { id }, select: { imageUrl: true } });
  if (!src?.imageUrl) return new NextResponse("not found", { status: 404 });

  let target: URL;
  try { target = new URL(src.imageUrl); } catch { return new NextResponse("bad url", { status: 400 }); }
  if (target.protocol !== "https:" || target.hostname !== ALLOWED_HOST) {
    return new NextResponse("forbidden host", { status: 403 });
  }

  const res = await fetch(target.toString());
  if (!res.ok) return new NextResponse("upstream error", { status: 502 });

  const ct = res.headers.get("content-type") ?? "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return new NextResponse(buf, {
    status: 200,
    headers: { "Content-Type": ct, "Cache-Control": "private, max-age=3600" },
  });
}
