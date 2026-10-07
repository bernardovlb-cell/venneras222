import type { Produto } from "@/data/products";

/**
 * Checkout via cart permalink do Shopify:
 *   https://{loja}.myshopify.com/cart/{variantId}:{qty},{variantId}:{qty}
 * O Shopify cria o carrinho com esses itens e leva direto ao checkout
 * (pagamento processado pelo Mercado Pago dentro do Shopify).
 */
export interface LinhaCheckout {
  variantId: string;
  quantidade: number;
}

/** Item como fica salvo na sacola (resolvido contra o catálogo na hora de usar). */
export interface ItemSacola {
  slug: string;
  cor: string;
  quantidade: number;
}

export const QUANTIDADE_MAXIMA = 10;

/** Variant ID do Shopify é numérico. "TODO", vazio ou GID não servem no permalink. */
export function variantIdValido(id: unknown): id is string {
  return typeof id === "string" && /^\d+$/.test(id);
}

export function montarPermalink(dominio: string, linhas: LinhaCheckout[]): string {
  if (!/^[a-z0-9-]+\.myshopify\.com$/.test(dominio)) {
    throw new Error(`Domínio Shopify inválido: ${dominio}`);
  }
  // Junta variantes repetidas mantendo a ordem da primeira ocorrência.
  const somadas = new Map<string, number>();
  for (const { variantId, quantidade } of linhas) {
    if (!variantIdValido(variantId)) throw new Error(`Variant ID inválido: ${variantId}`);
    if (!Number.isInteger(quantidade) || quantidade < 1) {
      throw new Error(`Quantidade inválida para ${variantId}: ${quantidade}`);
    }
    somadas.set(variantId, (somadas.get(variantId) ?? 0) + quantidade);
  }
  if (somadas.size === 0) throw new Error("Sacola vazia");
  const itens = [...somadas].map(([id, q]) => `${id}:${q}`).join(",");
  return `https://${dominio}/cart/${itens}`;
}

export interface ItemResolvido extends ItemSacola {
  produto: Produto;
  variantId: string | null;
  /** false = não entra no checkout (variante sem ID, esgotada ou removida do catálogo). */
  compravel: boolean;
}

/** Cruza a sacola com o catálogo atual. Itens que sumiram do catálogo são descartados. */
export function resolverItens(itens: ItemSacola[], catalogo: Produto[]): ItemResolvido[] {
  const out: ItemResolvido[] = [];
  for (const item of itens) {
    const produto = catalogo.find((p) => p.slug === item.slug);
    const variante = produto?.variantes.find((v) => v.cor === item.cor);
    if (!produto || !variante) continue;
    const id = variantIdValido(variante.shopifyVariantId) ? variante.shopifyVariantId : null;
    out.push({
      ...item,
      produto,
      variantId: id,
      compravel: id !== null && variante.disponivel && typeof produto.preco === "number",
    });
  }
  return out;
}

export function linhasCheckout(resolvidos: ItemResolvido[]): LinhaCheckout[] {
  return resolvidos
    .filter((i) => i.compravel && i.variantId)
    .map((i) => ({ variantId: i.variantId as string, quantidade: i.quantidade }));
}
