"use client";
import { AdminForm, F } from "@/components/admin/ui";
import { firstOwnerAction } from "../actions";

export function SetupForm() {
  return (
    <AdminForm action={firstOwnerAction} submitLabel="Criar proprietário e entrar">
      <F label="Código de configuração (SETUP_TOKEN)" name="token" type="password" autoComplete="off" required />
      <F label="Seu nome" name="name" autoComplete="name" required />
      <F label="E-mail" name="email" type="email" autoComplete="email" required />
      <F label="Senha" name="password" type="password" autoComplete="new-password" required hint="Mínimo de 8 caracteres, com letras e números" />
    </AdminForm>
  );
}
