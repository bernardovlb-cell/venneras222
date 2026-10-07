import { describe, expect, it } from "vitest";
import type { Produto } from "@/data/products";
import { linhasCheckout, montarPermalink, resolverItens, variantIdValido } from "@/lib/checkout";

const LOJA = "g2psx0-2d.myshopify.com";

function produto(slug: string, variantes: Produto["variantes"], preco: Produto["preco"] = 199.9): Produto {
  return {
    slug, nome: slug, marca: "Grenobil", categoria: "bolsas", preco, variantes, imagens: [],
    medidas: { alturaCm: "TODO", larguraCm: "TODO", profundidadeCm: "TODO", alcaCm: "TODO", cabe: "TODO" },
    material: "TODO", compartimentos: "TODO", descricaoCurta: "TODO", descricao: "TODO", cuidados: "TODO",
  };
}

describe("montarPermalink", () => {
  it("monta URL de um item", () => {
    expect(montarPermalink(LOJA, [{ variantId: "111", quantidade: 1 }])).toBe(`https://${LOJA}/cart/111:1`);
  });

  it("monta URL de vários itens na ordem", () => {
    expect(
      montarPermalink(LOJA, [
        { variantId: "111", quantidade: 2 },
        { variantId: "222", quantidade: 1 },
      ]),
    ).toBe(`https://${LOJA}/cart/111:2,222:1`);
  });

  it("soma variantes repetidas", () => {
    expect(
      montarPermalink(LOJA, [
        { variantId: "111", quantidade: 1 },
        { variantId: "222", quantidade: 1 },
        { variantId: "111", quantidade: 2 },
      ]),
    ).toBe(`https://${LOJA}/cart/111:3,222:1`);
  });

  it("recusa variant ID TODO, vazio ou GID", () => {
    for (const id of ["TODO", "", "gid://shopify/ProductVariant/111", "12a"]) {
      expect(() => montarPermalink(LOJA, [{ variantId: id, quantidade: 1 }])).toThrow(/Variant ID/);
    }
  });

  it("recusa quantidade zero, negativa ou fracionada", () => {
    for (const q of [0, -1, 1.5, NaN]) {
      expect(() => montarPermalink(LOJA, [{ variantId: "111", quantidade: q }])).toThrow(/Quantidade/);
    }
  });

  it("recusa sacola vazia", () => {
    expect(() => montarPermalink(LOJA, [])).toThrow(/vazia/);
  });

  it("recusa domínio fora do myshopify", () => {
    expect(() => montarPermalink("exemplo.com", [{ variantId: "111", quantidade: 1 }])).toThrow(/Domínio/);
  });
});

describe("variantIdValido", () => {
  it("aceita só dígitos", () => {
    expect(variantIdValido("48421367939264")).toBe(true);
    expect(variantIdValido("TODO")).toBe(false);
    expect(variantIdValido(123)).toBe(false);
  });
});

describe("resolverItens / linhasCheckout", () => {
  const catalogo = [
    produto("a", [
      { cor: "Preto", shopifyVariantId: "111", disponivel: true },
      { cor: "Caramelo", shopifyVariantId: "TODO", disponivel: true },
    ]),
    produto("b", [{ cor: "Preto", shopifyVariantId: "222", disponivel: false }]),
    produto("c", [{ cor: "Preto", shopifyVariantId: "333", disponivel: true }], "TODO"),
  ];

  it("usa o ID atual do catálogo e só envia itens compráveis", () => {
    const itens = [
      { slug: "a", cor: "Preto", quantidade: 2 },
      { slug: "a", cor: "Caramelo", quantidade: 1 }, // sem ID
      { slug: "b", cor: "Preto", quantidade: 1 }, // esgotado
      { slug: "c", cor: "Preto", quantidade: 1 }, // sem preço
      { slug: "sumiu", cor: "Preto", quantidade: 1 }, // fora do catálogo
    ];
    const resolvidos = resolverItens(itens, catalogo);
    expect(resolvidos.map((i) => [i.slug, i.cor, i.compravel])).toEqual([
      ["a", "Preto", true],
      ["a", "Caramelo", false],
      ["b", "Preto", false],
      ["c", "Preto", false],
    ]);
    expect(linhasCheckout(resolvidos)).toEqual([{ variantId: "111", quantidade: 2 }]);
  });

  it("fluxo completo: 2 produtos → permalink", () => {
    const cat = [
      produto("x", [{ cor: "Preto", shopifyVariantId: "48421367939264", disponivel: true }]),
      produto("y", [{ cor: "Off-white", shopifyVariantId: "48421368070336", disponivel: true }]),
    ];
    const linhas = linhasCheckout(
      resolverItens(
        [
          { slug: "x", cor: "Preto", quantidade: 1 },
          { slug: "y", cor: "Off-white", quantidade: 2 },
        ],
        cat,
      ),
    );
    expect(montarPermalink(LOJA, linhas)).toBe(`https://${LOJA}/cart/48421367939264:1,48421368070336:2`);
  });
});
