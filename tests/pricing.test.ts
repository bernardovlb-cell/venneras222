import { describe, expect, it } from "vitest";
import { parcelamento, precoPix } from "@/lib/pricing";
import { formatBRL } from "@/lib/format";

const regras = { pixDescontoPercentual: 5, parcelasSemJuros: 6, parcelaMinima: 50 };

describe("precoPix", () => {
  it("aplica o desconto e arredonda em centavos", () => {
    expect(precoPix(199.9, regras)).toBe(189.91);
  });
  it("null sem desconto configurado", () => {
    expect(precoPix(199.9, { ...regras, pixDescontoPercentual: null })).toBeNull();
    expect(precoPix(199.9, { ...regras, pixDescontoPercentual: 0 })).toBeNull();
  });
});

describe("parcelamento", () => {
  it("limita pelo máximo de parcelas", () => {
    expect(parcelamento(600, regras)).toEqual({ parcelas: 6, valor: 100 });
  });
  it("limita pela parcela mínima", () => {
    expect(parcelamento(199.9, regras)).toEqual({ parcelas: 3, valor: 66.63 });
  });
  it("não mostra parcelamento de 1x", () => {
    expect(parcelamento(80, regras)).toBeNull();
  });
  it("null sem parcelas configuradas", () => {
    expect(parcelamento(600, { ...regras, parcelasSemJuros: null })).toBeNull();
  });
  it("valor da parcela nunca soma mais que o preço", () => {
    const r = parcelamento(100, { ...regras, parcelasSemJuros: 3, parcelaMinima: null })!;
    expect(r.valor * r.parcelas).toBeLessThanOrEqual(100);
  });
});

describe("formatBRL", () => {
  it("formata em reais pt-BR", () => {
    expect(formatBRL(1234.5)).toBe("R$ 1.234,50");
  });
});
