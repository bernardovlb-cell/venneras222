/**
 * RASCUNHOS de páginas institucionais. Não são políticas definitivas: precisam de aprovação do
 * proprietário e, idealmente, revisão jurídica. Trechos entre [PENDENTE: ...] dependem de dados
 * comerciais ainda não fornecidos. O site exibe um aviso de "texto em revisão" enquanto o status
 * não for "publicado".
 * Formato do corpo: parágrafos separados por linha em branco; linhas iniciadas por "## " viram subtítulos
 * e por "- " viram itens de lista.
 */
export const POLICY_DRAFTS: { slug: string; title: string; body: string; pendingNotes: string }[] = [
  {
    slug: "trocas-e-devolucoes",
    title: "Trocas e devoluções",
    pendingNotes: "Definir prazo de troca por gosto/tamanho (além dos 7 dias legais), quem paga o frete de devolução, endereço de envio e canal de atendimento.",
    body: `## Direito de arrependimento
Compras feitas pela internet podem ser canceladas em até 7 (sete) dias corridos a contar do recebimento do produto, conforme o art. 49 do Código de Defesa do Consumidor. Nesse caso, os valores pagos são devolvidos integralmente, inclusive o frete.

Para exercer esse direito, abra uma solicitação em "Atendimento" escolhendo "Arrependimento" e informe o número do pedido.

## Produto com defeito
Produtos com defeito podem ser reclamados em até 90 dias (bens duráveis), conforme o art. 26 do CDC. Avaliaremos o caso e ofereceremos reparo, troca, abatimento ou devolução do valor, nos termos da lei.

## Troca por outros motivos
[PENDENTE: prazo e condições para troca por gosto, tamanho ou presente — política comercial da ToyVille.]

## Como devolver
[PENDENTE: endereço para envio ou retirada da devolução, embalagem exigida e responsável pelo custo do frete fora dos casos legais.]

## Reembolso
O reembolso é feito pelo mesmo meio de pagamento utilizado na compra, por meio do Mercado Pago. Os prazos de crédito dependem do meio de pagamento e da instituição financeira.`,
  },
  {
    slug: "politica-de-privacidade",
    title: "Política de privacidade",
    pendingNotes: "Preencher razão social, CNPJ, endereço e contato do encarregado (DPO). Revisar com assessoria jurídica.",
    body: `## Quem somos
[PENDENTE: razão social, CNPJ e endereço da empresa controladora dos dados.]

## Quais dados coletamos
- Dados de cadastro e compra: nome, e-mail, telefone, CPF (quando informado) e endereço de entrega.
- Dados de pagamento: processados diretamente pelo Mercado Pago. A ToyVille não recebe nem armazena número de cartão.
- Dados de navegação: cookies essenciais para o funcionamento (sessão e carrinho) e, somente com seu consentimento, cookies de análise e marketing.

## Para que usamos
- Processar pedidos, pagamentos, entregas, trocas e atendimento.
- Cumprir obrigações legais e fiscais.
- Enviar comunicações de marketing, somente com seu consentimento (você pode retirá-lo a qualquer momento).

## Com quem compartilhamos
Com o Mercado Pago (pagamentos), com empresas de entrega (quando houver envio) e com o emissor de notas fiscais. [PENDENTE: listar provedores efetivamente contratados — hospedagem, e-mail, análise.]

## Seus direitos (LGPD)
Você pode solicitar confirmação, acesso, correção, portabilidade e exclusão dos seus dados pela área "Minha conta" ou em "Atendimento". Alguns dados de pedidos precisam ser mantidos pelo prazo exigido em lei (por exemplo, obrigações fiscais).

## Encarregado (DPO)
[PENDENTE: nome e e-mail de contato do encarregado pelo tratamento de dados.]`,
  },
  {
    slug: "termos-de-uso",
    title: "Termos de uso",
    pendingNotes: "Revisar com assessoria jurídica; preencher dados da empresa e foro.",
    body: `## Sobre a loja
A ToyVille é uma loja virtual de brinquedos. [PENDENTE: razão social, CNPJ e endereço.]

## Preços e disponibilidade
Os preços e o estoque exibidos são confirmados no momento da finalização do pedido. O pedido só é considerado confirmado após a aprovação do pagamento pelo Mercado Pago.

## Pagamento
Os pagamentos são processados pelo Mercado Pago (Pix, cartão de crédito, cartão de débito e boleto, conforme disponibilidade na sua conta). Pedidos não pagos dentro do prazo indicado são cancelados automaticamente e os itens voltam ao estoque.

## Conta
Você é responsável por manter a confidencialidade da sua senha. É possível comprar sem criar conta.

## Avaliações
Avaliações passam por moderação. Conteúdo ofensivo, publicitário ou sem relação com o produto não é publicado.

## Foro
[PENDENTE: foro e legislação aplicável, a definir com assessoria jurídica.]`,
  },
  {
    slug: "politica-de-entregas",
    title: "Política de entregas",
    pendingNotes: "Definir modalidades, regiões atendidas, prazos e valores. Hoje nenhuma modalidade está ativa.",
    body: `## Modalidades
As modalidades disponíveis para o seu endereço são exibidas no checkout. Somente modalidades configuradas pela loja podem ser escolhidas.

## Retirada na loja
[PENDENTE: endereço, horários e documento exigido para retirada.]

## Entregas
[PENDENTE: regiões atendidas, transportadoras, prazos e valores. Frete grátis somente quando indicado no site.]

## Prazo
O prazo começa a contar após a confirmação do pagamento.`,
  },
  {
    slug: "sobre",
    title: "Sobre a ToyVille",
    pendingNotes: "Texto institucional a ser escrito/aprovado pelo proprietário.",
    body: `[PENDENTE: história da ToyVille, proposta e diferenciais confirmados.]`,
  },
];
