"use server";
import { redirect } from "next/navigation";
import { getCurrentUser, destroySession } from "@/server/auth/session";
import { requestMeta } from "@/server/http";
import { toActionError, type ActionResult } from "@/server/errors";
import * as account from "@/server/services/account";
import { submitReview } from "@/server/services/reviews";
import { openTicket, replyTicket } from "@/server/services/support";

function safeNext(n: FormDataEntryValue | null, fallback = "/conta"): string {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/admin") ? s : fallback;
}

export async function loginAction(_: unknown, fd: FormData): Promise<ActionResult> {
  try {
    await account.login(String(fd.get("email") ?? ""), String(fd.get("password") ?? ""), await requestMeta());
  } catch (e) {
    return toActionError(e);
  }
  redirect(safeNext(fd.get("next")));
}

export async function registerAction(_: unknown, fd: FormData): Promise<ActionResult> {
  try {
    await account.register({
      name: String(fd.get("name") ?? ""), email: String(fd.get("email") ?? ""), password: String(fd.get("password") ?? ""),
      acceptTerms: fd.get("acceptTerms") === "on", marketingConsent: fd.get("marketingConsent") === "on",
    } as Parameters<typeof account.register>[0], await requestMeta());
  } catch (e) {
    return toActionError(e);
  }
  redirect(safeNext(fd.get("next")));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(_: unknown, fd: FormData): Promise<ActionResult> {
  try {
    await account.requestPasswordReset(String(fd.get("email") ?? ""), await requestMeta());
    return { ok: true, message: "Se houver uma conta com este e-mail, enviaremos um link para redefinir a senha." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function resetPasswordAction(_: unknown, fd: FormData): Promise<ActionResult> {
  try {
    if (fd.get("password") !== fd.get("confirm")) return { ok: false, error: "As senhas não conferem.", fieldErrors: { confirm: "As senhas não conferem." } };
    await account.resetPassword(String(fd.get("token") ?? ""), String(fd.get("password") ?? ""), await requestMeta());
  } catch (e) {
    return toActionError(e);
  }
  redirect("/conta?senha=redefinida");
}

export async function updateProfileAction(_: unknown, fd: FormData): Promise<ActionResult> {
  try {
    const u = await getCurrentUser();
    if (!u) return { ok: false, error: "Faça login novamente." };
    await account.updateProfile(u.id, { name: String(fd.get("name") ?? ""), phone: String(fd.get("phone") ?? ""), marketingConsent: fd.get("marketingConsent") === "on" });
    return { ok: true, message: "Dados atualizados." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function changePasswordAction(_: unknown, fd: FormData): Promise<ActionResult> {
  try {
    const u = await getCurrentUser();
    if (!u) return { ok: false, error: "Faça login novamente." };
    await account.changePassword(u.id, String(fd.get("current") ?? ""), String(fd.get("password") ?? ""), await requestMeta());
    return { ok: true, message: "Senha alterada. Outras sessões foram encerradas." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function saveAddressAction(_: unknown, fd: FormData): Promise<ActionResult> {
  try {
    const u = await getCurrentUser();
    if (!u) return { ok: false, error: "Faça login novamente." };
    const data = Object.fromEntries(["label", "recipient", "phone", "zip", "street", "number", "complement", "district", "city", "state"].map((k) => [k, String(fd.get(k) ?? "")]));
    await account.saveAddress(u.id, { ...data, isDefault: fd.get("isDefault") === "on" }, (fd.get("id") as string) || undefined);
    return { ok: true, message: "Endereço salvo." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  try {
    const u = await getCurrentUser();
    if (!u) return { ok: false, error: "Faça login novamente." };
    await account.deleteAddress(u.id, id);
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function toggleFavoriteAction(productId: string): Promise<ActionResult<{ favorited: boolean }>> {
  try {
    const u = await getCurrentUser();
    if (!u) return { ok: false, error: "login_required" };
    return { ok: true, data: { favorited: await account.toggleFavorite(u.id, productId) } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function submitReviewAction(_: unknown, fd: FormData): Promise<ActionResult> {
  try {
    const u = await getCurrentUser();
    if (!u) return { ok: false, error: "Entre na sua conta para avaliar." };
    const { ip } = await requestMeta();
    await submitReview(u, { productId: String(fd.get("productId")), rating: Number(fd.get("rating")), title: String(fd.get("title") ?? ""), body: String(fd.get("body") ?? "") }, ip);
    return { ok: true, message: "Obrigado! Sua avaliação será publicada após moderação." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function openTicketAction(_: unknown, fd: FormData): Promise<ActionResult<{ number: number }>> {
  try {
    const u = await getCurrentUser();
    const { ip } = await requestMeta();
    const t = await openTicket(Object.fromEntries(["type", "name", "email", "phone", "orderNumber", "orderToken", "subject", "message", "website"].map((k) => [k, String(fd.get(k) ?? "")])) as Parameters<typeof openTicket>[0], { userId: u?.id ?? null, ip });
    return { ok: true, data: { number: t.number }, message: `Solicitação #${t.number} registrada. Responderemos por e-mail.` };
  } catch (e) {
    return toActionError(e);
  }
}

export async function replyTicketAction(_: unknown, fd: FormData): Promise<ActionResult> {
  try {
    const u = await getCurrentUser();
    if (!u) return { ok: false, error: "Faça login novamente." };
    await replyTicket(String(fd.get("ticketId")), { type: "customer", userId: u.id }, String(fd.get("body") ?? ""));
    return { ok: true, message: "Mensagem enviada." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteAccountAction(_: unknown, fd: FormData): Promise<ActionResult> {
  try {
    const u = await getCurrentUser();
    if (!u) return { ok: false, error: "Faça login novamente." };
    if (u.isStaff) return { ok: false, error: "Contas da equipe devem ser removidas por outro administrador." };
    if (fd.get("confirm") !== "EXCLUIR") return { ok: false, error: 'Digite EXCLUIR para confirmar.', fieldErrors: { confirm: "Digite EXCLUIR" } };
    await account.anonymizeAccount(u.id, await requestMeta());
    await destroySession();
  } catch (e) {
    return toActionError(e);
  }
  redirect("/?conta=excluida");
}

