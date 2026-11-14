"use server";
import { requestMeta } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { AppError, toActionError, type ActionResult } from "@/server/errors";
import { subscribeNewsletter } from "@/server/services/newsletter";

/** Cadastro na newsletter (rodapé). Só responde "cadastrado" depois de gravar no banco. */
export async function subscribeNewsletterAction(_: unknown, fd: FormData): Promise<ActionResult> {
  try {
    const { ip } = await requestMeta();
    await enforceRateLimit(`newsletter:${ip}`, 5, 3600, "Muitas tentativas. Tente novamente mais tarde.");
    // Campo-isca invisível: pessoas não preenchem; robôs costumam preencher.
    if (String(fd.get("website") ?? "") !== "") throw new AppError("spam", "Não foi possível concluir o cadastro.", 400);
    await subscribeNewsletter({ email: fd.get("email"), consent: fd.get("consent") === "on" });
    return { ok: true, message: "Pronto! Seu e-mail foi cadastrado." };
  } catch (e) {
    return toActionError(e);
  }
}
