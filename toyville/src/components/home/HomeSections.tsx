import Link from "next/link";
import Image from "next/image";
import { listProducts, getFeaturedCategories } from "@/server/services/catalog";
import { getSettings } from "@/server/settings";
import { AGE_BANDS } from "@/lib/age";
import { ProductRail } from "../product/ProductCard";
import { SectionTitle } from "../ui/States";
import { GiftFinderPanel } from "../gift/GiftFinderPanel";
import { TruckIcon, ShieldIcon, CardIcon, GiftIcon, StoreIcon, ChatIcon, StarIcon, RefreshIcon, BoltIcon } from "../icons";
import { Countdown } from "../product/Countdown";
import { HeroScene } from "../art/HeroScene";
import { CategoryArt, ToyArt } from "../art/ToyArt";
import type { banners, homeSections } from "@/server/db/schema";

type Section = typeof homeSections.$inferSelect;
type Banner = typeof banners.$inferSelect;

/* ------------------------------------------------------------------ hero */

const AGE_CHIP = ["bg-soft-yellow", "bg-soft-blue", "bg-soft-green", "bg-[#ffeadb]", "bg-soft-blue", "bg-soft-yellow"];

function AgeShortcuts() {
  return (
    <nav aria-label="Comprar por idade" className="mt-7">
      <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted">Comprar por idade</p>
      <ul className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
        {AGE_BANDS.map((b, i) => (
          <li key={b.key} className="shrink-0">
            <Link href={`/busca?idade=${encodeURIComponent(b.key)}`}
              className={`inline-flex min-h-[40px] items-center rounded-full px-3.5 text-[13.5px] font-extrabold text-ink ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-card ${AGE_CHIP[i % AGE_CHIP.length]}`}>
              {b.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Hero padrão (sem campanhas cadastradas): a vila da ToyVille. */
function DefaultHero() {
  return (
    <section className="tv-hero-bg relative overflow-hidden">
      <div className="container-tv grid grid-cols-[minmax(0,1fr)] items-center gap-x-10 pb-10 pt-7 [grid-template-areas:'title'_'scene'_'body'] sm:pt-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] lg:pb-16 lg:pt-12 lg:[grid-template-areas:'title_scene'_'body_scene']">
        <div className="text-center [grid-area:title] lg:self-end lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-extrabold text-primary shadow-card">
            <svg aria-hidden viewBox="0 0 20 20" className="size-4 text-accent"><path d="M10 1q1.6 7.4 9 9-7.4 1.6-9 9-1.6-7.4-9-9 7.4-1.6 9-9Z" fill="currentColor" /></svg>
            A vila dos brinquedos
          </p>
          <h1 className="mt-4 text-[2.6rem] font-extrabold leading-[0.98] text-primary-dark sm:text-6xl lg:text-[4.3rem]">
            Brinquedos que fazem a infância <span className="tv-marker whitespace-nowrap">brilhar</span>
          </h1>
        </div>
        <div className="relative -mb-3 -mt-1 [grid-area:scene] sm:my-0">
          <HeroScene className="mx-auto w-full max-w-[330px] sm:max-w-[520px] lg:max-w-[620px]" />
        </div>
        <div className="text-center [grid-area:body] lg:self-start lg:text-left">
          <p className="mx-auto max-w-md text-[1.05rem] leading-relaxed text-muted sm:text-lg lg:mx-0 lg:mt-5">
            Encontre o brinquedo certo por idade, categoria ou orçamento — e deixe o resto com a gente.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link href="/presentes" className="btn btn-accent btn-lg"><GiftIcon size={20} /> Encontrar o presente</Link>
            <Link href="/busca" className="btn btn-outline btn-lg">Ver todos os brinquedos</Link>
          </div>
          <AgeShortcuts />
        </div>
      </div>
    </section>
  );
}

const THEMES: Record<string, { bg: string; text: string; cta: string; muted: string }> = {
  blue: { bg: "bg-primary tv-stars", text: "text-white", cta: "btn-accent", muted: "text-white/85" },
  yellow: { bg: "bg-accent", text: "text-ink", cta: "btn-primary", muted: "text-ink/75" },
  red: { bg: "bg-promo tv-stars", text: "text-white", cta: "btn-accent", muted: "text-white/85" },
  green: { bg: "bg-[#1f7a26] tv-stars", text: "text-white", cta: "btn-accent", muted: "text-white/90" },
  cream: { bg: "bg-soft-yellow", text: "text-ink", cta: "btn-primary", muted: "text-muted" },
};

/** Campanha cadastrada no painel. Com imagem: a arte enviada ocupa o banner. Sem imagem: composição com a vila. */
function BannerSlide({ b, first }: { b: Banner; first: boolean }) {
  const t = THEMES[b.theme] ?? THEMES.blue;
  const Title = first ? "h1" : "h2";
  if (b.imageUrl) {
    return (
      <div className="relative flex min-h-[340px] overflow-hidden rounded-[2rem] bg-ink sm:min-h-[420px]">
        <picture className="absolute inset-0">
          {b.mobileImageUrl && <source media="(max-width: 640px)" srcSet={b.mobileImageUrl} />}
          <Image src={b.imageUrl} alt="" fill priority={first} sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover" />
        </picture>
        <div className="relative flex max-w-xl flex-col justify-end gap-3 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-6 text-white sm:justify-center sm:bg-gradient-to-r sm:p-12">
          <Title className="text-3xl font-extrabold leading-[1.02] sm:text-5xl">{b.title}</Title>
          {b.subtitle && <p className="text-base opacity-90 sm:text-lg">{b.subtitle}</p>}
          {b.linkUrl && <Link href={b.linkUrl} className="btn btn-accent btn-lg mt-2 w-fit">{b.ctaLabel || "Confira"}</Link>}
        </div>
      </div>
    );
  }
  return (
    <div className={`relative grid grid-cols-[minmax(0,1fr)] items-center overflow-hidden rounded-[2rem] px-6 pb-2 pt-8 sm:px-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-6 ${t.bg} ${t.text}`}>
      <div className="relative z-10 flex flex-col gap-3">
        <Title className="text-[2.2rem] font-extrabold leading-[1.02] sm:text-5xl lg:text-6xl">{b.title}</Title>
        {b.subtitle && <p className={`text-base sm:text-lg ${t.muted}`}>{b.subtitle}</p>}
        {b.linkUrl && <Link href={b.linkUrl} className={`btn btn-lg mt-2 w-fit ${t.cta}`}>{b.ctaLabel || "Confira"}</Link>}
      </div>
      <HeroScene className="mx-auto w-full max-w-[380px] lg:max-w-[520px]" />
    </div>
  );
}

export function Hero({ items }: { items: Banner[] }) {
  if (!items.length) return <DefaultHero />;
  return (
    <section className="tv-hero-bg pb-6 pt-5 sm:pt-8" aria-roledescription="carrossel" aria-label="Destaques">
      <div className="container-tv">
        <ul className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto">
          {items.map((b, i) => (
            <li key={b.id} className="w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`${i + 1} de ${items.length}`}>
              <BannerSlide b={b} first={i === 0} />
            </li>
          ))}
        </ul>
        {items.length > 1 && <p className="mt-2 text-center text-xs font-bold text-muted">Deslize para ver mais destaques →</p>}
        <AgeShortcuts />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ categorias */

const HOUSE = [
  { bg: "bg-soft-blue", window: "bg-[#dce7ff]" },
  { bg: "bg-soft-yellow", window: "bg-[#ffecaa]" },
  { bg: "bg-soft-green", window: "bg-[#d3efd3]" },
  { bg: "bg-[#ffeadb]", window: "bg-[#ffd9bf]" },
];

/** Categoria como "casinha" da vila: fachada em arco com a ilustração (ou a foto enviada no painel). */
export function CategoryHouse({ c, i }: { c: { name: string; slug: string; imageUrl: string | null }; i: number }) {
  const h = HOUSE[i % HOUSE.length];
  return (
    <Link href={`/c/${c.slug}`} className="group flex h-full flex-col items-center outline-none">
      <span className={`relative block aspect-[4/5] w-full rounded-b-[1.4rem] rounded-t-[999px] p-[9%] pb-[14%] shadow-[inset_0_-8px_0_rgba(27,33,64,.06)] transition duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[inset_0_-8px_0_rgba(27,33,64,.06),0_16px_30px_-18px_rgba(23,58,158,.55)] group-focus-visible:ring-4 group-focus-visible:ring-primary/40 ${h.bg}`}>
        <span className={`relative block size-full overflow-hidden rounded-b-[1rem] rounded-t-[999px] ${h.window}`}>
          {c.imageUrl ? (
            <Image src={c.imageUrl} alt="" fill sizes="(max-width: 640px) 40vw, (max-width: 1280px) 25vw, 160px" className="object-cover transition duration-500 group-hover:scale-105" />
          ) : (
            <CategoryArt slug={c.slug} className="absolute inset-x-[6%] bottom-[4%] w-[88%] transition duration-500 group-hover:-translate-y-1 group-hover:scale-110" />
          )}
        </span>
      </span>
      <span className="relative z-10 -mt-5 max-w-[95%] rounded-full bg-white px-3.5 py-1.5 text-center text-[13.5px] font-extrabold leading-tight text-ink shadow-card transition group-hover:bg-primary group-hover:text-white sm:text-sm">
        {c.name}
      </span>
    </Link>
  );
}

async function CategoriesSection({ s }: { s: Section }) {
  const cats = await getFeaturedCategories();
  if (!cats.length) return null;
  return (
    <section className="container-tv reveal">
      <SectionTitle eyebrow="Passeie pela vila" title={s.title ?? "Explore por categoria"} subtitle={s.subtitle} href="/busca" linkLabel="Ver todos os brinquedos" />
      <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 pt-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0 xl:grid-cols-8">
        {cats.map((c, i) => <li key={c.id} className="w-[40%] shrink-0 snap-start sm:w-auto"><CategoryHouse c={c} i={i} /></li>)}
      </ul>
      <div aria-hidden className="mx-2 mt-1 hidden h-3 rounded-full bg-[repeating-linear-gradient(90deg,var(--tv-line)_0_40px,#f4efe3_40px_80px)] sm:block" />
    </section>
  );
}

/* --------------------------------------------------------------- vitrines */

const EYEBROW: Partial<Record<Section["type"], string>> = {
  best_sellers: "Os queridinhos", deals: "Economize", new_arrivals: "Acabou de chegar", featured_products: "Escolhidos pela ToyVille",
};

async function ProductsSection({ s, favorites }: { s: Section; favorites: Set<string> }) {
  const limit = Math.min(s.config.limit ?? 8, 16);
  let title = s.title ?? "";
  let eyebrow = EYEBROW[s.type];
  let href: string | undefined;
  let items;
  let flashEnd: Date | null = null;
  switch (s.type) {
    case "best_sellers": {
      items = (await listProducts({ sort: "best_sellers", perPage: limit, inStock: true })).items;
      if (!items.some((i) => i.salesCount > 0)) { title = "Brinquedos da loja"; eyebrow = "Para começar"; } // não chama de "mais vendidos" sem vendas reais
      href = "/busca?ordem=best_sellers";
      break;
    }
    case "deals":
      items = (await listProducts({ onSale: true, sort: "discount", perPage: limit, inStock: true })).items;
      href = "/ofertas";
      break;
    case "flash": {
      const all = (await listProducts({ onSale: true, sort: "discount", perPage: 60, inStock: true })).items.filter((i) => i.promotionEndsAt);
      items = all.slice(0, limit);
      flashEnd = all.reduce<Date | null>((m, i) => (!m || i.promotionEndsAt! < m ? i.promotionEndsAt : m), null);
      href = "/ofertas";
      break;
    }
    case "new_arrivals":
      items = (await listProducts({ sort: "newest", perPage: limit, inStock: true })).items;
      href = "/busca?ordem=newest";
      break;
    case "featured_products":
      items = (await listProducts({ productIds: s.config.productIds ?? [], perPage: limit })).items;
      break;
    default:
      return null;
  }
  if (!items.length) return null; // sem conteúdo real → seção oculta

  if (s.type === "flash") {
    const few = items.length < 3;
    return (
      <section className="container-tv reveal">
        <div className="relative overflow-hidden rounded-[2rem] bg-promo p-4 text-white sm:p-8">
          <div className="tv-stars pointer-events-none absolute inset-0" aria-hidden />
          <div className={`relative grid grid-cols-[minmax(0,1fr)] gap-5 lg:items-center lg:gap-8 ${few ? "lg:grid-cols-[minmax(0,15rem)_auto_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]"}`}>
            <div className="flex flex-wrap items-end justify-between gap-3 lg:flex-col lg:items-start lg:justify-center">
              <div>
                <p className="eyebrow !text-white"><BoltIcon size={14} className="text-accent" /> Por tempo limitado</p>
                <h2 className="text-[1.75rem] font-extrabold leading-[1.05] sm:text-[2.35rem]">{title}</h2>
                {s.subtitle && <p className="mt-1 hidden text-white/85 lg:block">{s.subtitle}</p>}
              </div>
              {flashEnd && (
                <p className="rounded-2xl bg-white px-4 py-2 text-promo-ink shadow-[0_3px_0_#a3161b]">
                  <span className="block text-[11px] font-extrabold uppercase tracking-wider">Termina em</span>
                  <span className="font-display text-xl font-extrabold"><Countdown endsAt={flashEnd.toISOString()} /></span>
                </p>
              )}
              <Link href="/ofertas" className="btn btn-accent hidden lg:inline-flex">Ver todas as ofertas</Link>
            </div>
            <ProductRail items={items} favorites={favorites} compact={few} />
            {few && <ToyArt art="rocket" className="tv-float mx-auto hidden size-64 rotate-12 lg:block" />}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="container-tv reveal">
      <SectionTitle eyebrow={eyebrow} title={title} subtitle={s.subtitle} href={href} />
      <ProductRail items={items} favorites={favorites} />
    </section>
  );
}

/* ---------------------------------------------------------- benefícios */

const BENEFIT_ICONS = { truck: TruckIcon, shield: ShieldIcon, card: CardIcon, gift: GiftIcon, store: StoreIcon, chat: ChatIcon, star: StarIcon, refresh: RefreshIcon };
const BADGE = ["bg-primary text-white shadow-[0_3px_0_var(--tv-primary-dark)]", "bg-accent text-ink shadow-[0_3px_0_#d79e00]", "bg-success text-white shadow-[0_3px_0_#1f7a26]", "bg-[#ff9f5a] text-ink shadow-[0_3px_0_#d9752d]"];

async function BenefitsSection({ s }: { s: Section }) {
  const { benefits } = await getSettings();
  if (!benefits.items.length) return null; // só benefícios confirmados no painel
  return (
    <section className="container-tv reveal">
      <SectionTitle eyebrow="Compra tranquila" title={s.title ?? "Por que comprar na ToyVille"} subtitle={s.subtitle} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.items.map((b, i) => {
          const Icon = BENEFIT_ICONS[b.icon];
          return (
            <li key={i} className="group flex items-start gap-3.5 rounded-[1.4rem] bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-5">
              <span className={`tv-wiggle grid size-12 shrink-0 place-items-center rounded-2xl ${BADGE[i % BADGE.length]}`}><Icon /></span>
              <div><p className="font-display text-lg font-extrabold leading-tight">{b.title}</p><p className="mt-0.5 text-sm text-muted">{b.description}</p></div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------- guia de presentes */

async function GiftSection({ s }: { s: Section }) {
  const cats = (await getFeaturedCategories()).map((c) => ({ id: c.id, name: c.name }));
  return (
    <section className="container-tv reveal">
      <GiftFinderPanel title={s.title ?? "Encontre o presente perfeito"} subtitle={s.subtitle} categories={cats} />
    </section>
  );
}

/* ------------------------------------------ catálogo ainda sem produtos */

/** Aparece só enquanto não há nenhum produto ativo: explica a vitrine vazia sem inventar itens. */
export function CatalogComingSoon() {
  return (
    <section className="container-tv reveal">
      <div className="grid items-center gap-4 rounded-[2rem] bg-white p-6 text-center shadow-card ring-1 ring-line/60 sm:grid-cols-[auto_1fr] sm:gap-8 sm:p-10 sm:text-left">
        <ToyArt art="blocks" className="tv-float mx-auto size-32 sm:size-44" />
        <div>
          <p className="eyebrow">Vitrine em montagem</p>
          <h2 className="text-[1.6rem] font-extrabold leading-tight text-primary-dark sm:text-[2.1rem]">Nossas prateleiras estão ganhando brinquedos</h2>
          <p className="mt-2 max-w-xl text-muted">Os produtos estão sendo cadastrados. Procurando algo específico? Conte para a gente.</p>
          <Link href="/atendimento" className="btn btn-primary mt-5">Falar com a ToyVille</Link>
        </div>
      </div>
    </section>
  );
}

export async function HomeSection({ s, favorites }: { s: Section; favorites: Set<string> }) {
  switch (s.type) {
    case "categories": return <CategoriesSection s={s} />;
    case "benefits": return <BenefitsSection s={s} />;
    case "gift_finder": return <GiftSection s={s} />;
    case "best_sellers": case "deals": case "flash": case "new_arrivals": case "featured_products":
      return <ProductsSection s={s} favorites={favorites} />;
    default: return null;
  }
}
