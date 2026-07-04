import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** CSV bunka — escapuje úvodzovky/oddeľovače/nové riadky (RFC 4180). */
function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /["\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
/** BOM + CRLF + ";" oddeľovač → korektná diakritika a stĺpce v SK Exceli. */
function toCsv(headers: string[], rows: unknown[][]): string {
  return "﻿" + [headers, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
}
const dec = (n: number) => n.toFixed(2).replace(".", ","); // desatinná čiarka pre Excel
const day = (d: Date) => d.toISOString().slice(0, 10);

function csvResponse(body: string, filename: string): NextResponse {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const type = new URL(req.url).searchParams.get("type");
  const today = day(new Date());

  if (type === "orders") {
    const orders = await prisma.order.findMany({
      where: { status: { not: "CAKA_SCHVALENIE" } },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        number: true, createdAt: true, status: true, poNumber: true, subtotal: true, vat: true, total: true,
        _count: { select: { items: true } },
        company: { select: { name: true, ico: true, priceTier: { select: { code: true } } } },
      },
    });
    const csv = toCsv(
      ["Číslo", "Dátum", "Firma", "IČO", "Úroveň", "Stav", "Položiek", "PO číslo", "Medzisúčet", "DPH", "Spolu s DPH"],
      orders.map((o) => [
        o.number, day(o.createdAt), o.company.name, o.company.ico, o.company.priceTier?.code ?? "",
        o.status, o._count.items, o.poNumber ?? "", dec(Number(o.subtotal)), dec(Number(o.vat)), dec(Number(o.total)),
      ]),
    );
    await writeAudit({ userId: user.id, action: "EXPORT_ORDERS", entity: "Order", meta: { count: orders.length } });
    return csvResponse(csv, `objednavky-${today}.csv`);
  }

  if (type === "customers") {
    const companies = await prisma.company.findMany({
      orderBy: { name: "asc" },
      take: 5000,
      select: {
        name: true, ico: true, dic: true, icDph: true, city: true, splatDays: true, active: true, createdAt: true,
        priceTier: { select: { code: true } }, _count: { select: { orders: true } },
      },
    });
    const csv = toCsv(
      ["Firma", "IČO", "DIČ", "IČ DPH", "Mesto", "Úroveň", "Splatnosť (dni)", "Aktívna", "Objednávok", "Zákazník od"],
      companies.map((c) => [
        c.name, c.ico, c.dic ?? "", c.icDph ?? "", c.city ?? "", c.priceTier?.code ?? "",
        c.splatDays, c.active ? "áno" : "nie", c._count.orders, day(c.createdAt),
      ]),
    );
    await writeAudit({ userId: user.id, action: "EXPORT_CUSTOMERS", entity: "Company", meta: { count: companies.length } });
    return csvResponse(csv, `zakaznici-${today}.csv`);
  }

  return NextResponse.json({ error: "unknown type" }, { status: 400 });
}
