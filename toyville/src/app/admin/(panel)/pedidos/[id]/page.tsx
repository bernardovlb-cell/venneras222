import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage, can } from "@/server/auth/guards";
import { getOrderForViewer, formatOrderNumber } from "@/server/services/orders";
import { PageHead, Panel, Badge } from "@/components/admin/server-ui";
import { FulfillmentForm, CancelForm, RefundForm, ReconcileButton, OrderFieldsForm } from "@/components/admin/OrderActions";
import { formatBRL } from "@/lib/money";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, FULFILLMENT_LABEL, METHOD_LABEL, type InternalPaymentStatus } from "@/lib/payment-status";
import { isConfigured } from "@/server/payments/mercadopago";

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireStaffPage("orders.read");
  const { id } = await params;
  const data = await getOrderForViewer(id, { isStaff: true });
  if (!data) notFound();
  const { order: o, items, events, payments } = data;
  const addr = o.shippingAddress;
  const approved = payments.find((p) => p.status === "approved" || p.status === "partially_refunded");
  const paid = o.status === "paid" || o.status === "completed";
  return (
    <div className="max-w-6xl space-y-5">
      <Link href="/admin/pedidos" className="text-sm font-bold text-primary">← Pedidos</Link>
      <PageHead title={`Pedido ${formatOrderNumber(o.number)}`} subtitle={`${o.createdAt.toLocaleString("pt-BR")} · canal: ${o.channel}`} actions={<>
        <Badge tone={paid ? "green" : o.status === "cancelled" || o.status === "needs_attention" ? "red" : "yellow"}>{ORDER_STATUS_LABEL[o.status]}</Badge>
        <Badge tone="blue">{PAYMENT_STATUS_LABEL[o.paymentStatus as InternalPaymentStatus]}</Badge>
        <Badge>{FULFILLMENT_LABEL[o.fulfillmentStatus]}</Badge>
      </>} />
      {o.attentionReason && <p className="rounded-xl bg-soft-red px-4 py-3 text-sm font-bold text-[#9c1015]">⚠ {o.attentionReason}</p>}
      {o.isDemo && <Badge tone="yellow">Pedido de demonstração</Badge>}

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Panel title="Itens (valores cobrados na compra)">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {items.map((i) => (
                  <tr key={i.id}><td className="py-2"><p className="font-bold">{i.productName}</p><p className="text-xs text-muted">{i.variantName ?? ""} · SKU {i.sku}{i.promotionLabel ? ` · ${i.promotionLabel}` : ""}</p></td>
                    <td className="py-2 text-right">{i.quantity} × {formatBRL(i.unitCents)}{i.unitCents < i.listUnitCents && <s className="ml-1 text-xs text-muted">{formatBRL(i.listUnitCents)}</s>}{i.couponDiscountCents > 0 && <p className="text-xs text-[#1d5e1d]">cupom −{formatBRL(i.couponDiscountCents)}</p>}</td>
                    <td className="py-2 text-right font-bold">{formatBRL(i.totalCents)}</td></tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatBRL(o.subtotalCents)}</dd></div>
              {o.discountCents > 0 && <div className="flex justify-between"><dt>Cupom {o.couponCode}</dt><dd>−{formatBRL(o.discountCents)}</dd></div>}
              <div className="flex justify-between"><dt>Frete ({o.shippingMethodName})</dt><dd>{formatBRL(o.shippingCents)}</dd></div>
              <div className="flex justify-between text-base font-extrabold"><dt>Total</dt><dd>{formatBRL(o.totalCents)}</dd></div>
            </dl>
          </Panel>
          <Panel title="Pagamentos (Mercado Pago)" actions={isConfigured() ? <ReconcileButton orderId={o.id} /> : <Badge tone="red">MP não configurado</Badge>}>
            {payments.length === 0 ? <p className="text-sm text-muted">Nenhuma tentativa de pagamento registrada.</p> : (
              <ul className="divide-y divide-line text-sm">{payments.map((p) => (
                <li key={p.id} className="py-2">
                  <p className="font-bold">{p.providerPaymentId ? `#${p.providerPaymentId}` : "Preferência criada"} — {PAYMENT_STATUS_LABEL[p.status as InternalPaymentStatus]}</p>
                  <p className="text-xs text-muted">{METHOD_LABEL[p.methodType ?? ""] ?? p.methodType ?? "—"}{p.installments ? ` · ${p.installments}x` : ""} · {formatBRL(p.amountCents)}{p.refundedCents ? ` · reembolsado ${formatBRL(p.refundedCents)}` : ""}{p.statusDetail ? ` · ${p.statusDetail}` : ""}</p>
                </li>
              ))}</ul>
            )}
            <p className="mt-3 text-xs text-muted">O status de pagamento só é alterado por confirmação do Mercado Pago (webhook ou consulta). Não existe opção de marcar como pago manualmente.</p>
          </Panel>
          <Panel title="Histórico">
            <ol className="space-y-2 text-sm">{events.map((e) => <li key={e.id}><span className="text-xs text-muted">{e.createdAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span> — {e.message} {e.visibleToCustomer && <Badge tone="blue">cliente vê</Badge>}</li>)}</ol>
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel title="Cliente">
            <p className="text-sm"><strong>{o.customerName}</strong><br />{o.email}<br />{o.customerPhone}{o.customerDocument && <><br />CPF {o.customerDocument}</>}</p>
            {o.userId && can(u, "customers.read") && <Link href={`/admin/clientes/${o.userId}`} className="mt-2 inline-block text-sm font-bold text-primary">Ver cliente →</Link>}
            {o.marketingConsent && <p className="mt-1 text-xs text-muted">Aceitou receber marketing.</p>}
          </Panel>
          <Panel title="Entrega">
            <p className="text-sm">{o.shippingMethodName}</p>
            {addr && <p className="mt-1 text-sm text-muted">{addr.recipient} · {addr.street}, {addr.number}{addr.complement ? ` — ${addr.complement}` : ""} · {addr.district} · {addr.city}/{addr.state} · CEP {addr.zip}</p>}
            {o.trackingCode && <p className="mt-1 text-sm">Rastreio: <strong>{o.trackingCode}</strong></p>}
            {o.notes && <p className="mt-2 rounded-lg bg-soft-yellow p-2 text-sm">{o.notes}</p>}
          </Panel>
          {paid && can(u, "orders.write") && <Panel title="Separação e entrega"><FulfillmentForm orderId={o.id} status={o.fulfillmentStatus} shippingType={o.shippingType} /></Panel>}
          {(o.status === "pending_payment" || (o.status === "needs_attention" && !o.paidAt)) && can(u, "orders.write") && <Panel title="Cancelar"><CancelForm orderId={o.id} /></Panel>}
          {approved && can(u, "orders.refund") && <Panel title="Reembolso"><RefundForm orderId={o.id} maxLabel={formatBRL(approved.amountCents - approved.refundedCents)} /></Panel>}
          {can(u, "orders.write") && <Panel title="Fiscal e notas internas"><OrderFieldsForm o={o} /><p className="mt-2 text-xs text-muted">A emissão automática de NF-e está desativada até a integração com o emissor da loja. Registre aqui os dados da nota emitida no seu sistema.</p></Panel>}
        </div>
      </div>
    </div>
  );
}
