import "server-only";
import Papa from "papaparse";
import { inArray, sql } from "drizzle-orm";
import { db, type DbOrTx } from "../db/client";
import { brands, categories, productVariants, products } from "../db/schema";
import { AppError } from "../errors";
import { audit } from "../audit";
import { moveStock, setStockOnHand } from "./inventory";
import { parseImportRows, type ImportIssue, type ImportRow, type ParsedProduct } from "@/lib/product-import";
import { slugify } from "@/lib/slug";

const MAX_ROWS = 5000;

/** Lê CSV (vírgula ou ponto e vírgula, UTF-8) ou XLSX (primeira planilha). */
export async function readSpreadsheet(file: File): Promise<ImportRow[]> {
  if (file.size > 5 * 1024 * 1024) throw new AppError("too_large", "Arquivo maior que 5 MB.");
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer() as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new AppError("empty", "Planilha vazia.");
    const header: string[] = [];
    ws.getRow(1).eachCell({ includeEmpty: true }, (c, col) => { header[col] = String(c.text ?? "").trim(); });
    const rows: ImportRow[] = [];
    ws.eachRow((row, n) => {
      if (n === 1) return;
      const r: ImportRow = {};
      header.forEach((h, col) => { if (h) r[h] = String(row.getCell(col).text ?? "").trim(); });
      rows.push(r);
    });
    return rows.slice(0, MAX_ROWS + 1);
  }
  if (name.endsWith(".csv") || file.type.includes("csv") || file.type === "text/plain") {
    let text = await file.text();
    text = text.replace(/^﻿/, "");
    const parsed = Papa.parse<ImportRow>(text, { header: true, skipEmptyLines: "greedy", delimitersToGuess: [",", ";", "\t"] });
    return parsed.data.slice(0, MAX_ROWS + 1);
  }
  throw new AppError("format", "Formato não suportado. Envie .csv ou .xlsx.");
}

export interface ImportPlan {
  products: (ParsedProduct & { action: "create" | "update"; existingId: string | null })[];
  issues: ImportIssue[];
  summary: { create: number; update: number; variants: number; errors: number };
}

export async function planImport(rows: ImportRow[], tx: DbOrTx = db): Promise<ImportPlan> {
  if (rows.length > MAX_ROWS) throw new AppError("too_many", `Máximo de ${MAX_ROWS} linhas por importação.`);
  const { products: parsed, issues } = parseImportRows(rows);
  const cats = await tx.select({ id: categories.id, slug: categories.slug }).from(categories);
  const catSlugs = new Set(cats.map((c) => c.slug));
  for (const p of parsed) {
    if (p.categorySlug && !catSlugs.has(p.categorySlug)) issues.push({ row: p.row, field: "categoria", message: `categoria "${p.categorySlug}" não existe (cadastre-a antes)` });
  }
  const skus = parsed.map((p) => p.sku);
  const existing = skus.length ? await tx.select({ id: products.id, sku: products.sku, slug: products.slug }).from(products).where(inArray(sql`upper(${products.sku})`, skus.map((s) => s.toUpperCase()))) : [];
  const exBy = new Map(existing.map((e) => [e.sku.toUpperCase(), e]));
  // SKUs de variação usados por OUTRO produto
  const vSkus = parsed.flatMap((p) => p.variants.map((v) => v.sku.toUpperCase()));
  const vRows = vSkus.length ? await tx.select({ sku: productVariants.sku, productId: productVariants.productId }).from(productVariants).where(inArray(sql`upper(${productVariants.sku})`, vSkus)) : [];
  const slugRows = await tx.select({ slug: products.slug, sku: products.sku }).from(products).where(inArray(products.slug, parsed.map((p) => p.slug)));
  for (const p of parsed) {
    const ex = exBy.get(p.sku.toUpperCase());
    for (const v of p.variants) {
      const owner = vRows.find((r) => r.sku.toUpperCase() === v.sku.toUpperCase());
      if (owner && owner.productId !== ex?.id) issues.push({ row: v.row, field: "variacao_sku", message: `SKU "${v.sku}" já pertence a outro produto` });
    }
    const slugOwner = slugRows.find((r) => r.slug === p.slug);
    if (slugOwner && slugOwner.sku.toUpperCase() !== p.sku.toUpperCase()) issues.push({ row: p.row, field: "slug", message: `URL "${p.slug}" já usada por outro produto` });
  }
  const plan = parsed.map((p) => ({ ...p, action: exBy.has(p.sku.toUpperCase()) ? ("update" as const) : ("create" as const), existingId: exBy.get(p.sku.toUpperCase())?.id ?? null }));
  return {
    products: plan, issues: issues.sort((a, b) => a.row - b.row),
    summary: { create: plan.filter((p) => p.action === "create").length, update: plan.filter((p) => p.action === "update").length, variants: plan.reduce((s, p) => s + p.variants.length, 0), errors: issues.length },
  };
}

/**
 * Executa a importação em UMA transação: com qualquer erro, nada é gravado.
 * Atualização segura: campos vazios na planilha não apagam dados existentes; estoque vazio não altera.
 */
export async function executeImport(rows: ImportRow[], userId: string) {
  return db.transaction(async (tx) => {
    const plan = await planImport(rows, tx);
    if (plan.issues.length) throw new AppError("has_errors", `A planilha tem ${plan.issues.length} erro(s). Corrija e envie novamente.`);
    const cats = await tx.select({ id: categories.id, slug: categories.slug }).from(categories);
    const catBy = new Map(cats.map((c) => [c.slug, c.id]));
    const brandCache = new Map<string, string>();
    async function brandId(name: string | null) {
      if (!name) return null;
      const slug = slugify(name);
      if (brandCache.has(slug)) return brandCache.get(slug)!;
      const [b] = await tx.insert(brands).values({ name, slug }).onConflictDoUpdate({ target: brands.slug, set: { slug } }).returning({ id: brands.id });
      brandCache.set(slug, b.id);
      return b.id;
    }
    for (const p of plan.products) {
      const base = {
        name: p.name, slug: p.slug, categoryId: p.categorySlug ? catBy.get(p.categorySlug)! : undefined, brandId: (await brandId(p.brandName)) ?? undefined,
        manufacturer: p.manufacturer ?? undefined, shortDescription: p.shortDescription ?? undefined, description: p.description ?? undefined,
        minAgeMonths: p.minAgeMonths ?? undefined, maxAgeMonths: p.maxAgeMonths ?? undefined, gtin: p.gtin ?? undefined, safetyInfo: p.safetyInfo ?? undefined,
        certifications: p.certifications ?? undefined, weightGrams: p.weightGrams ?? undefined, lengthCm: p.lengthCm ?? undefined, widthCm: p.widthCm ?? undefined, heightCm: p.heightCm ?? undefined,
        updatedAt: new Date(),
      };
      let productId = p.existingId;
      if (productId) {
        await tx.update(products).set({ ...base, ...(p.status ? { status: p.status } : {}), ...(p.status === "active" ? { publishedAt: new Date() } : {}) }).where(sql`${products.id} = ${productId}`);
      } else {
        const [row] = await tx.insert(products).values({ ...base, sku: p.sku, status: p.status ?? "draft", publishedAt: p.status === "active" ? new Date() : null }).returning({ id: products.id });
        productId = row.id;
      }
      let pos = 0;
      for (const v of p.variants) {
        const ex = (await tx.select().from(productVariants).where(sql`upper(${productVariants.sku}) = upper(${v.sku})`).limit(1))[0];
        const vals = { name: v.name, options: v.options, priceCents: v.priceCents, salePriceCents: v.salePriceCents, weightGrams: v.weightGrams ?? undefined, position: pos++, isActive: true, updatedAt: new Date() };
        if (ex) {
          await tx.update(productVariants).set(vals).where(sql`${productVariants.id} = ${ex.id}`);
          if (v.stock != null && v.stock !== ex.stockOnHand) await setStockOnHand(tx, ex.id, v.stock, userId, "importação de planilha", "import");
        } else {
          const [nv] = await tx.insert(productVariants).values({ ...vals, productId, sku: v.sku, stockOnHand: 0 }).returning({ id: productVariants.id });
          if (v.stock) await moveStock(tx, { variantId: nv.id, deltaOnHand: v.stock, reason: "import", userId, note: "importação de planilha" });
        }
      }
    }
    await audit({ userId, action: "product.import", entity: "product", data: plan.summary }, tx);
    return plan.summary;
  });
}
