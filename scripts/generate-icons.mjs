import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");

function iconSvg(size, maskable) {
  const s = size;
  const tileMargin = 0.207 * s;
  const tile = 0.586 * s;
  const tileRx = 0.148 * s;
  const bg = maskable ? `<rect width="${s}" height="${s}" fill="#060A12"/>` : `<rect width="${s}" height="${s}" rx="${0.219 * s}" fill="#060A12"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  ${bg}
  <rect x="${tileMargin}" y="${tileMargin}" width="${tile}" height="${tile}" rx="${tileRx}" fill="#22C98D"/>
  <rect x="${0.344 * s}" y="${0.383 * s}" width="${0.3125 * s}" height="${0.156 * s}" rx="${0.023 * s}" fill="#04150E"/>
  <rect x="${0.422 * s}" y="${0.332 * s}" width="${0.156 * s}" height="${0.336 * s}" rx="${0.023 * s}" fill="#04150E"/>
</svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
];

mkdirSync(outDir, { recursive: true });

for (const t of targets) {
  const svg = Buffer.from(iconSvg(t.size, t.maskable));
  await sharp(svg).png().toFile(join(outDir, t.file));
  console.log("OK", t.file);
}