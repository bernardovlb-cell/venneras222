import { GiftFinderForm } from "./GiftFinderForm";

/** Guia de presentes (home e /presentes). */
export function GiftFinderPanel({ title, subtitle, categories, defaults, headingLevel = "h2" }: {
  title: string; subtitle?: string | null; categories: { id: string; name: string }[];
  defaults?: { idade?: string; orcamento?: string; categoria?: string }; headingLevel?: "h1" | "h2";
}) {
  const H = headingLevel;
  return (
    <div className="rounded-2xl bg-soft-blue p-4 sm:p-8">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:items-start lg:gap-10">
        <div className="px-1 pt-2 sm:px-0 lg:pt-4">
          <H className="text-[1.6rem] font-extrabold leading-tight tracking-tight text-primary-dark sm:text-[2.1rem]">{title}</H>
          <p className="mt-2 text-[15px] text-ink/75 sm:text-base">{subtitle ?? "Escolha a idade, o orçamento e o interesse."}</p>
          <p className="mt-4 hidden text-sm text-muted lg:block">Sugerimos apenas brinquedos disponíveis em estoque.</p>
        </div>
        <GiftFinderForm categories={categories} defaults={defaults} />
      </div>
    </div>
  );
}
