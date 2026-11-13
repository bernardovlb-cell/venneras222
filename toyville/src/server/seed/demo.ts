/**
 * DADOS DE DEMONSTRAÇÃO — claramente identificados (is_demo = true, nomes com "[DEMO]").
 * Servem apenas para desenvolver e testar antes do cadastro do catálogo real.
 *  - Não criam avaliações, vendas ou clientes fictícios.
 *  - Não usam fotos de produtos de terceiros (as imagens ficam vazias e o site mostra uma ilustração neutra).
 * Remova com `npm run db:purge-demo` antes de publicar.
 */
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import * as schema from "../db/schema";

type DB = PostgresJsDatabase<typeof schema>;

interface DemoProduct {
  sku: string; name: string; cat: string; brand: string; min: number | null; max: number | null; short: string;
  variants: { sku: string; name: string; options?: Record<string, string>; price: number; sale?: number; stock: number }[];
}

const P: DemoProduct[] = [
  { sku: "DEMO-EDU-01", name: "Quebra-cabeça Fazenda 60 peças", cat: "quebra-cabecas", brand: "Marca Demo A", min: 48, max: 96, short: "Peças grandes de papelão rígido.", variants: [{ sku: "DEMO-EDU-01", name: "Padrão", price: 5990, stock: 12 }] },
  { sku: "DEMO-EDU-02", name: "Kit Pequeno Cientista", cat: "ciencia-e-experiencias", brand: "Marca Demo B", min: 96, max: 144, short: "Experiências seguras para fazer em casa.", variants: [{ sku: "DEMO-EDU-02", name: "Padrão", price: 14990, sale: 11990, stock: 6 }] },
  { sku: "DEMO-BON-01", name: "Boneca Aventureira com Mochila", cat: "bonecas-e-acessorios", brand: "Marca Demo A", min: 36, max: 96, short: "Boneca articulada com acessórios.", variants: [
    { sku: "DEMO-BON-01-AM", name: "Amarela", options: { Cor: "Amarela" }, price: 12990, stock: 4 },
    { sku: "DEMO-BON-01-AZ", name: "Azul", options: { Cor: "Azul" }, price: 12990, stock: 0 },
  ] },
  { sku: "DEMO-CAR-01", name: "Pista Looping Turbo", cat: "carrinhos-e-pistas", brand: "Marca Demo C", min: 48, max: 120, short: "Pista com looping e 2 carrinhos.", variants: [{ sku: "DEMO-CAR-01", name: "Padrão", price: 21990, stock: 3 }] },
  { sku: "DEMO-CAR-02", name: "Carrinho de Fricção Bombeiro", cat: "carrinhos-e-pistas", brand: "Marca Demo C", min: 36, max: 96, short: "Anda sozinho com fricção.", variants: [{ sku: "DEMO-CAR-02", name: "Padrão", price: 4990, stock: 20 }] },
  { sku: "DEMO-JOG-01", name: "Jogo de Tabuleiro Ilha do Tesouro", cat: "jogos-de-tabuleiro", brand: "Marca Demo B", min: 72, max: null, short: "2 a 4 jogadores.", variants: [{ sku: "DEMO-JOG-01", name: "Padrão", price: 8990, stock: 9 }] },
  { sku: "DEMO-PEL-01", name: "Pelúcia Ursinho Abraço", cat: "pelucias", brand: "Marca Demo A", min: 0, max: null, short: "Pelúcia macia e lavável.", variants: [
    { sku: "DEMO-PEL-01-P", name: "Pequeno (25 cm)", options: { Tamanho: "Pequeno" }, price: 6990, stock: 8 },
    { sku: "DEMO-PEL-01-G", name: "Grande (45 cm)", options: { Tamanho: "Grande" }, price: 11990, sale: 9990, stock: 2 },
  ] },
  { sku: "DEMO-BEB-01", name: "Chocalho Sensorial Colorido", cat: "brinquedos-para-bebes", brand: "Marca Demo D", min: 3, max: 18, short: "Texturas e sons suaves.", variants: [{ sku: "DEMO-BEB-01", name: "Padrão", price: 3990, stock: 15 }] },
  { sku: "DEMO-BLO-01", name: "Blocos de Montar 120 peças", cat: "blocos-de-montar", brand: "Marca Demo D", min: 36, max: 120, short: "Compatível com bases da mesma linha.", variants: [{ sku: "DEMO-BLO-01", name: "Padrão", price: 9990, stock: 10 }] },
  { sku: "DEMO-ELE-01", name: "Robô Dançante com Luzes", cat: "brinquedos-eletronicos", brand: "Marca Demo C", min: 36, max: 96, short: "Funciona com 3 pilhas AA (não inclusas).", variants: [{ sku: "DEMO-ELE-01", name: "Padrão", price: 15990, stock: 5 }] },
];

export async function seedDemo(db: DB) {
  const brandIds = new Map<string, string>();
  for (const b of [...new Set(P.map((p) => p.brand))]) {
    const slug = "demo-" + b.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const [row] = await db.insert(schema.brands).values({ name: `[DEMO] ${b}`, slug, isDemo: true })
      .onConflictDoUpdate({ target: schema.brands.slug, set: { isDemo: true } }).returning({ id: schema.brands.id });
    brandIds.set(b, row.id);
  }
  const cats = await db.select({ id: schema.categories.id, slug: schema.categories.slug }).from(schema.categories);
  const catBy = new Map(cats.map((c) => [c.slug, c.id]));

  for (const p of P) {
    const exists = (await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.sku, p.sku)).limit(1))[0];
    if (exists) continue;
    const slug = "demo-" + p.sku.toLowerCase();
    const [prod] = await db.insert(schema.products).values({
      sku: p.sku, slug, name: `[DEMO] ${p.name}`, categoryId: catBy.get(p.cat) ?? null, brandId: brandIds.get(p.brand)!,
      minAgeMonths: p.min, maxAgeMonths: p.max, status: "active", isDemo: true, publishedAt: new Date(),
      shortDescription: `${p.short} Produto de demonstração — não está à venda.`,
      description: "Este é um produto FICTÍCIO criado para testes da loja. Substitua pelo catálogo real antes da publicação.",
      safetyInfo: "Exemplo de campo de advertências de segurança (ex.: contém peças pequenas).",
      weightGrams: 400, lengthCm: 30, widthCm: 20, heightCm: 10,
    }).returning({ id: schema.products.id });
    let pos = 0;
    for (const v of p.variants) {
      const [vr] = await db.insert(schema.productVariants).values({
        productId: prod.id, sku: v.sku, name: v.name, options: v.options ?? {}, priceCents: v.price, salePriceCents: v.sale ?? null,
        stockOnHand: v.stock, position: pos++,
      }).returning({ id: schema.productVariants.id });
      if (v.stock) await db.insert(schema.inventoryMovements).values({ variantId: vr.id, deltaOnHand: v.stock, reason: "initial", note: "demonstração" });
    }
  }

  const demoPromos = (await db.select({ n: sql<number>`count(*)::int` }).from(schema.promotions).where(eq(schema.promotions.isDemo, true)))[0].n;
  if (!demoPromos) {
    const now = Date.now();
    const pelucias = catBy.get("pelucias");
    await db.insert(schema.promotions).values([
      { name: "[DEMO] Relâmpago Pelúcias", kind: "percent_off", value: 15, scope: { categoryIds: pelucias ? [pelucias] : [] }, isFlash: true, badge: "Relâmpago", startsAt: new Date(now - 3600e3), endsAt: new Date(now + 2 * 86400e3), isDemo: true },
    ]);
    await db.insert(schema.banners).values([
      { title: "[DEMO] Banner principal", subtitle: "Exemplo de campanha — edite em Painel > Conteúdo", ctaLabel: "Ver ofertas", linkUrl: "/ofertas", theme: "blue", position: 0, isDemo: true },
      { title: "[DEMO] Encontre o presente perfeito", subtitle: "Busque por idade e orçamento", ctaLabel: "Começar", linkUrl: "/presentes", theme: "yellow", position: 1, isDemo: true },
    ]);
  }
}

export async function purgeDemo(db: DB) {
  return db.transaction(async (tx) => {
    // pedidos marcados como demo (criados só em testes manuais) — itens de pedidos reais são preservados
    await tx.delete(schema.orders).where(eq(schema.orders.isDemo, true));
    const p = await tx.delete(schema.products).where(eq(schema.products.isDemo, true)).returning({ id: schema.products.id });
    const b = await tx.delete(schema.brands).where(eq(schema.brands.isDemo, true)).returning({ id: schema.brands.id });
    const pr = await tx.delete(schema.promotions).where(eq(schema.promotions.isDemo, true)).returning({ id: schema.promotions.id });
    const bn = await tx.delete(schema.banners).where(eq(schema.banners.isDemo, true)).returning({ id: schema.banners.id });
    await tx.delete(schema.reviews).where(eq(schema.reviews.isDemo, true));
    await tx.delete(schema.categories).where(eq(schema.categories.isDemo, true));
    return { products: p.length, brands: b.length, promotions: pr.length, banners: bn.length };
  });
}
