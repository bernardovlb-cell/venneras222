"use client";
import { useState } from "react";
import { AdminForm, F, Check, ActionButton } from "./ui";
import { saveCategoryAction, deleteCategoryAction, saveBrandAction, deleteBrandAction } from "@/app/admin/actions";

type C = { id: string; name: string; slug: string; parentId: string | null; description: string | null; position: number; isActive: boolean; isFeatured: boolean; depth: number; imageUrl: string | null };

export function CategoryEditor({ category, options, count = 0, children }: { category?: C; options: C[]; count?: number; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return category ? (
      <div className="flex flex-wrap items-center justify-between gap-2"><div>{children}</div>
        <div className="flex gap-1"><button className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>Editar</button>
          {count === 0 && <ActionButton action={() => deleteCategoryAction(category.id)} confirm={`Excluir a categoria "${category.name}"?`} className="btn btn-ghost btn-sm text-promo">Excluir</ActionButton>}</div>
      </div>
    ) : <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>+ Nova categoria</button>;
  }
  return (
    <AdminForm action={saveCategoryAction} onResult={(r) => r.ok && setOpen(false)} footer={<button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancelar</button>}>
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Nome" name="name" defaultValue={category?.name} required />
        <F label="URL" name="slug" defaultValue={category?.slug} hint="Gerada pelo nome se vazia" />
        <F label="Categoria pai" name="parentId" as="select" defaultValue={category?.parentId ?? ""}>
          <option value="">— principal —</option>
          {options.filter((o) => o.id !== category?.id).map((o) => <option key={o.id} value={o.id}>{"— ".repeat(o.depth)}{o.name}</option>)}
        </F>
        <F label="Ordem" name="position" type="number" min={0} defaultValue={String(category?.position ?? 0)} />
        <F label="Descrição" name="description" defaultValue={category?.description ?? ""} className="sm:col-span-2" />
        <Check label="Ativa" name="isActive" defaultChecked={category?.isActive ?? true} />
        <Check label="Destaque na home" name="isFeatured" defaultChecked={category?.isFeatured ?? false} />
        <div className="flex items-start gap-3 sm:col-span-2">
          {category?.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- miniatura no painel
            <img src={category.imageUrl} alt="" width={64} height={64} className="size-16 shrink-0 rounded-xl border border-line object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <F label={category?.imageUrl ? "Trocar foto" : "Foto da categoria (opcional)"} name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif"
              hint="Quadrada, de preferência com fundo claro. Aparece no lugar do ícone na loja. JPG, PNG, WebP ou AVIF, até 10 MB." />
            {category?.imageUrl && <div className="mt-2"><Check label="Remover a foto atual" name="removeImage" /></div>}
          </div>
        </div>
      </div>
    </AdminForm>
  );
}

export function BrandEditor({ brand }: { brand?: { id: string; name: string; isActive: boolean } }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return brand ? (
      <div className="flex items-center justify-between gap-2"><span className={brand.isActive ? "font-bold" : "text-muted line-through"}>{brand.name}</span>
        <div className="flex gap-1"><button className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>Editar</button>
          <ActionButton action={() => deleteBrandAction(brand.id)} confirm={`Excluir a marca "${brand.name}"?`} className="btn btn-ghost btn-sm text-promo">Excluir</ActionButton></div>
      </div>
    ) : <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>+ Nova marca</button>;
  }
  return (
    <AdminForm action={saveBrandAction} onResult={(r) => r.ok && setOpen(false)} footer={<button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancelar</button>}>
      {brand && <input type="hidden" name="id" value={brand.id} />}
      <F label="Nome da marca" name="name" defaultValue={brand?.name} required />
      <Check label="Ativa" name="isActive" defaultChecked={brand?.isActive ?? true} />
    </AdminForm>
  );
}
