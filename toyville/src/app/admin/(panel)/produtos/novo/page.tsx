import Link from "next/link";
import { requireStaffPage } from "@/server/auth/guards";
import { categoryOptions, brandOptions } from "@/server/services/admin-lookups";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageHead, Panel } from "@/components/admin/server-ui";

export default async function NewProduct() {
  await requireStaffPage("products.write");
  const [cats, brands] = await Promise.all([categoryOptions(), brandOptions()]);
  return (
    <div className="max-w-4xl">
      <Link href="/admin/produtos" className="text-sm font-bold text-primary">← Produtos</Link>
      <PageHead title="Novo produto" subtitle="Depois de criar, cadastre variações (preço e estoque) e imagens, e então publique." />
      <Panel><ProductForm categories={cats} brands={brands} /></Panel>
    </div>
  );
}
