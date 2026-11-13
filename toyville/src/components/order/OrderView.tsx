import Image from "next/image";
import type { getOrderForViewer } from "@/server/services/orders";
import { formatOrderNumber } from "@/server/services/orders";
import { formatBRL } from "@/lib/money";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, FULFILLMENT_LABEL, METHOD_LABEL, type InternalPaymentStatus } from "@/lib/payment-status";
import { CheckIcon, ClockIcon, AlertIcon, StoreIcon, TruckIcon } from "../icons";

type Data = NonNullable<Awaited<ReturnType<typeof getOrderForViewer>>>;

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending_payment: "bg-soft-yellow text-ink", paid: "bg-soft-green text-[#1d5e1d]", completed: "bg-soft-green text-[#1d5e1d]",
    cancelled: "bg-soft-red text-[#9c1015]", needs_attention: "bg-soft-red text-[#9c1015]",
  };
  return <span className={`chip ${map[status] ?? "bg-soft-blue text-primary-dark"}`}>{ORDER_STATUS_LABEL[status] ?? status}</span>;
}

export function OrderView({ data }: { data: Data }) {
  const { order: o, items, events, payments } = data;
  const addr = o.shippingAddress;
  const det = o.shippingDetails as Record<string, string>;
  const lastPayment = payments.find((p) => p.providerPaymentId);
  const ticket = (lastPayment?.raw as { transaction_details?: { external_resource_url?: string }; point_of_interaction?: { transaction_data?: { ticket_url?: string } } } | null);
  const payLink = ticket?.transaction_details?.external_resource_url ?? ticket?.point_of_interaction?.transaction_data?.ticket_url;

  const hero = o.status === "paid" || o.status === "completed"
    ? { icon: <CheckIcon size={28} />, cls: "bg-success text-white", title: "Pagamento confirmado!", text: "Recebemos a confirmação do Mercado Pago. Você será avisado a cada etapa." }
    : o.status === "cancelled"
      ? { icon: <AlertIcon size={26} />, cls: "bg-promo text-white", title: "Pedido cancelado", text: "Os itens voltaram ao estoque. Se houve cobrança, o reembolso segue o prazo do meio de pagamento." }
      : o.paymentStatus === "rejected"
        ? { icon: <AlertIcon size={26} />, cls: "bg-promo text-white", title: "Pagamento recusado", text: "Você pode tentar novamente com outro meio de pagamento enquanto a reserva estiver válida." }
        : { icon: <ClockIcon size={26} />, cls: "bg-accent text-ink", title: o.paymentStatus === "in_process" ? "Pagamento em análise" : "Aguardando pagamento", text: "Assim que o Mercado Pago confirmar o pagamento, atualizamos o pedido automaticamente." };

  return (
    <div className="space-y-6">
      <div className="card flex items-start gap-4 p-5">
        <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${hero.cls}`}>{hero.icon}</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-muted">Pedido {formatOrderNumber(o.number)} · {o.createdAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{hero.title}</h1>
          <p className="mt-1 text-muted">{hero.text}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={o.status} />
            <span className="chip bg-soft-blue text-primary-dark">{PAYMENT_STATUS_LABEL[o.paymentStatus as InternalPaymentStatus]}</span>
            {(o.status === "paid" || o.status === "completed") && <span className="chip bg-cream text-ink">{FULFILLMENT_LABEL[o.fulfillmentStatus]}</span>}
          </div>
          {o.status === "pending_payment" && o.reservationExpiresAt && (
            <p className="mt-3 text-sm">Itens reservados até <strong>{o.reservationExpiresAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</strong>.</p>
          )}
          {o.status === "pending_payment" && payLink && /^https:\/\//.test(payLink) && (
            <a href={payLink} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm mt-3">Ver boleto / código Pix</a>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="card p-5">
          <h2 className="text-lg font-extrabold">Itens</h2>
          <ul className="mt-3 divide-y divide-line">
            {items.map((i) => (
              <li key={i.id} className="flex gap-3 py-3">
                <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-soft-yellow">{i.imageUrl ? <Image src={i.imageUrl} alt="" fill sizes="64px" className="object-contain" /> : <span className="grid size-full place-items-center" aria-hidden>🧸</span>}</span>
                <div className="flex-1 text-sm">
                  <p className="font-bold">{i.productName}</p>
                  {i.variantName && <p className="text-muted">{i.variantName}</p>}
                  <p className="text-muted">{i.quantity} × {formatBRL(i.unitCents)}{i.unitCents < i.listUnitCents && <s className="ml-1">{formatBRL(i.listUnitCents)}</s>}</p>
                </div>
                <p className="text-sm font-extrabold">{formatBRL(i.totalCents)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatBRL(o.subtotalCents)}</dd></div>
            {o.discountCents > 0 && <div className="flex justify-between text-[#1d5e1d]"><dt>Cupom {o.couponCode}</dt><dd>− {formatBRL(o.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Entrega</dt><dd>{o.shippingCents ? formatBRL(o.shippingCents) : "Grátis"}</dd></div>
            <div className="flex justify-between text-base font-extrabold"><dt>Total</dt><dd>{formatBRL(o.totalCents)}</dd></div>
          </dl>
        </section>

        <div className="space-y-6">
          <section className="card p-5 text-sm">
            <h2 className="flex items-center gap-2 text-lg font-extrabold">{o.shippingType === "pickup" ? <StoreIcon /> : <TruckIcon />} {o.shippingMethodName}</h2>
            {o.shippingType === "pickup" ? (
              <p className="mt-2 text-muted">{det.address} — {det.city}/{det.state}<br />{det.hours}{det.instructions && <><br />{det.instructions}</>}</p>
            ) : addr ? (
              <p className="mt-2 text-muted">{addr.recipient}<br />{addr.street}, {addr.number}{addr.complement ? ` — ${addr.complement}` : ""}<br />{addr.district} — {addr.city}/{addr.state}<br />CEP {addr.zip}</p>
            ) : null}
            {det.etaText && <p className="mt-2">{det.etaText}</p>}
            {o.trackingCode && <p className="mt-2 font-bold">Rastreamento: {o.trackingUrl ? <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">{o.trackingCode}</a> : o.trackingCode}</p>}
          </section>
          {lastPayment && (
            <section className="card p-5 text-sm">
              <h2 className="text-lg font-extrabold">Pagamento</h2>
              <p className="mt-2">{METHOD_LABEL[lastPayment.methodType ?? ""] ?? "Mercado Pago"}{lastPayment.installments && lastPayment.installments > 1 ? ` em ${lastPayment.installments}x` : ""} — {PAYMENT_STATUS_LABEL[lastPayment.status as InternalPaymentStatus]}</p>
              {lastPayment.refundedCents > 0 && <p className="text-[#1d5e1d]">Reembolsado: {formatBRL(lastPayment.refundedCents)}</p>}
            </section>
          )}
          {events.length > 0 && (
            <section className="card p-5">
              <h2 className="text-lg font-extrabold">Acompanhamento</h2>
              <ol className="mt-3 space-y-3 border-l-2 border-line pl-4 text-sm">
                {events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[23px] top-1 size-3 rounded-full bg-primary ring-4 ring-white" aria-hidden />
                    <p className="font-bold">{e.message}</p>
                    <p className="text-xs text-muted">{e.createdAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
