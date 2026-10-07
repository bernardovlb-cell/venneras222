"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { site } from "@/config/site";
import type { Produto } from "@/data/products";
import { track } from "@/lib/analytics";
import { variantIdValido } from "@/lib/checkout";
import { formatBRL } from "@/lib/format";
import { irParaCheckout } from "@/lib/irParaCheckout";

export function ProductPurchase({ produto }: { produto: Produto }) {
  const { adicionar } = useCart();
  const inicial = produto.variantes.find((v) => v.disponivel) ?? produto.variantes[0];
  const [cor, setCor] = useState(inicial?.cor);
  const variante = produto.variantes.find((v) => v.cor === cor);
  const temPreco = typeof produto.preco === "number";
  const temId = variante ? variantIdValido(variante.shopifyVariantId) : false;
  const podeComprar = Boolean(variante?.disponivel && temId && temPreco);

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && variante && !temId) {
      console.warn(`[Venneras] Variant ID pendente (TODO): ${produto.slug} / ${variante.cor}. Botões de compra desabilitados.`);
    }
  }, [produto.slug, variante, temId]);

  useEffect(() => {
    track("view_item", {
      value: temPreco ? (produto.preco as number) : undefined,
      items: [{ item_id: produto.slug, item_name: produto.nome, item_brand: produto.marca, item_category: produto.categoria }],
    });
  }, [produto, temPreco]);

  const itemAnalytics = () => ({
    item_id: variante!.shopifyVariantId as string,
    item_name: produto.nome,
    item_brand: produto.marca,
    item_category: produto.categoria,
    item_variant: variante!.cor,
    price: produto.preco as number,
    quantity: 1,
  });

  function onAdicionar() {
    if (!podeComprar || !variante) return;
    adicionar(produto.slug, variante.cor, 1);
    track("add_to_cart", { value: produto.preco as number, items: [itemAnalytics()] });
  }

  function onComprarAgora() {
    if (!podeComprar || !variante) return;
    irParaCheckout([{ variantId: variante.shopifyVariantId as string, quantidade: 1 }], produto.preco as number, [itemAnalytics()]);
  }

  const rotuloIndisponivel = !temId || !temPreco ? "Em breve" : "Esgotado";

  return (
    <div className="space-y-5">
      {produto.variantes.length > 0 && (
        <fieldset>
          <legend className="label mb-2">
            Cor: <span className="font-normal normal-case tracking-normal">{cor}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {produto.variantes.map((v) => (
              <label
                key={v.cor}
                className={`flex min-h-11 cursor-pointer items-center border px-4 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                  v.cor === cor ? "border-ink" : "border-line"
                } ${v.disponivel ? "" : "text-muted line-through"}`}
              >
                <input
                  type="radio"
                  name="cor"
                  value={v.cor}
                  checked={v.cor === cor}
                  onChange={() => setCor(v.cor)}
                  className="sr-only"
                />
                {v.cor}
                {!v.disponivel && <span className="sr-only"> (esgotado)</span>}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Formas de pagamento e prazo visíveis antes do botão (referência size.co.uk). */}
      <ul className="space-y-1 text-xs text-muted">
        <li>Pix e cartão via Mercado Pago, no checkout seguro Shopify</li>
        <li>
          Frete e prazo calculados no checkout pelo CEP
          {site.freteGratisAcima ? ` · Frete grátis acima de ${formatBRL(site.freteGratisAcima)}` : ""}
        </li>
      </ul>

      <div className="space-y-2">
        <button
          type="button"
          onClick={onAdicionar}
          disabled={!podeComprar}
          className="label flex min-h-12 w-full items-center justify-center bg-ink text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/40"
        >
          {podeComprar ? "Adicionar à sacola" : rotuloIndisponivel}
        </button>
        {podeComprar && (
          <button
            type="button"
            onClick={onComprarAgora}
            className="label flex min-h-12 w-full items-center justify-center border border-ink hover:bg-ink hover:text-paper"
          >
            Comprar agora
          </button>
        )}
      </div>

      <WhatsAppLink
        origem="produto"
        mensagem={`Olá! Tenho uma dúvida sobre a ${produto.nome}${cor ? ` (${cor})` : ""}.`}
        className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
      >
        Dúvidas? Fale no WhatsApp
      </WhatsAppLink>
    </div>
  );
}
