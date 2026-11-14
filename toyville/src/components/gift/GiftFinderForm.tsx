"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AGE_BANDS } from "@/lib/age";
import { BUDGETS } from "@/lib/gift";
import { CloseIcon, GiftIcon } from "../icons";

const AGE_SHORT: Record<string, [string, string]> = { "0-12m": ["0–12", "meses"], "1-2": ["1–2", "anos"], "3-4": ["3–4", "anos"], "5-7": ["5–7", "anos"], "8-11": ["8–11", "anos"], "12+": ["12+", "anos"] };

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <legend className="mb-3 flex items-center gap-2.5 text-[15px] font-extrabold">
      <span aria-hidden className="grid size-7 place-items-center rounded-full bg-accent text-sm text-ink">{n}</span>
      {children}
    </legend>
  );
}

const chip = "inline-flex min-h-[44px] cursor-pointer items-center whitespace-nowrap rounded-full border-2 border-line bg-white px-4 text-sm font-bold transition duration-200 hover:border-primary/50 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-primary/30";

/**
 * Guia de presentes: painel com todas as opções visíveis (não é um questionário em etapas).
 * Mostra as escolhas feitas, permite trocar ou limpar cada uma, valida a idade antes de buscar e
 * indica o carregamento. Sem JavaScript continua funcionando como formulário GET comum.
 * A busca usa somente produtos reais do catálogo (página /presentes).
 */
export function GiftFinderForm({ categories, defaults = {} }: { categories: { id: string; name: string }[]; defaults?: { idade?: string; orcamento?: string; categoria?: string } }) {
  const [age, setAge] = useState(defaults.idade ?? "");
  const [budget, setBudget] = useState(defaults.orcamento ?? "");
  const [cat, setCat] = useState(defaults.categoria ?? "");
  const [missing, setMissing] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const firstAge = useRef<HTMLInputElement>(null);

  const picked = [
    age && { key: "age", label: AGE_BANDS.find((b) => b.key === age)?.label ?? age, clear: () => setAge("") },
    budget && { key: "budget", label: BUDGETS.find((b) => b.key === budget)?.label ?? budget, clear: () => setBudget("") },
    cat && { key: "cat", label: categories.find((c) => c.id === cat)?.name ?? "Categoria", clear: () => setCat("") },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!age) { setMissing(true); firstAge.current?.focus(); return; }
    const qs = new URLSearchParams({ idade: age });
    if (budget) qs.set("orcamento", budget);
    if (cat) qs.set("categoria", cat);
    start(() => router.push(`/presentes?${qs.toString()}`));
  }

  return (
    <form action="/presentes" method="get" onSubmit={submit} noValidate
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 rounded-panel bg-white p-4 text-ink shadow-pop sm:p-7">
      <fieldset aria-describedby={missing ? "gf-erro" : undefined}>
        <Step n={1}>Qual a idade da criança?</Step>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {AGE_BANDS.map((b, i) => (
            <label key={b.key} className="group relative cursor-pointer">
              <input ref={i === 0 ? firstAge : undefined} type="radio" name="idade" value={b.key} checked={age === b.key}
                onChange={() => { setAge(b.key); setMissing(false); }} className="peer sr-only" />
              <span className="flex h-full flex-col items-center rounded-2xl border-2 border-line bg-white px-1 py-3 text-center transition duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/50 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-card peer-focus-visible:ring-4 peer-focus-visible:ring-primary/30">
                <span className="sr-only">{b.label}</span>
                <span aria-hidden className="font-display text-[1.45rem] font-semibold leading-none">{AGE_SHORT[b.key]?.[0] ?? b.label}</span>
                <span aria-hidden className="mt-1 text-xs font-bold opacity-75">{AGE_SHORT[b.key]?.[1]}</span>
              </span>
            </label>
          ))}
        </div>
        {missing && <p id="gf-erro" role="alert" className="error-text">Escolha a idade da criança para ver as sugestões.</p>}
      </fieldset>

      <fieldset>
        <Step n={2}>Quanto quer investir?</Step>
        <div className="flex flex-wrap gap-2">
          <label className="relative"><input type="radio" name="orcamento" value="" checked={budget === ""} onChange={() => setBudget("")} className="peer sr-only" /><span className={chip}>Qualquer valor</span></label>
          {BUDGETS.map((b) => (
            <label key={b.key} className="relative"><input type="radio" name="orcamento" value={b.key} checked={budget === b.key} onChange={() => setBudget(b.key)} className="peer sr-only" /><span className={chip}>{b.label}</span></label>
          ))}
        </div>
      </fieldset>

      {categories.length > 0 && (
        <fieldset className="min-w-0">
          <Step n={3}>Do que a criança gosta?</Step>
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <label className="relative shrink-0"><input type="radio" name="categoria" value="" checked={cat === ""} onChange={() => setCat("")} className="peer sr-only" /><span className={chip}>Tanto faz</span></label>
            {categories.map((c) => (
              <label key={c.id} className="relative shrink-0"><input type="radio" name="categoria" value={c.id} checked={cat === c.id} onChange={() => setCat(c.id)} className="peer sr-only" /><span className={chip}>{c.name}</span></label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-[2rem] min-w-0" aria-live="polite">
          {picked.length === 0 ? (
            <p className="text-sm text-muted">Comece pela idade. Orçamento e categoria são opcionais.</p>
          ) : (
            <ul className="flex flex-wrap items-center gap-1.5" aria-label="Suas escolhas">
              {picked.map((p) => (
                <li key={p.key}>
                  <button type="button" onClick={p.clear} aria-label={`Remover: ${p.label}`}
                    className="inline-flex min-h-[32px] items-center gap-1 rounded-full bg-soft-blue py-1 pl-3 pr-1.5 text-[13px] font-bold text-primary-dark transition hover:bg-primary hover:text-white">
                    {p.label} <CloseIcon size={14} />
                  </button>
                </li>
              ))}
              <li><button type="button" onClick={() => { setAge(""); setBudget(""); setCat(""); setMissing(false); }} className="min-h-[32px] px-2 text-[13px] font-bold text-muted underline-offset-2 hover:text-ink hover:underline">Limpar tudo</button></li>
            </ul>
          )}
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full shrink-0 sm:w-auto">
          <GiftIcon size={20} /> {pending ? "Buscando…" : "Ver presentes"}
        </button>
      </div>
    </form>
  );
}
