import Link from "next/link";
import Image from "next/image";
import { listProducts, getFeaturedCategories } from "@/server/services/catalog";
import { getSettings } from "@/server/settings";
import { ProductRail } from "../product/ProductCard";
import { SectionTitle } from "../ui/States";
import { GiftFinderForm } from "../gift/GiftFinderForm";
import { TruckIcon, ShieldIcon, CardIcon, GiftIcon, StoreIcon, ChatIcon, StarIcon, RefreshIcon, BoltIcon } from "../icons";
import { Countdown } from "../product/Countdown";
import type { banners, homeSections } from "@/server/db/schema";

type Section = typeof homeSections.$inferSelect;
type Banner = typeof banners.$inferSelect;

const THEMES: Record<string, string> = {
  blue: "bg-primary text-white",
  yellow: "bg-accent text-ink",
  red: "bg-promo text-white",
  green: "bg-success text-white",
  cream: "bg-soft-yellow text-ink",
};

function Decorations() {
  return (
    <svg aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 opacity-25 sm:h-56 sm:w-56" viewBox="0 0 100 100">
      <path d="M50 5l11 23 25 3-18 18 4 25-22-12-22 12 4-25L14 31l25-3z" fill="currentColor" />
    </svg>
  );
}

export function Hero({ items }: { items: Banner[] }) {
  if (!items.length) {
    return (
      <section className="container-tv pt-4 sm:pt-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-10 text-white sm:px-12 sm:py-16">
          <Decorations />
          <div className="relative max-w-xl">
            <p className="chip bg-accent text-ink">Bem-vindo à ToyVille</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] sm:text-5xl">Brinquedos que fazem a infância brilhar</h1>
            <p className="mt-3 text-white/85 sm:text-lg">Encontre o presente certo por idade, categoria e orçamento.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/presentes" className="btn btn-accent">Encontrar presente</Link>
              <Link href="/busca" className="btn btn-outline !border-white !bg-transparent !text-white hover:!bg-white/10">Ver todos os brinquedos</Link>
            </div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="container-tv pt-4 sm:pt-6" aria-roledescription="carrossel" aria-label="Destaques">
      <ul className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto">
        {items.map((b, i) => (
          <li key={b.id} className="w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`${i + 1} de ${items.length}`}>
            <div className={`relative flex min-h-[260px] overflow-hidden rounded-[2rem] sm:min-h-[340px] ${THEMES[b.theme] ?? THEMES.blue}`}>
              {b.imageUrl && (
                <picture className="absolute inset-0">
                  {b.mobileImageUrl && <source media="(max-width: 640px)" srcSet={b.mobileImageUrl} />}
                  <Image src={b.imageUrl} alt="" fill priority={i === 0} sizes="100vw" className="object-cover" />
                </picture>
              )}
              {!b.imageUrl && <Decorations />}
              <div className={`relative flex max-w-xl flex-col justify-center gap-3 px-6 py-10 sm:px-12 ${b.imageUrl ? "bg-gradient-to-r from-black/45 to-transparent text-white" : ""}`}>
                {i === 0 ? <h1 className="text-3xl font-extrabold leading-[1.05] sm:text-5xl">{b.title}</h1> : <h2 className="text-3xl font-extrabold leading-[1.05] sm:text-5xl">{b.title}</h2>}
                {b.subtitle && <p className="text-base opacity-90 sm:text-lg">{b.subtitle}</p>}
                {b.linkUrl && <Link href={b.linkUrl} className={`btn mt-2 w-fit ${b.theme === "yellow" || b.theme === "cream" ? "btn-primary" : "btn-accent"}`}>{b.ctaLabel || "Confira"}</Link>}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {items.length > 1 && <p className="mt-2 text-center text-xs text-muted">Deslize para ver mais destaques</p>}
    </section>
  );
}

const TILE_COLORS = ["bg-soft-blue text-primary-dark", "bg-soft-yellow text-ink", "bg-soft-red text-[#9c1015]", "bg-soft-green text-[#1d5e1d]"];
const TILE_EMOJI: Record<string, string> = {
  "brinquedos-educativos": "🧩", "bonecas-e-acessorios": "🎎", "carrinhos-e-pistas": "🏎️", "jogos-de-tabuleiro": "🎲",
  pelucias: "🧸", "brinquedos-para-bebes": "🍼", "blocos-de-montar": "🧱", "brinquedos-eletronicos": "🤖",
};

async function CategoriesSection({ s }: { s: Section }) {
  const cats = await getFeaturedCategories();
  if (!cats.length) return null;
  return (
    <section className="container-tv">
      <SectionTitle title={s.title ?? "Categorias"} subtitle={s.subtitle} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {cats.map((c, i) => (
          <li key={c.id}>
            <Link href={`/c/${c.slug}`} className={`group flex h-full flex-col items-center gap-2 rounded-3xl p-4 text-center transition hover:-translate-y-1 hover:shadow-card ${TILE_COLORS[i % 4]}`}>
              <span className="grid size-16 place-items-center overflow-hidden rounded-full bg-white text-3xl shadow-card transition group-hover:scale-110" aria-hidden>
                {c.imageUrl ? <Image src={c.imageUrl} alt="" width={64} height={64} className="size-full object-cover" /> : (TILE_EMOJI[c.slug] ?? "⭐")}
              </span>
              <span className="text-sm font-extrabold leading-tight">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function ProductsSection({ s, favorites }: { s: Section; favorites: Set<string> }) {
  const limit = Math.min(s.config.limit ?? 8, 16);
  let title = s.title ?? "";
  let href: string | undefined;
  let items;
  let flashEnd: Date | null = null;
  switch (s.type) {
    case "best_sellers": {
      items = (await listProducts({ sort: "best_sellers", perPage: limit, inStock: true })).items;
      if (!items.some((i) => i.salesCount > 0)) title = "Destaques da loja"; // não chama de "mais vendidos" sem vendas reais
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
    <section className={`container-tv ${s.type === "flash" ? "" : ""}`}>
      {s.type === "flash" ? (
        <div className="rounded-[2rem] bg-soft-red p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-2xl font-extrabold text-promo sm:text-3xl"><BoltIcon size={26} /> {title}</h2>
            {flashEnd && <span className="rounded-full bg-promo px-3 py-1.5 text-white">Termina em <Countdown endsAt={flashEnd.toISOString()} /></span>}
          </div>
          <ProductRail items={items} favorites={favorites} />
        </div>
      ) : (
        <>
          <SectionTitle title={title} subtitle={s.subtitle} href={href} />
          <ProductRail items={items} favorites={favorites} />
        </>
      )}
    </section>
  );
}

const BENEFIT_ICONS = { truck: TruckIcon, shield: ShieldIcon, card: CardIcon, gift: GiftIcon, store: StoreIcon, chat: ChatIcon, star: StarIcon, refresh: RefreshIcon };

async function BenefitsSection({ s }: { s: Section }) {
  const { benefits } = await getSettings();
  if (!benefits.items.length) return null; // só benefícios confirmados no painel
  return (
    <section className="container-tv">
      <SectionTitle title={s.title ?? "Por que comprar na ToyVille"} subtitle={s.subtitle} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.items.map((b, i) => {
          const Icon = BENEFIT_ICONS[b.icon];
          return (
            <li key={i} className="card flex items-start gap-3 p-4">
              <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${TILE_COLORS[i % 4]}`}><Icon /></span>
              <div><p className="font-extrabold">{b.title}</p><p className="text-sm text-muted">{b.description}</p></div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

async function GiftSection({ s }: { s: Section }) {
  const cats = (await getFeaturedCategories()).map((c) => ({ id: c.id, name: c.name }));
  return (
    <section className="container-tv">
      <div className="relative overflow-hidden rounded-[2rem] bg-accent p-6 sm:p-10">
        <svg aria-hidden className="absolute -bottom-10 -right-10 h-48 w-48 text-white/40" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="currentColor" /></svg>
        <div className="relative grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <span className="grid size-14 place-items-center rounded-2xl bg-white text-primary shadow-card"><GiftIcon size={30} /></span>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight">{s.title ?? "Encontre o presente perfeito"}</h2>
            {s.subtitle && <p className="mt-1 font-semibold text-ink/75">{s.subtitle}</p>}
          </div>
          <GiftFinderForm categories={cats} />
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
