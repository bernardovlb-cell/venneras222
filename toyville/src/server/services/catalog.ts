import "server-only";
import { and, desc, eq, gt, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import { banners, brands, categories, homeSections, orderItems, orders, productImages, productVariants, products, reviews } from "../db/schema";
import { categoryDescendants, categoryLineage, getActivePromotions, getCategories, type CategoryNode } from "./promotions";
import { resolveUnitPrice, type PromotionInput } from "@/lib/pricing";
import { ageBand, ageOverlaps } from "@/lib/age";
import { normalizeText } from "@/lib/slug";

export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  brandName: string | null;
  imageUrl: string | null;
  imageAlt: string;
  priceCents: number; // menor preço efetivo entre variações disponíveis (ou todas, se esgotado)
  listPriceCents: number;
  promotionLabel: string | null;
  promotionEndsAt: Date | null;
  inStock: boolean;
  variantCount: number;
  defaultVariantId: string | null; // só quando há 1 variação (permite "adicionar" direto do card)
  minAgeMonths: number | null;
  maxAgeMonths: number | null;
  ratingAvg: number | null;
  ratingCount: number;
  createdAt: Date;
  salesCount: number;
  relevance: number;
  categoryId: string | null;
  brandId: string | null;
  isDemo: boolean;
}

export type SortKey = "relevance" | "price_asc" | "price_desc" | "newest" | "best_sellers" | "discount" | "rating";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "Relevância" },
  { key: "best_sellers", label: "Mais vendidos" },
  { key: "newest", label: "Novidades" },
  { key: "price_asc", label: "Menor preço" },
  { key: "price_desc", label: "Maior preço" },
  { key: "discount", label: "Maior desconto" },
  { key: "rating", label: "Mais bem avaliados" },
];

export interface ListFilters {
  q?: string;
  categoryId?: string;
  ageBand?: string;
  brandIds?: string[];
  priceMinCents?: number;
  priceMaxCents?: number;
  inStock?: boolean;
  onSale?: boolean;
  productIds?: string[];
  excludeProductId?: string;
  sort?: SortKey;
  page?: number;
  perPage?: number;
}

function searchConditions(q: string): { where: SQL; score: SQL } {
  const n = normalizeText(q).slice(0, 80);
  const like = `%${n.replace(/[%_\\]/g, (m) => "\\" + m)}%`;
  const prefix = `${n.replace(/[%_\\]/g, (m) => "\\" + m)}%`;
  const where = sql`(
    tv_norm(${products.name}) like ${like}
    or tv_norm(coalesce(${brands.name}, '')) like ${like}
    or tv_norm(coalesce(${products.shortDescription}, '') || ' ' || coalesce(${products.description}, '')) like ${like}
    or ${products.sku} ilike ${like}
    or word_similarity(${n}, tv_norm(${products.name})) >= 0.45
    or word_similarity(${n}, tv_norm(coalesce(${brands.name}, ''))) >= 0.6
  )`;
  const score = sql`(
    case when tv_norm(${products.name}) like ${prefix} then 100 else 0 end
    + case when tv_norm(${products.name}) like ${like} then 60 else 0 end
    + word_similarity(${n}, tv_norm(${products.name})) * 50
    + case when tv_norm(coalesce(${brands.name}, '')) like ${like} then 30 else 0 end
    + case when tv_norm(coalesce(${products.shortDescription}, '') || ' ' || coalesce(${products.description}, '')) like ${like} then 10 else 0 end
  )`;
  return { where, score };
}

/**
 * Carrega cards de produtos ativos. Filtros estruturais rodam no SQL; preço efetivo (que depende de
 * promoções vigentes) é resolvido em memória pelo MESMO motor usado no checkout.
 * Adequado para catálogos de alguns milhares de produtos (ver docs/ARQUITETURA.md).
 */
export async function listProducts(f: ListFilters): Promise<{ items: ProductCard[]; total: number; page: number; pages: number }> {
  const cats = await getCategories();
  const promos = await getActivePromotions();
  const now = new Date();
  const conds: SQL[] = [eq(products.status, "active")];
  if (f.categoryId) conds.push(inArray(products.categoryId, categoryDescendants(cats, f.categoryId)));
  if (f.brandIds?.length) conds.push(inArray(products.brandId, f.brandIds));
  if (f.productIds) conds.push(f.productIds.length ? inArray(products.id, f.productIds) : sql`false`);
  if (f.excludeProductId) conds.push(sql`${products.id} <> ${f.excludeProductId}`);
  const band = ageBand(f.ageBand);
  if (band) conds.push(sql`coalesce(${products.minAgeMonths}, 0) < ${band.max} and coalesce(${products.maxAgeMonths}, 1200) >= ${band.min}`);
  let score: SQL = sql`0`;
  if (f.q && f.q.trim()) {
    const s = searchConditions(f.q.trim());
    conds.push(s.where);
    score = s.score;
  }

  const rows = await db
    .select({
      id: products.id, slug: products.slug, name: products.name, brandName: brands.name, brandId: products.brandId,
      categoryId: products.categoryId, minAge: products.minAgeMonths, maxAge: products.maxAgeMonths,
      createdAt: products.createdAt, isDemo: products.isDemo, relevance: sql<number>`${score}`.as("relevance"),
    })
    .from(products)
    .leftJoin(brands, eq(brands.id, products.brandId))
    .where(and(...conds))
    .limit(5000);

  const cards = await hydrateCards(rows, cats, promos, now);
  let items = cards;
  if (f.inStock) items = items.filter((c) => c.inStock);
  if (f.onSale) items = items.filter((c) => c.priceCents < c.listPriceCents);
  if (f.priceMinCents != null) items = items.filter((c) => c.priceCents >= f.priceMinCents!);
  if (f.priceMaxCents != null) items = items.filter((c) => c.priceCents <= f.priceMaxCents!);
  if (band) items = items.filter((c) => ageOverlaps(c.minAgeMonths, c.maxAgeMonths, band.min, band.max));

  const sort = f.sort ?? (f.q ? "relevance" : "best_sellers");
  const byStock = (a: ProductCard, b: ProductCard) => Number(b.inStock) - Number(a.inStock);
  const cmp: Record<SortKey, (a: ProductCard, b: ProductCard) => number> = {
    relevance: (a, b) => byStock(a, b) || b.relevance - a.relevance || b.salesCount - a.salesCount,
    price_asc: (a, b) => byStock(a, b) || a.priceCents - b.priceCents,
    price_desc: (a, b) => byStock(a, b) || b.priceCents - a.priceCents,
    newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    best_sellers: (a, b) => byStock(a, b) || b.salesCount - a.salesCount || b.createdAt.getTime() - a.createdAt.getTime(),
    discount: (a, b) => (b.listPriceCents - b.priceCents) / b.listPriceCents - (a.listPriceCents - a.priceCents) / a.listPriceCents,
    rating: (a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0) || b.ratingCount - a.ratingCount,
  };
  items.sort(cmp[sort]);
  const perPage = Math.min(Math.max(f.perPage ?? 24, 1), 60);
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const page = Math.min(Math.max(f.page ?? 1, 1), pages);
  return { items: items.slice((page - 1) * perPage, page * perPage), total: items.length, page, pages };
}

async function hydrateCards(
  rows: { id: string; slug: string; name: string; brandName: string | null; brandId: string | null; categoryId: string | null; minAge: number | null; maxAge: number | null; createdAt: Date; isDemo: boolean; relevance: number }[],
  cats: CategoryNode[], promos: PromotionInput[], now: Date,
): Promise<ProductCard[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [vars, imgs, rats, sales] = await Promise.all([
    db.select().from(productVariants).where(and(inArray(productVariants.productId, ids), eq(productVariants.isActive, true))).orderBy(productVariants.position),
    db.selectDistinctOn([productImages.productId], { productId: productImages.productId, url: productImages.url, thumbUrl: productImages.thumbUrl, alt: productImages.alt })
      .from(productImages).where(inArray(productImages.productId, ids)).orderBy(productImages.productId, productImages.position),
    db.select({ productId: reviews.productId, avg: sql<number>`avg(${reviews.rating})::float`, n: sql<number>`count(*)::int` })
      .from(reviews).where(and(inArray(reviews.productId, ids), eq(reviews.status, "approved"))).groupBy(reviews.productId),
    db.select({ productId: orderItems.productId, n: sql<number>`sum(${orderItems.quantity})::int` })
      .from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(inArray(orderItems.productId, ids), inArray(orders.status, ["paid", "completed"]), sql`${orders.createdAt} > now() - interval '120 days'`))
      .groupBy(orderItems.productId),
  ]);
  const vBy = new Map<string, typeof vars>();
  for (const v of vars) (vBy.get(v.productId) ?? vBy.set(v.productId, []).get(v.productId)!).push(v);
  const imgBy = new Map(imgs.map((i) => [i.productId, i]));
  const ratBy = new Map(rats.map((r) => [r.productId, r]));
  const salesBy = new Map(sales.map((s) => [s.productId!, s.n]));

  const out: ProductCard[] = [];
  for (const r of rows) {
    const vs = vBy.get(r.id) ?? [];
    if (!vs.length) continue; // produto sem variação ativa não é vendável
    const lineage = categoryLineage(cats, r.categoryId);
    const priced = vs.map((v) => ({
      v,
      available: v.stockOnHand - v.stockReserved,
      price: resolveUnitPrice({ productId: r.id, brandId: r.brandId, categoryIds: lineage, priceCents: v.priceCents, salePriceCents: v.salePriceCents, saleStartsAt: v.saleStartsAt, saleEndsAt: v.saleEndsAt }, promos, now),
    }));
    const inStockVars = priced.filter((p) => p.available > 0);
    const pool = inStockVars.length ? inStockVars : priced;
    const best = pool.reduce((a, b) => (b.price.unitCents < a.price.unitCents ? b : a));
    const img = imgBy.get(r.id);
    const rat = ratBy.get(r.id);
    out.push({
      id: r.id, slug: r.slug, name: r.name, brandName: r.brandName, brandId: r.brandId, categoryId: r.categoryId,
      imageUrl: img?.thumbUrl ?? img?.url ?? null, imageAlt: img?.alt ?? r.name,
      priceCents: best.price.unitCents, listPriceCents: best.v.priceCents,
      promotionLabel: best.price.source === "list" ? null : best.price.label, promotionEndsAt: best.price.endsAt,
      inStock: inStockVars.length > 0, variantCount: vs.length, defaultVariantId: vs.length === 1 ? vs[0].id : null,
      minAgeMonths: r.minAge, maxAgeMonths: r.maxAge,
      ratingAvg: rat ? Math.round(rat.avg * 10) / 10 : null, ratingCount: rat?.n ?? 0,
      createdAt: r.createdAt, salesCount: salesBy.get(r.id) ?? 0, relevance: Number(r.relevance) || 0, isDemo: r.isDemo,
    });
  }
  return out;
}

export async function searchSuggestions(q: string) {
  const term = q.trim();
  if (term.length < 2) return { products: [], categories: [], brands: [] };
  const { items } = await listProducts({ q: term, perPage: 6, sort: "relevance" });
  const n = normalizeText(term);
  const cats = (await getCategories()).filter((c) => c.isActive && normalizeText(c.name).includes(n)).slice(0, 4);
  const brs = await db.select({ id: brands.id, name: brands.name, slug: brands.slug }).from(brands)
    .where(and(eq(brands.isActive, true), sql`tv_norm(${brands.name}) like ${"%" + n + "%"} or word_similarity(${n}, tv_norm(${brands.name})) >= 0.6`)).limit(4);
  return {
    products: items.map((i) => ({ slug: i.slug, name: i.name, imageUrl: i.imageUrl, priceCents: i.priceCents, brandName: i.brandName })),
    categories: cats.map((c) => ({ slug: c.slug, name: c.name })),
    brands: brs,
  };
}

export async function getFacetBrands() {
  return db.select({ id: brands.id, name: brands.name, slug: brands.slug }).from(brands)
    .where(and(eq(brands.isActive, true), sql`exists (select 1 from products p where p.brand_id = ${brands.id} and p.status = 'active')`))
    .orderBy(brands.name);
}

export async function getProductBySlug(slug: string) {
  const p = (await db.select().from(products).where(eq(products.slug, slug)).limit(1))[0];
  if (!p || p.status !== "active") return null;
  const cats = await getCategories();
  const promos = await getActivePromotions();
  const now = new Date();
  const [vars, imgs, brand, revs, summary] = await Promise.all([
    db.select().from(productVariants).where(and(eq(productVariants.productId, p.id), eq(productVariants.isActive, true))).orderBy(productVariants.position),
    db.select().from(productImages).where(eq(productImages.productId, p.id)).orderBy(productImages.position),
    p.brandId ? db.select().from(brands).where(eq(brands.id, p.brandId)).limit(1).then((r) => r[0] ?? null) : Promise.resolve(null),
    db.select({ id: reviews.id, authorName: reviews.authorName, rating: reviews.rating, title: reviews.title, body: reviews.body, verifiedPurchase: reviews.verifiedPurchase, createdAt: reviews.createdAt, isDemo: reviews.isDemo })
      .from(reviews).where(and(eq(reviews.productId, p.id), eq(reviews.status, "approved"))).orderBy(desc(reviews.createdAt)).limit(30),
    db.select({ avg: sql<number>`avg(${reviews.rating})::float`, n: sql<number>`count(*)::int` }).from(reviews).where(and(eq(reviews.productId, p.id), eq(reviews.status, "approved"))),
  ]);
  if (!vars.length) return null;
  const lineage = categoryLineage(cats, p.categoryId);
  const variants = vars.map((v) => {
    const price = resolveUnitPrice({ productId: p.id, brandId: p.brandId, categoryIds: lineage, priceCents: v.priceCents, salePriceCents: v.salePriceCents, saleStartsAt: v.saleStartsAt, saleEndsAt: v.saleEndsAt }, promos, now);
    return {
      id: v.id, sku: v.sku, name: v.name, options: v.options, imageId: v.imageId,
      listPriceCents: v.priceCents, priceCents: price.unitCents, promotionLabel: price.source === "list" ? null : price.label,
      promotionEndsAt: price.endsAt?.toISOString() ?? null, available: Math.max(0, v.stockOnHand - v.stockReserved),
    };
  });
  const byId = new Map(cats.map((c) => [c.id, c]));
  const breadcrumb = lineage.slice().reverse().map((id) => byId.get(id)!).filter(Boolean).map((c) => ({ name: c.name, slug: c.slug }));
  return {
    product: p, brand, variants, images: imgs, breadcrumb, reviews: revs,
    rating: summary[0]?.n ? { avg: Math.round(summary[0].avg * 10) / 10, count: summary[0].n } : null,
  };
}

export async function getRelatedProducts(productId: string, categoryId: string | null, limit = 8) {
  if (!categoryId) return [];
  const { items } = await listProducts({ categoryId, excludeProductId: productId, perPage: limit, inStock: true });
  return items;
}

export async function getCategoryBySlug(slug: string) {
  const cats = await getCategories();
  const c = cats.find((x) => x.slug === slug && x.isActive);
  if (!c) return null;
  const children = cats.filter((x) => x.parentId === c.id && x.isActive);
  const byId = new Map(cats.map((x) => [x.id, x]));
  const breadcrumb = categoryLineage(cats, c.id).reverse().map((id) => byId.get(id)!).map((x) => ({ name: x.name, slug: x.slug }));
  return { category: c, children, breadcrumb };
}

export async function getNavCategories() {
  const cats = (await getCategories()).filter((c) => c.isActive);
  const roots = cats.filter((c) => !c.parentId);
  return roots.map((r) => ({ ...r, children: cats.filter((c) => c.parentId === r.id) }));
}

export async function getHomeData() {
  const now = new Date();
  const [sections, activeBanners] = await Promise.all([
    db.select().from(homeSections).where(eq(homeSections.isActive, true)).orderBy(homeSections.position),
    db.select().from(banners).where(and(
      eq(banners.isActive, true),
      or(isNull(banners.startsAt), lte(banners.startsAt, now)),
      or(isNull(banners.endsAt), gt(banners.endsAt, now)),
    )).orderBy(banners.position),
  ]);
  return { sections, banners: activeBanners };
}

export async function getFeaturedCategories() {
  const cats = (await getCategories()).filter((c) => c.isActive);
  const featured = cats.filter((c) => c.isFeatured);
  return (featured.length ? featured : cats.filter((c) => !c.parentId)).slice(0, 12);
}

export async function activeProductSlugs() {
  return db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.status, "active"));
}

export async function allActiveCategories() {
  return db.select({ slug: categories.slug }).from(categories).where(eq(categories.isActive, true));
}
