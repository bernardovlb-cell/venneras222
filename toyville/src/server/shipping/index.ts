import "server-only";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, type DbOrTx } from "../db/client";
import { shippingMethods } from "../db/schema";

/**
 * Logística desacoplada: cada modalidade é um "provider" com `quote()`.
 * Regras do briefing:
 *  - Nada de valores/prazos/regiões inventados: uma modalidade só aparece quando configurada no painel.
 *  - Retirada presencial só aparece com endereço, cidade e horários preenchidos.
 *  - Correios/transportadoras ficam indisponíveis até existir integração real (ver docs/INTEGRACOES.md).
 */
export interface ShippingAddress {
  recipient: string; phone?: string; zip: string; street: string; number: string;
  complement?: string; district: string; city: string; state: string;
}
export interface ShippingContext {
  address: ShippingAddress | null;
  subtotalCents: number;
  totalWeightGrams: number | null; // null se algum item não tiver peso cadastrado
}
export interface ShippingQuote {
  methodId: string; code: string; type: "pickup" | "local_delivery" | "correios" | "carrier";
  name: string; priceCents: number; etaText: string; requiresAddress: boolean; details: Record<string, unknown>;
}
export type QuoteResult = { ok: true; quote: ShippingQuote } | { ok: false; reason: string };

export const pickupConfigSchema = z.object({
  address: z.string().max(300).default(""),
  city: z.string().max(100).default(""),
  state: z.string().max(2).default(""),
  hours: z.string().max(200).default(""),
  instructions: z.string().max(500).default(""),
  prepDays: z.number().int().min(0).max(30).default(1),
});
export const localDeliveryConfigSchema = z.object({
  zipRanges: z.array(z.object({ from: z.string().regex(/^\d{8}$/), to: z.string().regex(/^\d{8}$/) })).default([]),
  priceCents: z.number().int().min(0).nullable().default(null),
  minDays: z.number().int().min(0).max(60).default(1),
  maxDays: z.number().int().min(0).max(60).default(3),
});
export const carrierConfigSchema = z.object({
  provider: z.string().max(60).default(""), // ex.: "correios-contrato", "melhor-envio" — exige implementação
  notes: z.string().max(500).default(""),
});

type MethodRow = typeof shippingMethods.$inferSelect;

export function onlyDigits(s: string) { return s.replace(/\D/g, ""); }

export function pickupReady(cfg: z.output<typeof pickupConfigSchema>) {
  return !!(cfg.address.trim() && cfg.city.trim() && cfg.hours.trim());
}

function days(min: number, max: number) {
  if (min === max) return `${min} ${min === 1 ? "dia útil" : "dias úteis"}`;
  return `${min} a ${max} dias úteis`;
}

const providers: Record<MethodRow["type"], (m: MethodRow, ctx: ShippingContext) => Promise<QuoteResult> | QuoteResult> = {
  pickup(m) {
    const cfg = pickupConfigSchema.parse(m.config ?? {});
    if (!pickupReady(cfg)) return { ok: false, reason: "Endereço/horário de retirada não configurados" };
    return {
      ok: true,
      quote: {
        methodId: m.id, code: m.code, type: "pickup", name: m.name, priceCents: 0, requiresAddress: false,
        etaText: cfg.prepDays === 0 ? "Disponível após a confirmação do pagamento" : `Pronto para retirada em até ${days(cfg.prepDays, cfg.prepDays)} após o pagamento`,
        details: { address: cfg.address, city: cfg.city, state: cfg.state, hours: cfg.hours, instructions: cfg.instructions },
      },
    };
  },
  local_delivery(m, ctx) {
    const cfg = localDeliveryConfigSchema.parse(m.config ?? {});
    if (!cfg.zipRanges.length || cfg.priceCents == null) return { ok: false, reason: "Regiões/valor da entrega local não configurados" };
    if (!ctx.address) return { ok: false, reason: "Informe o CEP" };
    const zip = onlyDigits(ctx.address.zip);
    const inRange = cfg.zipRanges.some((r) => zip >= r.from && zip <= r.to);
    if (!inRange) return { ok: false, reason: "CEP fora da área de entrega local" };
    return {
      ok: true,
      quote: { methodId: m.id, code: m.code, type: "local_delivery", name: m.name, priceCents: cfg.priceCents, requiresAddress: true, etaText: days(cfg.minDays, cfg.maxDays), details: {} },
    };
  },
  // Sem integração implementada: nunca cota (não inventa preço/prazo).
  correios() { return { ok: false, reason: "Integração com os Correios ainda não configurada" }; },
  carrier() { return { ok: false, reason: "Integração com transportadora ainda não configurada" }; },
};

export async function listShippingMethods(tx: DbOrTx = db) {
  return tx.select().from(shippingMethods).orderBy(asc(shippingMethods.position));
}

export async function quoteAll(ctx: ShippingContext, tx: DbOrTx = db) {
  const methods = (await listShippingMethods(tx)).filter((m) => m.isActive);
  const options: ShippingQuote[] = [];
  const unavailable: { code: string; name: string; reason: string }[] = [];
  for (const m of methods) {
    const r = await providers[m.type](m, ctx);
    if (r.ok) options.push(r.quote);
    else unavailable.push({ code: m.code, name: m.name, reason: r.reason });
  }
  return { options, unavailable };
}

export async function quoteMethod(code: string, ctx: ShippingContext, tx: DbOrTx = db): Promise<QuoteResult> {
  const m = (await tx.select().from(shippingMethods).where(eq(shippingMethods.code, code)).limit(1))[0];
  if (!m || !m.isActive) return { ok: false, reason: "Modalidade de entrega indisponível" };
  return providers[m.type](m, ctx);
}
