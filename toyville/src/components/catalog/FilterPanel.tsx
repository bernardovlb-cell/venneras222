"use client";
import { useEffect, useState } from "react";
import { FilterIcon, CloseIcon } from "../icons";

/** Desktop: barra lateral fixa. Celular: painel inferior acionado por botão (alvo de toque grande). */
export function FilterPanel({ activeCount, children }: { activeCount: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-outline btn-sm lg:hidden" aria-expanded={open} aria-controls="filtros">
        <FilterIcon size={18} /> Filtrar{activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] text-white">{activeCount}</span>}
      </button>
      {open && <button type="button" aria-label="Fechar filtros" className="fixed inset-0 z-[55] bg-ink/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside id="filtros" aria-label="Filtros"
        className={`${open ? "fixed inset-x-0 bottom-0 z-[60] max-h-[85dvh] animate-slide-up overflow-y-auto rounded-t-[1.75rem] bg-white p-5 shadow-pop" : "hidden"} lg:static lg:block lg:max-h-none lg:animate-none lg:overflow-visible lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none`}>
        <div className="mb-3 flex items-center justify-between lg:hidden">
          <p className="font-display text-xl font-extrabold">Filtros</p>
          <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost !px-2.5" aria-label="Fechar filtros"><CloseIcon /></button>
        </div>
        {children}
      </aside>
    </>
  );
}
