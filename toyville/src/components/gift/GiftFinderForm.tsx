import { AGE_BANDS } from "@/lib/age";

export const BUDGETS = [
  { key: "ate-50", label: "Até R$ 50", min: null, max: 5000 },
  { key: "50-100", label: "R$ 50 a R$ 100", min: 5000, max: 10000 },
  { key: "100-200", label: "R$ 100 a R$ 200", min: 10000, max: 20000 },
  { key: "200-mais", label: "Acima de R$ 200", min: 20000, max: null },
] as const;

const AGE_SHORT: Record<string, [string, string]> = { "0-12m": ["0–12", "meses"], "1-2": ["1–2", "anos"], "3-4": ["3–4", "anos"], "5-7": ["5–7", "anos"], "8-11": ["8–11", "anos"], "12+": ["12+", "anos"] };

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <legend className="mb-2.5 flex items-center gap-2 text-[15px] font-extrabold">
      <span aria-hidden className="grid size-6 place-items-center rounded-full bg-ink text-xs text-white">{n}</span>
      {children}
    </legend>
  );
}

const chip = "inline-flex min-h-[42px] cursor-pointer items-center whitespace-nowrap rounded-xl border border-line bg-white px-4 text-sm font-bold transition hover:border-primary/40 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-primary/30";

/**
 * Guia de presentes. Formulário GET com rádios nativos: funciona sem JavaScript,
 * é navegável por teclado (setas dentro de cada grupo) e gera URL compartilhável.
 */
export function GiftFinderForm({ categories, defaults = {} }: { categories: { id: string; name: string }[]; defaults?: { idade?: string; orcamento?: string; categoria?: string } }) {
  return (
    <form action="/presentes" method="get" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 rounded-2xl border border-line bg-white p-4 text-ink sm:p-6">
      <fieldset>
        <Step n={1}>Qual a idade da criança?</Step>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {AGE_BANDS.map((b) => (
            <label key={b.key} className="group relative cursor-pointer">
              <input type="radio" name="idade" value={b.key} required defaultChecked={defaults.idade === b.key} className="peer sr-only" />
              <span className="flex h-full flex-col items-center rounded-xl border border-line bg-white px-1 py-2.5 text-center transition group-hover:border-primary/40 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-primary/30">
                <span className="sr-only">{b.label}</span>
                <span aria-hidden className="text-xl font-extrabold leading-none tracking-tight">{AGE_SHORT[b.key]?.[0] ?? b.label}</span>
                <span aria-hidden className="mt-1 text-xs font-bold opacity-75">{AGE_SHORT[b.key]?.[1]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <Step n={2}>Quanto quer investir?</Step>
        <div className="flex flex-wrap gap-2">
          <label className="relative"><input type="radio" name="orcamento" value="" defaultChecked={!defaults.orcamento} className="peer sr-only" /><span className={chip}>Qualquer valor</span></label>
          {BUDGETS.map((b) => (
            <label key={b.key} className="relative"><input type="radio" name="orcamento" value={b.key} defaultChecked={defaults.orcamento === b.key} className="peer sr-only" /><span className={chip}>{b.label}</span></label>
          ))}
        </div>
      </fieldset>
      {categories.length > 0 && (
        <fieldset className="min-w-0">
          <Step n={3}>Do que a criança gosta?</Step>
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <label className="relative shrink-0"><input type="radio" name="categoria" value="" defaultChecked={!defaults.categoria} className="peer sr-only" /><span className={chip}>Tanto faz</span></label>
            {categories.map((c) => (
              <label key={c.id} className="relative shrink-0"><input type="radio" name="categoria" value={c.id} defaultChecked={defaults.categoria === c.id} className="peer sr-only" /><span className={chip}>{c.name}</span></label>
            ))}
          </div>
        </fieldset>
      )}
      <button type="submit" className="btn btn-primary btn-lg w-full">Ver presentes</button>
    </form>
  );
}
