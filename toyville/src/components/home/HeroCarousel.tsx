"use client";
import { Children, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "../icons";

function subscribeMotion(cb: () => void) {
  const m = window.matchMedia("(prefers-reduced-motion: reduce)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
function subscribeVisibility(cb: () => void) {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
}

/**
 * Carrossel do banner principal.
 * - Rotação automática a cada `intervalMs` (um único temporizador, recriado a cada troca).
 * - Pausa com o mouse em cima (só mouse: toque não "prende" a pausa), com foco de teclado dentro,
 *   fora da tela, em aba oculta e com
 *   "reduzir movimento" ativo. Há botão para pausar/retomar.
 * - Qualquer navegação manual (setas, indicadores, toque) interrompe a rotação: o banner não muda
 *   sozinho depois que a pessoa interagiu. Só volta a girar se ela apertar "retomar".
 * - Desliza por toque (encaixe nativo). Todos os slides têm a mesma altura: sem salto de layout.
 * - Slides fora de vista ficam inertes (não recebem foco).
 */
export function HeroCarousel({ children, intervalMs, label = "Campanhas em destaque" }: { children: React.ReactNode; intervalMs: number; label?: string }) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const programmatic = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const reduced = useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  const tabVisible = useSyncExternalStore(subscribeVisibility, () => !document.hidden, () => true);

  const go = useCallback((i: number) => {
    const el = track.current;
    if (!el || count === 0) return;
    const n = ((i % count) + count) % count;
    if (programmatic.current) window.clearTimeout(programmatic.current);
    programmatic.current = window.setTimeout(() => { programmatic.current = null; }, 700);
    el.scrollTo({ left: n * el.clientWidth, behavior: reduced ? "auto" : "smooth" });
    indexRef.current = n;
    setIndex(n);
  }, [count, reduced]);

  const manual = useCallback((i: number) => { setUserPaused(true); go(i); }, [go]);

  // Rotação automática
  const playing = count > 1 && !userPaused && !hovered && !focused && onScreen && tabVisible && !reduced;
  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => go(indexRef.current + 1), intervalMs);
    return () => window.clearTimeout(t);
  }, [playing, index, intervalMs, go]);

  // Fora da tela → pausa; redimensionou → realinha sem animar
  useEffect(() => {
    const el = root.current, tr = track.current;
    if (!el || !tr) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    const ro = new ResizeObserver(() => tr.scrollTo({ left: indexRef.current * tr.clientWidth, behavior: "auto" }));
    ro.observe(tr);
    return () => { io.disconnect(); ro.disconnect(); if (programmatic.current) window.clearTimeout(programmatic.current); };
  }, []);

  // Deslize por toque/rolagem: acompanha o slide visível
  const onScroll = () => {
    const el = track.current;
    if (!el || programmatic.current) return;
    const n = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    if (n !== indexRef.current) { indexRef.current = n; setIndex(n); }
  };

  if (count <= 1) return <div className="h-full">{slides}</div>;

  return (
    <div ref={root} role="region" aria-roledescription="carrossel" aria-label={label} className="relative h-full"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setHovered(true); }} onPointerLeave={() => setHovered(false)}
      onFocusCapture={(e) => setFocused((e.target as HTMLElement).matches(":focus-visible"))}
      onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false); }}>
      <div ref={track} onScroll={onScroll} onTouchStart={() => setUserPaused(true)} onWheel={(e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) setUserPaused(true); }}
        aria-live={playing ? "off" : "polite"} className="scrollbar-none flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-panel">
        {slides.map((s, i) => (
          <div key={i} role="group" aria-roledescription="slide" aria-label={`${i + 1} de ${count}`} inert={i !== index} className="w-full shrink-0 snap-center">
            {s}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex items-center justify-between gap-2 px-4 sm:bottom-5 sm:px-8 lg:px-11">
        <div className="pointer-events-auto flex items-center rounded-full bg-white/95 p-1 text-ink shadow-card">
          {!reduced && (
            <button type="button" onClick={() => setUserPaused((p) => !p)} aria-label={userPaused ? "Retomar a troca automática de campanhas" : "Pausar a troca automática de campanhas"}
              className="grid size-9 place-items-center rounded-full transition hover:bg-soft-blue">
              <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden>
                {userPaused ? <path d="M8 5.5v13l11-6.5z" /> : <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />}
              </svg>
            </button>
          )}
          {slides.map((_, i) => (
            <button key={i} type="button" onClick={() => manual(i)} aria-label={`Mostrar campanha ${i + 1} de ${count}`} aria-current={i === index ? "true" : undefined}
              className="grid h-9 w-7 place-items-center rounded-full">
              <span className={`block h-2 rounded-full transition-all duration-300 ${i === index ? "w-5 bg-primary" : "w-2 bg-ink/30"}`} />
            </button>
          ))}
        </div>
        <div className="pointer-events-auto flex rounded-full bg-white/95 p-1 text-ink shadow-card">
          <button type="button" onClick={() => manual(index - 1)} aria-label="Campanha anterior" className="grid size-9 place-items-center rounded-full transition hover:bg-soft-blue"><ChevronLeft size={20} /></button>
          <button type="button" onClick={() => manual(index + 1)} aria-label="Próxima campanha" className="grid size-9 place-items-center rounded-full transition hover:bg-soft-blue"><ChevronRight size={20} /></button>
        </div>
      </div>
    </div>
  );
}
