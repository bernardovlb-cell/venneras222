import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { LoginForm } from "@/components/account/Forms";
import { AuthShell } from "../AuthShell";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/conta");
  return (
    <AuthShell title="Entrar" subtitle="Acompanhe pedidos, salve endereços e favoritos."
      aside={<><h2 className="text-xl font-extrabold">Ainda não tem conta?</h2><p className="mt-1 text-sm text-ink/75">Você também pode comprar sem cadastro.</p><Link href={`/conta/cadastro${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="btn btn-primary mt-4 w-full">Criar conta</Link><Link href="/carrinho" className="btn btn-ghost mt-2 w-full">Comprar sem cadastro</Link></>}>
      <LoginForm next={next} />
    </AuthShell>
  );
}
