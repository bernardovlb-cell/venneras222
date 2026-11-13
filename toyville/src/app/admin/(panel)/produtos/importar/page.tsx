import Link from "next/link";
import { requireStaffPage } from "@/server/auth/guards";
import { PageHead, Panel } from "@/components/admin/server-ui";
import { ImportForm } from "@/components/admin/ImportForm";
import { IMPORT_COLUMNS } from "@/lib/product-import";

export default async function ImportPage() {
  await requireStaffPage("products.write");
  // download de arquivo gerado por rota (não é navegação entre páginas)
  const templateLink = <a href="/admin/produtos/importar/modelo" download className="btn btn-outline btn-sm">Baixar planilha-modelo (CSV)</a>;
  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/admin/produtos" className="text-sm font-bold text-primary">← Produtos</Link>
      <PageHead title="Importar produtos" subtitle="Cadastre ou atualize vários produtos de uma vez. Produtos existentes são identificados pelo SKU." actions={templateLink} />
      <Panel><ImportForm /></Panel>
      <Panel title="Colunas aceitas">
        <ul className="grid gap-1 text-sm sm:grid-cols-2">{IMPORT_COLUMNS.map((c) => <li key={c.key}><code className="font-bold">{c.key}</code>{c.required && <span className="text-promo"> *</span>} <span className="text-muted">{c.help}</span></li>)}</ul>
        <p className="mt-3 text-xs text-muted">Uma linha por variação; linhas com o mesmo <code>produto_sku</code> formam um produto. Imagens são enviadas pela tela do produto (não importamos imagens de links externos).</p>
      </Panel>
    </div>
  );
}
