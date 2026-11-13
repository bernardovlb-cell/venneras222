import type { Metadata } from "next";
import { requireUserPage } from "@/server/auth/guards";
import { myProfile } from "@/server/services/customer";
import { ProfileForm, PasswordForm, DeleteAccountForm } from "@/components/account/Forms";

export const metadata: Metadata = { title: "Meus dados", robots: { index: false } };

export default async function MyData() {
  const u = await requireUserPage("/conta/dados");
  const p = await myProfile(u.id);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-primary-dark">Meus dados e privacidade</h1>
      <section className="card p-5"><h2 className="mb-4 text-lg font-extrabold">Dados pessoais</h2><ProfileForm user={p} /></section>
      <section className="card p-5"><h2 className="mb-4 text-lg font-extrabold">Senha</h2><PasswordForm /></section>
      <section className="card p-5">
        <h2 className="text-lg font-extrabold">Seus dados (LGPD)</h2>
        <p className="mt-1 text-sm text-muted">Baixe uma cópia dos dados da sua conta em formato JSON.</p>
        <a href="/conta/dados/exportar" className="btn btn-outline btn-sm mt-3">Baixar meus dados</a>
      </section>
      <section className="card border-2 border-soft-red p-5"><h2 className="mb-2 text-lg font-extrabold text-promo">Excluir conta</h2><DeleteAccountForm /></section>
    </div>
  );
}
