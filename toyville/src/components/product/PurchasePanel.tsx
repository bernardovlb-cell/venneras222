"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCartAction } from "@/app/actions/cart";
import { useToast } from "../ui/Toast";
import { Price } from "./Price";
import { Countdown } from "./Countdown";
import { FavoriteButton } from "./CardActions";
import { Gallery, type GalleryImage } from "./Gallery";
import { MinusIcon, PlusIcon, CartIcon, CheckIcon } from "../icons";
import { track } from "@/lib/analytics";

export type PVariant = {
  id: string; sku: string; name: string; options: Record<string, string>; imageId: string | null;
  listPriceCents: number; priceCents: number; promotionLabel: string | null; promotionEndsAt: string | null; available: number;
};

/** Galeria + seleção de variações. Cada variação tem preço, estoque e imagem próprios. */
export function PurchasePanel({ productId, name, variants, images, favorited, children }: {
  productId: string; name: string; variants: PVariant[]; images: GalleryImage[]; favorited: boolean; children?: React.ReactNode;
}) {
  const optionNames = useMemo(() => [...new Set(variants.flatMap((v) => Object.keys(v.options)))], [variants]);
  const firstAvailable = variants.find((v) => v.available > 0) ?? variants[0];
  const [selected, setSelected] = useState<Record<string, string>>(firstAvailable.options);
  const [variantId, setVariantId] = useState(firstAvailable.id);
  const [qty, setQty] = useState(1);
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const v = variants.find((x) => x.id === variantId) ?? firstAvailable;
  const hasOptions = optionNames.length > 0 && variants.length > 1;

  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    track("view_item", { value: v.priceCents / 100, items: [{ id: v.sku, name, price: v.priceCents / 100, quantity: 1 }] });
  }, [v.priceCents, v.sku, name]);

  function choose(opt: string, value: string) {
    const next = { ...selected, [opt]: value };
    const match = variants.find((x) => optionNames.every((o) => x.options[o] === next[o])) ?? variants.find((x) => x.options[opt] === value);
    if (match) { setSelected(match.options); setVariantId(match.id); setQty(1); }
  }

  function add(buyNow: boolean) {
    start(async () => {
      const r = await addToCartAction(v.id, qty);
      if (!r.ok) { toast({ kind: "error", text: r.error }); return; }
      track("add_to_cart", { value: (v.priceCents * qty) / 100, items: [{ id: v.sku, name, price: v.priceCents / 100, quantity: qty }] });
      if (buyNow) { router.push("/checkout"); return; }
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
      toast({ kind: "success", text: "Adicionado ao carrinho!", action: { label: "Ver carrinho", href: "/carrinho" } });
      router.refresh();
    });
  }

  const max = Math.min(v.available, 99);
  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
      <Gallery images={images} name={name} activeId={v.imageId} />
      <div className="flex flex-col gap-5">
        {children}
        <div className="card flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <Price priceCents={v.priceCents} listPriceCents={v.listPriceCents} size="lg" showSavings />
            <FavoriteButton productId={productId} initial={favorited} />
          </div>
          {v.promotionLabel && v.priceCents < v.listPriceCents && (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="chip bg-promo text-white">{v.promotionLabel}</span>
              {v.promotionEndsAt && <span className="text-promo">termina em <Countdown endsAt={v.promotionEndsAt} /></span>}
            </p>
          )}
          {hasOptions && optionNames.map((opt) => {
            const values = [...new Set(variants.map((x) => x.options[opt]).filter(Boolean))];
            return (
              <fieldset key={opt}>
                <legend className="label">{opt}: <span className="font-semibold text-muted">{selected[opt]}</span></legend>
                <div className="flex flex-wrap gap-2">
                  {values.map((val) => {
                    const candidate = variants.find((x) => x.options[opt] === val && optionNames.every((o) => o === opt || x.options[o] === selected[o])) ?? variants.find((x) => x.options[opt] === val);
                    const out = !candidate || candidate.available <= 0;
                    const active = selected[opt] === val;
                    return (
                      <button key={val} type="button" onClick={() => choose(opt, val)} aria-pressed={active}
                        className={`min-h-[44px] rounded-full border-2 px-4 text-sm font-bold transition ${active ? "border-primary bg-soft-blue text-primary-dark" : "border-line bg-white hover:border-primary/50"} ${out ? "text-muted line-through decoration-2" : ""}`}>
                        {val}{out && <span className="sr-only"> (esgotado)</span>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
          {!hasOptions && variants.length > 1 && (
            <div>
              <label htmlFor="variante" className="label">Opção</label>
              <select id="variante" className="field" value={variantId} onChange={(e) => { setVariantId(e.target.value); setQty(1); }}>
                {variants.map((x) => <option key={x.id} value={x.id}>{x.name}{x.available <= 0 ? " — esgotado" : ""}</option>)}
              </select>
            </div>
          )}
          <p className={`text-sm font-bold ${v.available > 0 ? "text-[#1d5e1d]" : "text-promo"}`} aria-live="polite">
            {v.available <= 0 ? "Esgotado nesta opção" : v.available <= 3 ? `Últimas ${v.available} unidades` : "Em estoque"}
          </p>
          {v.available > 0 && (
            <>
              <div className="flex items-center gap-3">
                <span className="label !mb-0">Quantidade</span>
                <div className="flex items-center rounded-full border-2 border-line">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="grid size-11 place-items-center rounded-full disabled:opacity-40" aria-label="Diminuir quantidade"><MinusIcon size={18} /></button>
                  <output aria-live="polite" className="w-8 text-center font-extrabold tabular-nums">{qty}</output>
                  <button type="button" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max} className="grid size-11 place-items-center rounded-full disabled:opacity-40" aria-label="Aumentar quantidade"><PlusIcon size={18} /></button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => add(false)} disabled={pending} className="btn btn-primary">
                  {added ? <><CheckIcon size={18} /> Adicionado</> : <><CartIcon size={18} /> {pending ? "Adicionando…" : "Adicionar ao carrinho"}</>}
                </button>
                <button type="button" onClick={() => add(true)} disabled={pending} className="btn btn-accent">Comprar agora</button>
              </div>
            </>
          )}
          <p className="text-xs text-muted">Código: {v.sku}</p>
        </div>
      </div>
    </div>
  );
}
