import Link from "next/link";
import Image from "next/image";
import type { banners } from "@/server/db/schema";
import { ChevronRight } from "../icons";
import { ShapesHero, ShapesBackdrop, ShapesCompact, type ShapeTheme } from "../brand/Shapes";

export type BannerView = Pick<typeof banners.$inferSelect, "id" | "title" | "subtitle" | "imageUrl" | "mobileImageUrl" | "linkUrl" | "ctaLabel" | "theme" | "textPosition" | "imageMode">;

const MAIN: Record<string, { bg: string; text: string; muted: string; cta: string; shape: ShapeTheme }> = {
  blue: { bg: "bg-primary", text: "text-white", muted: "text-white/85", cta: "btn-accent", shape: "blue" },
  yellow: { bg: "bg-accent", text: "text-ink", muted: "text-ink/80", cta: "btn-primary", shape: "yellow" },
  red: { bg: "bg-promo", text: "text-white", muted: "text-white/90", cta: "btn-accent", shape: "red" },
  green: { bg: "bg-[#1f7a26]", text: "text-white", muted: "text-white/90", cta: "btn-accent", shape: "green" },
  cream: { bg: "bg-soft-yellow", text: "text-ink", muted: "text-ink/75", cta: "btn-primary", shape: "cream" },
};

/** Foto do banner, com versão própria para celular quando enviada. Decorativa: o texto é real. */
function Photo({ b, priority, sizes, className }: { b: BannerView; priority: boolean; sizes: string; className: string }) {
  return (
    <picture>
      {b.mobileImageUrl && <source media="(max-width: 767px)" srcSet={b.mobileImageUrl} />}
      <Image src={b.imageUrl!} alt="" fill priority={priority} sizes={sizes} className={className} />
    </picture>
  );
}

/**
 * Banner principal de campanha. Texto e botão são elementos reais (nunca embutidos na imagem).
 * - `textPosition`: left | right (texto ao lado da foto) | overlay (texto sobre a foto, com véu de contraste).
 * - `imageMode`: cover (foto preenche a área) | cutout (foto recortada inteira, sobre formas da marca).
 * - Sem foto: composição de formas abstratas da marca.
 * `controls`: reserva espaço embaixo para os controles do carrossel.
 */
export function CampaignBanner({ b, first = false, controls = false }: { b: BannerView; first?: boolean; controls?: boolean }) {
  const t = MAIN[b.theme] ?? MAIN.blue;
  const Title = first ? "h1" : "h2";
  const pad = controls ? "pb-[4.5rem] sm:pb-20 lg:pb-[5.5rem]" : "";
  const sizes = "(max-width: 1023px) 100vw, 820px";

  if (b.imageUrl && b.textPosition === "overlay") {
    return (
      <div className="relative isolate flex h-full min-h-[440px] overflow-hidden rounded-panel bg-ink text-white md:min-h-[400px] lg:min-h-[460px]">
        <Photo b={b} priority={first} sizes={sizes} className="-z-10 object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent md:bg-gradient-to-r md:from-black/70 md:via-black/30" />
        <div className={`flex w-full flex-col justify-end gap-3 p-6 sm:p-9 md:max-w-[62%] md:justify-center lg:p-12 ${pad}`}>
          <Title className="text-[1.85rem] font-semibold leading-[1.06] sm:text-[2.5rem] lg:text-[2.6rem] xl:text-[2.75rem]">{b.title}</Title>
          {b.subtitle && <p className="max-w-md text-[15px] leading-relaxed text-white/90 sm:text-lg">{b.subtitle}</p>}
          {b.linkUrl && <Link href={b.linkUrl} className="btn btn-accent btn-lg mt-2 w-fit">{b.ctaLabel || "Ver mais"}</Link>}
        </div>
      </div>
    );
  }

  const right = b.textPosition === "right";
  return (
    <div className={`relative isolate grid h-full grid-cols-[minmax(0,1fr)] overflow-hidden rounded-panel md:min-h-[400px] md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:min-h-[460px] ${t.bg} ${t.text}`}>
      <div className={`flex flex-col justify-center gap-3 p-6 sm:p-9 lg:p-10 xl:p-12 ${pad} ${right ? "md:order-2" : ""}`}>
        <Title className="text-[1.85rem] font-semibold leading-[1.06] sm:text-[2.5rem] lg:text-[2.6rem] xl:text-[2.75rem]">{b.title}</Title>
        {b.subtitle && <p className={`max-w-md text-[15px] leading-relaxed sm:text-lg ${t.muted}`}>{b.subtitle}</p>}
        {b.linkUrl && <Link href={b.linkUrl} className={`btn btn-lg mt-2 w-fit ${t.cta}`}>{b.ctaLabel || "Ver mais"}</Link>}
      </div>
      <div className={`relative order-first md:order-none md:h-auto ${b.imageUrl ? "h-52 sm:h-64" : "h-36 sm:h-48"}`}>
        {!b.imageUrl ? (
          <ShapesHero theme={t.shape} className="absolute inset-0 size-full px-5 pt-5 md:p-8" />
        ) : b.imageMode === "cutout" ? (
          <>
            <ShapesBackdrop theme={t.shape} className="absolute inset-0 size-full p-4 md:p-6" />
            <Photo b={b} priority={first} sizes="(max-width: 767px) 100vw, 420px" className="object-contain object-bottom p-4 drop-shadow-[0_18px_16px_rgba(0,0,0,.28)] md:p-6" />
          </>
        ) : (
          <div className={`absolute inset-0 ${right ? "tv-photo-left" : "tv-photo-right"}`}>
            <Photo b={b} priority={first} sizes="(max-width: 767px) 100vw, 420px" className="object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}

const SIDE: Record<string, { bg: string; shape: ShapeTheme }> = {
  blue: { bg: "bg-soft-blue", shape: "soft-blue" },
  yellow: { bg: "bg-soft-yellow", shape: "soft-yellow" },
  green: { bg: "bg-soft-green", shape: "soft-green" },
  red: { bg: "bg-soft-red", shape: "white" },
  cream: { bg: "bg-white ring-1 ring-inset ring-line", shape: "white" },
};

/** Banner secundário (compacto). O cartão inteiro leva ao link; sem link, é só informativo. */
export function SideBanner({ b, variant = 0 }: { b: BannerView; variant?: number }) {
  const t = SIDE[b.theme] ?? SIDE.blue;
  return (
    <article className={`group relative isolate flex h-full min-h-[168px] overflow-hidden rounded-panel text-ink transition duration-300 ease-brand hover:shadow-lift ${t.bg}`}>
      <div className="flex w-[58%] flex-col justify-center gap-1.5 p-5 sm:p-6">
        <h2 className="text-[1.35rem] font-semibold leading-tight sm:text-2xl">
          {b.linkUrl ? <Link href={b.linkUrl} className="after:absolute after:inset-0 after:content-['']">{b.title}</Link> : b.title}
        </h2>
        {b.subtitle && <p className="text-sm leading-snug text-ink/75">{b.subtitle}</p>}
        {b.linkUrl && (
          <span aria-hidden className="mt-1.5 inline-flex items-center gap-1 text-sm font-extrabold text-primary">
            {b.ctaLabel || "Ver"} <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
          </span>
        )}
      </div>
      <div className="absolute inset-y-0 right-0 -z-10 w-[46%]">
        {!b.imageUrl ? (
          <ShapesCompact mono theme={t.shape} variant={variant} className="absolute inset-0 size-full p-3 transition duration-500 ease-brand group-hover:scale-105" />
        ) : b.imageMode === "cutout" ? (
          <Image src={b.imageUrl} alt="" fill sizes="220px" className="object-contain object-bottom p-2 drop-shadow-[0_12px_10px_rgba(0,0,0,.22)] transition duration-500 ease-brand group-hover:scale-105" />
        ) : (
          <div className="tv-photo-right absolute inset-0"><Image src={b.imageUrl} alt="" fill sizes="220px" className="object-cover transition duration-500 ease-brand group-hover:scale-105" /></div>
        )}
      </div>
    </article>
  );
}

/** Campanhas padrão quando não há nenhum banner ativo no painel (a home nunca fica sem destaque). */
export const FALLBACK_MAIN: BannerView = {
  id: "padrao-principal", title: "Um mundo de brincadeiras espera por você", subtitle: "Brinquedos para todas as idades, dos primeiros meses às brincadeiras em família.",
  imageUrl: null, mobileImageUrl: null, linkUrl: "/busca", ctaLabel: "Ver brinquedos", theme: "blue", textPosition: "left", imageMode: "cutout",
};
export const FALLBACK_SIDE: BannerView[] = [
  { id: "padrao-guia", title: "Encontre o presente perfeito", subtitle: "Sugestões por idade e orçamento.", imageUrl: null, mobileImageUrl: null, linkUrl: "/presentes", ctaLabel: "Abrir o guia", theme: "yellow", textPosition: "left", imageMode: "cutout" },
  { id: "padrao-categorias", title: "Todas as categorias", subtitle: "Escolha pelo tipo de brinquedo.", imageUrl: null, mobileImageUrl: null, linkUrl: "/categorias", ctaLabel: "Explorar", theme: "green", textPosition: "left", imageMode: "cutout" },
];
