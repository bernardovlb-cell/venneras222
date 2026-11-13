import { GiftFinderForm } from "./GiftFinderForm";
import { GiftIcon } from "../icons";

/**
 * Guia de presentes (home e /presentes): apresentação + painel de opções.
 * `framed`: desenha o próprio fundo (usado na página /presentes; na home a seção já tem a faixa).
 */
export function GiftFinderPanel({ title, subtitle, categories, defaults, headingLevel = "h2", framed = false }: {
  title: string; subtitle?: string | null; categories: { id: string; name: string }[];
  defaults?: { idade?: string; orcamento?: string; categoria?: string }; headingLevel?: "h1" | "h2"; framed?: boolean;
}) {
  const H = headingLevel;
  return (
    <div className={framed ? "relative isolate overflow-hidden rounded-panel bg-soft-blue p-4 sm:p-8" : "relative isolate"}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,0.62fr)_minmax(0,1.38fr)] lg:items-center lg:gap-10">
        <div className="px-1 sm:px-0">
          <span aria-hidden className="mb-4 grid size-14 place-items-center rounded-2xl bg-accent text-ink shadow-card"><GiftIcon size={28} /></span>
          <H className="text-[1.75rem] font-semibold leading-[1.08] text-primary-dark sm:text-[2.4rem]">{title}</H>
          <p className="mt-2 text-[15px] text-ink/75 sm:text-lg">{subtitle ?? "Escolha a idade, o orçamento e o que a criança curte."}</p>
          <p className="mt-3 hidden text-sm font-bold text-muted lg:block">Só sugerimos brinquedos disponíveis em estoque.</p>
        </div>
        <GiftFinderForm categories={categories} defaults={defaults} />
      </div>
    </div>
  );
}
