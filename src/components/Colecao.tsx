import Link from "next/link";
import { ProductGrid } from "@/components/ProductCard";
import { categorias, produtos, type Categoria } from "@/data/products";

export function Colecao({ categoria }: { categoria?: Categoria }) {
  const lista = categoria ? produtos.filter((p) => p.categoria === categoria) : produtos;
  const abas = [{ href: "/colecao", nome: "Todas", ativa: !categoria }].concat(
    categorias.map((c) => ({ href: `/colecao/${c.slug}`, nome: c.nome, ativa: c.slug === categoria })),
  );
  const titulo = categoria ? categorias.find((c) => c.slug === categoria)!.nome : "A coleção";

  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-12 lg:px-10 lg:pt-16">
      <h1 className="title text-center text-2xl lg:text-3xl">{titulo}</h1>
      <nav aria-label="Categorias" className="mt-8 border-b border-line">
        <ul className="-mb-px flex justify-start gap-1 overflow-x-auto sm:justify-center">
          {abas.map((a) => (
            <li key={a.href}>
              <Link
                href={a.href}
                aria-current={a.ativa ? "page" : undefined}
                className={`label flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 ${
                  a.ativa ? "border-amber text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {a.nome}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-10">
        <h2 className="sr-only">Produtos</h2>
        {lista.length > 0 ? (
          <ProductGrid produtos={lista} priorityCount={2} />
        ) : (
          <p className="py-16 text-center text-sm text-muted">Nenhuma peça nesta categoria no momento.</p>
        )}
      </div>
    </div>
  );
}
