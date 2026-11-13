"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setQuantityAction, applyCouponAction, removeCouponAction } from "@/app/actions/cart";
import { useToast } from "../ui/Toast";
import { MinusIcon, PlusIcon, TrashIcon } from "../icons";

export function QtyControl({ variantId, quantity, max, name }: { variantId: string; quantity: number; max: number; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const set = (q: number) => start(async () => {
    const r = await setQuantityAction(variantId, q);
    if (!r.ok) toast({ kind: "error", text: r.error });
    else if (q === 0) toast({ kind: "info", text: `${name} removido do carrinho` });
    router.refresh();
  });
  return (
    <div className={`flex items-center gap-2 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-center rounded-full border-2 border-line bg-white">
        <button type="button" disabled={pending || quantity <= 1} onClick={() => set(quantity - 1)} className="grid size-10 place-items-center rounded-full disabled:opacity-40" aria-label={`Diminuir quantidade de ${name}`}><MinusIcon size={16} /></button>
        <span className="w-7 text-center font-extrabold tabular-nums" aria-label={`Quantidade: ${quantity}`}>{quantity}</span>
        <button type="button" disabled={pending || quantity >= Math.min(max, 99)} onClick={() => set(quantity + 1)} className="grid size-10 place-items-center rounded-full disabled:opacity-40" aria-label={`Aumentar quantidade de ${name}`}><PlusIcon size={16} /></button>
      </div>
      <button type="button" disabled={pending} onClick={() => set(0)} className="btn btn-ghost btn-sm !px-2.5 text-muted hover:text-promo" aria-label={`Remover ${name}`}><TrashIcon size={18} /></button>
    </div>
  );
}

export function FixQuantity({ variantId, available }: { variantId: string; available: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button type="button" disabled={pending} className="btn btn-outline btn-sm" onClick={() => start(async () => { await setQuantityAction(variantId, available); router.refresh(); })}>
      {available > 0 ? `Ajustar para ${available}` : "Remover item"}
    </button>
  );
}

export function CouponForm({ applied }: { applied: string | null }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-2xl bg-soft-green px-4 py-3 text-sm">
        <span>Cupom <strong>{applied}</strong> aplicado</span>
        <button type="button" disabled={pending} className="font-bold text-promo underline" onClick={() => start(async () => { await removeCouponAction(); router.refresh(); })}>Remover</button>
      </div>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => {
      const r = await applyCouponAction(code);
      if (r.ok) { setError(null); toast({ kind: "success", text: r.message ?? "Cupom aplicado" }); router.refresh(); } else setError(r.error);
    }); }}>
      <label htmlFor="cupom" className="label">Cupom de desconto</label>
      <div className="flex gap-2">
        <input id="cupom" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="field !min-h-[44px] uppercase" autoComplete="off" maxLength={40} aria-invalid={!!error} aria-describedby={error ? "cupom-erro" : undefined} />
        <button className="btn btn-outline" disabled={pending || !code.trim()}>{pending ? "…" : "Aplicar"}</button>
      </div>
      {error && <p id="cupom-erro" className="error-text">{error}</p>}
    </form>
  );
}

export function ContinueLinks() {
  return <Link href="/" className="btn btn-ghost w-full">Continuar comprando</Link>;
}
