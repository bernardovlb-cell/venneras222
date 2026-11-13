import type { Metadata } from "next";
import { ResetForm } from "@/components/account/Forms";
import { AuthShell } from "../AuthShell";
import { EmptyState } from "@/components/ui/States";

export const metadata: Metadata = { title: "Nova senha", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) return <div className="container-tv py-12"><EmptyState title="Link inválido" action={{ href: "/conta/recuperar", label: "Solicitar novo link" }} /></div>;
  return <AuthShell title="Criar nova senha"><ResetForm token={token} /></AuthShell>;
}
