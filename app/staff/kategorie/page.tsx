import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategoryManager } from "./category-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff · Kategórie", robots: { index: false, follow: false } };

export default async function KategoriePage() {
  await requireStaff();
  const cats = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true, _count: { select: { products: true, subProducts: true } } },
  });

  // strom: hlavná kategória → podkategórie. Počet: hlavná = produkty v kategórii; pod = produkty v podkategórii.
  const tree = cats
    .filter((c) => !c.parentId)
    .map((c) => ({
      id: c.id,
      name: c.name,
      count: c._count.products,
      children: cats
        .filter((k) => k.parentId === c.id)
        .map((k) => ({ id: k.id, name: k.name, count: k._count.subProducts })),
    }));

  return (
    <div className="max-w-[760px]">
      <div className="mb-5">
        <h2 className="text-[20px] font-normal text-ink">Kategórie</h2>
        <p className="mt-1 text-[13.5px] text-muted">
          Strom kategórií pre katalóg — hlavná kategória a jej podkategórie. Produkt zaradíte do (pod)kategórie v editore produktu.
          Kategóriu s podkategóriami alebo priradenými produktmi nemožno zmazať, kým ich nepreradíte.
        </p>
      </div>
      <CategoryManager tree={tree} />
    </div>
  );
}
