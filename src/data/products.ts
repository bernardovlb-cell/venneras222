/**
 * Catálogo Venneras — fonte única dos produtos.
 * Campos não fornecidos ficam como TODO e NÃO aparecem no site.
 * Os 7 produtos serão cadastrados quando os dados reais chegarem.
 */
export type Categoria = "bolsas" | "mochilas" | "carteiras";

export type TipoImagem = "produto" | "uso" | "detalhe" | "medidas";

export const TODO = "TODO" as const;
export type Todo = typeof TODO;

export interface Variante {
  cor: string;
  /** ID numérico da variante no Shopify (ex.: "48421367939264") ou TODO. */
  shopifyVariantId: string | Todo;
  disponivel: boolean;
}

export interface ImagemProduto {
  src: string;
  alt: string;
  tipo: TipoImagem;
}

export interface Medidas {
  alturaCm: number | Todo;
  larguraCm: number | Todo;
  profundidadeCm: number | Todo;
  alcaCm: number | Todo;
  /** Frase "cabe: ...". Ex.: "celular, carteira e chaves". */
  cabe: string | Todo;
}

export interface Produto {
  slug: string;
  nome: string;
  marca: string;
  categoria: Categoria;
  preco: number | Todo;
  precoComparacao?: number;
  variantes: Variante[];
  imagens: ImagemProduto[];
  medidas: Medidas;
  material: string | Todo;
  compartimentos: string | Todo;
  descricaoCurta: string | Todo;
  descricao: string | Todo;
  cuidados: string | Todo;
}

export const categorias: { slug: Categoria; nome: string }[] = [
  { slug: "bolsas", nome: "Bolsas" },
  { slug: "mochilas", nome: "Mochilas" },
  { slug: "carteiras", nome: "Carteiras" },
];

export const produtos: Produto[] = [];
