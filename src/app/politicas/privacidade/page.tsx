import type { Metadata } from "next";
import { PaginaTexto } from "@/components/Prose";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Política de privacidade", alternates: { canonical: "/politicas/privacidade" } };

export default function Privacidade() {
  return (
    <PaginaTexto titulo="Política de privacidade" rascunho>
      <p>
        Esta política explica como a {site.razaoSocial} (CNPJ {site.cnpj}) trata dados pessoais neste site, de acordo com a Lei Geral de
        Proteção de Dados (Lei nº 13.709/2018 — LGPD).
      </p>
      <h2>Quais dados coletamos</h2>
      <ul>
        <li>Itens que você coloca na sacola, guardados só no seu navegador (armazenamento local).</li>
        <li>Se você aceitar os cookies de análise: dados de navegação, como páginas visitadas, dispositivo e origem do acesso.</li>
      </ul>
      <p>
        Os dados da compra (nome, endereço, e-mail, pagamento) são informados no checkout da Shopify e processados pela Shopify e pelo
        Mercado Pago, conforme as políticas de privacidade dessas empresas. Este site não recebe dados de cartão.
      </p>
      <h2>Cookies de análise</h2>
      <p>
        Usamos Google Analytics 4 e Meta Pixel para entender como o site é usado e medir anúncios. Esses cookies só são ativados depois que
        você clica em “Aceitar” no aviso de cookies. Se você recusar, nenhum deles é carregado. Para mudar sua escolha, apague os dados do
        site no seu navegador e o aviso aparecerá de novo.
      </p>
      <h2>Base legal</h2>
      <p>Consentimento (art. 7º, I, da LGPD) para os cookies de análise; execução de contrato (art. 7º, V) para o processamento da compra.</p>
      <h2>Seus direitos</h2>
      <p>
        Você pode pedir acesso, correção ou exclusão dos seus dados, e revogar o consentimento a qualquer momento (art. 18 da LGPD).
      </p>
      <h2>Contato do encarregado</h2>
      <p>[PREENCHER] E-mail para assuntos de privacidade.</p>
    </PaginaTexto>
  );
}
