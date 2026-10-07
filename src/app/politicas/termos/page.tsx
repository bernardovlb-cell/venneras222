import type { Metadata } from "next";
import Link from "next/link";
import { PaginaTexto } from "@/components/Prose";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Termos de uso", alternates: { canonical: "/politicas/termos" } };

export default function Termos() {
  return (
    <PaginaTexto titulo="Termos de uso" rascunho>
      <p>
        Este site ({site.url.replace("https://", "")}) é operado pela {site.razaoSocial}, CNPJ {site.cnpj}. Ao usar o site, você
        concorda com estes termos.
      </p>
      <h2>Produtos</h2>
      <p>
        A Venneras é uma curadoria: as peças são de fabricantes parceiros, e a marca de cada uma está indicada na página do produto. As
        fotos são ilustrativas; pequenas variações de cor podem ocorrer conforme a tela.
      </p>
      <h2>Preços e pagamento</h2>
      <p>
        O preço válido é o exibido no checkout no momento da compra. O pagamento é feito no checkout da Shopify e processado pelo Mercado
        Pago.
      </p>
      <h2>Entrega</h2>
      <p>Frete e prazo são calculados no checkout pelo CEP. [PREENCHER] Transportadoras e regras de entrega.</p>
      <h2>Trocas</h2>
      <p>
        Veja a <Link href="/politicas/trocas">política de trocas e devoluções</Link>.
      </p>
      <h2>Foro</h2>
      <p>[PREENCHER] Foro e legislação aplicável.</p>
    </PaginaTexto>
  );
}
