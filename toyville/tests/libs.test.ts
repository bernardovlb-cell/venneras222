import { describe, it, expect } from "vitest";
import { parseBRLToCents, formatBRL, discountPercent } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { verifyMercadoPagoSignature, signManifest, buildManifest } from "@/lib/mercadopago-signature";
import { mapMercadoPagoStatus } from "@/lib/payment-status";
import { parseImportRows } from "@/lib/product-import";
import { ageOverlaps, formatAgeRange } from "@/lib/age";

describe("money", () => {
  it("converte formatos brasileiros", () => {
    expect(parseBRLToCents("1.234,56")).toBe(123456);
    expect(parseBRLToCents("R$ 79,9")).toBe(7990);
    expect(parseBRLToCents("79.90")).toBe(7990);
    expect(parseBRLToCents("abc")).toBeNull();
    expect(parseBRLToCents("1,234")).toBeNull();
    expect(formatBRL(7990).replace(/\s/g, " ")).toBe("R$ 79,90");
    expect(discountPercent(10000, 7500)).toBe(25);
  });
  it("slug sem acentos", () => {
    expect(slugify("Pelúcias & Bonecas  Ação!")).toBe("pelucias-bonecas-acao");
  });
});

describe("idade", () => {
  it("sobreposição de faixas", () => {
    expect(ageOverlaps(36, 72, 60, 96)).toBe(true);
    expect(ageOverlaps(96, null, 36, 60)).toBe(false);
    expect(ageOverlaps(null, null, 0, 12)).toBe(true);
    expect(formatAgeRange(36, 96)).toBe("3 anos a 8 anos");
    expect(formatAgeRange(6, null)).toBe("A partir de 6 meses");
  });
});

describe("assinatura do webhook Mercado Pago", () => {
  const secret = "segredo";
  const ts = "1704908010";
  const v1 = signManifest(buildManifest("123456", "req-1", ts), secret);
  it("manifest conforme documentação", () => {
    expect(buildManifest("ABC", "r", "1")).toBe("id:abc;request-id:r;ts:1;");
    expect(buildManifest(null, "r", "1")).toBe("request-id:r;ts:1;");
  });
  it("aceita assinatura válida", () => {
    expect(verifyMercadoPagoSignature({ signatureHeader: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: "123456", secret }).valid).toBe(true);
  });
  it("rejeita assinatura adulterada, id diferente, segredo ausente e header ausente", () => {
    expect(verifyMercadoPagoSignature({ signatureHeader: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: "999", secret }).valid).toBe(false);
    expect(verifyMercadoPagoSignature({ signatureHeader: `ts=${ts},v1=${"0".repeat(64)}`, requestId: "req-1", dataId: "123456", secret }).valid).toBe(false);
    expect(verifyMercadoPagoSignature({ signatureHeader: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: "123456", secret: "" }).reason).toBe("secret_not_configured");
    expect(verifyMercadoPagoSignature({ signatureHeader: null, requestId: "req-1", dataId: "123456", secret }).reason).toBe("missing_signature");
  });
  it("rejeita notificação antiga (replay) quando há tolerância", () => {
    const r = verifyMercadoPagoSignature({ signatureHeader: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: "123456", secret, maxAgeMs: 600_000, now: Date.now() });
    expect(r.reason).toBe("stale");
  });
});

describe("status do Mercado Pago", () => {
  it("mapeia todos os status relevantes", () => {
    expect(mapMercadoPagoStatus("approved", 100, 0)).toBe("approved");
    expect(mapMercadoPagoStatus("approved", 100, 40)).toBe("partially_refunded");
    expect(mapMercadoPagoStatus("in_process", 100, 0)).toBe("in_process");
    expect(mapMercadoPagoStatus("pending", 100, 0)).toBe("pending");
    expect(mapMercadoPagoStatus("rejected", 100, 0)).toBe("rejected");
    expect(mapMercadoPagoStatus("cancelled", 100, 0)).toBe("cancelled");
    expect(mapMercadoPagoStatus("refunded", 100, 100)).toBe("refunded");
    expect(mapMercadoPagoStatus("charged_back", 100, 0)).toBe("charged_back");
  });
});

describe("importação de produtos", () => {
  const ok = { produto_sku: "P1", nome: "Carrinho", preco: "49,90", estoque: "3" };
  it("agrupa variações por produto", () => {
    const { products, issues } = parseImportRows([
      { ...ok, variacao_sku: "P1-A", opcoes: "Cor=Azul" },
      { produto_sku: "P1", variacao_sku: "P1-V", opcoes: "Cor=Verde", preco: "49,90" },
    ]);
    expect(issues).toEqual([]);
    expect(products).toHaveLength(1);
    expect(products[0].variants.map((v) => v.name)).toEqual(["Azul", "Verde"]);
  });
  it("detecta SKU duplicado e campos inválidos com número da linha", () => {
    const { issues } = parseImportRows([
      ok,
      { ...ok, produto_sku: "P2" , variacao_sku: "p1" },
      { produto_sku: "P3", nome: "X", preco: "0" },
      { produto_sku: "P4", nome: "Y", preco: "10", preco_promocional: "20" },
      { produto_sku: "P5", nome: "Z", preco: "10", estoque: "-1" },
      { produto_sku: "", nome: "W", preco: "10" },
    ]);
    const msgs = issues.map((i) => `${i.row}:${i.field}`);
    expect(msgs).toContain("3:variacao_sku");
    expect(msgs).toContain("4:preco");
    expect(msgs).toContain("5:preco_promocional");
    expect(msgs).toContain("6:estoque");
    expect(msgs).toContain("7:produto_sku");
  });
  it("aceita cabeçalhos com acentos/maiúsculas", () => {
    const { products, issues } = parseImportRows([{ "Produto SKU": "Q1", "Nome": "Bola", "Preço": "10,00", "Descrição curta": "x" }]);
    expect(issues).toEqual([]);
    expect(products[0].shortDescription).toBe("x");
  });
});
