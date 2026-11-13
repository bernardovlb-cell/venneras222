import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth/session";
import { getSettings, whatsappLink } from "@/server/settings";
import { TicketForm } from "@/components/account/Forms";
import { WhatsAppIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Atendimento", description: "Fale com a ToyVille: dúvidas, trocas, devoluções e privacidade." };

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ tipo?: string; pedido?: string }> }) {
  const [u, s, sp] = await Promise.all([getCurrentUser(), getSettings(), searchParams]);
  const wa = whatsappLink(s.whatsapp);
  return (
    <div className="container-tv grid max-w-5xl gap-6 py-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="card p-6">
        <h1 className="text-3xl font-extrabold text-primary-dark">Atendimento</h1>
        <p className="mt-1 text-muted">Abra uma solicitação e acompanhe {u ? <Link href="/conta/atendimentos" className="font-bold text-primary underline">pela sua conta</Link> : "pelo e-mail"}.</p>
        <div className="mt-6"><TicketForm defaults={{ name: u?.name, email: u?.email, type: sp.tipo, orderNumber: sp.pedido }} /></div>
      </div>
      <aside className="space-y-4">
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-3 p-5 hover:shadow-pop">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#25D366] text-white"><WhatsAppIcon /></span>
            <span><span className="block font-extrabold">WhatsApp</span><span className="text-sm text-muted">{s.store.businessHours || "Fale com a gente"}</span></span>
          </a>
        )}
        <div className="card p-5 text-sm">
          <h2 className="font-extrabold">Direito de arrependimento</h2>
          <p className="mt-1 text-muted">Compras on-line podem ser canceladas em até 7 dias do recebimento (art. 49 do CDC). Escolha “Desistência da compra” e informe o número do pedido.</p>
          <Link href="/p/trocas-e-devolucoes" className="mt-2 inline-block font-bold text-primary underline">Política de trocas e devoluções</Link>
        </div>
        <div className="card p-5 text-sm">
          <h2 className="font-extrabold">Privacidade (LGPD)</h2>
          <p className="mt-1 text-muted">Você pode pedir acesso ou exclusão dos seus dados por aqui ou diretamente em <Link href="/conta/dados" className="font-bold text-primary underline">Meus dados</Link>.</p>
        </div>
      </aside>
    </div>
  );
}
