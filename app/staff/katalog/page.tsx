import { prisma } from "@/lib/prisma";
import { ReviewList } from "./review-list";

export const dynamic = "force-dynamic"; // vždy čerstvé (queue sa mení)
export const metadata = { title: "Staff · Katalóg", robots: { index: false, follow: false } };

export default async function StaffKatalogPage() {
  const items = await prisma.productSource.findMany({
    where: { matchStatus: "SUGGESTED", productId: { not: null } },
    select: {
      id: true,
      externalSku: true,
      title: true,
      imageUrl: true,
      matchScore: true,
      matchMethod: true,
      brand: true,
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          nameDisplay: true,
          isPublished: true,
          descriptionLong: true,
          category: { select: { name: true } },
          media: { where: { isPrimary: true }, take: 1, select: { storagePath: true } },
        },
      },
    },
    orderBy: [{ matchScore: "desc" }], // najpodobnejšie názvy hore; kódové kolízie (nízke %) dole
    take: 60,
  });

  const base = { matchStatus: "SUGGESTED" as const, productId: { not: null } };
  const [pendingTotal, code, name, confirmed, published, unmatched] = await Promise.all([
    prisma.productSource.count({ where: base }),
    prisma.productSource.count({ where: { ...base, matchMethod: "CODE" } }),
    prisma.productSource.count({ where: { ...base, matchMethod: "NAME" } }),
    prisma.productSource.count({ where: { matchStatus: "CONFIRMED" } }),
    prisma.product.count({ where: { isPublished: true } }),
    prisma.productSource.count({ where: { matchStatus: "SUGGESTED", productId: null } }),
  ]);

  return (
    <ReviewList
      items={items}
      stats={{ pendingTotal, code, name, confirmed, published, unmatched }}
    />
  );
}
