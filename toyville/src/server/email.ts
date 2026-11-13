import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { emailOutbox } from "./db/schema";
import { env } from "./env";
import { log } from "./log";

/**
 * E-mail transacional. Todo envio é registrado na caixa de saída (email_outbox).
 * EMAIL_PROVIDER=outbox → NÃO envia; fica visível no painel com status "not_configured".
 * EMAIL_PROVIDER=resend → envia pela API da Resend (requer RESEND_API_KEY e domínio verificado).
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const [row] = await db.insert(emailOutbox).values({ to, subject, text, status: "queued" }).returning({ id: emailOutbox.id });
  if (env.emailProvider !== "resend" || !process.env.RESEND_API_KEY) {
    await db.update(emailOutbox).set({ status: "not_configured" }).where(eq(emailOutbox.id, row.id));
    log("info", "e-mail registrado (provedor não configurado)", { to: to.replace(/(.).+@/, "$1***@"), subject });
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    await db.update(emailOutbox).set({ status: "sent", sentAt: new Date() }).where(eq(emailOutbox.id, row.id));
  } catch (e) {
    await db.update(emailOutbox).set({ status: "failed", error: String(e).slice(0, 500) }).where(eq(emailOutbox.id, row.id));
    log("error", "falha ao enviar e-mail", { subject, error: String(e) });
  }
}
