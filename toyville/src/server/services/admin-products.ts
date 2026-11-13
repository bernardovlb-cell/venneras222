import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { brands, categories, orderItems, productImages, productVariants, products } from "../db/schema";
import { AppError, isUniqueViolation } from "../errors";
import { audit } from "../audit";
import { storeImage, removeImage } from "../storage";
import { moveStock, setStockOnHand } from "./inventory";
import { slugify } from "@/lib/slug";
import { parseBRLToCents } from "@/lib/money";

const optInt = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(0).nullable());
const optText = (max: number) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max).nullish());

export const productSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(160),
  slug: z.string().trim().max(80).optional(),
  sku: z.string().trim().regex(/^[A-Za-z0-9._-]{1,64}$/, "Use letras, números, ponto, hífen ou sublinhado"),
  gtin: optText(20),
  shortDescription: optText(300),
  description: optText(10000),
  brandId: z.preprocess((v) => (v === "" ? null : v), z.string().uuid().nullable()),
  manufacturer: optText(120),
  categoryId: z.preprocess((v) => (v === "" ? null : v), z.string().uuid().nullable()),
  minAgeMonths: optInt,
  maxAgeMonths: optInt,
  status: z.enum(["draft", "active", "archived"]),
  safetyInfo: optText(2000),
  certifications: optText(500),
  weightGrams: optInt,
  lengthCm: optInt,
  widthCm: optInt,
  heightCm: optInt,
  seoTitle: optText(70),
  seoDescription: optText(170),
}).refine((d) => d.minAgeMonths == null || d.maxAgeMonths == null || d.minAgeMonths <= d.maxAgeMonths, { message: "Idade máxima menor que a mínima", path: ["maxAgeMonths"] });

export async function saveProduct(input: unknown, userId: string, id?: string) {
  const d = productSchema.parse(input);
  const slug = slugify(d.slug || d.name);
  if (!slug) throw new AppError("slug", "URL inválida", 400, "slug");
  const values = { ...d, slug, updatedAt: new Date(), publishedAt: d.status === "active" ? new Date() : undefined };
  try {
    if (id) {
      const before = (await db.select().from(products).where(eq(products.id, id)))[0];
      if (!before) throw new AppError("not_found", "Produto não encontrado", 404);
      if (d.status === "active") {
        const v = await db.select({ id: productVariants.id }).from(productVariants).where(and(eq(productVariants.productId, id), eq(productVariants.isActive, true))).limit(1);
        if (!v.length) throw new AppError("no_variant", "Cadastre ao menos uma variação ativa com preço antes de publicar.", 400, "status");
      }
      await db.update(products).set({ ...values, publishedAt: d.status === "active" ? before.publishedAt ?? new Date() : before.publishedAt }).where(eq(products.id, id));
      await audit({ userId, action: "product.update", entity: "product", entityId: id, data: { status: d.status, name: d.name } });
      return id;
    }
    const [p] = await db.insert(products).values({ ...values, status: "draft" }).returning({ id: products.id });
    await audit({ userId, action: "product.create", entity: "product", entityId: p.id, data: { name: d.name } });
    return p.id;
  } catch (e) {
    if (isUniqueViolation(e, "products_slug_uq")) throw new AppError("slug", "Já existe um produto com esta URL.", 400, "slug");
    if (isUniqueViolation(e, "products_sku_uq")) throw new AppError("sku", "Já existe um produto com este SKU.", 400, "sku");
    throw e;
  }
}

export const variantSchema = z.object({
  sku: z.string().trim().regex(/^[A-Za-z0-9._-]{1,64}$/, "SKU inválido"),
  name: z.string().trim().min(1).max(80),
  options: z.string().max(300).optional(), // "Cor=Azul;Tamanho=M"
  price: z.string(),
  salePrice: z.string().optional(),
  saleStartsAt: z.string().optional(),
  saleEndsAt: z.string().optional(),
  stock: z.string().optional(),
  weightGrams: optInt.optional(),
  imageId: z.preprocess((v) => (v === "" ? null : v), z.string().uuid().nullable()).optional(),
  isActive: z.boolean(),
  position: z.coerce.number().int().min(0).max(999).default(0),
});

function parseOptions(s: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of (s ?? "").split(";")) {
    const [k, v] = pair.split("=").map((x) => x?.trim());
    if (k && v) out[k.slice(0, 30)] = v.slice(0, 40);
  }
  return out;
}

function parseLocalDate(s?: string): Date | null {
  if (!s) return null;
  // <input type="datetime-local"> sem fuso: interpretado no fuso de Brasília
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function saveVariant(productId: string, input: unknown, userId: string, variantId?: string) {
  const d = variantSchema.parse(input);
  const price = parseBRLToCents(d.price);
  if (!price || price <= 0) throw new AppError("price", "Preço inválido", 400, "price");
  const sale = d.salePrice ? parseBRLToCents(d.salePrice) : null;
  if (d.salePrice && (sale == null || sale <= 0)) throw new AppError("sale", "Preço promocional inválido", 400, "salePrice");
  if (sale != null && sale >= price) throw new AppError("sale", "O preço promocional deve ser menor que o preço normal", 400, "salePrice");
  const saleStartsAt = parseLocalDate(d.saleStartsAt), saleEndsAt = parseLocalDate(d.saleEndsAt);
  if (saleStartsAt && saleEndsAt && saleEndsAt <= saleStartsAt) throw new AppError("dates", "Fim da promoção antes do início", 400, "saleEndsAt");
  const values = {
    sku: d.sku, name: d.name, options: parseOptions(d.options), priceCents: price, salePriceCents: sale, saleStartsAt, saleEndsAt,
    weightGrams: d.weightGrams ?? null, imageId: d.imageId ?? null, isActive: d.isActive, position: d.position, updatedAt: new Date(),
  };
  try {
    return await db.transaction(async (tx) => {
      if (variantId) {
        const r = await tx.update(productVariants).set(values).where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId))).returning({ id: productVariants.id });
        if (!r.length) throw new AppError("not_found", "Variação não encontrada", 404);
        if (d.stock != null && d.stock !== "") await setStockOnHand(tx, variantId, Number(d.stock), userId, "ajuste no cadastro");
        await audit({ userId, action: "variant.update", entity: "variant", entityId: variantId, data: { sku: d.sku, priceCents: price, salePriceCents: sale } }, tx);
        return variantId;
      }
      const [v] = await tx.insert(productVariants).values({ ...values, productId, stockOnHand: 0 }).returning({ id: productVariants.id });
      const stock = d.stock ? Number(d.stock) : 0;
      if (!Number.isInteger(stock) || stock < 0) throw new AppError("stock", "Estoque inválido", 400, "stock");
      if (stock > 0) await moveStock(tx, { variantId: v.id, deltaOnHand: stock, reason: "initial", userId, note: "cadastro" });
      await audit({ userId, action: "variant.create", entity: "variant", entityId: v.id, data: { sku: d.sku, productId } }, tx);
      return v.id;
    });
  } catch (e) {
    if (isUniqueViolation(e, "variants_sku_uq")) throw new AppError("sku", "SKU já usado por outra variação.", 400, "sku");
    throw e;
  }
}

export async function deleteVariant(productId: string, variantId: string, userId: string) {
  const used = await db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.variantId, variantId)).limit(1);
  const v = (await db.select().from(productVariants).where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId))))[0];
  if (!v) throw new AppError("not_found", "Variação não encontrada", 404);
  if (v.stockReserved > 0) throw new AppError("reserved", "Há unidades reservadas em pedidos aguardando pagamento.");
  if (used.length) {
    await db.update(productVariants).set({ isActive: false, updatedAt: new Date() }).where(eq(productVariants.id, variantId));
    await audit({ userId, action: "variant.deactivate", entity: "variant", entityId: variantId });
    return "deactivated" as const;
  }
  await db.delete(productVariants).where(eq(productVariants.id, variantId));
  await audit({ userId, action: "variant.delete", entity: "variant", entityId: variantId, data: { sku: v.sku } });
  return "deleted" as const;
}

export async function adjustStock(variantId: string, newOnHand: number, note: string, userId: string) {
  await db.transaction((tx) => setStockOnHand(tx, variantId, newOnHand, userId, note || "ajuste manual"));
  await audit({ userId, action: "stock.adjust", entity: "variant", entityId: variantId, data: { newOnHand, note } });
}

export async function uploadImages(productId: string, files: File[], userId: string) {
  const exists = (await db.select({ id: products.id }).from(products).where(eq(products.id, productId)))[0];
  if (!exists) throw new AppError("not_found", "Produto não encontrado", 404);
  const valid = files.filter((f) => f && f.size > 0).slice(0, 20);
  if (!valid.length) throw new AppError("no_files", "Selecione ao menos uma imagem.");
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${productImages.position}), -1)::int` }).from(productImages).where(eq(productImages.productId, productId));
  const errors: string[] = [];
  let pos = max + 1, ok = 0;
  for (const f of valid) {
    try {
      const img = await storeImage(f, `produtos/${productId}`);
      await db.insert(productImages).values({ productId, ...img, alt: null, position: pos++ });
      ok++;
    } catch (e) {
      errors.push(e instanceof AppError ? e.message : `Falha em "${f.name}"`);
    }
  }
  await audit({ userId, action: "image.upload", entity: "product", entityId: productId, data: { count: ok } });
  return { ok, errors };
}

export async function reorderImage(productId: string, imageId: string, dir: "up" | "down" | "first", userId: string) {
  const list = await db.select().from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.position), asc(productImages.createdAt));
  const i = list.findIndex((x) => x.id === imageId);
  if (i < 0) throw new AppError("not_found", "Imagem não encontrada", 404);
  const [item] = list.splice(i, 1);
  const to = dir === "first" ? 0 : dir === "up" ? Math.max(0, i - 1) : Math.min(list.length, i + 1);
  list.splice(to, 0, item);
  await db.transaction(async (tx) => {
    for (let k = 0; k < list.length; k++) await tx.update(productImages).set({ position: k }).where(eq(productImages.id, list[k].id));
  });
  await audit({ userId, action: "image.reorder", entity: "product", entityId: productId });
}

export async function updateImageAlt(productId: string, imageId: string, alt: string) {
  await db.update(productImages).set({ alt: alt.trim().slice(0, 200) || null }).where(and(eq(productImages.id, imageId), eq(productImages.productId, productId)));
}

export async function replaceImage(productId: string, imageId: string, file: File, userId: string) {
  const old = (await db.select().from(productImages).where(and(eq(productImages.id, imageId), eq(productImages.productId, productId))))[0];
  if (!old) throw new AppError("not_found", "Imagem não encontrada", 404);
  const img = await storeImage(file, `produtos/${productId}`);
  await db.update(productImages).set({ ...img }).where(eq(productImages.id, imageId));
  await removeImage(old.storageKey);
  await audit({ userId, action: "image.replace", entity: "product", entityId: productId });
}

export async function deleteImage(productId: string, imageId: string, userId: string) {
  const [img] = await db.delete(productImages).where(and(eq(productImages.id, imageId), eq(productImages.productId, productId))).returning();
  if (img) await removeImage(img.storageKey);
  await audit({ userId, action: "image.delete", entity: "product", entityId: productId });
}

export async function deleteOrArchiveProduct(productId: string, userId: string) {
  const sold = await db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.productId, productId)).limit(1);
  const reserved = await db.select({ id: productVariants.id }).from(productVariants).where(and(eq(productVariants.productId, productId), sql`${productVariants.stockReserved} > 0`)).limit(1);
  if (reserved.length) throw new AppError("reserved", "Há unidades reservadas em pedidos aguardando pagamento.");
  if (sold.length) {
    await db.update(products).set({ status: "archived", updatedAt: new Date() }).where(eq(products.id, productId));
    await audit({ userId, action: "product.archive", entity: "product", entityId: productId });
    return "archived" as const;
  }
  const imgs = await db.select({ key: productImages.storageKey }).from(productImages).where(eq(productImages.productId, productId));
  await db.delete(products).where(eq(products.id, productId));
  for (const i of imgs) await removeImage(i.key);
  await audit({ userId, action: "product.delete", entity: "product", entityId: productId });
  return "deleted" as const;
}

/* ---------------- categorias e marcas ---------------- */
export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(80).optional(),
  parentId: z.preprocess((v) => (v === "" ? null : v), z.string().uuid().nullable()),
  description: optText(300),
  position: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
});

/**
 * Cria/edita categoria. `image`: URL da foto já processada (`storeImage`), `null` para remover,
 * ausente para manter a atual.
 */
export async function saveCategory(input: unknown, userId: string, id?: string, image?: { imageUrl: string | null }) {
  const d = { ...categorySchema.parse(input), ...(image ?? {}) };
  const slug = slugify(d.slug || d.name);
  if (id && d.parentId) {
    // impede ciclos (categoria dentro de si mesma ou de uma descendente)
    const all = await db.select({ id: categories.id, parentId: categories.parentId }).from(categories);
    let cur: string | null = d.parentId;
    for (let i = 0; cur && i < 50; i++) {
      if (cur === id) throw new AppError("cycle", "Uma categoria não pode ficar dentro dela mesma.", 400, "parentId");
      cur = all.find((c) => c.id === cur)?.parentId ?? null;
    }
  }
  try {
    if (id) await db.update(categories).set({ ...d, slug }).where(eq(categories.id, id));
    else await db.insert(categories).values({ ...d, slug });
  } catch (e) {
    if (isUniqueViolation(e, "categories_slug_uq")) throw new AppError("slug", "Já existe uma categoria com esta URL.", 400, "slug");
    throw e;
  }
  await audit({ userId, action: id ? "category.update" : "category.create", entity: "category", entityId: id ?? slug });
}

export async function deleteCategory(id: string, userId: string) {
  const child = await db.select({ id: categories.id }).from(categories).where(eq(categories.parentId, id)).limit(1);
  if (child.length) throw new AppError("has_children", "Remova ou mova as subcategorias primeiro.");
  const prod = await db.select({ id: products.id }).from(products).where(eq(products.categoryId, id)).limit(1);
  if (prod.length) throw new AppError("has_products", "Há produtos nesta categoria. Mova-os ou desative a categoria.");
  await db.delete(categories).where(eq(categories.id, id));
  await audit({ userId, action: "category.delete", entity: "category", entityId: id });
}

export async function saveBrand(name: string, isActive: boolean, userId: string, id?: string) {
  const n = name.trim();
  if (n.length < 1 || n.length > 80) throw new AppError("name", "Nome inválido", 400, "name");
  const slug = slugify(n);
  try {
    if (id) await db.update(brands).set({ name: n, slug, isActive }).where(eq(brands.id, id));
    else await db.insert(brands).values({ name: n, slug, isActive });
  } catch (e) {
    if (isUniqueViolation(e, "brands_slug_uq")) throw new AppError("dup", "Marca já cadastrada.", 400, "name");
    throw e;
  }
  await audit({ userId, action: id ? "brand.update" : "brand.create", entity: "brand", entityId: id ?? slug });
}

export async function deleteBrand(id: string, userId: string) {
  const used = await db.select({ id: products.id }).from(products).where(eq(products.brandId, id)).limit(1);
  if (used.length) throw new AppError("in_use", "Há produtos desta marca. Desative-a em vez de excluir.");
  await db.delete(brands).where(eq(brands.id, id));
  await audit({ userId, action: "brand.delete", entity: "brand", entityId: id });
}

export async function getProductForAdmin(id: string) {
  const p = (await db.select().from(products).where(eq(products.id, id)))[0];
  if (!p) return null;
  const [vars, imgs] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, id)).orderBy(asc(productVariants.position), asc(productVariants.createdAt)),
    db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.position)),
  ]);
  return { product: p, variants: vars, images: imgs };
}

export async function variantsByIds(ids: string[]) {
  return ids.length ? db.select().from(productVariants).where(inArray(productVariants.id, ids)) : [];
}
