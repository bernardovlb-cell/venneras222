"use client";
import { AdminForm, F } from "./ui";
import { saveProductAction } from "@/app/admin/actions";

type P = Partial<{
  id: string; name: string; slug: string; sku: string; gtin: string | null; shortDescription: string | null; description: string | null; brandId: string | null;
  manufacturer: string | null; categoryId: string | null; minAgeMonths: number | null; maxAgeMonths: number | null; status: string; safetyInfo: string | null;
  certifications: string | null; weightGrams: number | null; lengthCm: number | null; widthCm: number | null; heightCm: number | null; seoTitle: string | null; seoDescription: string | null;
}>;

export function ProductForm({ p = {}, categories, brands }: { p?: P; categories: { id: string; name: string; depth: number }[]; brands: { id: string; name: string }[] }) {
  const v = (x: unknown) => (x == null ? "" : String(x));
  return (
    <AdminForm action={saveProductAction} submitLabel={p.id ? "Salvar produto" : "Criar produto (como rascunho)"}>
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Nome" name="name" defaultValue={v(p.name)} required className="sm:col-span-2" />
        <F label="SKU / código interno" name="sku" defaultValue={v(p.sku)} required />
        <F label="URL amigável" name="slug" defaultValue={v(p.slug)} hint="Gerada pelo nome se vazia" />
        <F label="Categoria" name="categoryId" as="select" defaultValue={v(p.categoryId)}>
          <option value="">— sem categoria —</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{"— ".repeat(c.depth)}{c.name}</option>)}
        </F>
        <F label="Marca" name="brandId" as="select" defaultValue={v(p.brandId)}>
          <option value="">— sem marca —</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </F>
        <F label="Fabricante" name="manufacturer" defaultValue={v(p.manufacturer)} />
        <F label="Código de barras (GTIN/EAN)" name="gtin" defaultValue={v(p.gtin)} />
        <F label="Idade mínima (meses)" name="minAgeMonths" type="number" min={0} defaultValue={v(p.minAgeMonths)} hint="Ex.: 36 = 3 anos" />
        <F label="Idade máxima (meses)" name="maxAgeMonths" type="number" min={0} defaultValue={v(p.maxAgeMonths)} hint="Vazio = sem limite" />
        <F label="Descrição resumida" name="shortDescription" as="textarea" rows={2} maxLength={300} defaultValue={v(p.shortDescription)} className="sm:col-span-2" />
        <F label="Descrição completa" name="description" as="textarea" rows={6} defaultValue={v(p.description)} className="sm:col-span-2" hint="Parágrafos separados por linha em branco" />
        <F label="Informações de segurança / advertências" name="safetyInfo" as="textarea" rows={2} defaultValue={v(p.safetyInfo)} className="sm:col-span-2" />
        <F label="Certificações (ex.: INMETRO)" name="certifications" defaultValue={v(p.certifications)} className="sm:col-span-2" />
        <F label="Peso (g)" name="weightGrams" type="number" min={0} defaultValue={v(p.weightGrams)} />
        <div className="grid grid-cols-3 gap-2">
          <F label="Compr. (cm)" name="lengthCm" type="number" min={0} defaultValue={v(p.lengthCm)} />
          <F label="Larg. (cm)" name="widthCm" type="number" min={0} defaultValue={v(p.widthCm)} />
          <F label="Alt. (cm)" name="heightCm" type="number" min={0} defaultValue={v(p.heightCm)} />
        </div>
        <F label="Título para buscadores (SEO)" name="seoTitle" maxLength={70} defaultValue={v(p.seoTitle)} />
        <F label="Descrição para buscadores (SEO)" name="seoDescription" maxLength={170} defaultValue={v(p.seoDescription)} />
        {p.id && (
          <F label="Status" name="status" as="select" defaultValue={v(p.status)} hint="Publicar exige ao menos uma variação ativa">
            <option value="draft">Rascunho (oculto)</option><option value="active">Publicado</option><option value="archived">Arquivado</option>
          </F>
        )}
      </div>
    </AdminForm>
  );
}
