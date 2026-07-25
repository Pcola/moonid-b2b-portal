import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const BASE = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await prisma.product.findMany({
    where: { isPublished: true, slug: { not: null } },
    select: { slug: true, updatedAt: true },
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/produkty`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/o-nas`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/kontakt`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/pomoc`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/registracia`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/ochrana-osobnych-udajov`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/cookies`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/obchodne-podmienky`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products
    .filter((p) => p.slug)
    .map((p) => ({
      url: `${BASE}/produkt/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  return [...staticRoutes, ...productRoutes];
}
