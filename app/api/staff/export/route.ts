import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// desatinná čiarka pre Excel; berie number aj Prisma.Decimal (formát priamo z DB hodnoty, bez float medzikroku)
const money = (v: { toFixed(dp: number): string }) => v.toFixed(2).replace(".", ",");
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
  // requireStaff = auth + active + STAFF/ADMIN + MFA gate (enrolment aj AAL2 výzva).
  // Middleware matcher /api vynecháva, takže autorizáciu MUSÍ spraviť route sama —
  // inline role-check by obišiel MFA (únik IČO/DIČ/splatnosť celej zákazníckej bázy).
  const user = await requireStaff();
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
        o.status, o._count.items, o.poNumber ?? "", money(o.subtotal), money(o.vat), money(o.total),
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
