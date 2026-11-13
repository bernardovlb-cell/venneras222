import { GiftFinderForm } from "./GiftFinderForm";
import { ToyArt } from "../art/ToyArt";

/** Painel azul do guia de presentes (home e /presentes). */
export function GiftFinderPanel({ title, subtitle, categories, defaults, headingLevel = "h2" }: {
  title: string; subtitle?: string | null; categories: { id: string; name: string }[];
  defaults?: { idade?: string; orcamento?: string; categoria?: string }; headingLevel?: "h1" | "h2";
}) {
  const H = headingLevel;
  return (
    <div className="tv-stars relative overflow-hidden rounded-[2.2rem] bg-primary px-4 pb-4 pt-7 text-white sm:p-8 lg:p-10">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-white/10" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 size-64 rounded-full bg-accent/20" />
      <div className="relative grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:items-center lg:gap-10">
        <div className="flex items-center gap-4 px-2 sm:px-0 lg:flex-col lg:items-start">
          <ToyArt art="gift" className="tv-float size-24 shrink-0 sm:size-32 lg:size-48" />
          <div>
            <p className="eyebrow !text-[#ffe08a]">Guia de presentes</p>
            <H className="text-[1.8rem] font-extrabold leading-[1.02] sm:text-[2.6rem]">{title}</H>
            <p className="mt-2 text-[15px] text-white/85 sm:text-base">{subtitle ?? "Três toques e a gente mostra o que combina."}</p>
            <p className="mt-3 hidden text-sm font-bold text-white/75 lg:block">Só sugerimos brinquedos disponíveis na loja.</p>
          </div>
        </div>
        <GiftFinderForm categories={categories} defaults={defaults} />
      </div>
    </div>
  );
}
