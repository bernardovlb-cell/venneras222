import type { Metadata } from "next";
import { PaginaTexto } from "@/components/Prose";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Trocas e devoluções", alternates: { canonical: "/politicas/trocas" } };

export default function Trocas() {
  return (
    <PaginaTexto titulo="Trocas e devoluções" rascunho>
      <h2>Direito de arrependimento (7 dias)</h2>
      <p>
        Nas compras feitas pela internet, você pode desistir da compra em até 7 (sete) dias corridos a partir do recebimento do produto,
        sem precisar justificar, conforme o art. 49 do Código de Defesa do Consumidor (Lei nº 8.078/1990).
      </p>
      <p>
        Nesse caso, os valores pagos, inclusive o frete, são devolvidos integralmente, pelo mesmo meio de pagamento usado na compra.
      </p>
      <h2>Como solicitar</h2>
      <p>[PREENCHER] Canal de solicitação (WhatsApp / e-mail) e dados que o cliente deve enviar (nº do pedido, fotos).</p>
      <p>[PREENCHER] Como funciona o envio de volta (código de postagem, quem paga o frete de retorno).</p>
      <h2>Condições do produto</h2>
      <p>[PREENCHER] Ex.: produto sem sinais de uso, com etiquetas e embalagem original.</p>
      <h2>Produto com defeito</h2>
      <p>
        Produtos com defeito podem ser reclamados em até 90 dias (art. 26, II, do CDC). [PREENCHER] Procedimento de troca ou reembolso.
      </p>
      <h2>Prazo de reembolso</h2>
      <p>[PREENCHER] Prazo após o recebimento da devolução.</p>
      <p className="pt-6 text-sm text-muted">
        {site.razaoSocial} · CNPJ {site.cnpj}
      </p>
    </PaginaTexto>
  );
}
