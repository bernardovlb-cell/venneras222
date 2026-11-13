import type { Metadata } from "next";
import Link from "next/link";
import { getOrderForViewer } from "@/server/services/orders";
import { verifyReturnedPayment } from "@/app/actions/checkout";
import { getCurrentUser } from "@/server/auth/session";
import { OrderView } from "@/components/order/OrderView";
import { PayButton } from "@/components/order/PayButton";
import { EmptyState, Notice } from "@/components/ui/States";

export const metadata: Metadata = { title: "Seu pedido", robots: { index: false, follow: false } };

type SP = Record<string, string | undefined>;

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  const token = sp.t ?? null;
  let data = await getOrderForViewer(id, { token, userId: user?.id, isStaff: false });
  if (!data) {
    return (
      <div className="container-tv py-12">
        <EmptyState title={sp.duplicado ? "Pedido já registrado" : "Pedido não encontrado"}
          text={sp.duplicado ? "Este pedido já foi criado. Use o link enviado ao seu e-mail para acompanhá-lo." : "Use o link enviado ao seu e-mail ou entre na sua conta para ver seus pedidos."}
          action={{ href: "/conta/pedidos", label: "Meus pedidos" }} emoji="📦" />
      </div>
    );
  }
  // Retorno do Mercado Pago: confirma o pagamento consultando a API (o status da URL é ignorado).
  const paymentId = sp.payment_id ?? sp.collection_id;
  if (paymentId && data.order.status === "pending_payment") {
    await verifyReturnedPayment(id, paymentId);
    data = (await getOrderForViewer(id, { token, userId: user?.id }))!;
  }
  const o = data.order;
  const canPay = o.status === "pending_payment" && token && o.reservationExpiresAt && o.reservationExpiresAt > new Date();
  return (
    <div className="container-tv max-w-5xl space-y-4 py-6">
      {sp.erro_pagamento && <Notice kind="error">Seu pedido foi criado, mas não conseguimos abrir o Mercado Pago agora. Tente novamente abaixo.</Notice>}
      <OrderView data={data} />
      {canPay && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm">{o.paymentStatus === "rejected" ? "Tente pagar novamente com outro meio." : "Ainda não pagou? Você pode concluir o pagamento agora."}</p>
          <PayButton orderId={o.id} token={token!} />
        </div>
      )}
      <p className="text-sm text-muted">Dúvidas? <Link href="/atendimento" className="font-bold text-primary underline">Fale com o atendimento</Link> informando o número do pedido.</p>
    </div>
  );
}
