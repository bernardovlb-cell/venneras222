import { formatBRL } from "@/lib/format";
import { parcelamento, precoPix } from "@/lib/pricing";
import { site } from "@/config/site";

/** Linhas de Pix e parcelamento. Só aparecem se configuradas em site.ts. */
export function PriceLines({
  preco,
  ordem = "pix-primeiro",
  className = "",
}: {
  preco: number;
  ordem?: "pix-primeiro" | "parcelas-primeiro";
  className?: string;
}) {
  const pix = precoPix(preco);
  const parc = parcelamento(preco);
  const linhaPix = pix !== null && (
    <p key="pix">
      {formatBRL(pix)} no Pix <span className="text-muted">({site.pixDescontoPercentual}% de desconto)</span>
    </p>
  );
  const linhaParc = parc && (
    <p key="parc" className="text-muted">
      ou {parc.parcelas}x de {formatBRL(parc.valor)} sem juros
    </p>
  );
  if (!linhaPix && !linhaParc) return null;
  return (
    <div className={`space-y-0.5 text-sm ${className}`}>
      {ordem === "pix-primeiro" ? [linhaPix, linhaParc] : [linhaParc, linhaPix]}
    </div>
  );
}

export function Preco({ preco, precoComparacao, className = "" }: { preco: number; precoComparacao?: number; className?: string }) {
  return (
    <p className={`font-medium ${className}`}>
      {precoComparacao && precoComparacao > preco && (
        <>
          <span className="sr-only">De </span>
          <s className="mr-2 font-normal text-muted">{formatBRL(precoComparacao)}</s>
          <span className="sr-only">por </span>
        </>
      )}
      {formatBRL(preco)}
    </p>
  );
}
