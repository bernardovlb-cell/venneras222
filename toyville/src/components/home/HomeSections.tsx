import Link from "next/link";
import Image from "next/image";
import { listProducts, getFeaturedCategories } from "@/server/services/catalog";
import { getSettings } from "@/server/settings";
import { AGE_BANDS } from "@/lib/age";
import { ProductRail } from "../product/ProductCard";
import { SectionTitle } from "../ui/States";
import { GiftFinderPanel } from "../gift/GiftFinderPanel";
import { CategoryIcon } from "../catalog/CategoryIcon";
import { TruckIcon, ShieldIcon, CardIcon, GiftIcon, StoreIcon, ChatIcon, StarIcon, RefreshIcon, BoltIcon, ChevronRight, BoxIcon } from "../icons";
import { Countdown } from "../product/Countdown";
import type { banners, homeSections } from "@/server/db/schema";

type Section = typeof homeSections.$inferSelect;
type Banner = typeof banners.$inferSelect;
type Brand = { logoUrl: string; logoWidth: number; logoHeight: number };

/* ------------------------------------------------------------------ hero */

/** Banner principal da marca (enquanto não houver campanhas com imagem). A logo oficial é a única peça visual. */
function BrandBanner({ brand }: { brand: Brand }) {
  return (
    <div className="relative grid h-full overflow-hidden rounded-2xl bg-primary text-white md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="relative z-10 flex flex-col justify-center p-6 sm:p-10">
        <h1 className="text-[2rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">Brinquedos para todas as idades</h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/85 sm:text-lg">
          Educativos, pelúcias, jogos, carrinhos e muito mais. Encontre por idade, categoria ou orçamento.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href="/busca" className="btn btn-accent">Ver todos os brinquedos</Link>
        </div>
      </div>
      <div className="relative hidden items-center justify-center bg-white/[0.06] p-8 md:flex">
        <div className="rounded-3xl bg-white p-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,.45)]">
          <Image src={brand.logoUrl} alt="" width={brand.logoWidth} height={brand.logoHeight} sizes="320px" className="h-auto w-[min(320px,26vw)]" priority />
        </div>
      </div>
    </div>
  );
}

const THEMES: Record<string, { bg: string; text: string; cta: string; muted: string }> = {
  blue: { bg: "bg-primary", text: "text-white", cta: "btn-accent", muted: "text-white/85" },
  yellow: { bg: "bg-accent", text: "text-ink", cta: "btn-primary", muted: "text-ink/75" },
  red: { bg: "bg-promo", text: "text-white", cta: "btn-accent", muted: "text-white/90" },
  green: { bg: "bg-[#1f7a26]", text: "text-white", cta: "btn-accent", muted: "text-white/90" },
  cream: { bg: "bg-soft-yellow", text: "text-ink", cta: "btn-primary", muted: "text-muted" },
};

/** Campanha cadastrada no painel: com imagem, a arte enviada ocupa o banner; sem imagem, banner tipográfico na cor do tema. */
function BannerSlide({ b, first }: { b: Banner; first: boolean }) {
  const t = THEMES[b.theme] ?? THEMES.blue;
  const Title = first ? "h1" : "h2";
  if (b.imageUrl) {
    return (
      <div className="relative flex h-full min-h-[300px] overflow-hidden rounded-2xl bg-ink sm:min-h-[380px]">
        <picture className="absolute inset-0">
          {b.mobileImageUrl && <source media="(max-width: 640px)" srcSet={b.mobileImageUrl} />}
          <Image src={b.imageUrl} alt="" fill priority={first} sizes="(max-width: 1024px) 100vw, 860px" className="object-cover" />
        </picture>
        <div className="relative flex max-w-xl flex-col justify-end gap-3 bg-gradient-to-t from-black/60 via-black/15 to-transparent p-6 text-white sm:justify-center sm:bg-gradient-to-r sm:p-10">
          <Title className="text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">{b.title}</Title>
          {b.subtitle && <p className="text-base opacity-90 sm:text-lg">{b.subtitle}</p>}
          {b.linkUrl && <Link href={b.linkUrl} className="btn btn-accent mt-1 w-fit">{b.ctaLabel || "Confira"}</Link>}
        </div>
      </div>
    );
  }
  return (
    <div className={`flex h-full min-h-[260px] flex-col justify-center gap-3 rounded-2xl p-6 sm:min-h-[340px] sm:p-10 ${t.bg} ${t.text}`}>
      <Title className="max-w-2xl text-[2rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">{b.title}</Title>
      {b.subtitle && <p className={`max-w-xl text-base sm:text-lg ${t.muted}`}>{b.subtitle}</p>}
      {b.linkUrl && <Link href={b.linkUrl} className={`btn mt-2 w-fit ${t.cta}`}>{b.ctaLabel || "Confira"}</Link>}
    </div>
  );
}

function SideCard({ href, title, text, icon, tone }: { href: string; title: string; text: string; icon: React.ReactNode; tone: string }) {
  return (
    <Link href={href} className={`group flex flex-col items-start gap-3 rounded-2xl p-4 transition hover:shadow-card sm:flex-row sm:items-center sm:gap-4 sm:p-6 ${tone}`}>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm sm:size-12">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-extrabold leading-tight sm:text-lg">{title}</span>
        <span className="mt-0.5 hidden text-sm text-ink/70 sm:block">{text}</span>
      </span>
      <ChevronRight size={20} className="hidden shrink-0 text-ink/50 transition group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}

export async function Hero({ items }: { items: Banner[] }) {
  const [{ brand }, deals] = await Promise.all([getSettings(), listProducts({ onSale: true, inStock: true, perPage: 1 })]);
  return (
    <section className="container-tv pt-4 sm:pt-6">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-4">
        {items.length ? (
          <div aria-roledescription="carrossel" aria-label="Destaques">
            <ul className="scrollbar-none flex h-full snap-x snap-mandatory gap-3 overflow-x-auto">
              {items.map((b, i) => (
                <li key={b.id} className="w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`${i + 1} de ${items.length}`}>
                  <BannerSlide b={b} first={i === 0} />
                </li>
              ))}
            </ul>
            {items.length > 1 && <p className="mt-2 text-center text-xs font-bold text-muted">Deslize para ver mais destaques</p>}
          </div>
        ) : <BrandBanner brand={brand} />}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
          <SideCard href="/presentes" title="Guia de presentes" text="Filtre por idade, orçamento e interesse." icon={<GiftIcon size={24} />} tone="bg-soft-yellow" />
          {deals.total > 0 ? (
            <SideCard href="/ofertas" title="Ofertas" text="Produtos com preço promocional." icon={<BoltIcon size={22} className="text-promo-ink" />} tone="bg-soft-red" />
          ) : (
            <SideCard href="/busca?ordem=newest" title="Novidades" text="Os últimos brinquedos que chegaram." icon={<StarIcon size={22} filled={false} />} tone="bg-soft-blue" />
          )}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- por idade */

const AGE_TONES = ["bg-soft-yellow", "bg-soft-blue", "bg-soft-green", "bg-[#ffeedd]", "bg-soft-blue", "bg-soft-yellow"];

/** "Compre por idade": números grandes, sem ilustração. */
export function ShopByAge() {
  return (
    <section className="container-tv reveal" aria-labelledby="por-idade">
      <SectionTitle id="por-idade" title="Compre por idade" />
      <ul className="grid grid-cols-3 gap-2.5 sm:gap-3 lg:grid-cols-6">
        {AGE_BANDS.map((b, i) => {
          const months = b.key === "0-12m";
          const n = months ? "0–12" : b.key === "12+" ? "12+" : b.key.replace("-", "–");
          return (
            <li key={b.key}>
              <Link href={`/busca?idade=${encodeURIComponent(b.key)}`} aria-label={`Brinquedos para ${b.label}`}
                className={`group flex h-full flex-col justify-between rounded-2xl p-3.5 transition hover:-translate-y-0.5 hover:shadow-card sm:p-5 ${AGE_TONES[i]}`}>
                <span className="text-[1.9rem] font-extrabold leading-none tracking-tight text-primary-dark sm:text-[2.6rem]">{n}</span>
                <span className="mt-2 flex items-center justify-between text-[13px] font-bold text-ink/75 sm:text-sm">
                  {months ? "meses" : "anos"}
                  <ChevronRight size={16} className="text-ink/40 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------ categorias */

async function CategoriesSection({ s }: { s: Section }) {
  const cats = await getFeaturedCategories();
  if (!cats.length) return null;
  return (
    <section className="container-tv reveal">
      <SectionTitle title={s.title ?? "Categorias"} subtitle={s.subtitle} href="/busca" linkLabel="Ver todos os brinquedos" />
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {cats.map((c) => (
          <li key={c.id}>
            <Link href={`/c/${c.slug}`} className="group flex h-full items-center gap-3 rounded-2xl border border-line bg-white p-3 transition hover:border-primary/40 hover:shadow-card sm:gap-4 sm:p-4">
              <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-soft-blue text-primary sm:size-14">
                {c.imageUrl ? <Image src={c.imageUrl} alt="" fill sizes="56px" className="object-cover" /> : <CategoryIcon slug={c.slug} size={26} />}
              </span>
              <span className="min-w-0 flex-1 text-[14px] font-bold leading-snug sm:text-[15px]">{c.name}</span>
              <ChevronRight size={18} className="hidden shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary sm:block" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* --------------------------------------------------------------- vitrines */

async function ProductsSection({ s, favorites }: { s: Section; favorites: Set<string> }) {
  const limit = Math.min(s.config.limit ?? 8, 16);
  let title = s.title ?? "";
  let subtitle = s.subtitle;
  let href: string | undefined;
  let items;
  let flashEnd: Date | null = null;
  switch (s.type) {
    case "best_sellers": {
      items = (await listProducts({ sort: "best_sellers", perPage: limit, inStock: true })).items;
      if (!items.some((i) => i.salesCount > 0)) { title = "Destaques da loja"; subtitle = null; } // sem vendas reais: nem "mais vendidos", nem subtítulo de popularidade
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

  return (
    <section className="container-tv reveal">
      {s.type === "flash" ? (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-promo-ink sm:text-3xl"><BoltIcon size={24} /> {title}</h2>
            {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-4">
            {flashEnd && (
              <p className="flex items-center gap-2 rounded-lg bg-promo px-3 py-1.5 text-sm font-bold text-white">
                Termina em <Countdown endsAt={flashEnd.toISOString()} />
              </p>
            )}
            <Link href="/ofertas" className="hidden text-sm font-extrabold text-primary hover:underline sm:inline">Ver todas</Link>
          </div>
        </div>
      ) : (
        <SectionTitle title={title} subtitle={subtitle} href={href} />
      )}
      <ProductRail items={items} favorites={favorites} />
    </section>
  );
}

/* ---------------------------------------------------------- benefícios */

const BENEFIT_ICONS = { truck: TruckIcon, shield: ShieldIcon, card: CardIcon, gift: GiftIcon, store: StoreIcon, chat: ChatIcon, star: StarIcon, refresh: RefreshIcon };

async function BenefitsSection({ s }: { s: Section }) {
  const { benefits } = await getSettings();
  if (!benefits.items.length) return null; // só benefícios confirmados no painel
  return (
    <section className="container-tv reveal" aria-label={s.title ?? "Por que comprar na ToyVille"}>
      <ul className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {benefits.items.map((b, i) => {
          const Icon = BENEFIT_ICONS[b.icon];
          return (
            <li key={i} className="flex items-start gap-3.5 bg-white p-4 sm:p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-soft-blue text-primary"><Icon /></span>
              <div><p className="font-extrabold leading-tight">{b.title}</p><p className="mt-0.5 text-sm text-muted">{b.description}</p></div>
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
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-white p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-soft-blue text-primary"><BoxIcon size={28} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Catálogo em cadastro</h2>
          <p className="mt-1 text-muted">Os produtos estão sendo cadastrados. Procurando algo específico? Fale com a gente.</p>
        </div>
        <Link href="/atendimento" className="btn btn-primary shrink-0">Falar com a loja</Link>
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
