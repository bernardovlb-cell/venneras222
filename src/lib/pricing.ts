import { site } from "@/config/site";

/**
 * Cálculos de EXIBIÇÃO de preço. Nada aqui define cobrança:
 * quem cobra é o Shopify/Mercado Pago. Não há cálculo de juros.
 */
export interface RegrasPreco {
  pixDescontoPercentual: number | null;
  parcelasSemJuros: number | null;
  parcelaMinima: number | null;
}

const regrasSite: RegrasPreco = {
  pixDescontoPercentual: site.pixDescontoPercentual,
  parcelasSemJuros: site.parcelasSemJuros,
  parcelaMinima: site.parcelaMinima,
};

const centavos = (v: number) => Math.round(v * 100) / 100;

/** Preço no Pix, ou null se não houver desconto configurado. */
export function precoPix(preco: number, regras: RegrasPreco = regrasSite): number | null {
  const p = regras.pixDescontoPercentual;
  if (!p || p <= 0 || p >= 100) return null;
  return centavos(preco * (1 - p / 100));
}

/**
 * Parcelamento sem juros: maior nº de parcelas ≤ parcelasSemJuros
 * em que cada parcela fica ≥ parcelaMinima. Só retorna se der 2x ou mais.
 */
export function parcelamento(
  preco: number,
  regras: RegrasPreco = regrasSite,
): { parcelas: number; valor: number } | null {
  const max = regras.parcelasSemJuros;
  if (!max || max < 2 || preco <= 0) return null;
  const min = regras.parcelaMinima ?? 0;
  const porMinimo = min > 0 ? Math.floor(preco / min) : max;
  const parcelas = Math.min(max, porMinimo);
  if (parcelas < 2) return null;
  // Arredonda para baixo: a soma exibida nunca passa do preço.
  return { parcelas, valor: Math.floor((preco / parcelas) * 100) / 100 };
}
