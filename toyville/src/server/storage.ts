import "server-only";
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { env } from "./env";
import { AppError } from "./errors";

/**
 * Armazenamento de imagens com otimização no envio:
 *  - valida tipo real do arquivo (pelo conteúdo, não pela extensão)
 *  - converte para WebP, limita a 1600px e gera miniatura de 480px
 *  - remove metadados (EXIF/GPS)
 */
export interface StoredImage { url: string; thumbUrl: string; storageKey: string; width: number; height: number }

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["jpeg", "png", "webp", "avif", "gif"]);

interface Driver {
  put(key: string, body: Buffer, contentType: string): Promise<string>; // retorna URL pública
  remove(key: string): Promise<void>;
}

const localDriver: Driver = {
  async put(key, body) {
    const file = path.join(process.cwd(), "public", "uploads", key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
    return `/uploads/${key}`;
  },
  async remove(key) {
    const base = path.join(process.cwd(), "public", "uploads");
    const file = path.resolve(base, key);
    if (!file.startsWith(base + path.sep)) return; // impede path traversal
    await fs.unlink(file).catch(() => {});
  },
};

const supabaseDriver: Driver = {
  async put(key, body, contentType) {
    const url = process.env.SUPABASE_URL, k = process.env.SUPABASE_SERVICE_ROLE_KEY, bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "produtos";
    if (!url || !k) throw new AppError("storage_not_configured", "Armazenamento Supabase não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).", 500);
    const res = await fetch(`${url}/storage/v1/object/${bucket}/${key}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${k}`, apikey: k, "Content-Type": contentType, "x-upsert": "false", "cache-control": "31536000" },
      body: new Uint8Array(body),
    });
    if (!res.ok) throw new AppError("storage_error", `Falha ao enviar imagem (${res.status}).`, 502);
    return `${url}/storage/v1/object/public/${bucket}/${key}`;
  },
  async remove(key) {
    const url = process.env.SUPABASE_URL, k = process.env.SUPABASE_SERVICE_ROLE_KEY, bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "produtos";
    if (!url || !k) return;
    await fetch(`${url}/storage/v1/object/${bucket}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${k}`, apikey: k, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [key] }),
    });
  },
};

function driver(): Driver {
  return env.storageDriver === "supabase" ? supabaseDriver : localDriver;
}

export async function storeImage(file: File, folder: string): Promise<StoredImage> {
  if (file.size === 0) throw new AppError("empty_file", "Arquivo vazio.");
  if (file.size > MAX_BYTES) throw new AppError("file_too_large", `"${file.name}" excede 10 MB.`);
  const input = Buffer.from(await file.arrayBuffer());
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new AppError("invalid_image", `"${file.name}" não é uma imagem válida.`);
  }
  if (!meta.format || !ALLOWED.has(meta.format)) throw new AppError("invalid_image", `Formato de "${file.name}" não suportado (use JPG, PNG, WebP ou AVIF).`);

  const id = randomUUID();
  const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, "").slice(0, 80);
  const main = await sharp(input).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const thumb = await sharp(input).rotate().resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  const key = `${safeFolder}/${id}.webp`;
  const thumbKey = `${safeFolder}/${id}-480.webp`;
  const d = driver();
  const url = await d.put(key, main.data, "image/webp");
  const thumbUrl = await d.put(thumbKey, thumb, "image/webp");
  return { url, thumbUrl, storageKey: key, width: main.info.width, height: main.info.height };
}

export async function removeImage(storageKey: string | null) {
  if (!storageKey) return;
  const d = driver();
  await d.remove(storageKey);
  await d.remove(storageKey.replace(/\.webp$/, "-480.webp"));
}
