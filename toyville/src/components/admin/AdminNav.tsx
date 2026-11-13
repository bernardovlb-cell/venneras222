"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon, CloseIcon } from "../icons";

export type NavItem = { href: string; label: string; badge?: number };

export function AdminNav({ items, userName, roleName }: { items: NavItem[]; userName: string; roleName: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [prev, setPrev] = useState(path);
  if (prev !== path) { setPrev(path); setOpen(false); }
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  const list = (
    <ul className="space-y-0.5">
      {items.map((i) => (
        <li key={i.href}>
          <Link href={i.href} aria-current={active(i.href) ? "page" : undefined}
            className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold transition ${active(i.href) ? "bg-primary text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
            {i.label}
            {!!i.badge && <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] text-ink">{i.badge}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between bg-ink px-4 py-2 text-white lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost !px-2 text-white" aria-label="Abrir menu"><MenuIcon /></button>
        <span className="font-display text-lg font-extrabold">Painel ToyVille</span>
        <Link href="/" className="text-xs font-bold text-accent">Ver loja</Link>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-black/40" aria-label="Fechar" onClick={() => setOpen(false)} />
          <nav className="absolute inset-y-0 left-0 w-72 animate-slide-left overflow-y-auto bg-ink p-4">
            <div className="mb-4 flex items-center justify-between text-white"><span className="font-extrabold">Menu</span><button onClick={() => setOpen(false)} aria-label="Fechar" className="btn btn-ghost !px-2 text-white"><CloseIcon /></button></div>
            {list}
          </nav>
        </div>
      )}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto bg-ink p-4 lg:flex">
        <Link href="/admin" className="mb-5 block font-display text-xl font-extrabold text-white">Painel <span className="text-accent">ToyVille</span></Link>
        <nav aria-label="Painel" className="flex-1">{list}</nav>
        <div className="mt-4 border-t border-white/15 pt-3 text-xs text-white/70">
          <p className="font-bold text-white">{userName}</p><p>{roleName}</p>
          <div className="mt-2 flex gap-3"><Link href="/" className="font-bold text-accent">Ver loja</Link><form action="/admin/sair" method="post"><button className="font-bold text-white/80 hover:text-white">Sair</button></form></div>
        </div>
      </aside>
    </>
  );
}
