"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { CheckIcon, AlertIcon } from "../icons";

type Toast = { id: number; kind: "success" | "error" | "info"; text: string; action?: { label: string; href: string } };
const Ctx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function useToast() { return useContext(Ctx); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x.slice(-2), { ...t, id }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {items.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex w-full max-w-md animate-pop-in items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold shadow-pop ${t.kind === "error" ? "bg-promo text-white" : "bg-ink text-white"}`}>
            <span className={`grid size-7 shrink-0 place-items-center rounded-full ${t.kind === "error" ? "bg-white/20" : "bg-success"}`}>
              {t.kind === "error" ? <AlertIcon size={16} /> : <CheckIcon size={16} />}
            </span>
            <span className="flex-1">{t.text}</span>
            {t.action && <a href={t.action.href} className="rounded-full bg-white px-3 py-1.5 text-ink">{t.action.label}</a>}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
