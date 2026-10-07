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

const medidasPendentes: Medidas = {
  alturaCm: TODO,
  larguraCm: TODO,
  profundidadeCm: TODO,
  alcaCm: TODO,
  cabe: TODO,
};

/**
 * TODO [PREENCHER]: os 7 produtos abaixo são PROVISÓRIOS, só para a estrutura do site.
 * Nome, categoria, preço, cores, variant IDs, medidas e textos precisam ser substituídos
 * pelos dados reais. Fotos: public/images/produtos/{slug}/.
 *
 * Exemplo de produto completo:
 * {
 *   slug: "crossbody-x",
 *   nome: "Crossbody X",
 *   marca: "Grenobil",
 *   categoria: "bolsas",
 *   preco: 199.9,
 *   variantes: [{ cor: "Preto", shopifyVariantId: "48421367939264", disponivel: true }],
 *   imagens: [
 *     { src: "/images/produtos/crossbody-x/produto.jpg", alt: "Crossbody X preta, vista de frente", tipo: "produto" },
 *     { src: "/images/produtos/crossbody-x/uso.jpg", alt: "Modelo usando a Crossbody X transversal", tipo: "uso" },
 *   ],
 *   medidas: { alturaCm: 18, larguraCm: 24, profundidadeCm: 8, alcaCm: 120, cabe: "celular, carteira e chaves" },
 *   ...
 * }
 */
function pendente(n: number, categoria: Categoria): Produto {
  return {
    slug: `peca-${n}`,
    nome: `Peça ${n} (dados pendentes)`,
    marca: "Grenobil",
    categoria,
    preco: TODO,
    variantes: [{ cor: "Cor pendente", shopifyVariantId: TODO, disponivel: true }],
    imagens: [],
    medidas: medidasPendentes,
    material: TODO,
    compartimentos: TODO,
    descricaoCurta: TODO,
    descricao: TODO,
    cuidados: TODO,
  };
}

// TODO [PREENCHER]: categoria de cada peça é provisória.
export const produtos: Produto[] = [
  pendente(1, "bolsas"),
  pendente(2, "bolsas"),
  pendente(3, "bolsas"),
  pendente(4, "bolsas"),
  pendente(5, "mochilas"),
  pendente(6, "mochilas"),
  pendente(7, "carteiras"),
];

export function preenchido<T>(v: T | Todo | undefined | null): v is T {
  return v !== undefined && v !== null && v !== TODO && v !== "";
}

const ordemTipo: Record<TipoImagem, number> = { produto: 0, uso: 1, detalhe: 2, medidas: 3 };

/** Ordem da galeria: produto, uso, detalhes, medidas. */
export function imagensOrdenadas(p: Produto): ImagemProduto[] {
  return [...p.imagens].sort((a, b) => ordemTipo[a.tipo] - ordemTipo[b.tipo]);
}

export function produtoPorSlug(slug: string) {
  return produtos.find((p) => p.slug === slug);
}

export function nomeCategoria(slug: Categoria) {
  return categorias.find((c) => c.slug === slug)?.nome ?? slug;
}

export function esgotado(p: Produto) {
  return p.variantes.every((v) => !v.disponivel);
}

/** "Você também pode gostar": mesma categoria primeiro, depois as outras. */
export function relacionados(p: Produto, n = 3): Produto[] {
  const outros = produtos.filter((x) => x.slug !== p.slug);
  return [...outros.filter((x) => x.categoria === p.categoria), ...outros.filter((x) => x.categoria !== p.categoria)].slice(0, n);
}
