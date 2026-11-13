"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { SearchIcon } from "../icons";
import { formatBRL } from "@/lib/money";

type Suggest = {
  products: { slug: string; name: string; imageUrl: string | null; priceCents: number; brandName: string | null }[];
  categories: { slug: string; name: string }[];
  brands: { id: string; name: string; slug: string }[];
};

export function SearchBox({ initial = "", autoFocus = false, label = "Buscar na loja" }: { initial?: string; autoFocus?: boolean; label?: string }) {
  const [q, setQ] = useState(initial);
  const [data, setData] = useState<Suggest | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const router = useRouter();
  const listId = useId();
  const inputId = useId();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (r.ok) { setData(await r.json()); setActive(-1); }
      } catch { /* cancelado */ } finally { setLoading(false); }
    }, 220);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const shown = q.trim().length >= 2 ? data : null;
  const flat = shown ? [
    ...shown.products.map((p) => ({ href: `/produto/${p.slug}`, label: p.name })),
    ...shown.categories.map((c) => ({ href: `/c/${c.slug}`, label: c.name })),
  ] : [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (active >= 0 && flat[active]) { router.push(flat[active].href); setOpen(false); return; }
    const term = q.trim();
    if (term) { router.push(`/busca?q=${encodeURIComponent(term)}`); setOpen(false); }
  }

  const showPanel = open && q.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative w-full">
      <form role="search" aria-label={label} onSubmit={submit} action="/busca">
        <label htmlFor={inputId} className="sr-only">Buscar brinquedos</label>
        <div className="flex items-center rounded-full border-2 border-transparent bg-[#f4f1ea] pl-4 pr-1.5 transition hover:bg-[#efebe1] focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(31,79,209,.12)]">
          <SearchIcon size={20} className="shrink-0 text-primary" />
          <input
            id={inputId} name="q" value={q} autoFocus={autoFocus} autoComplete="off" enterKeyHint="search"
            onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
              if (e.key === "Escape") setOpen(false);
            }}
            role="combobox" aria-expanded={showPanel} aria-controls={listId} aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            placeholder="Procure por brinquedo, marca ou idade"
            className="min-h-[46px] w-full min-w-0 bg-transparent px-3 text-[16px] outline-none placeholder:text-muted/80"
          />
          <button type="submit" className="btn btn-primary btn-sm !min-h-[38px] !px-3 sm:!px-4" aria-label="Buscar"><SearchIcon size={18} className="sm:hidden" /><span className="hidden sm:inline">Buscar</span></button>
        </div>
      </form>
      {showPanel && (
        <div id={listId} role="listbox" className="absolute inset-x-0 top-[calc(100%+8px)] z-50 max-h-[70vh] animate-pop-in overflow-auto rounded-2xl border border-line bg-white p-2 shadow-pop">
          {loading && !shown && <div className="space-y-2 p-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-10" />)}</div>}
          {shown && flat.length === 0 && !loading && (
            <p className="p-3 text-sm text-muted">Nenhuma sugestão para “{q}”. Pressione Enter para buscar mesmo assim.</p>
          )}
          {shown?.products.map((p, i) => (
            <Link key={p.slug} id={`${listId}-${i}`} role="option" aria-selected={active === i} href={`/produto/${p.slug}`} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl p-2 ${active === i ? "bg-soft-blue" : "hover:bg-cream"}`}>
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-soft-yellow">
                {p.imageUrl ? <Image src={p.imageUrl} alt="" width={44} height={44} className="size-full object-cover" /> : <span aria-hidden>🧸</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{p.name}</span>
                {p.brandName && <span className="block truncate text-xs text-muted">{p.brandName}</span>}
              </span>
              <span className="text-sm font-extrabold text-primary">{formatBRL(p.priceCents)}</span>
            </Link>
          ))}
          {!!shown?.categories.length && (
            <div className="mt-1 flex flex-wrap gap-2 border-t border-line p-2">
              {shown.categories.map((c, j) => {
                const idx = shown.products.length + j;
                return (
                  <Link key={c.slug} id={`${listId}-${idx}`} role="option" aria-selected={active === idx} href={`/c/${c.slug}`} onClick={() => setOpen(false)}
                    className={`chip ${active === idx ? "bg-primary text-white" : "bg-soft-blue text-primary-dark"}`}>Categoria: {c.name}</Link>
                );
              })}
            </div>
          )}
          {shown && (
            <button type="button" onClick={() => { router.push(`/busca?q=${encodeURIComponent(q.trim())}`); setOpen(false); }}
              className="mt-1 w-full rounded-xl p-2.5 text-left text-sm font-bold text-primary hover:bg-soft-blue">
              Ver todos os resultados para “{q.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
