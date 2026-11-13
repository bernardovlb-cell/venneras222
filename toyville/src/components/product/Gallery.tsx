"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ProductImage } from "./ProductImage";
import { ChevronLeft, ChevronRight, CloseIcon, ZoomIcon } from "../icons";

export type GalleryImage = { id: string; url: string; thumbUrl: string | null; alt: string | null; width: number | null; height: number | null };

export function Gallery({ images, name, activeId }: { images: GalleryImage[]; name: string; activeId?: string | null }) {
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  // Variação escolhida com imagem própria → mostra essa imagem (ajuste durante a renderização, sem efeito).
  const [prevActive, setPrevActive] = useState<string | null | undefined>(undefined);
  if (activeId !== prevActive) {
    setPrevActive(activeId);
    const i = activeId ? images.findIndex((im) => im.id === activeId) : -1;
    if (i >= 0) setIdx(i);
  }
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + images.length) % images.length);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [zoom, images.length]);

  if (!images.length) {
    return <div className="relative aspect-square overflow-hidden rounded-[1.75rem] bg-white shadow-card"><ProductImage src={null} alt={name} sizes="(max-width:1024px) 100vw, 50vw" /></div>;
  }
  const cur = images[idx];
  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      <div className="relative aspect-square flex-1 overflow-hidden rounded-[1.75rem] bg-white shadow-card">
        <button type="button" onClick={() => setZoom(true)} className="group absolute inset-0 cursor-zoom-in" aria-label="Ampliar imagem">
          <Image src={cur.url} alt={cur.alt || name} fill priority sizes="(max-width:1024px) 100vw, 50vw" className="object-contain p-4 transition duration-300 group-hover:scale-[1.03]" />
          <span className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-white/90 text-ink shadow-card"><ZoomIcon size={20} /></span>
        </button>
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => setIdx((idx - 1 + images.length) % images.length)} aria-label="Imagem anterior" className="absolute left-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-card lg:hidden"><ChevronLeft /></button>
            <button type="button" onClick={() => setIdx((idx + 1) % images.length)} aria-label="Próxima imagem" className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-card lg:hidden"><ChevronRight /></button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <ul className="scrollbar-none flex gap-2 overflow-x-auto lg:max-h-[520px] lg:flex-col lg:overflow-y-auto" aria-label="Miniaturas">
          {images.map((im, i) => (
            <li key={im.id} className="shrink-0">
              <button type="button" onClick={() => setIdx(i)} aria-label={`Ver imagem ${i + 1}`} aria-current={i === idx}
                className={`relative block size-16 overflow-hidden rounded-xl bg-white ring-2 transition sm:size-20 ${i === idx ? "ring-primary" : "ring-transparent hover:ring-line"}`}>
                <Image src={im.thumbUrl ?? im.url} alt="" fill sizes="80px" className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {zoom && (
        <div role="dialog" aria-modal="true" aria-label="Imagem ampliada" className="fixed inset-0 z-[80] flex flex-col bg-white">
          <div className="flex items-center justify-between p-3">
            <span className="text-sm font-bold text-muted">{idx + 1} / {images.length}</span>
            <button type="button" onClick={() => setZoom(false)} className="btn btn-ghost" aria-label="Fechar"><CloseIcon /></button>
          </div>
          <div className="relative flex-1 overflow-auto">
            <Image src={cur.url} alt={cur.alt || name} fill sizes="100vw" className="object-contain" />
          </div>
          {images.length > 1 && (
            <div className="flex justify-center gap-3 p-3">
              <button type="button" className="btn btn-outline" onClick={() => setIdx((idx - 1 + images.length) % images.length)}><ChevronLeft /> Anterior</button>
              <button type="button" className="btn btn-outline" onClick={() => setIdx((idx + 1) % images.length)}>Próxima <ChevronRight /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
