"use client";

import { useRef, useState } from "react";
import { Foto } from "@/components/Foto";
import type { ImagemProduto } from "@/data/products";

/**
 * Celular: rolagem horizontal com indicador. Desktop: imagens empilhadas.
 * Sem imagens: um bloco "FOTO PENDENTE".
 */
export function Gallery({ imagens, nome }: { imagens: ImagemProduto[]; nome: string }) {
  const lista = imagens.length > 0 ? imagens : [{ src: "", alt: nome, tipo: "produto" as const }];
  const trilho = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);

  function onScroll() {
    const el = trilho.current;
    if (!el) return;
    setAtual(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div>
      <div
        ref={trilho}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] lg:flex-col lg:gap-3 lg:overflow-visible [&::-webkit-scrollbar]:hidden"
        aria-label={`Fotos de ${nome}`}
        role="region"
        tabIndex={0}
      >
        {lista.map((img, i) => (
          <div key={i} className="w-full shrink-0 snap-center">
            <Foto src={img.src || null} alt={img.alt} priority={i === 0} sizes="(min-width: 1024px) 55vw, 100vw" />
          </div>
        ))}
      </div>
      {lista.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
          {lista.map((_, i) => (
            <span key={i} className={`h-1 rounded-full transition-all ${i === atual ? "w-6 bg-ink" : "w-1.5 bg-ink/25"}`} />
          ))}
        </div>
      )}
      {lista.length > 1 && (
        <p className="sr-only" aria-live="polite">
          Foto {atual + 1} de {lista.length}
        </p>
      )}
    </div>
  );
}
