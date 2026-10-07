import fs from "node:fs";
import path from "node:path";

/** true se o arquivo existe em public/. Só no servidor (build). */
export function existeEmPublic(src: string | undefined | null): src is string {
  if (!src || !src.startsWith("/")) return false;
  return fs.existsSync(path.join(process.cwd(), "public", src));
}
