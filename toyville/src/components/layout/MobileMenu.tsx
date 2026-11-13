"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon, CloseIcon, ChevronDown, GiftIcon, UserIcon, HeartIcon, ChatIcon, BoltIcon } from "../icons";

type Cat = { id: string; name: string; slug: string; children: { id: string; name: string; slug: string }[] };

export function MobileMenu({ categories, loggedIn }: { categories: Cat[]; loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) { setPrevPath(pathname); setOpen(false); }
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost !min-h-[44px] !px-2.5 lg:hidden" aria-label="Abrir menu" aria-expanded={open}>
        <MenuIcon size={26} />
      </button>
      {/* Portal no <body>: o cabeçalho usa backdrop-filter, que faz elementos "fixed" dentro dele
          se posicionarem pelo cabeçalho (e não pela tela) — a gaveta ficava cortada no celular. */}
      {open && createPortal(
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <nav className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm animate-slide-left flex-col overflow-y-auto bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="font-display text-xl font-extrabold text-primary-dark">Menu</span>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="btn btn-ghost !px-2.5" aria-label="Fechar menu"><CloseIcon /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              <Link href="/presentes" className="flex items-center gap-2 rounded-2xl bg-soft-yellow p-3 text-sm font-extrabold leading-tight"><GiftIcon size={20} className="shrink-0" /> Presentes</Link>
              <Link href="/ofertas" className="flex items-center gap-2 rounded-2xl bg-soft-red p-3 text-sm font-extrabold leading-tight text-promo-ink"><BoltIcon size={18} className="shrink-0" /> Ofertas</Link>
            </div>
            <p className="px-4 pb-1 text-xs font-extrabold uppercase tracking-wider text-muted">Categorias</p>
            <ul className="px-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <div className="flex items-center">
                    <Link href={`/c/${c.slug}`} className="flex-1 rounded-xl px-3 py-3 text-[15px] font-bold hover:bg-cream">{c.name}</Link>
                    {c.children.length > 0 && (
                      <button type="button" onClick={() => setExpanded(expanded === c.id ? null : c.id)} aria-expanded={expanded === c.id}
                        aria-label={`Subcategorias de ${c.name}`} className="btn btn-ghost !px-3">
                        <ChevronDown className={`transition ${expanded === c.id ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>
                  {expanded === c.id && (
                    <ul className="mb-2 ml-4 border-l-2 border-line pl-2">
                      {c.children.map((ch) => <li key={ch.id}><Link href={`/c/${ch.slug}`} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-cream">{ch.name}</Link></li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-auto grid gap-1 border-t border-line p-3 text-sm font-bold">
              <Link href={loggedIn ? "/conta" : "/conta/entrar"} className="flex items-center gap-3 rounded-xl p-3 hover:bg-cream"><UserIcon size={20} /> {loggedIn ? "Minha conta" : "Entrar ou cadastrar"}</Link>
              <Link href="/conta/favoritos" className="flex items-center gap-3 rounded-xl p-3 hover:bg-cream"><HeartIcon size={20} /> Favoritos</Link>
              <Link href="/atendimento" className="flex items-center gap-3 rounded-xl p-3 hover:bg-cream"><ChatIcon size={20} /> Atendimento</Link>
            </div>
          </nav>
        </div>,
        document.body,
      )}
    </>
  );
}
