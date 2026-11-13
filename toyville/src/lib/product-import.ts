/**
 * Validação de planilhas de importação de produtos (CSV/XLSX). Função pura.
 * Uma linha por VARIAÇÃO. Linhas com o mesmo `produto_sku` formam um produto.
 * Campos do produto são lidos da primeira linha do grupo.
 */
import { parseBRLToCents } from "./money";
import { slugify } from "./slug";

export const IMPORT_COLUMNS = [
  { key: "produto_sku", required: true, help: "Código interno do produto (agrupa as variações)" },
  { key: "nome", required: true, help: "Nome do produto" },
  { key: "slug", required: false, help: "URL amigável (gerada a partir do nome se vazio)" },
  { key: "categoria", required: false, help: "Slug da categoria (ex.: pelucias)" },
  { key: "marca", required: false, help: "Nome da marca (criada se não existir)" },
  { key: "fabricante", required: false, help: "" },
  { key: "descricao_curta", required: false, help: "" },
  { key: "descricao", required: false, help: "" },
  { key: "idade_min_meses", required: false, help: "Ex.: 36 para 3 anos" },
  { key: "idade_max_meses", required: false, help: "" },
  { key: "status", required: false, help: "rascunho | ativo | arquivado (padrão: rascunho)" },
  { key: "variacao_sku", required: false, help: "SKU da variação (padrão: igual ao produto_sku)" },
  { key: "variacao_nome", required: false, help: "Ex.: Azul / Tamanho M (padrão: Padrão)" },
  { key: "opcoes", required: false, help: "Ex.: Cor=Azul;Tamanho=M" },
  { key: "preco", required: true, help: "Preço normal. Ex.: 129,90" },
  { key: "preco_promocional", required: false, help: "Menor que o preço normal" },
  { key: "estoque", required: false, help: "Quantidade inteira (vazio = não altera em atualizações; 0 em novos)" },
  { key: "peso_g", required: false, help: "" },
  { key: "comprimento_cm", required: false, help: "" },
  { key: "largura_cm", required: false, help: "" },
  { key: "altura_cm", required: false, help: "" },
  { key: "gtin", required: false, help: "Código de barras EAN/GTIN" },
  { key: "seguranca", required: false, help: "Advertências de segurança" },
  { key: "certificacoes", required: false, help: "Ex.: Certificação INMETRO nº ..." },
] as const;

export type ImportRow = Record<string, string | undefined>;

export interface ParsedVariant {
  row: number;
  sku: string;
  name: string;
  options: Record<string, string>;
  priceCents: number;
  salePriceCents: number | null;
  stock: number | null;
  weightGrams: number | null;
}

export interface ParsedProduct {
  row: number;
  sku: string;
  name: string;
  slug: string;
  categorySlug: string | null;
  brandName: string | null;
  manufacturer: string | null;
  shortDescription: string | null;
  description: string | null;
  minAgeMonths: number | null;
  maxAgeMonths: number | null;
  status: "draft" | "active" | "archived" | null; // null = não informado (novo: rascunho; existente: mantém)
  gtin: string | null;
  safetyInfo: string | null;
  certifications: string | null;
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  variants: ParsedVariant[];
}

export interface ImportIssue {
  row: number; // número da linha na planilha (cabeçalho = 1)
  field: string;
  message: string;
}

const STATUS_MAP: Record<string, ParsedProduct["status"]> = {
  rascunho: "draft", draft: "draft", ativo: "active", active: "active", publicado: "active",
  arquivado: "archived", archived: "archived",
};

function clean(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t ? t : null;
}

function int(v: string | undefined, row: number, field: string, issues: ImportIssue[], min = 0): number | null {
  const t = clean(v);
  if (t == null) return null;
  if (!/^-?\d+$/.test(t)) { issues.push({ row, field, message: `"${t}" não é um número inteiro` }); return null; }
  const n = Number(t);
  if (n < min) { issues.push({ row, field, message: `deve ser maior ou igual a ${min}` }); return null; }
  return n;
}

export function normalizeHeader(h: string): string {
  return slugify(h).replace(/-/g, "_");
}

export function parseImportRows(rows: ImportRow[]): { products: ParsedProduct[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const byProduct = new Map<string, ParsedProduct>();
  const seenVariantSku = new Map<string, number>();
  const seenSlug = new Map<string, string>();

  rows.forEach((raw, idx) => {
    const row = idx + 2;
    const r: ImportRow = {};
    for (const [k, v] of Object.entries(raw)) r[normalizeHeader(k)] = v;
    if (Object.values(r).every((v) => !clean(v))) return; // linha vazia

    const pSku = clean(r.produto_sku);
    const name = clean(r.nome);
    if (!pSku) { issues.push({ row, field: "produto_sku", message: "obrigatório" }); return; }
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(pSku)) { issues.push({ row, field: "produto_sku", message: "use apenas letras, números, ponto, hífen ou sublinhado (até 64)" }); return; }

    const vSku = clean(r.variacao_sku) ?? pSku;
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(vSku)) { issues.push({ row, field: "variacao_sku", message: "formato inválido" }); return; }
    const vKey = vSku.toUpperCase();
    if (seenVariantSku.has(vKey)) {
      issues.push({ row, field: "variacao_sku", message: `SKU duplicado na planilha (também na linha ${seenVariantSku.get(vKey)})` });
      return;
    }
    seenVariantSku.set(vKey, row);

    const price = parseBRLToCents(r.preco ?? "");
    if (price == null || price <= 0) { issues.push({ row, field: "preco", message: "preço obrigatório e maior que zero" }); return; }
    const saleRaw = clean(r.preco_promocional);
    let sale: number | null = null;
    if (saleRaw) {
      sale = parseBRLToCents(saleRaw);
      if (sale == null || sale <= 0) { issues.push({ row, field: "preco_promocional", message: "valor inválido" }); return; }
      if (sale >= price) { issues.push({ row, field: "preco_promocional", message: "deve ser menor que o preço normal" }); return; }
    }
    const stock = int(r.estoque, row, "estoque", issues, 0);

    const options: Record<string, string> = {};
    const optRaw = clean(r.opcoes);
    if (optRaw) {
      for (const pair of optRaw.split(";")) {
        const [k, v] = pair.split("=").map((x) => x?.trim());
        if (!k || !v) { issues.push({ row, field: "opcoes", message: `par inválido "${pair}" (use Nome=Valor;Nome=Valor)` }); continue; }
        options[k] = v;
      }
    }

    const variant: ParsedVariant = {
      row, sku: vSku, name: clean(r.variacao_nome) ?? (Object.values(options).join(" / ") || "Padrão"),
      options, priceCents: price, salePriceCents: sale, stock, weightGrams: int(r.peso_g, row, "peso_g", issues, 0),
    };

    let p = byProduct.get(pSku.toUpperCase());
    if (!p) {
      if (!name) { issues.push({ row, field: "nome", message: "obrigatório na primeira linha do produto" }); return; }
      const statusRaw = clean(r.status)?.toLowerCase() ?? null;
      const status = statusRaw ? STATUS_MAP[statusRaw] : null;
      if (statusRaw && !status) issues.push({ row, field: "status", message: `"${statusRaw}" inválido (use rascunho, ativo ou arquivado)` });
      const slug = slugify(clean(r.slug) ?? name);
      if (!slug) { issues.push({ row, field: "slug", message: "não foi possível gerar a URL" }); return; }
      if (seenSlug.has(slug) && seenSlug.get(slug) !== pSku.toUpperCase()) {
        issues.push({ row, field: "slug", message: `URL "${slug}" repetida em outro produto da planilha` });
      }
      seenSlug.set(slug, pSku.toUpperCase());
      const minAge = int(r.idade_min_meses, row, "idade_min_meses", issues, 0);
      const maxAge = int(r.idade_max_meses, row, "idade_max_meses", issues, 0);
      if (minAge != null && maxAge != null && minAge > maxAge) issues.push({ row, field: "idade_max_meses", message: "menor que a idade mínima" });
      p = {
        row, sku: pSku, name, slug,
        categorySlug: clean(r.categoria) ? slugify(clean(r.categoria)!) : null,
        brandName: clean(r.marca), manufacturer: clean(r.fabricante),
        shortDescription: clean(r.descricao_curta), description: clean(r.descricao),
        minAgeMonths: minAge, maxAgeMonths: maxAge, status: status ?? null,
        gtin: clean(r.gtin), safetyInfo: clean(r.seguranca), certifications: clean(r.certificacoes),
        weightGrams: variant.weightGrams,
        lengthCm: int(r.comprimento_cm, row, "comprimento_cm", issues, 0),
        widthCm: int(r.largura_cm, row, "largura_cm", issues, 0),
        heightCm: int(r.altura_cm, row, "altura_cm", issues, 0),
        variants: [],
      };
      byProduct.set(pSku.toUpperCase(), p);
    }
    p.variants.push(variant);
  });

  return { products: [...byProduct.values()], issues };
}

export function templateCsv(): string {
  const header = IMPORT_COLUMNS.map((c) => c.key).join(",");
  const example1 = [
    "EXEMPLO-001", "Quebra-cabeça 100 peças (EXEMPLO)", "", "brinquedos-educativos", "Marca Exemplo", "Fabricante Exemplo",
    "Resumo curto", "Descrição completa", "60", "120", "rascunho", "EXEMPLO-001", "Padrão", "", "79,90", "", "10",
    "350", "30", "22", "5", "", "Contém peças pequenas", "",
  ];
  const ex2a = ["EXEMPLO-002", "Pelúcia com variações (EXEMPLO)", "", "pelucias", "Marca Exemplo", "", "", "", "0", "", "rascunho", "EXEMPLO-002-AZ", "Azul", "Cor=Azul", "99,90", "89,90", "5", "", "", "", "", "", "", ""];
  const ex2b = ["EXEMPLO-002", "", "", "", "", "", "", "", "", "", "", "EXEMPLO-002-RS", "Rosa", "Cor=Rosa", "99,90", "", "3", "", "", "", "", "", "", ""];
  const q = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [header, example1.map(q).join(","), ex2a.map(q).join(","), ex2b.map(q).join(",")].join("\n") + "\n";
}
