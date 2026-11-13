"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "../icons";

/**
 * Carrossel horizontal de conteúdo (vitrines): desliza por toque e ganha setas no desktop.
 * As setas só aparecem quando há mais itens do que cabem e ficam desativadas no fim de cada lado.
 * Todo item continua acessível por teclado e por rolagem.
 */
export function ScrollRail({ children, label, itemClass = "w-[46%] sm:w-[31%] lg:w-[23.4%]" }: { children: React.ReactNode[]; label: string; itemClass?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ overflow: false, start: true, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth;
      setEdges({ overflow: max > 4, start: el.scrollLeft <= 4, end: el.scrollLeft >= max - 4 });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener("scroll", measure); };
  }, []);

  const by = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: smooth ? "smooth" : "auto" });
  };
  const arrow = "absolute top-[30%] z-20 hidden size-11 place-items-center rounded-full bg-white text-ink shadow-pop ring-1 ring-line transition hover:bg-soft-blue disabled:opacity-0 lg:grid";
  return (
    <div className="relative">
      <ul ref={ref} aria-label={label} className="tv-rail -mx-4 gap-3 px-4 pb-3 pt-1 sm:mx-0 sm:gap-4 sm:px-0">
        {children.map((c, i) => <li key={i} className={itemClass}>{c}</li>)}
      </ul>
      {edges.overflow && (
        <>
          <button type="button" onClick={() => by(-1)} disabled={edges.start} aria-label={`${label}: anteriores`} className={`${arrow} -left-4`}><ChevronLeft size={22} /></button>
          <button type="button" onClick={() => by(1)} disabled={edges.end} aria-label={`${label}: próximos`} className={`${arrow} -right-4`}><ChevronRight size={22} /></button>
        </>
      )}
    </div>
  );
}
