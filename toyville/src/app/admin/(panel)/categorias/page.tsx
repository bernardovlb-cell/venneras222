import { sql } from "drizzle-orm";
import { requireStaffPage } from "@/server/auth/guards";
import { categoryOptions, brandOptions } from "@/server/services/admin-lookups";
import { db } from "@/server/db/client";
import { PageHead, Panel, Badge } from "@/components/admin/server-ui";
import { CategoryEditor, BrandEditor } from "@/components/admin/CatalogEditors";

export default async function CategoriesPage() {
  await requireStaffPage("products.read");
  const [cats, brands, { rows: counts }] = await Promise.all([
    categoryOptions(), brandOptions(),
    db.execute<{ category_id: string; n: number }>(sql`select category_id, count(*)::int as n from products group by category_id`),
  ]);
  const countBy = new Map(counts.map((c) => [c.category_id, c.n]));
  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div>
        <PageHead title="Categorias" subtitle="Organize categorias e subcategorias sem mexer no código." />
        <Panel>
          <ul className="divide-y divide-line">
            {cats.map((c) => (
              <li key={c.id} className="py-2" style={{ paddingLeft: c.depth * 20 }}>
                <CategoryEditor category={c} options={cats} count={countBy.get(c.id) ?? 0}>
                  <span className="font-bold">{c.name}</span> <span className="text-xs text-muted">/{c.slug} · {countBy.get(c.id) ?? 0} produto(s)</span>{" "}
                  {!c.isActive && <Badge tone="red">inativa</Badge>} {c.isFeatured && <Badge tone="blue">destaque na home</Badge>} {c.imageUrl && <Badge tone="green">com foto</Badge>}
                </CategoryEditor>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-line pt-4"><CategoryEditor options={cats} /></div>
        </Panel>
      </div>
      <div>
        <PageHead title="Marcas" />
        <Panel>
          <ul className="divide-y divide-line">{brands.map((b) => <li key={b.id} className="py-2"><BrandEditor brand={b} /></li>)}</ul>
          <div className="mt-4 border-t border-line pt-4"><BrandEditor /></div>
        </Panel>
      </div>
    </div>
  );
}
