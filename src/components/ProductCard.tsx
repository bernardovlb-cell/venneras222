import Link from "next/link";
import { Foto } from "@/components/Foto";
import { Preco, PriceLines } from "@/components/PriceBlock";
import { esgotado, imagensOrdenadas, type Produto } from "@/data/products";

export function ProductCard({ produto, priority = false }: { produto: Produto; priority?: boolean }) {
  const imgs = imagensOrdenadas(produto);
  const principal = imgs.find((i) => i.tipo === "produto") ?? imgs[0];
  const uso = imgs.find((i) => i.tipo === "uso");
  const semEstoque = esgotado(produto);
  const sizes = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw";

  return (
    <Link href={`/produto/${produto.slug}`} className="group block">
      <div className="relative">
        <Foto src={principal?.src} alt={principal?.alt ?? produto.nome} sizes={sizes} priority={priority} />
        {uso && (
          // Troca para a foto de uso no hover (só desktop com mouse).
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 [@media(hover:hover)]:group-hover:opacity-100">
            <Foto src={uso.src} alt="" sizes={sizes} />
          </div>
        )}
        {semEstoque && (
          <span className="label absolute left-2 top-2 bg-ink px-2 py-1 text-[0.625rem] text-paper">Esgotado</span>
        )}
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="text-sm leading-snug group-hover:underline group-hover:underline-offset-4">{produto.nome}</h3>
        {typeof produto.preco === "number" && (
          <>
            <Preco preco={produto.preco} precoComparacao={produto.precoComparacao} className="text-sm" />
            <PriceLines preco={produto.preco} ordem="parcelas-primeiro" className="text-xs" />
          </>
        )}
      </div>
    </Link>
  );
}

export function ProductGrid({
  produtos,
  priorityCount = 0,
  colunasDesktop = "lg:grid-cols-4",
}: {
  produtos: Produto[];
  priorityCount?: number;
  colunasDesktop?: string;
}) {
  return (
    <ul className={`grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 lg:gap-x-6 ${colunasDesktop}`}>
      {produtos.map((p, i) => (
        <li key={p.slug}>
          <ProductCard produto={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
