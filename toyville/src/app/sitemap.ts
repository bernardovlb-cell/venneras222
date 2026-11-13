import type { MetadataRoute } from "next";
import { eq, and } from "drizzle-orm";
import { db } from "@/server/db/client";
import { categories, pages, products } from "@/server/db/schema";
import { env } from "@/server/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.appUrl;
  const [prods, cats, pgs] = await Promise.all([
    db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(and(eq(products.status, "active"), eq(products.isDemo, false))),
    db.select({ slug: categories.slug }).from(categories).where(and(eq(categories.isActive, true), eq(categories.isDemo, false))),
    db.select({ slug: pages.slug, updatedAt: pages.updatedAt }).from(pages).where(eq(pages.status, "published")),
  ]);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/ofertas`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/presentes`, changeFrequency: "weekly", priority: 0.7 },
    ...cats.map((c) => ({ url: `${base}/c/${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...prods.map((p) => ({ url: `${base}/produto/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...pgs.map((p) => ({ url: `${base}/p/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
}
