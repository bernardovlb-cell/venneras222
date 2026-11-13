import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { eq, desc } from "drizzle-orm";
import { getCartView } from "@/server/services/cart";
import { getCurrentUser } from "@/server/auth/session";
import { getSettings } from "@/server/settings";
import { db } from "@/server/db/client";
import { addresses } from "@/server/db/schema";
import { isConfigured } from "@/server/payments/mercadopago";
import { mercadoPagoMode } from "@/server/env";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { EmptyState, Notice } from "@/components/ui/States";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const view = await getCartView(user?.email ?? null, user?.id ?? null);
  if (!view || !view.lines.length || !view.pricing) {
    return <div className="container-tv py-12"><EmptyState title="Seu carrinho está vazio" action={{ href: "/", label: "Explorar brinquedos" }} emoji="🛒" /></div>;
  }
  if (view.lines.some((l) => l.problem)) {
    return <div className="container-tv py-12"><EmptyState title="Alguns itens mudaram" text="Há itens indisponíveis ou com estoque menor no carrinho. Revise antes de continuar." action={{ href: "/carrinho", label: "Revisar carrinho" }} /></div>;
  }
  const s = await getSettings();
  const saved = user ? await db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(desc(addresses.isDefault)) : [];
  const byVariant = new Map(view.pricing.lines.map((l) => [l.variantId, l]));
  const mode = mercadoPagoMode();

  return (
    <div className="container-tv py-6">
      <h1 className="text-3xl font-extrabold text-primary-dark sm:text-4xl">Finalizar compra</h1>
      <div className="mt-4 space-y-3">
        {!isConfigured() && <Notice kind="warn">Os pagamentos online ainda não foram configurados pela loja. Não é possível concluir pedidos no momento.</Notice>}
        {mode === "test" && <Notice kind="info">Ambiente de TESTE do Mercado Pago: nenhuma cobrança real será feita.</Notice>}
      </div>
      <div className="mt-6">
        <CheckoutForm
          idempotencyKey={randomUUID()}
          initialPricing={view.pricing}
          lines={view.lines.map((l) => ({ name: l.productName, variant: l.variantName === "Padrão" ? null : l.variantName, qty: l.quantity, totalCents: byVariant.get(l.variantId)?.lineSubtotalCents ?? 0 }))}
          user={user ? { email: user.email, name: user.name, phone: user.phone } : null}
          savedAddresses={saved.map((a) => ({ id: a.id, label: a.label, isDefault: a.isDefault, recipient: a.recipient, phone: a.phone ?? "", zip: a.zip, street: a.street, number: a.number, complement: a.complement ?? "", district: a.district, city: a.city, state: a.state }))}
          requireCpf={s.checkout.requireCpf}
        />
      </div>
    </div>
  );
}
