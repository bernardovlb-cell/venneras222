"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCartAction } from "@/app/actions/cart";
import { toggleFavoriteAction } from "@/app/actions/account";
import { useToast } from "../ui/Toast";
import { CartIcon, HeartIcon } from "../icons";
import { track } from "@/lib/analytics";

export function QuickAdd({ variantId, productName, priceCents }: { variantId: string; productName: string; priceCents: number }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button type="button" disabled={pending} aria-label={`Adicionar ${productName} ao carrinho`}
      onClick={() => start(async () => {
        const r = await addToCartAction(variantId, 1);
        if (r.ok) {
          toast({ kind: "success", text: "Adicionado ao carrinho!", action: { label: "Ver carrinho", href: "/carrinho" } });
          track("add_to_cart", { value: priceCents / 100, items: [{ id: variantId, name: productName, price: priceCents / 100, quantity: 1 }] });
          router.refresh();
        } else toast({ kind: "error", text: r.error });
      })}
      className="btn btn-primary btn-sm w-full">
      <CartIcon size={18} /> {pending ? "Adicionando…" : "Adicionar"}
    </button>
  );
}

export function FavoriteButton({ productId, initial = false, className = "" }: { productId: string; initial?: boolean; className?: string }) {
  const [fav, setFav] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button type="button" aria-pressed={fav} aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"} disabled={pending}
      onClick={() => start(async () => {
        const r = await toggleFavoriteAction(productId);
        if (r.ok) { setFav(!!r.data?.favorited); toast({ kind: "success", text: r.data?.favorited ? "Salvo nos favoritos" : "Removido dos favoritos" }); }
        else if (r.error === "login_required") router.push(`/conta/entrar?next=${encodeURIComponent(location.pathname)}`);
        else toast({ kind: "error", text: r.error });
      })}
      className={`grid size-10 place-items-center rounded-full bg-white/95 shadow-card transition hover:scale-110 ${fav ? "text-promo" : "text-muted hover:text-promo"} ${className}`}>
      <HeartIcon size={20} filled={fav} />
    </button>
  );
}
