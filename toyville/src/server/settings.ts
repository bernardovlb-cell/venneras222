import "server-only";
import { cache } from "react";
import { z } from "zod";
import { inArray } from "drizzle-orm";
import { db } from "./db/client";
import { settings } from "./db/schema";

/**
 * Configurações editáveis pelo painel. Valores padrão NÃO inventam dados comerciais:
 * campos desconhecidos ficam vazios e as partes do site que dependem deles ficam ocultas.
 */
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor no formato #RRGGBB");

export const settingsSchemas = {
  store: z.object({
    name: z.string().min(1).max(80).default("ToyVille"),
    legalName: z.string().max(160).default(""),
    cnpj: z.string().max(20).default(""),
    email: z.string().max(160).default(""),
    phone: z.string().max(40).default(""),
    address: z.string().max(300).default(""),
    businessHours: z.string().max(200).default(""),
    tagline: z.string().max(160).default("Brinquedos que fazem a infância brilhar"),
  }),
  brand: z.object({
    logoUrl: z.string().max(500).default("/brand/logo-480.webp"),
    logoWidth: z.number().int().positive().default(1774),
    logoHeight: z.number().int().positive().default(887),
    primary: hex.default("#1F4FD1"),
    primaryDark: hex.default("#173A9E"),
    accent: hex.default("#FFC21A"),
    promo: hex.default("#D7262C"),
    success: hex.default("#2E9B2E"),
    background: hex.default("#FFFCF5"),
  }),
  whatsapp: z.object({
    enabled: z.boolean().default(false),
    number: z.string().regex(/^\d{10,15}$/, "Somente dígitos com DDI e DDD, ex.: 5511999999999").or(z.literal("")).default(""),
    defaultMessage: z.string().max(300).default("Olá! Vim pelo site da ToyVille e tenho uma dúvida."),
  }),
  benefits: z.object({
    // Somente benefícios REALMENTE oferecidos. Lista vazia = seção oculta.
    items: z.array(z.object({ title: z.string().min(1).max(60), description: z.string().max(160), icon: z.enum(["truck", "shield", "card", "gift", "store", "chat", "star", "refresh"]) })).max(6).default([]),
  }),
  checkout: z.object({
    reservationHours: z.number().int().min(1).max(168).default(48),
    requireCpf: z.boolean().default(false),
    maxInstallments: z.number().int().min(1).max(12).default(12),
    termsVersion: z.string().max(40).default("rascunho-2026-11"),
    // Recuperação de carrinho: desligada até o proprietário ativar (e só para quem consentiu)
    cartRecoveryEnabled: z.boolean().default(false),
    cartRecoveryHours: z.number().int().min(1).max(168).default(24),
  }),
  fiscal: z.object({
    provider: z.string().max(80).default(""), // nome do emissor informado pelo proprietário
    autoIssue: z.boolean().default(false), // só pode ser ativado com integração válida
    notes: z.string().max(1000).default(""),
  }),
  analytics: z.object({
    ga4Id: z.string().regex(/^G-[A-Z0-9]+$/).or(z.literal("")).default(""),
    gtmId: z.string().regex(/^GTM-[A-Z0-9]+$/).or(z.literal("")).default(""),
    metaPixelId: z.string().regex(/^\d{5,20}$/).or(z.literal("")).default(""),
  }),
  social: z.object({
    instagram: z.string().max(200).default(""),
    facebook: z.string().max(200).default(""),
    tiktok: z.string().max(200).default(""),
    youtube: z.string().max(200).default(""),
  }),
  home: z.object({
    // Tempo de cada campanha no carrossel principal (segundos). Um único lugar para ajustar.
    carouselSeconds: z.number().int().min(3).max(20).default(6),
    // Cadastro de e-mails no rodapé (só guarda o e-mail com consentimento; nenhum envio é feito pelo site).
    newsletterEnabled: z.boolean().default(true),
  }),
  seo: z.object({
    defaultTitle: z.string().max(70).default("ToyVille — Loja de brinquedos"),
    defaultDescription: z.string().max(170).default("Brinquedos educativos, pelúcias, bonecas, jogos e muito mais. Encontre o presente perfeito por idade e orçamento."),
  }),
} as const;

export type SettingsKey = keyof typeof settingsSchemas;
export type SettingsOf<K extends SettingsKey> = z.output<(typeof settingsSchemas)[K]>;
export type AllSettings = { [K in SettingsKey]: SettingsOf<K> };

function parseOrDefault<K extends SettingsKey>(key: K, value: unknown): SettingsOf<K> {
  const schema = settingsSchemas[key];
  const r = schema.safeParse(value ?? {});
  if (r.success) return r.data as SettingsOf<K>;
  // valor salvo inválido (ex.: após mudança de schema) → mescla campo a campo
  return schema.parse({}) as SettingsOf<K>;
}

export async function loadSettings(): Promise<AllSettings> {
  const keys = Object.keys(settingsSchemas) as SettingsKey[];
  const rows = await db.select().from(settings).where(inArray(settings.key, keys));
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const out = {} as Record<string, unknown>;
  for (const k of keys) out[k] = parseOrDefault(k, map.get(k));
  return out as AllSettings;
}

/** Memoizado por requisição. */
export const getSettings = cache(loadSettings);

export async function saveSettings<K extends SettingsKey>(key: K, value: unknown): Promise<SettingsOf<K>> {
  const parsed = settingsSchemas[key].parse(value) as SettingsOf<K>;
  await db.insert(settings).values({ key, value: parsed }).onConflictDoUpdate({ target: settings.key, set: { value: parsed, updatedAt: new Date() } });
  return parsed;
}

export function whatsappLink(s: SettingsOf<"whatsapp">, message?: string): string | null {
  if (!s.enabled || !s.number) return null;
  return `https://wa.me/${s.number}?text=${encodeURIComponent(message ?? s.defaultMessage)}`;
}
