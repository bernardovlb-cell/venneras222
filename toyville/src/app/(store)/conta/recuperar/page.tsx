import type { Metadata } from "next";
import { ForgotForm } from "@/components/account/Forms";
import { AuthShell } from "../AuthShell";

export const metadata: Metadata = { title: "Recuperar senha", robots: { index: false } };

export default function ForgotPage() {
  return <AuthShell title="Recuperar senha" subtitle="Enviaremos um link para você criar uma nova senha."><ForgotForm /></AuthShell>;
}
