import { describe, it, expect, beforeEach } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { seedBase, STARTER_BANNERS } from "@/server/seed/base";
import { saveBanner, moveBanner } from "@/server/services/admin";
import { getHomeCategories, getHomeData, listProducts, NEW_PRODUCT_DAYS } from "@/server/services/catalog";
import { subscribeNewsletter, removeNewsletterSubscriber, NEWSLETTER_CONSENT_TEXT } from "@/server/services/newsletter";
import { anonymizeAccount } from "@/server/services/account";
import { loadSettings, saveSettings } from "@/server/settings";
import { hashPassword } from "@/server/auth/password";
import { resetDb, makeProduct } from "./helpers";

const ADMIN = "00000000-0000-0000-0000-000000000001";
beforeEach(async () => { await resetDb(); });

const banner = (over: Record<string, unknown> = {}) => ({ placement: "hero", title: "Campanha de teste", subtitle: "", linkUrl: "/busca", ctaLabel: "Ver", theme: "blue", textPosition: "left", imageMode: "cutout", position: "0", startsAt: "", endsAt: "", isActive: true, ...over });
const titles = async (placement: string) => (await db.select().from(s.banners).where(eq(s.banners.placement, placement)).orderBy(s.banners.position)).map((b) => b.title);

describe("banners da home", () => {
  it("campanhas iniciais são criadas uma única vez e não voltam depois de excluídas", async () => {
    const hero = await titles("hero"), side = await titles("side");
    expect(hero).toEqual(STARTER_BANNERS.filter((b) => b.placement === "hero").map((b) => b.title));
    expect(side.length).toBe(3);
    // "Novidades" nasce despublicado: não promete novidade com o catálogo vazio
    const [nov] = await db.select().from(s.banners).where(eq(s.banners.title, "Novidades"));
    expect(nov.isActive).toBe(false);
    await db.delete(s.banners);
    await seedBase(db); // novo deploy
    expect((await db.select().from(s.banners)).length).toBe(0);
  });

  it("não cria campanhas iniciais quando a loja já tem banner próprio", async () => {
    await db.execute(sql`truncate banners, settings`);
    await db.insert(s.banners).values({ title: "Banner da loja", placement: "hero" });
    await seedBase(db);
    expect(await titles("hero")).toEqual(["Banner da loja"]);
    expect(await titles("side")).toEqual([]);
  });

  it("salva posição do texto e tipo de foto; novo banner entra no fim do seu grupo; editar não muda a ordem", async () => {
    await saveBanner(banner({ title: "Nova", textPosition: "overlay", imageMode: "cover" }), {}, ADMIN);
    const [b] = await db.select().from(s.banners).where(eq(s.banners.title, "Nova"));
    expect(b).toMatchObject({ placement: "hero", textPosition: "overlay", imageMode: "cover", position: 2 });
    await saveBanner(banner({ title: "Nova (editada)", textPosition: "right" }), { imageUrl: "/uploads/banners/x.webp" }, ADMIN, b.id);
    const [after] = await db.select().from(s.banners).where(eq(s.banners.id, b.id));
    expect(after).toMatchObject({ title: "Nova (editada)", textPosition: "right", position: 2, imageUrl: "/uploads/banners/x.webp" });
    await expect(saveBanner(banner({ textPosition: "centro" }), {}, ADMIN)).rejects.toThrow();
    await expect(saveBanner(banner({ placement: "rodape" }), {}, ADMIN)).rejects.toThrow();
    await expect(saveBanner(banner({ linkUrl: "javascript:alert(1)" }), {}, ADMIN)).rejects.toThrow();
  });

  it("subir/descer reordena só dentro do grupo (principal ou secundário)", async () => {
    const before = await titles("hero");
    const [second] = await db.select().from(s.banners).where(eq(s.banners.title, before[1]));
    await moveBanner(second.id, "up", ADMIN);
    expect(await titles("hero")).toEqual([before[1], before[0]]);
    await moveBanner(second.id, "up", ADMIN); // já é o primeiro: nada muda
    expect(await titles("hero")).toEqual([before[1], before[0]]);
    expect((await titles("side")).length).toBe(3);
  });

  it("a home só recebe banners publicados e dentro do período", async () => {
    await saveBanner(banner({ title: "Futuro", startsAt: "2999-01-01T00:00" }), {}, ADMIN);
    await saveBanner(banner({ title: "Encerrado", endsAt: "2001-01-01T00:00" }), {}, ADMIN);
    const { banners } = await getHomeData();
    const t = banners.map((b) => b.title);
    expect(t).not.toContain("Futuro");
    expect(t).not.toContain("Encerrado");
    expect(t).not.toContain("Novidades");
    expect(banners.filter((b) => b.placement === "hero").length).toBe(2);
    expect(banners.filter((b) => b.placement === "side").length).toBe(2);
  });

  it("tempo do carrossel tem padrão de 6 s e aceita só valores razoáveis", async () => {
    expect((await loadSettings()).home).toEqual({ carouselSeconds: 6, newsletterEnabled: true });
    await saveSettings("home", { carouselSeconds: 9, newsletterEnabled: true });
    expect((await loadSettings()).home.carouselSeconds).toBe(9);
    await expect(saveSettings("home", { carouselSeconds: 1, newsletterEnabled: true })).rejects.toThrow();
  });
});

describe("imagem das categorias", () => {
  const photo = async (productId: string, url: string) => db.insert(s.productImages).values({ productId, url, thumbUrl: url.replace(".webp", "-480.webp") });
  const cat = async (slug: string) => (await getHomeCategories()).find((c) => c.slug === slug)!;

  it("prioridade: foto do painel > foto de produto da própria categoria > nenhuma", async () => {
    expect(await cat("pelucias")).toMatchObject({ photoUrl: null, photoSource: null });
    const { productId } = await makeProduct({ categorySlug: "pelucias" });
    await photo(productId, "/uploads/p/urso.webp");
    expect(await cat("pelucias")).toMatchObject({ photoUrl: "/uploads/p/urso-480.webp", photoSource: "product" });
    await db.update(s.categories).set({ imageUrl: "/uploads/categorias/manual.webp" }).where(eq(s.categories.slug, "pelucias"));
    expect(await cat("pelucias")).toMatchObject({ photoUrl: "/uploads/categorias/manual.webp", photoSource: "manual" });
  });

  it("nunca usa foto de outra categoria, de produto inativo ou de demonstração; subcategoria conta", async () => {
    const a = await makeProduct({ categorySlug: "pelucias" });
    await photo(a.productId, "/uploads/p/urso.webp");
    expect((await cat("carrinhos-e-pistas")).photoUrl).toBeNull();
    const draft = await makeProduct({ categorySlug: "carrinhos-e-pistas", status: "draft" });
    await photo(draft.productId, "/uploads/p/rascunho.webp");
    const demo = await makeProduct({ categorySlug: "carrinhos-e-pistas" });
    await db.update(s.products).set({ isDemo: true }).where(eq(s.products.id, demo.productId));
    await photo(demo.productId, "/uploads/p/demo.webp");
    expect((await cat("carrinhos-e-pistas")).photoUrl).toBeNull();
    const child = await makeProduct({ categorySlug: "quebra-cabecas" }); // filha de "brinquedos-educativos"
    await photo(child.productId, "/uploads/p/quebra.webp");
    expect(await cat("brinquedos-educativos")).toMatchObject({ photoUrl: "/uploads/p/quebra-480.webp", photoSource: "product" });
  });

  it("lista todas as categorias principais ativas, com as subcategorias", async () => {
    const all = await getHomeCategories();
    expect(all.length).toBe(8);
    expect(all.find((c) => c.slug === "brinquedos-educativos")!.children.map((c) => c.slug)).toContain("quebra-cabecas");
    await db.update(s.categories).set({ isActive: false }).where(eq(s.categories.slug, "pelucias"));
    expect((await getHomeCategories()).some((c) => c.slug === "pelucias")).toBe(false);
  });
});

describe("selos dos cards", () => {
  it("“Novo” só para produto cadastrado há até NEW_PRODUCT_DAYS dias", async () => {
    const fresh = await makeProduct({ name: "Recém-chegado" });
    const old = await makeProduct({ name: "Antigo" });
    await db.update(s.products).set({ createdAt: new Date(Date.now() - (NEW_PRODUCT_DAYS + 1) * 86_400_000) }).where(eq(s.products.id, old.productId));
    const { items } = await listProducts({ perPage: 10 });
    expect(items.find((i) => i.id === fresh.productId)!.isNew).toBe(true);
    expect(items.find((i) => i.id === old.productId)!.isNew).toBe(false);
  });

  it("desconto só existe quando o preço atual é menor que o de lista; sem vendas, salesCount é zero", async () => {
    const full = await makeProduct({ price: 10000 });
    const sale = await makeProduct({ price: 10000, sale: 8000 });
    const { items } = await listProducts({ perPage: 10 });
    const a = items.find((i) => i.id === full.productId)!, b = items.find((i) => i.id === sale.productId)!;
    expect(a.priceCents).toBe(a.listPriceCents);
    expect(b).toMatchObject({ priceCents: 8000, listPriceCents: 10000 });
    expect(items.every((i) => i.salesCount === 0 && i.ratingAvg === null)).toBe(true);
  });
});

describe("newsletter", () => {
  const rows = () => db.select().from(s.newsletterSubscribers);

  it("grava o e-mail com o consentimento; repetir não duplica", async () => {
    await subscribeNewsletter({ email: "  Mae@Exemplo.com ", consent: true });
    await subscribeNewsletter({ email: "mae@exemplo.com", consent: true });
    const all = await rows();
    expect(all.length).toBe(1);
    expect(all[0]).toMatchObject({ email: "mae@exemplo.com", consentText: NEWSLETTER_CONSENT_TEXT, source: "footer", unsubscribedAt: null });
  });

  it("recusa e-mail inválido e falta de consentimento, sem gravar nada", async () => {
    await expect(subscribeNewsletter({ email: "nao-e-email", consent: true })).rejects.toMatchObject({ field: "email" });
    await expect(subscribeNewsletter({ email: "", consent: true })).rejects.toMatchObject({ field: "email" });
    await expect(subscribeNewsletter({ email: "ok@exemplo.com", consent: false })).rejects.toMatchObject({ field: "consent" });
    await expect(subscribeNewsletter({ email: "ok@exemplo.com", consent: "on" })).rejects.toMatchObject({ field: "consent" });
    expect((await rows()).length).toBe(0);
  });

  it("desativada no painel: não grava e avisa", async () => {
    await saveSettings("home", { carouselSeconds: 6, newsletterEnabled: false });
    await expect(subscribeNewsletter({ email: "ok@exemplo.com", consent: true })).rejects.toThrow(/desativado/);
    expect((await rows()).length).toBe(0);
  });

  it("remoção pelo painel e pela exclusão da conta apagam o registro", async () => {
    await subscribeNewsletter({ email: "a@exemplo.com", consent: true });
    await subscribeNewsletter({ email: "b@exemplo.com", consent: true });
    const [a] = await db.select().from(s.newsletterSubscribers).where(eq(s.newsletterSubscribers.email, "a@exemplo.com"));
    await removeNewsletterSubscriber(a.id, ADMIN);
    const [u] = await db.insert(s.users).values({ name: "B", email: "b@exemplo.com", passwordHash: await hashPassword("Senha1234"), roleKey: "customer" }).returning();
    await anonymizeAccount(u.id, { ip: "1.1.1.1" });
    expect((await rows()).length).toBe(0);
  });
});
