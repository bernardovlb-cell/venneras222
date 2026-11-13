/** Gera public/art/*.svg a partir das ilustrações em src/components/art/ToyArt.tsx. Uso: npm run art */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ART_KEYS, staticArtSvg } from "../src/components/art/render-static";

const dir = path.join(import.meta.dirname, "..", "public", "art");
mkdirSync(dir, { recursive: true });
for (const k of ART_KEYS) writeFileSync(path.join(dir, `${k}.svg`), staticArtSvg(k));
console.log(`${ART_KEYS.length} ilustrações geradas em public/art`);
