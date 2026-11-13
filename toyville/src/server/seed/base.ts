/**
 * Dados estruturais (NÃO são demonstração): papéis, categorias do briefing, seções da home,
 * modalidades de entrega (todas desativadas até configuração) e rascunhos de páginas institucionais
 * marcados como PENDENTES de aprovação. Idempotente.
 */
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "../db/schema";
import { DEFAULT_ROLES } from "../auth/permissions";
import { POLICY_DRAFTS } from "./policies";

type DB = NodePgDatabase<typeof schema>;

export const BASE_CATEGORIES: { slug: string; name: string; description: string; children?: { slug: string; name: string }[] }[] = [
  { slug: "brinquedos-educativos", name: "Brinquedos educativos", description: "Para aprender brincando.", children: [{ slug: "quebra-cabecas", name: "Quebra-cabeças" }, { slug: "ciencia-e-experiencias", name: "Ciência e experiências" }] },
  { slug: "bonecas-e-acessorios", name: "Bonecas e acessórios", description: "Bonecas, casinhas e acessórios." },
  { slug: "carrinhos-e-pistas", name: "Carrinhos e pistas", description: "Veículos, pistas e garagens." },
  { slug: "jogos-de-tabuleiro", name: "Jogos de tabuleiro", description: "Diversão para a família toda." },
  { slug: "pelucias", name: "Pelúcias", description: "Companheiros fofinhos." },
  { slug: "brinquedos-para-bebes", name: "Brinquedos para bebês", description: "Estímulos para os primeiros meses." },
  { slug: "blocos-de-montar", name: "Blocos de montar", description: "Construir, desmontar e criar." },
  { slug: "brinquedos-eletronicos", name: "Brinquedos eletrônicos", description: "Luzes, sons e tecnologia." },
];

export async function seedBase(db: DB) {
  for (const r of DEFAULT_ROLES) {
    await db.insert(schema.roles).values(r).onConflictDoUpdate({ target: schema.roles.key, set: { name: r.name, isStaff: r.isStaff, permissions: r.permissions } });
  }

  let pos = 0;
  for (const c of BASE_CATEGORIES) {
    const [row] = await db.insert(schema.categories).values({ slug: c.slug, name: c.name, description: c.description, position: pos++, isFeatured: true })
      .onConflictDoUpdate({ target: schema.categories.slug, set: { name: sql`${schema.categories.name}` } }).returning({ id: schema.categories.id });
    let cpos = 0;
    for (const ch of c.children ?? []) {
      await db.insert(schema.categories).values({ slug: ch.slug, name: ch.name, parentId: row.id, position: cpos++ }).onConflictDoNothing();
    }
  }

  const sectionCount = (await db.select({ n: sql<number>`count(*)::int` }).from(schema.homeSections))[0].n;
  if (sectionCount === 0) {
    await db.insert(schema.homeSections).values([
      { type: "hero", position: 0 },
      { type: "categories", title: "Explore por categoria", position: 1 },
      { type: "gift_finder", title: "Encontre o presente perfeito", subtitle: "Diga a idade e o orçamento — a gente sugere", position: 2 },
      { type: "best_sellers", title: "Mais vendidos", position: 3, config: { limit: 8 } },
      { type: "new_arrivals", title: "Lançamentos", position: 4, config: { limit: 8 } },
      { type: "flash", title: "Ofertas relâmpago", subtitle: "Por tempo limitado", position: 5, config: { limit: 8 } },
      { type: "deals", title: "Ofertas e descontos", position: 6, config: { limit: 8 } },
      { type: "benefits", title: "Por que comprar na ToyVille", position: 7 },
    ]);
  }

  // Modalidades de entrega: criadas DESATIVADAS e sem valores. O proprietário configura no painel.
  const methods = [
    { code: "retirada", type: "pickup" as const, name: "Retirar na loja", position: 0, config: { address: "", city: "", state: "", hours: "", instructions: "", prepDays: 1 } },
    { code: "entrega-local", type: "local_delivery" as const, name: "Entrega local", position: 1, config: { zipRanges: [], priceCents: null, minDays: 1, maxDays: 3 } },
    { code: "correios", type: "correios" as const, name: "Correios", position: 2, config: { provider: "", notes: "Requer contrato/credenciais e implementação do provedor." } },
    { code: "transportadora", type: "carrier" as const, name: "Transportadora", position: 3, config: { provider: "", notes: "Requer escolha do provedor (ex.: plataforma agregadora)." } },
  ];
  for (const m of methods) await db.insert(schema.shippingMethods).values({ ...m, isActive: false }).onConflictDoNothing();

  for (const p of POLICY_DRAFTS) {
    await db.insert(schema.pages).values({ slug: p.slug, title: p.title, body: p.body, status: "pending_review", pendingNotes: p.pendingNotes }).onConflictDoNothing();
  }
  await seedStarterBanners(db);
}

/**
 * Campanhas iniciais da home (texto da marca, sem promoção nem produto inventado), criadas UMA única
 * vez para o proprietário editar no painel e acrescentar as fotos. A marca em `settings` impede que
 * voltem a ser criadas depois de editadas ou excluídas. Não cria nada se já houver banner próprio.
 */
export const STARTER_BANNERS = [
  { placement: "hero", position: 0, theme: "blue", title: "Um mundo de brincadeiras espera por você", subtitle: "Brinquedos para todas as idades, dos primeiros meses às brincadeiras em família.", ctaLabel: "Ver brinquedos", linkUrl: "/busca" },
  { placement: "hero", position: 1, theme: "cream", title: "Cada brinquedo, uma nova descoberta", subtitle: "Montar, imaginar, aprender e jogar junto: escolha pelo tipo de brincadeira.", ctaLabel: "Explorar categorias", linkUrl: "/categorias" },
  { placement: "side", position: 0, theme: "yellow", title: "Encontre o presente perfeito", subtitle: "Sugestões por idade e orçamento.", ctaLabel: "Abrir o guia", linkUrl: "/presentes" },
  { placement: "side", position: 1, theme: "green", title: "Dúvidas na escolha?", subtitle: "Fale com a ToyVille antes de comprar.", ctaLabel: "Abrir atendimento", linkUrl: "/atendimento" },
  // Pronto para ativar quando houver produtos cadastrados (não é exibido antes disso).
  { placement: "side", position: 2, theme: "blue", title: "Novidades", subtitle: "Os brinquedos que acabaram de chegar.", ctaLabel: "Ver novidades", linkUrl: "/busca?ordem=newest", isActive: false },
] as const;

async function seedStarterBanners(db: DB) {
  const FLAG = "_seed_banners_v3";
  const done = (await db.select({ key: schema.settings.key }).from(schema.settings).where(sql`${schema.settings.key} = ${FLAG}`)).length > 0;
  if (done) return;
  const own = (await db.select({ n: sql<number>`count(*)::int` }).from(schema.banners).where(sql`${schema.banners.isDemo} = false`))[0].n;
  if (own === 0) {
    await db.insert(schema.banners).values(STARTER_BANNERS.map((b) => ({ ...b, textPosition: "left", imageMode: "cutout", isActive: "isActive" in b ? b.isActive : true })));
  }
  await db.insert(schema.settings).values({ key: FLAG, value: true }).onConflictDoNothing();
}

