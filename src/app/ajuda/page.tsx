import type { Metadata } from "next";
import Link from "next/link";
import { Accordion } from "@/components/Accordion";
import { PaginaTexto } from "@/components/Prose";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { site } from "@/config/site";
import { formatBRL } from "@/lib/format";

export const metadata: Metadata = {
  title: "Ajuda",
  description: "Pagamento, entrega, trocas, medidas e contato da Venneras.",
  alternates: { canonical: "/ajuda" },
};

export default function Ajuda() {
  return (
    <PaginaTexto titulo="Ajuda" rascunho>
      <div className="border-t border-line">
        <Accordion titulo="Quais as formas de pagamento?">
          <p>
            Pix e cartão de crédito, processados pelo Mercado Pago dentro do checkout seguro da Shopify. O site da Venneras não recebe nem
            armazena dados de cartão.
          </p>
          {site.pixDescontoPercentual && <p>No Pix, você tem {site.pixDescontoPercentual}% de desconto.</p>}
          {site.parcelasSemJuros && <p>No cartão, em até {site.parcelasSemJuros}x sem juros.</p>}
        </Accordion>
        <Accordion titulo="Qual o prazo e o valor do frete?">
          <p>Frete e prazo são calculados no checkout, a partir do seu CEP, antes de você pagar.</p>
          {site.freteGratisAcima && <p>Frete grátis em compras acima de {formatBRL(site.freteGratisAcima)}.</p>}
        </Accordion>
        <Accordion titulo="Posso trocar ou devolver?">
          <p>
            Sim. Em compras online, você pode desistir em até 7 dias após o recebimento (art. 49 do Código de Defesa do Consumidor). Veja
            os detalhes na <Link href="/politicas/trocas">política de trocas</Link>.
          </p>
        </Accordion>
        <Accordion titulo="Como ver se a bolsa tem o tamanho certo?">
          <p>
            Cada produto tem um bloco de medidas com altura, largura, profundidade e comprimento da alça, em centímetros. Compare com uma
            bolsa que você já tem: meça com uma fita métrica, com a bolsa vazia e apoiada numa superfície plana.
          </p>
        </Accordion>
        <Accordion titulo="Como falo com a Venneras?">
          <p>
            Pelo Instagram <a href={site.instagramUrl}>{site.instagramHandle}</a>
            {site.whatsappNumero ? " ou pelo WhatsApp." : "."}
          </p>
          <WhatsAppLink origem="ajuda" className="inline-flex min-h-11 items-center">
            Abrir WhatsApp
          </WhatsAppLink>
        </Accordion>
      </div>
    </PaginaTexto>
  );
}
