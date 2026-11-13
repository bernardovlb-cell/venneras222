import { renderToStaticMarkup } from "react-dom/server";
import { ARTS, type ArtKey } from "./ToyArt";

export const ART_KEYS = Object.keys(ARTS) as ArtKey[];

/** SVG autônomo de uma ilustração (conteúdo de public/art/<chave>.svg). Usado por `npm run art` e pelo teste de sincronia. */
export function staticArtSvg(key: ArtKey): string {
  const A = ARTS[key];
  let svg = renderToStaticMarkup(<A />);
  svg = svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" ');
  if (key === "rocket") svg = svg.replace(/<ellipse class="tv-ground"[^>]*>(<\/ellipse>)?/, ""); // foguete "voando": sem sombra no chão
  svg = svg.replace(/ (class|style|aria-hidden)="[^"]*"/g, "");
  return svg + "\n";
}
