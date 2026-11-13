import { AGE_BANDS } from "@/lib/age";
import { ToyArt, AGE_ART } from "../art/ToyArt";

export const BUDGETS = [
  { key: "ate-50", label: "Até R$ 50", min: null, max: 5000 },
  { key: "50-100", label: "R$ 50 a R$ 100", min: 5000, max: 10000 },
  { key: "100-200", label: "R$ 100 a R$ 200", min: 10000, max: 20000 },
  { key: "200-mais", label: "Acima de R$ 200", min: 20000, max: null },
] as const;

const AGE_SHORT: Record<string, string> = { "0-12m": "0 a 12 meses", "1-2": "1 e 2 anos", "3-4": "3 e 4 anos", "5-7": "5 a 7 anos", "8-11": "8 a 11 anos", "12+": "12 anos +" };

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <legend className="mb-2.5 flex items-center gap-2 text-[15px] font-extrabold">
      <span aria-hidden className="grid size-6 place-items-center rounded-full bg-accent font-display text-sm text-ink">{n}</span>
      {children}
    </legend>
  );
}

const chip = "inline-flex min-h-[42px] cursor-pointer items-center whitespace-nowrap rounded-full border-2 border-line bg-white px-4 text-sm font-bold transition hover:border-primary/40 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-primary/30";

/**
 * Guia de presentes. Formulário GET com rádios nativos: funciona sem JavaScript,
 * é navegável por teclado (setas dentro de cada grupo) e gera URL compartilhável.
 */
export function GiftFinderForm({ categories, defaults = {} }: { categories: { id: string; name: string }[]; defaults?: { idade?: string; orcamento?: string; categoria?: string } }) {
  return (
    <form action="/presentes" method="get" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 rounded-[1.75rem] bg-white p-4 text-ink shadow-pop sm:p-6">
      <fieldset>
        <Step n={1}>Qual a idade da criança?</Step>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {AGE_BANDS.map((b) => (
            <label key={b.key} className="group relative cursor-pointer">
              <input type="radio" name="idade" value={b.key} required defaultChecked={defaults.idade === b.key} className="peer sr-only" />
              <span className="flex h-full flex-col items-center gap-1 rounded-2xl border-2 border-line bg-cream px-1 pb-2 pt-1.5 text-center transition group-hover:-translate-y-0.5 group-hover:border-primary/40 peer-checked:border-primary peer-checked:bg-soft-blue peer-checked:shadow-[0_3px_0_var(--tv-primary)] peer-focus-visible:ring-4 peer-focus-visible:ring-primary/30">
                <ToyArt art={AGE_ART[b.key]} className="tv-wiggle size-12 sm:size-14" />
                <span className="text-[12.5px] font-extrabold leading-tight">{AGE_SHORT[b.key] ?? b.label}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <Step n={2}>Quanto quer investir?</Step>
        <div className="flex flex-wrap gap-2">
          <label><input type="radio" name="orcamento" value="" defaultChecked={!defaults.orcamento} className="peer sr-only" /><span className={chip}>Qualquer valor</span></label>
          {BUDGETS.map((b) => (
            <label key={b.key}><input type="radio" name="orcamento" value={b.key} defaultChecked={defaults.orcamento === b.key} className="peer sr-only" /><span className={chip}>{b.label}</span></label>
          ))}
        </div>
      </fieldset>
      {categories.length > 0 && (
        <fieldset className="min-w-0">
          <Step n={3}>Do que a criança gosta?</Step>
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <label className="shrink-0"><input type="radio" name="categoria" value="" defaultChecked={!defaults.categoria} className="peer sr-only" /><span className={chip}>Tanto faz</span></label>
            {categories.map((c) => (
              <label key={c.id} className="shrink-0"><input type="radio" name="categoria" value={c.id} defaultChecked={defaults.categoria === c.id} className="peer sr-only" /><span className={chip}>{c.name}</span></label>
            ))}
          </div>
        </fieldset>
      )}
      <button type="submit" className="btn btn-primary btn-lg w-full">Ver presentes</button>
    </form>
  );
}
