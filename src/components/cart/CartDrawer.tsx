"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Foto } from "@/components/Foto";
import { imagensOrdenadas } from "@/data/products";
import { PriceLines } from "@/components/PriceBlock";
import { linhasCheckout, QUANTIDADE_MAXIMA } from "@/lib/checkout";
import { formatBRL } from "@/lib/format";
import { irParaCheckout } from "@/lib/irParaCheckout";
import { useCart } from "./CartProvider";

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CartDrawer() {
  const { itens, aberta, fechar, alterarQuantidade, remover } = useCart();
  const painel = useRef<HTMLDivElement>(null);
  const fecharBtn = useRef<HTMLButtonElement>(null);

  // Foco preso no drawer, Esc fecha, foco volta para onde estava.
  useEffect(() => {
    if (!aberta) return;
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fecharBtn.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        fechar();
        return;
      }
      if (e.key !== "Tab" || !painel.current) return;
      const els = [...painel.current.querySelectorAll<HTMLElement>(FOCAVEIS)];
      if (els.length === 0) return;
      const primeiro = els[0];
      const ultimo = els[els.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
  }, [aberta, fechar]);

  if (!aberta) return null;

  const compraveis = itens.filter((i) => i.compravel);
  const subtotal = compraveis.reduce((s, i) => s + (i.produto.preco as number) * i.quantidade, 0);
  const linhas = linhasCheckout(itens);

  function finalizar() {
    irParaCheckout(
      linhas,
      subtotal,
      compraveis.map((i) => ({
        item_id: i.variantId!,
        item_name: i.produto.nome,
        item_brand: i.produto.marca,
        item_variant: i.cor,
        price: i.produto.preco as number,
        quantity: i.quantidade,
      })),
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/40" onClick={fechar} aria-hidden="true" />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sacola-titulo"
        className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col bg-paper shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-2">
          <h2 id="sacola-titulo" className="title text-base">
            Sacola
          </h2>
          <button ref={fecharBtn} type="button" onClick={fechar} className="label flex min-h-11 items-center px-2">
            Fechar <span aria-hidden="true" className="ml-2 text-base leading-none">×</span>
          </button>
        </div>

        {itens.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5 text-center">
            <p className="text-sm text-muted">Sua sacola está vazia.</p>
            <Link href="/colecao" onClick={fechar} className="label inline-flex min-h-12 items-center bg-ink px-8 text-paper">
              Ver coleção
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {itens.map((i) => (
                <li key={`${i.slug}-${i.cor}`} className="flex gap-4 py-5">
                  <div className="w-20 shrink-0"><Foto src={imagensOrdenadas(i.produto)[0]?.src} alt={imagensOrdenadas(i.produto)[0]?.alt ?? i.produto.nome} sizes="80px" /></div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link href={`/produto/${i.slug}`} onClick={fechar} className="text-sm font-medium hover:underline">
                      {i.produto.nome}
                    </Link>
                    <p className="text-xs text-muted">Cor: {i.cor}</p>
                    {typeof i.produto.preco === "number" && (
                      <p className="text-sm font-medium">{formatBRL(i.produto.preco * i.quantidade)}</p>
                    )}
                    {!i.compravel && <p className="text-xs font-medium">Indisponível no momento — não entra na compra.</p>}
                    <div className="mt-1 flex items-center gap-3">
                      <label className="sr-only" htmlFor={`qtd-${i.slug}-${i.cor}`}>
                        Quantidade de {i.produto.nome}
                      </label>
                      <select
                        id={`qtd-${i.slug}-${i.cor}`}
                        value={i.quantidade}
                        onChange={(e) => alterarQuantidade(i.slug, i.cor, Number(e.target.value))}
                        className="min-h-11 border border-line bg-paper px-3 text-sm"
                      >
                        {Array.from({ length: QUANTIDADE_MAXIMA }, (_, n) => n + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => remover(i.slug, i.cor)}
                        className="min-h-11 px-1 text-xs text-muted underline underline-offset-4 hover:text-ink"
                        aria-label={`Remover ${i.produto.nome} da sacola`}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-4 border-t border-line px-5 py-5">
              {subtotal > 0 && (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatBRL(subtotal)}</span>
                  </div>
                  <PriceLines preco={subtotal} className="text-right" />
                </div>
              )}
              <p className="text-xs text-muted">Frete calculado no checkout.</p>
              <button
                type="button"
                onClick={finalizar}
                disabled={linhas.length === 0}
                className="label flex min-h-12 w-full items-center justify-center bg-ink text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/40"
              >
                {linhas.length === 0 ? "Em breve" : "Finalizar compra"}
              </button>
              <p className="text-center text-xs text-muted">Pagamento seguro no checkout Shopify · Pix e cartão via Mercado Pago</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
