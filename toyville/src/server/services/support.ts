import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { orders, supportTickets, ticketMessages } from "../db/schema";
import { AppError } from "../errors";
import { enforceRateLimit } from "../rate-limit";
import { sendEmail } from "../email";
import { sha256 } from "../auth/password";

export const TICKET_TYPE_LABEL: Record<string, string> = {
  question: "Dúvida",
  exchange: "Troca",
  return: "Devolução",
  withdrawal: "Arrependimento (até 7 dias do recebimento)",
  complaint: "Reclamação",
  data_access: "LGPD: acesso aos meus dados",
  data_deletion: "LGPD: exclusão dos meus dados",
};
export const TICKET_STATUS_LABEL: Record<string, string> = {
  open: "Aberto", in_progress: "Em andamento", waiting_customer: "Aguardando você", resolved: "Resolvido", closed: "Encerrado",
};

export const ticketSchema = z.object({
  type: z.enum(["question", "exchange", "return", "withdrawal", "complaint", "data_access", "data_deletion"]),
  name: z.string().trim().min(3, "Informe seu nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  orderNumber: z.string().trim().max(20).optional().or(z.literal("")),
  orderToken: z.string().max(100).optional().or(z.literal("")),
  subject: z.string().trim().min(3, "Informe o assunto").max(140),
  message: z.string().trim().min(10, "Descreva com um pouco mais de detalhe").max(4000),
  website: z.string().max(0).optional().or(z.literal("")), // honeypot anti-spam
});

export async function openTicket(input: z.input<typeof ticketSchema>, ctx: { userId: string | null; ip: string }) {
  const d = ticketSchema.parse(input);
  await enforceRateLimit(`ticket:${ctx.ip}`, 5, 3600);
  let orderId: string | null = null;
  if (d.orderNumber) {
    const n = Number(d.orderNumber.replace(/\D/g, ""));
    const o = n ? (await db.select().from(orders).where(eq(orders.number, n)).limit(1))[0] : undefined;
    // Vincula ao pedido somente se o solicitante comprovar a relação (mesma conta, mesmo e-mail ou token do pedido).
    if (o && ((ctx.userId && o.userId === ctx.userId) || o.email.toLowerCase() === d.email || (d.orderToken && sha256(d.orderToken) === o.accessTokenHash))) orderId = o.id;
  }
  if ((d.type === "exchange" || d.type === "return" || d.type === "withdrawal") && !orderId) {
    throw new AppError("order_required", "Informe o número de um pedido feito com este e-mail.", 400, "orderNumber");
  }
  const t = await db.transaction(async (tx) => {
    const [t] = await tx.insert(supportTickets).values({
      type: d.type, userId: ctx.userId, orderId, name: d.name, email: d.email, phone: d.phone || null, subject: d.subject,
    }).returning({ id: supportTickets.id, number: supportTickets.number });
    await tx.insert(ticketMessages).values({ ticketId: t.id, authorType: "customer", userId: ctx.userId, body: d.message });
    return t;
  });
  await sendEmail(d.email, `Recebemos sua solicitação #${t.number} — ToyVille`, `Olá, ${d.name}!\n\nRegistramos sua solicitação "${d.subject}" (protocolo #${t.number}). Responderemos por e-mail.\n\nToyVille`).catch(() => {});
  return t;
}

export async function replyTicket(ticketId: string, author: { type: "customer" | "staff"; userId: string | null }, body: string, status?: string) {
  const text = body.trim();
  if (text.length < 2 || text.length > 4000) throw new AppError("invalid", "Mensagem inválida.");
  const t = (await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1))[0];
  if (!t) throw new AppError("not_found", "Solicitação não encontrada.", 404);
  if (author.type === "customer" && t.userId !== author.userId) throw new AppError("forbidden", "Acesso negado.", 403);
  await db.insert(ticketMessages).values({ ticketId, authorType: author.type, userId: author.userId, body: text });
  const nextStatus = (status as typeof t.status | undefined) ?? (author.type === "staff" ? "waiting_customer" : "open");
  await db.update(supportTickets).set({ status: nextStatus, updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
  if (author.type === "staff") {
    await sendEmail(t.email, `Resposta à sua solicitação #${t.number} — ToyVille`, `Olá, ${t.name}!\n\n${text}\n\nToyVille`).catch(() => {});
  }
}

export async function getTicketForUser(ticketId: string, userId: string) {
  const t = (await db.select().from(supportTickets).where(and(eq(supportTickets.id, ticketId), eq(supportTickets.userId, userId))).limit(1))[0];
  if (!t) return null;
  const msgs = await db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, t.id)).orderBy(asc(ticketMessages.createdAt));
  return { ticket: t, messages: msgs };
}
