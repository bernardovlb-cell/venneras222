import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { LoginForm } from "@/components/account/Forms";
import { adminLoginAction } from "../actions";

export const metadata = { title: "Entrar no painel" };

export default async function AdminLogin() {
  const u = await getCurrentUser();
  if (u?.isStaff) redirect("/admin");
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-card">
        <p className="text-2xl font-extrabold">Painel <span className="text-primary">ToyVille</span></p>
        <p className="mb-5 text-sm text-muted">Acesso restrito à equipe.</p>
        <LoginForm staff action={adminLoginAction} />
      </div>
    </div>
  );
}
