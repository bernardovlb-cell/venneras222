import "server-only";
import { z } from "zod";
import { desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/client";
import { newsletterSubscribers } from "../db/schema";
import { AppError } from "../errors";
import { getSettings } from "../settings";
import { audit } from "../audit";

/** Texto de consentimento exibido no formulário. Fica gravado junto com cada inscrição. */
export const NEWSLETTER_CONSENT_TEXT = "Quero receber novidades e ofertas da ToyVille por e-mail. Posso cancelar quando quiser.";

const emailSchema = z.string().trim().toLowerCase().max(160).email("Informe um e-mail válido.");

/**
 * Inscreve um e-mail na newsletter. Exige consentimento explícito e só confirma quando o registro
 * foi gravado. Reinscrição reativa o cadastro. Nenhum e-mail é enviado por aqui.
 */
export async function subscribeNewsletter(input: { email: unknown; consent: unknown; source?: string }): Promise<{ email: string }> {
  const { home } = await getSettings();
  if (!home.newsletterEnabled) throw new AppError("disabled", "O cadastro de e-mails está desativado no momento.", 400);
  const parsed = emailSchema.safeParse(input.email);
  if (!parsed.success) throw new AppError("email", parsed.error.issues[0]?.message ?? "Informe um e-mail válido.", 400, "email");
  if (input.consent !== true) throw new AppError("consent", "Marque a caixa para autorizar o envio de novidades.", 400, "consent");
  const now = new Date();
  const [row] = await db.insert(newsletterSubscribers)
    .values({ email: parsed.data, consentAt: now, consentText: NEWSLETTER_CONSENT_TEXT, source: (input.source ?? "footer").slice(0, 40) })
    .onConflictDoUpdate({ target: newsletterSubscribers.email, set: { consentAt: now, consentText: NEWSLETTER_CONSENT_TEXT, unsubscribedAt: null } })
    .returning({ email: newsletterSubscribers.email });
  if (!row) throw new AppError("not_saved", "Não foi possível salvar seu e-mail. Tente novamente.", 500);
  return row;
}

export async function listNewsletterSubscribers(limit = 2000) {
  return db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt)).limit(limit);
}

export async function newsletterCounts() {
  const [r] = await db.select({
    active: sql<number>`count(*) filter (where ${isNull(newsletterSubscribers.unsubscribedAt)})::int`,
    total: sql<number>`count(*)::int`,
  }).from(newsletterSubscribers);
  return r ?? { active: 0, total: 0 };
}

/** Remove definitivamente uma inscrição (pedido do titular ou limpeza). */
export async function removeNewsletterSubscriber(id: string, userId: string) {
  const [row] = await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id)).returning({ id: newsletterSubscribers.id });
  if (!row) throw new AppError("not_found", "Inscrição não encontrada.", 404);
  await audit({ userId, action: "newsletter.remove", entity: "newsletter_subscriber", entityId: id });
}

/** Remove a inscrição de um e-mail (usado na exclusão/anonimização da conta). */
export async function removeNewsletterEmail(email: string) {
  await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.email, email.trim().toLowerCase()));
}
