import "server-only";
import { asc } from "drizzle-orm";
import { db } from "../db/client";
import { brands, categories, products } from "../db/schema";

/** Categorias em ordem de árvore, com profundidade (para selects). */
export async function categoryOptions() {
  const all = await db.select({ id: categories.id, name: categories.name, parentId: categories.parentId, position: categories.position, isActive: categories.isActive, slug: categories.slug, isFeatured: categories.isFeatured, description: categories.description, imageUrl: categories.imageUrl })
    .from(categories).orderBy(asc(categories.position), asc(categories.name));
  const out: ((typeof all)[number] & { depth: number })[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const c of all.filter((x) => x.parentId === parent)) { out.push({ ...c, depth }); if (depth < 10) walk(c.id, depth + 1); }
  };
  walk(null, 0);
  return out;
}

export async function brandOptions() {
  return db.select({ id: brands.id, name: brands.name, isActive: brands.isActive }).from(brands).orderBy(asc(brands.name));
}

export async function productOptions() {
  return db.select({ id: products.id, name: products.name, sku: products.sku }).from(products).orderBy(asc(products.name)).limit(2000);
}
