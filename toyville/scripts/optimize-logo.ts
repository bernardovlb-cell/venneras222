/**
 * Gera versões otimizadas da logo a partir do arquivo original, SEM alterar a arte:
 * apenas redimensiona proporcionalmente (sem cortar nem esticar) e recomprime.
 * Uso: npm run brand:logo [caminho-do-original]
 */
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

const src = process.argv[2] ?? "brand-source/toyville-logo-original.webp";
const out = "public/brand";
const widths = [240, 360, 480, 720, 960];

async function main() {
  await fs.mkdir(out, { recursive: true });
  const meta = await sharp(src).metadata();
  console.log(`original: ${meta.width}x${meta.height} ${meta.format}`);
  for (const w of widths) {
    if (meta.width && w > meta.width) continue;
    await sharp(src).resize({ width: w, withoutEnlargement: true }).webp({ quality: 88 }).toFile(path.join(out, `logo-${w}.webp`));
    await sharp(src).resize({ width: w, withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(path.join(out, `logo-${w}.png`));
  }
  const m = await sharp(path.join(out, "logo-480.webp")).metadata();
  await fs.writeFile(path.join(out, "logo.json"), JSON.stringify({ width: meta.width, height: meta.height, ratio: (meta.width ?? 1) / (meta.height ?? 1), sample: { w: m.width, h: m.height } }, null, 2));
  console.log("ok");
}
main();
