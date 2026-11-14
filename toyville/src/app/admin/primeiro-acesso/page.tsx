import { notFound } from "next/navigation";
import { ownerExists, setupTokenConfigured } from "@/server/services/setup";
import { SetupForm } from "./SetupForm";

export const metadata = { title: "Primeiro acesso", robots: { index: false, follow: false } };

export default async function FirstAccess() {
  if (await ownerExists()) notFound(); // depois de criado o proprietário, esta página deixa de existir
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-card">
        <p className="text-2xl font-extrabold">Primeiro acesso <span className="text-primary">ToyVille</span></p>
        <p className="mb-5 text-sm text-muted">Crie o usuário proprietário do painel. Esta tela some assim que ele for criado.</p>
        {setupTokenConfigured() ? <SetupForm /> : (
          <p className="rounded-xl bg-soft-yellow p-3 text-sm">Para liberar esta tela, defina a variável <code>SETUP_TOKEN</code> (um código secreto com 16 ou mais caracteres) nas configurações da hospedagem e faça um novo deploy.</p>
        )}
      </div>
    </div>
  );
}
