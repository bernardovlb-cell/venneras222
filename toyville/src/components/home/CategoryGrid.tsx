"use client";
import { Children, useId, useState } from "react";

/**
 * Lista de categorias: trilho horizontal no celular (todas deslizam) e grade a partir do tablet.
 * Na grade, mostra as primeiras `initial` e um botão expande as demais. Sem JavaScript, o link
 * "Ver todas as categorias" da seção continua levando à página completa.
 */
export function CategoryGrid({ children, initial = 8 }: { children: React.ReactNode; initial?: number }) {
  const items = Children.toArray(children);
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const extra = items.length - initial;
  return (
    <div>
      <ul id={id} className="tv-rail -mx-4 px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
        {items.map((it, i) => (
          <li key={i} className={`w-[44%] sm:w-auto ${!expanded && i >= initial ? "sm:hidden" : ""}`}>{it}</li>
        ))}
      </ul>
      {extra > 0 && (
        <div className="mt-5 hidden justify-center sm:flex">
          <button type="button" className="btn btn-outline" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded((e) => !e)}>
            {expanded ? "Mostrar menos" : `Mostrar mais ${extra} ${extra === 1 ? "categoria" : "categorias"}`}
          </button>
        </div>
      )}
    </div>
  );
}
