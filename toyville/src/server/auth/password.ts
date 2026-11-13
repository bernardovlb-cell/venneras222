import { scrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto";

const N = 16384, R = 8, P = 1, KEYLEN = 64;

function scryptAsync(pw: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((res, rej) =>
    scrypt(pw.normalize("NFKC"), salt, KEYLEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? rej(e) : res(k))),
  );
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(pw, salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string | null): Promise<boolean> {
  if (!stored) {
    // custo equivalente para não revelar a existência da conta pelo tempo de resposta
    await scryptAsync(pw, randomBytes(16), N, R, P);
    return false;
  }
  const [alg, n, r, p, salt, key] = stored.split("$");
  if (alg !== "scrypt" || !salt || !key) return false;
  const derived = await scryptAsync(pw, Buffer.from(salt, "base64"), Number(n), Number(r), Number(p));
  const expected = Buffer.from(key, "base64");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Política mínima: 8+ caracteres, com letras e números. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (pw.length > 128) return "A senha é longa demais.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Use letras e números na senha.";
  return null;
}
