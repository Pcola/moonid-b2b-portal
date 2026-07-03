"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const ID = z.string().min(1).max(100);
const NAME = z.string().trim().min(2, "Zadajte názov (aspoň 2 znaky)").max(80);

/** slug z názvu (bez diakritiky, malé písmená, pomlčky) — konzistentné s app/staff/katalog/actions.ts */
function slugify(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "kategoria";
}

/** Zabezpečí unikátny slug (kategórie majú @unique slug). */
async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  let slug = base;
  for (let i = 2; i < 100; i++) {
    const hit = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === exceptId) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

function revalidate() {
  revalidatePath("/staff/kategorie");
  revalidatePath("/katalog");
  revalidatePath("/produkty");
}

/** Vytvorí kategóriu (hlavnú alebo podkategóriu ak je zadaný parentId). Strom max 2 úrovne. */
export async function createCategory(input: { name: string; parentId?: string | null }): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  const nameP = NAME.safeParse(input.name);
  if (!nameP.success) return { ok: false, error: nameP.error.issues[0]?.message ?? "Neplatný názov." };
  const parentId = input.parentId?.trim() || null;

  if (parentId) {
    if (!ID.safeParse(parentId).success) return { ok: false, error: "Neplatná nadradená kategória." };
    const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { id: true, parentId: true } });
    if (!parent) return { ok: false, error: "Nadradená kategória neexistuje." };
    if (parent.parentId) return { ok: false, error: "Podkategóriu nemožno vnoriť hlbšie (strom má 2 úrovne)." };
  }
  // poradie: na koniec v rámci súrodencov
  const last = await prisma.category.findFirst({ where: { parentId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const slug = await uniqueSlug(slugify(nameP.data));
  try {
    const cat = await prisma.category.create({ data: { name: nameP.data, slug, parentId, sortOrder: (last?.sortOrder ?? 0) + 1 } });
    await writeAudit({ userId: staff.id, action: "CATEGORY_CREATE", entity: "Category", entityId: cat.id, meta: { name: nameP.data, parentId } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "Kategória s týmto názvom už existuje." };
    throw e;
  }
  revalidate();
  return { ok: true };
}

/** Premenuje kategóriu (slug ostáva — je to trvalý identifikátor v URL a väzbách). */
export async function renameCategory(id: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  if (!ID.safeParse(id).success) return { ok: false, error: "Neplatný vstup." };
  const nameP = NAME.safeParse(name);
  if (!nameP.success) return { ok: false, error: nameP.error.issues[0]?.message ?? "Neplatný názov." };
  const exists = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return { ok: false, error: "Kategória neexistuje." };
  try {
    await prisma.category.update({ where: { id }, data: { name: nameP.data } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "Kategória s týmto názvom už existuje." };
    throw e;
  }
  await writeAudit({ userId: staff.id, action: "CATEGORY_RENAME", entity: "Category", entityId: id, meta: { name: nameP.data } });
  revalidate();
  return { ok: true };
}

/** Presunie kategóriu pod iného rodiča (alebo na hlavnú úroveň ak parentId=null).
 *  Zákaz: presunúť pod seba/svojho potomka, a presunúť kategóriu ktorá má deti pod inú (ostala by 3. úroveň). */
export async function moveCategory(id: string, parentId: string | null): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  if (!ID.safeParse(id).success) return { ok: false, error: "Neplatný vstup." };
  const target = parentId?.trim() || null;
  const cat = await prisma.category.findUnique({ where: { id }, select: { id: true, parentId: true, _count: { select: { children: true } } } });
  if (!cat) return { ok: false, error: "Kategória neexistuje." };
  if (target === id) return { ok: false, error: "Kategóriu nemožno presunúť pod seba." };

  if (target) {
    if (!ID.safeParse(target).success) return { ok: false, error: "Neplatná nadradená kategória." };
    const parent = await prisma.category.findUnique({ where: { id: target }, select: { id: true, parentId: true } });
    if (!parent) return { ok: false, error: "Nadradená kategória neexistuje." };
    if (parent.parentId) return { ok: false, error: "Cieľ je už podkategória — strom má len 2 úrovne." };
    if (cat._count.children > 0) return { ok: false, error: "Táto kategória má podkategórie — najprv ich presuňte, inak by vznikla 3. úroveň." };
  }
  await prisma.category.update({ where: { id }, data: { parentId: target } });
  await writeAudit({ userId: staff.id, action: "CATEGORY_MOVE", entity: "Category", entityId: id, meta: { parentId: target } });
  revalidate();
  return { ok: true };
}

/** Zmení poradie kategórie v rámci súrodencov (posun hore/dole výmenou sortOrder). */
export async function reorderCategory(id: string, direction: "up" | "down"): Promise<{ ok: boolean; error?: string }> {
  await requireStaff();
  if (!ID.safeParse(id).success) return { ok: false, error: "Neplatný vstup." };
  const cat = await prisma.category.findUnique({ where: { id }, select: { id: true, parentId: true, sortOrder: true } });
  if (!cat) return { ok: false, error: "Kategória neexistuje." };
  const neighbor = await prisma.category.findFirst({
    where: {
      parentId: cat.parentId,
      sortOrder: direction === "up" ? { lt: cat.sortOrder } : { gt: cat.sortOrder },
    },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
    select: { id: true, sortOrder: true },
  });
  if (!neighbor) return { ok: true }; // už na kraji
  await prisma.$transaction([
    prisma.category.update({ where: { id: cat.id }, data: { sortOrder: neighbor.sortOrder } }),
    prisma.category.update({ where: { id: neighbor.id }, data: { sortOrder: cat.sortOrder } }),
  ]);
  revalidate();
  return { ok: true };
}

/** Zmaže kategóriu. Nedovolí, ak má podkategórie alebo priradené produkty (chráni dáta). */
export async function deleteCategory(id: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  if (!ID.safeParse(id).success) return { ok: false, error: "Neplatný vstup." };
  const cat = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { children: true, products: true, subProducts: true } } },
  });
  if (!cat) return { ok: false, error: "Kategória neexistuje." };
  if (cat._count.children > 0) return { ok: false, error: "Kategória má podkategórie — najprv ich zmažte alebo presuňte." };
  const productCount = cat._count.products + cat._count.subProducts;
  if (productCount > 0) return { ok: false, error: `Kategória má priradených ${productCount} produktov — najprv ich preraďte.` };
  await prisma.category.delete({ where: { id } });
  await writeAudit({ userId: staff.id, action: "CATEGORY_DELETE", entity: "Category", entityId: id, meta: { name: cat.name } });
  revalidate();
  return { ok: true };
}
