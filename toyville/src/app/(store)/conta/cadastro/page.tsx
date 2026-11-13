import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/account/Forms";
import { AuthShell } from "../AuthShell";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell title="Criar conta" aside={<><h2 className="text-xl font-extrabold">Já tem conta?</h2><Link href="/conta/entrar" className="btn btn-outline mt-4 w-full">Entrar</Link></>}>
      <RegisterForm next={next} />
    </AuthShell>
  );
}
