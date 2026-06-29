import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewProductForm } from "./new-product-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff · Nový produkt", robots: { index: false, follow: false } };

export default async function NovyProduktPage() {
  await requireStaff();
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return <NewProductForm categories={categories} />;
}
