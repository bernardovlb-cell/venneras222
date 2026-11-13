"use client";
import { AdminForm, F, Check, ActionButton } from "./ui";
import { fulfillmentAction, cancelOrderAction, refundAction, reconcileAction, orderFieldsAction } from "@/app/admin/actions";

const NEXT: Record<string, { value: string; label: string; pickupOnly?: boolean; deliveryOnly?: boolean }[]> = {
  unfulfilled: [{ value: "picking", label: "Iniciar separação" }, { value: "ready_for_pickup", label: "Pronto para retirada", pickupOnly: true }, { value: "shipped", label: "Marcar como enviado", deliveryOnly: true }],
  picking: [{ value: "ready_for_pickup", label: "Pronto para retirada", pickupOnly: true }, { value: "shipped", label: "Marcar como enviado", deliveryOnly: true }, { value: "unfulfilled", label: "Voltar para aguardando" }],
  ready_for_pickup: [{ value: "delivered", label: "Retirado pelo cliente" }, { value: "picking", label: "Voltar para separação" }],
  shipped: [{ value: "delivered", label: "Marcar como entregue" }, { value: "returned", label: "Registrar devolução recebida (repõe estoque)" }],
  delivered: [{ value: "returned", label: "Registrar devolução recebida (repõe estoque)" }],
};

export function FulfillmentForm({ orderId, status, shippingType }: { orderId: string; status: string; shippingType: string }) {
  const opts = (NEXT[status] ?? []).filter((o) => (!o.pickupOnly || shippingType === "pickup") && (!o.deliveryOnly || shippingType !== "pickup"));
  if (!opts.length) return <p className="text-sm text-muted">Sem próximas etapas.</p>;
  return (
    <AdminForm action={fulfillmentAction} submitLabel="Atualizar etapa">
      <input type="hidden" name="orderId" value={orderId} />
      <F label="Próxima etapa" name="next" as="select">{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</F>
      {shippingType !== "pickup" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <F label="Código de rastreamento" name="trackingCode" hint="Obrigatório ao marcar como enviado (exceto entrega local)" />
          <F label="Link de rastreamento" name="trackingUrl" placeholder="https://" />
        </div>
      )}
      <F label="Observação ao cliente (opcional)" name="note" />
    </AdminForm>
  );
}

export function CancelForm({ orderId }: { orderId: string }) {
  return (
    <AdminForm action={cancelOrderAction} submitLabel="Cancelar pedido não pago">
      <input type="hidden" name="orderId" value={orderId} />
      <F label="Motivo" name="reason" required />
      <p className="text-xs text-muted">Antes de cancelar, o sistema consulta o Mercado Pago; se houver pagamento aprovado, o cancelamento é bloqueado.</p>
    </AdminForm>
  );
}

export function RefundForm({ orderId, maxLabel }: { orderId: string; maxLabel: string }) {
  return (
    <AdminForm action={refundAction} submitLabel="Solicitar reembolso">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="grid gap-2 sm:grid-cols-2">
        <F label="Valor (vazio = total)" name="amount" inputMode="decimal" hint={`Disponível: ${maxLabel}`} />
        <F label="Motivo" name="reason" required />
      </div>
      <p className="text-xs text-muted">O reembolso é executado pelo Mercado Pago. O status do pedido só muda após a confirmação do provedor.</p>
    </AdminForm>
  );
}

export function ReconcileButton({ orderId }: { orderId: string }) {
  return <ActionButton action={() => reconcileAction(orderId)} className="btn btn-outline btn-sm">Consultar pagamento no Mercado Pago</ActionButton>;
}

export function OrderFieldsForm({ o }: { o: { id: string; notes: string | null; fiscalStatus: string; invoiceNumber: string | null; invoiceKey: string | null; invoiceUrl: string | null; attentionReason: string | null } }) {
  return (
    <AdminForm action={orderFieldsAction}>
      <input type="hidden" name="orderId" value={o.id} />
      <F label="Notas internas" name="notes" as="textarea" rows={2} defaultValue={o.notes ?? ""} />
      <div className="grid gap-2 sm:grid-cols-2">
        <F label="Status fiscal" name="fiscalStatus" as="select" defaultValue={o.fiscalStatus}>
          <option value="disabled">Não emitida (integração desativada)</option><option value="pending">Pendente</option><option value="issued">Emitida</option><option value="error">Erro</option><option value="cancelled">Cancelada</option>
        </F>
        <F label="Número da NF-e" name="invoiceNumber" defaultValue={o.invoiceNumber ?? ""} />
        <F label="Chave de acesso (44 dígitos)" name="invoiceKey" defaultValue={o.invoiceKey ?? ""} />
        <F label="Link da DANFE/XML" name="invoiceUrl" defaultValue={o.invoiceUrl ?? ""} placeholder="https://" />
      </div>
      {o.attentionReason && <Check label="Marcar alerta como resolvido" name="clearAttention" />}
    </AdminForm>
  );
}
