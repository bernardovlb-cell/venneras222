/** Mapeia status de pagamento do Mercado Pago para o status interno. */
export type InternalPaymentStatus =
  | "pending" | "in_process" | "approved" | "rejected" | "cancelled" | "refunded" | "partially_refunded" | "charged_back" | "expired";

export function mapMercadoPagoStatus(status: string, amountCents: number, refundedCents: number): InternalPaymentStatus {
  switch (status) {
    case "approved":
      return refundedCents > 0 && refundedCents < amountCents ? "partially_refunded" : "approved";
    case "authorized":
    case "in_process":
    case "in_mediation":
      return "in_process";
    case "pending":
      return "pending";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "refunded":
      return "refunded";
    case "charged_back":
      return "charged_back";
    default:
      return "pending";
  }
}

export const PAYMENT_STATUS_LABEL: Record<InternalPaymentStatus, string> = {
  pending: "Aguardando pagamento",
  in_process: "Pagamento em análise",
  approved: "Pagamento aprovado",
  rejected: "Pagamento recusado",
  cancelled: "Pagamento cancelado",
  refunded: "Reembolsado",
  partially_refunded: "Reembolsado parcialmente",
  charged_back: "Contestado (chargeback)",
  expired: "Expirado",
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Aguardando pagamento",
  paid: "Pago",
  cancelled: "Cancelado",
  completed: "Concluído",
  needs_attention: "Requer atenção",
};

export const FULFILLMENT_LABEL: Record<string, string> = {
  unfulfilled: "Aguardando separação",
  picking: "Em separação",
  ready_for_pickup: "Pronto para retirada",
  shipped: "Enviado",
  delivered: "Entregue",
  returned: "Devolvido",
  cancelled: "Cancelado",
};

export const METHOD_LABEL: Record<string, string> = {
  bank_transfer: "Pix",
  pix: "Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  ticket: "Boleto",
  account_money: "Saldo Mercado Pago",
  prepaid_card: "Cartão pré-pago",
};
