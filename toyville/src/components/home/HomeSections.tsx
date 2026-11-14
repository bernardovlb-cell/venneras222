import Link from "next/link";
import { listProducts, getHomeCategories, type HomeCategory } from "@/server/services/catalog";
import { getSettings, whatsappLink } from "@/server/settings";
import { AGE_BANDS } from "@/lib/age";
import { ProductCard, ProductRail } from "../product/ProductCard";
import { SectionTitle } from "../ui/States";
import { GiftFinderPanel } from "../gift/GiftFinderPanel";
import { CategoryCard } from "../catalog/CategoryCard";
import { CategoryGrid } from "./CategoryGrid";
import { HeroCarousel } from "./HeroCarousel";
import { CampaignBanner, SideBanner, FALLBACK_MAIN, FALLBACK_SIDE, type BannerView } from "./Banners";
import { ShapesCompact, ShapesRow } from "../brand/Shapes";
import { TruckIcon, ShieldIcon, CardIcon, GiftIcon, StoreIcon, ChatIcon, StarIcon, RefreshIcon, BoltIcon, ChevronRight, BlocksIcon, MapPinIcon } from "../icons";
import { Countdown } from "../product/Countdown";
import type { banners, homeSections } from "@/server/db/schema";

type Section = typeof homeSections.$inferSelect;
type Banner = typeof banners.$inferSelect;

/* ============================================================ 1. BANNERS */

/**
 * Área de destaque: banner principal (carrossel, ~65%) + banners secundários (~35%, empilhados).
 * No celular: principal em cima e secundários num carrossel horizontal próprio.
 * Tudo vem do painel (Conteúdo > Banners); sem banners ativos, usa as chamadas padrão.
 */
export async function HeroArea({ banners: all }: { banners: Banner[] }) {
  const { home } = await getSettings();
  const main: BannerView[] = all.filter((b) => b.placement === "hero");
  const side: BannerView[] = all.filter((b) => b.placement === "side").slice(0, 2);
  const mainList = main.length ? main : [FALLBACK_MAIN];
  const sideList = side.length ? side : FALLBACK_SIDE;
  return (
    <section className="container-tv pb-2 pt-4 sm:pt-6" aria-label="Destaques da loja">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)] lg:gap-4">
        <HeroCarousel intervalMs={home.carouselSeconds * 1000}>
          {mainList.map((b, i) => <CampaignBanner key={b.id} b={b} first={i === 0} controls={mainList.length > 1} />)}
        </HeroCarousel>
        <ul aria-label="Mais destaques" className="tv-rail -mx-4 px-4 pb-1 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:auto-rows-fr lg:grid-cols-1">
          {sideList.map((b, i) => <li key={b.id} className="w-[84%] md:w-auto"><SideBanner b={b} variant={i + 1} /></li>)}
        </ul>
      </div>
    </section>
  );
}

/* ========================================================= 2. CATEGORIAS */

async function CategoriesSection({ s }: { s: Section }) {
  const cats = await getHomeCategories();
  if (!cats.length) return null;
  return (
    <section className="tv-section bg-white">
      <div className="container-tv reveal">
        <SectionTitle title={s.title ?? "Explore por categoria"} subtitle={s.subtitle} href="/categorias" linkLabel="Ver todas as categorias" shortLabel="Ver todas" />
        <CategoryGrid initial={8}>
          {cats.map((c, i) => <CategoryCard key={c.id} c={c} i={i} />)}
        </CategoryGrid>
      </div>
    </section>
  );
}

/* ======================================================= 3. FAIXA ETÁRIA */

const AGE_TONES = ["bg-soft-yellow", "bg-soft-blue", "bg-soft-green", "bg-soft-yellow", "bg-soft-blue", "bg-soft-green"];

/** "Compre por idade": cartões numerados com as faixas reais do catálogo. */
export function ShopByAge() {
  return (
    <section className="tv-section" aria-labelledby="por-idade">
      <div className="container-tv reveal">
        <SectionTitle id="por-idade" title="Compre por idade" subtitle="Brinquedos certos para cada fase." />
        <ul className="tv-rail -mx-4 px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-6 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-4">
          {AGE_BANDS.map((b, i) => {
            const months = b.key === "0-12m";
            const n = months ? "0–12" : b.key === "12+" ? "12+" : b.key.replace("-", "–");
            return (
              <li key={b.key} className="w-[31%] min-w-[112px] sm:w-auto sm:min-w-0">
                <Link href={`/busca?idade=${encodeURIComponent(b.key)}`} aria-label={`Brinquedos para ${b.label}`}
                  className={`group relative isolate flex h-full min-h-[112px] flex-col justify-between overflow-hidden rounded-card p-4 transition duration-300 ease-brand hover:-translate-y-1 hover:shadow-lift lg:min-h-[136px] lg:p-5 ${AGE_TONES[i]}`}>
                  <span aria-hidden className="absolute -bottom-7 -right-7 -z-10 size-20 rounded-full bg-white/70 transition duration-500 ease-brand group-hover:scale-125 lg:size-24" />
                  <span className="font-display text-[2rem] font-semibold leading-none text-primary-dark sm:text-[1.7rem] lg:text-[2.75rem]">{n}</span>
                  <span className="mt-3 flex items-center justify-between text-[13px] font-bold text-ink/75 lg:text-sm">
                    {months ? "meses" : "anos"}
                    <ChevronRight size={16} className="text-ink/50 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ================================================== 4. GUIA DE PRESENTES */

async function GiftSection({ s }: { s: Section }) {
  const cats = (await getHomeCategories()).map((c) => ({ id: c.id, name: c.name }));
  return (
    <section className="tv-section relative isolate overflow-hidden bg-soft-blue">
      <span aria-hidden className="absolute -left-24 -top-24 -z-10 size-72 rounded-full bg-white/60" />
      <span aria-hidden className="absolute -bottom-32 right-[-6rem] -z-10 size-80 rounded-full bg-soft-yellow" />
      <div className="container-tv reveal">
        <GiftFinderPanel title={s.title ?? "Encontre o presente perfeito"} subtitle={s.subtitle} categories={cats} />
      </div>
    </section>
  );
}

/* =========================================================== 5. VITRINES */

function PromoHeader({ title, subtitle, end }: { title: string; subtitle?: string | null; end?: Date | null }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-[1.6rem] font-semibold leading-tight text-promo-ink sm:text-[2rem]"><BoltIcon size={24} /> {title}</h2>
        {subtitle && <p className="mt-1 text-[15px] text-ink/75">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {end && <p className="flex items-center gap-2 rounded-full bg-promo px-3.5 py-1.5 text-sm font-bold text-white">Termina em <Countdown endsAt={end.toISOString()} /></p>}
        <Link href="/ofertas" className="inline-flex items-center gap-1 py-2 text-sm font-extrabold text-primary hover:underline">Ver todas <ChevronRight size={16} /></Link>
      </div>
    </div>
  );
}

/**
 * Vitrines com composições diferentes (variedade controlada, mesmos cards):
 * mais vendidos = destaque grande + grade · lançamentos = carrossel · ofertas = painel com grade ·
 * relâmpago = painel com carrossel e contagem · seleção do painel = grade.
 * Sem produtos reais para a regra, a vitrine não aparece.
 */
async function ProductsSection({ s, favorites }: { s: Section; favorites: Set<string> }) {
  const limit = Math.min(s.config.limit ?? 8, 16);
  let title = s.title ?? "";
  let subtitle = s.subtitle;

  switch (s.type) {
    case "best_sellers": {
      const items = (await listProducts({ sort: "best_sellers", perPage: 5, inStock: true })).items;
      if (!items.length) return null;
      const realSales = items.some((i) => i.salesCount > 0);
      if (!realSales) { title = "Destaques da loja"; subtitle = null; } // sem vendas reais: nem "mais vendidos", nem selo
      return (
        <section className="tv-section bg-white">
          <div className="container-tv reveal">
            <SectionTitle title={title} subtitle={subtitle} href="/busca?ordem=best_sellers" />
            <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 lg:grid-cols-4">
              {items.map((p, i) => (
                <li key={p.id} className={i === 0 ? "col-span-2 lg:row-span-2" : ""}>
                  <ProductCard p={p} favorited={favorites.has(p.id)} featured={i === 0} bestSeller={realSales && i === 0 && p.salesCount > 0} priority={i === 0} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      );
    }
    case "new_arrivals": {
      const items = (await listProducts({ sort: "newest", perPage: limit, inStock: true })).items;
      if (!items.length) return null;
      return (
        <section className="tv-section">
          <div className="container-tv reveal">
            <SectionTitle title={title || "Lançamentos"} subtitle={subtitle} href="/busca?ordem=newest" />
            <ProductRail items={items} favorites={favorites} label={title || "Lançamentos"} />
          </div>
        </section>
      );
    }
    case "deals": {
      const items = (await listProducts({ onSale: true, sort: "discount", perPage: limit, inStock: true })).items;
      if (!items.length) return null;
      return (
        <section className="tv-section bg-white">
          <div className="container-tv reveal">
            <div className="rounded-panel bg-soft-red p-4 sm:p-8">
              <PromoHeader title={title || "Ofertas"} subtitle={subtitle} />
              <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4">
                {items.map((p, i) => <li key={p.id} className={i >= 4 ? "hidden md:block" : ""}><ProductCard p={p} favorited={favorites.has(p.id)} /></li>)}
              </ul>
            </div>
          </div>
        </section>
      );
    }
    case "flash": {
      const all = (await listProducts({ onSale: true, sort: "discount", perPage: 60, inStock: true })).items.filter((i) => i.promotionEndsAt);
      const items = all.slice(0, limit);
      if (!items.length) return null;
      const end = all.reduce<Date | null>((m, i) => (!m || i.promotionEndsAt! < m ? i.promotionEndsAt : m), null);
      return (
        <section className="tv-section">
          <div className="container-tv reveal">
            <div className="rounded-panel bg-soft-red p-4 sm:p-8">
              <PromoHeader title={title || "Ofertas relâmpago"} subtitle={subtitle} end={end} />
              <ProductRail items={items} favorites={favorites} label={title || "Ofertas relâmpago"} />
            </div>
          </div>
        </section>
      );
    }
    case "featured_products": {
      const items = (await listProducts({ productIds: s.config.productIds ?? [], perPage: limit })).items;
      if (!items.length) return null;
      return (
        <section className="tv-section bg-white">
          <div className="container-tv reveal">
            <SectionTitle title={title || "Seleção ToyVille"} subtitle={subtitle} />
            <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => <li key={p.id}><ProductCard p={p} favorited={favorites.has(p.id)} /></li>)}
            </ul>
          </div>
        </section>
      );
    }
    default:
      return null;
  }
}

/** Estado vazio único das vitrines: aparece no lugar delas enquanto não há nenhum produto ativo. */
export function CatalogComingSoon() {
  return (
    <section className="tv-section bg-white">
      <div className="container-tv reveal">
        <div className="relative isolate grid items-center gap-2 overflow-hidden rounded-panel bg-soft-yellow sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:gap-6">
          <ShapesCompact theme="soft-yellow" variant={2} className="mx-auto mt-6 w-44 sm:my-6 sm:w-full sm:max-w-[280px]" />
          <div className="p-6 pt-2 text-center sm:p-10 sm:pl-0 sm:text-left">
            <h2 className="text-[1.6rem] font-semibold leading-tight text-primary-dark sm:text-[2.1rem]">Nossas prateleiras estão sendo montadas</h2>
            <p className="mx-auto mt-2 max-w-md text-ink/75 sm:mx-0 sm:text-lg">Os brinquedos estão chegando ao site. Enquanto isso, conheça as categorias ou fale com a gente.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
              <Link href="/categorias" className="btn btn-primary">Explorar categorias</Link>
              <Link href="/atendimento" className="btn btn-outline">Falar com a loja</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ====================================================== 6. INSTITUCIONAL */

const BENEFIT_ICONS = { truck: TruckIcon, shield: ShieldIcon, card: CardIcon, gift: GiftIcon, store: StoreIcon, chat: ChatIcon, star: StarIcon, refresh: RefreshIcon };
type Tile = { icon: React.ReactNode; title: string; text: string; href?: string; cta?: string; external?: boolean };

/**
 * "Por que comprar na ToyVille": variedade, loja física, atendimento e guia de presentes.
 * Só usa dados verificados: contagem real de categorias, endereço/horário das Configurações (o
 * bloco da loja física some se não houver endereço) e benefícios cadastrados pelo proprietário.
 */
async function InstitutionalSection({ s }: { s: Section }) {
  const [{ store, whatsapp, benefits }, cats] = await Promise.all([getSettings(), getHomeCategories()]);
  const wa = whatsappLink(whatsapp);
  const tiles: Tile[] = [
    { icon: <BlocksIcon size={24} />, title: "Brinquedos para todas as idades", text: `De 0 a 12+ anos, em ${cats.length} ${cats.length === 1 ? "categoria" : "categorias"}.`, href: "/categorias", cta: "Ver categorias" },
    ...(store.address ? [{
      icon: <MapPinIcon size={24} />, title: "Loja física", text: [store.address, store.businessHours].filter(Boolean).join(" · "),
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`, cta: "Ver no mapa", external: true,
    } satisfies Tile] : []),
    { icon: <ChatIcon size={24} />, title: "Fale com a ToyVille", text: "Tire dúvidas sobre brinquedos, pedidos e trocas.", href: wa ?? "/atendimento", cta: wa ? "Chamar no WhatsApp" : "Abrir atendimento", external: !!wa },
    { icon: <GiftIcon size={24} />, title: "Presente sem complicação", text: "O guia sugere brinquedos por idade e orçamento.", href: "/presentes", cta: "Abrir o guia" },
    ...benefits.items.map((b) => { const I = BENEFIT_ICONS[b.icon]; return { icon: <I />, title: b.title, text: b.description } satisfies Tile; }),
  ];
  return (
    <section className="tv-section">
      <div className="container-tv reveal grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] lg:items-center lg:gap-12">
        <div>
          <h2 className="text-[1.75rem] font-semibold leading-[1.08] text-primary-dark sm:text-[2.4rem]">{s.title ?? "Por que comprar na ToyVille"}</h2>
          <p className="mt-3 max-w-md text-ink/75 sm:text-lg">{s.subtitle ?? "Uma loja dedicada a brincar: para descobrir, aprender e se divertir junto."}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {tiles.map((t, i) => (
            <li key={i} className="group relative flex gap-4 rounded-card bg-white p-5 shadow-card ring-1 ring-line/70 transition duration-300 ease-brand hover:-translate-y-0.5 hover:shadow-lift">
              <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${["bg-soft-blue text-primary", "bg-soft-yellow text-ink", "bg-soft-green text-success-ink"][i % 3]}`}>{t.icon}</span>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold leading-tight">{t.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{t.text}</p>
                {t.href && t.cta && (
                  t.external
                    ? <a href={t.href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-[32px] items-center gap-1 text-sm font-extrabold text-primary after:absolute after:inset-0 after:content-['']">{t.cta} <ChevronRight size={16} /></a>
                    : <Link href={t.href} className="mt-2 inline-flex min-h-[32px] items-center gap-1 text-sm font-extrabold text-primary after:absolute after:inset-0 after:content-['']">{t.cta} <ChevronRight size={16} /></Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ======================================================= 7. ENCERRAMENTO */

/**
 * Fecho da home: mensagem da marca (o slogan das Configurações) + convite para explorar.
 * As formas "nascem" da borda de baixo e a curva azul emenda no rodapé.
 */
export async function ClosingSection() {
  const { store } = await getSettings();
  return (
    <section className="relative isolate -mb-20 overflow-hidden bg-soft-yellow">
      <div className="container-tv grid grid-cols-[minmax(0,1fr)] items-end gap-x-8 gap-y-2 pt-[var(--tv-section)] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="reveal pb-4 lg:pb-24">
          <h2 className="max-w-xl text-[2rem] font-semibold leading-[1.05] text-primary-dark sm:text-5xl lg:text-[3.4rem]">{store.tagline || "Brincar é descobrir o mundo"}</h2>
          <p className="mt-4 max-w-md text-ink/75 sm:text-lg">Escolha por idade, por categoria ou deixe o guia de presentes ajudar.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/busca" className="btn btn-primary btn-lg">Explorar brinquedos</Link>
            <Link href="/categorias" className="btn btn-outline btn-lg">Ver categorias</Link>
          </div>
        </div>
        {/* blocos apoiados na borda: a curva azul do rodapé passa por cima da base deles */}
        <ShapesRow className="mx-auto -mb-3 w-full max-w-[340px] sm:max-w-[440px] lg:-mb-6 lg:max-w-[520px]" />
      </div>
      <svg aria-hidden viewBox="0 0 1440 80" preserveAspectRatio="none" className="relative block h-10 w-full text-primary-dark sm:h-16">
        <path fill="currentColor" d="M0 80V46C240 6 480 0 720 0s480 6 720 46v34Z" />
      </svg>
    </section>
  );
}

export type { HomeCategory };
export const PRODUCT_SECTION_TYPES = ["best_sellers", "deals", "flash", "new_arrivals", "featured_products"] as const;

export async function HomeSection({ s, favorites }: { s: Section; favorites: Set<string> }) {
  switch (s.type) {
    case "categories": return <CategoriesSection s={s} />;
    case "benefits": return <InstitutionalSection s={s} />;
    case "gift_finder": return <GiftSection s={s} />;
    case "best_sellers": case "deals": case "flash": case "new_arrivals": case "featured_products":
      return <ProductsSection s={s} favorites={favorites} />;
    default: return null;
  }
}
