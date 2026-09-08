#!/usr/bin/env node
/**
 * Spellbound art ingest — turns generated source images into conformant sprites.
 *
 *   node tools/ingest-art.mjs [--autokey] [--threshold=128]
 *
 * Image generators produce large, anti-aliased, off-palette artwork. The game
 * needs exactly 32x32, palette-snapped, binary-alpha PNGs. This bridges the two,
 * so the art model can work at whatever resolution it likes.
 *
 *   assets/source/<name>.png   in   — any size, any palette
 *   assets/sprites/<name>.png  out  — 32x32, Torchlight 24, alpha 0 or 255
 *
 * Steps, per file:
 *   1. box-downsample to 32x32, averaging in linear light (alpha-weighted so
 *      transparent pixels do not bleed dark halos into the edges)
 *   2. snap every colour to the nearest Torchlight 24 entry
 *   3. binarise alpha at --threshold
 *
 * --autokey treats the most common colour on the image border as background and
 * makes it transparent. Use it when the generator returned a solid backdrop
 * instead of real transparency.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng } from './png.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'assets', 'source');
const OUT = join(ROOT, 'assets', 'sprites');
const SIZE = 32;

const PALETTE = [
  ['VOID','0b0910'],['SHADOW','17141f'],['STONE_D','2b2739'],['STONE_M','443f57'],
  ['STONE_L','676078'],['STONE_H','938ca0'],['WOOD_D','3a2418'],['WOOD_M','6b4227'],
  ['WOOD_L','a86b3c'],['FLAME_D','c2531f'],['FLAME_M','f0a447'],['FLAME_L','ffd98a'],
  ['SKIN_D','b07a52'],['SKIN_L','e8c39e'],['ROBE_D','1f3f63'],['ROBE_M','2f5d8a'],
  ['ROBE_L','4a8fc7'],['GOB_D','35542a'],['GOB_M','4f7a3a'],['GOB_L','7cb551'],
  ['BLOOD_D','7a1f1f'],['BLOOD_M','a32b2b'],['BLOOD_L','d94f4f'],['BONE','e8e0d0'],
].map(([name, hex]) => ({
  name, hex,
  r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16),
}));

const args = process.argv.slice(2);
const autokey = args.includes('--autokey');
const threshold = Number((args.find(a => a.startsWith('--threshold=')) || '=128').split('=')[1]);

const toLinear = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const toSrgb = (v) => 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

/** Nearest palette entry, weighted toward luma so values stay right. */
function snap(r, g, b) {
  let best = PALETTE[0], bd = Infinity;
  for (const p of PALETTE) {
    const dr = r - p.r, dg = g - p.g, db = b - p.b;
    const d = 2.4 * dr * dr + 4.6 * dg * dg + 0.9 * db * db;
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

function borderColour(img) {
  const counts = new Map();
  const push = (x, y) => {
    const i = (y * img.width + x) * 4;
    if (img.px[i + 3] === 0) return;
    const k = `${img.px[i]},${img.px[i+1]},${img.px[i+2]}`;
    counts.set(k, (counts.get(k) || 0) + 1);
  };
  for (let x = 0; x < img.width; x++) { push(x, 0); push(x, img.height - 1); }
  for (let y = 0; y < img.height; y++) { push(0, y); push(img.width - 1, y); }
  let best = null, bn = 0;
  for (const [k, n] of counts) if (n > bn) { bn = n; best = k; }
  return best ? best.split(',').map(Number) : null;
}

function convert(img) {
  const key = autokey ? borderColour(img) : null;
  const out = new Uint8Array(SIZE * SIZE * 4);
  const bw = img.width / SIZE, bh = img.height / SIZE;

  for (let ty = 0; ty < SIZE; ty++) {
    for (let tx = 0; tx < SIZE; tx++) {
      const x0 = Math.floor(tx * bw), x1 = Math.max(x0 + 1, Math.ceil((tx + 1) * bw));
      const y0 = Math.floor(ty * bh), y1 = Math.max(y0 + 1, Math.ceil((ty + 1) * bh));
      let lr = 0, lg = 0, lb = 0, aSum = 0, n = 0;
      for (let y = y0; y < Math.min(y1, img.height); y++) {
        for (let x = x0; x < Math.min(x1, img.width); x++) {
          const i = (y * img.width + x) * 4;
          let a = img.px[i + 3];
          if (key && img.px[i] === key[0] && img.px[i+1] === key[1] && img.px[i+2] === key[2]) a = 0;
          n++; aSum += a;
          if (a === 0) continue;                       // do not average invisible pixels into the colour
          const w = a / 255;
          lr += toLinear(img.px[i]) * w;
          lg += toLinear(img.px[i+1]) * w;
          lb += toLinear(img.px[i+2]) * w;
        }
      }
      const d = ty * SIZE * 4 + tx * 4;
      const meanA = aSum / Math.max(1, n);
      if (meanA < threshold) { out[d] = out[d+1] = out[d+2] = out[d+3] = 0; continue; }
      const wsum = aSum / 255 || 1;
      const p = snap(
        Math.round(toSrgb(lr / wsum)), Math.round(toSrgb(lg / wsum)), Math.round(toSrgb(lb / wsum)));
      out[d] = p.r; out[d+1] = p.g; out[d+2] = p.b; out[d+3] = 255;
    }
  }
  return out;
}

const lumOf = (px) => {
  let s = 0, n = 0;
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (px[i*4+3] === 0) continue;
    s += 0.2126*px[i*4] + 0.7152*px[i*4+1] + 0.0722*px[i*4+2]; n++;
  }
  return n ? s / n : 0;
};

if (!existsSync(SRC)) {
  console.error(`\n  No assets/source/ directory.\n\n  Put your generated artwork there, one PNG per sprite, named exactly as\n  listed in ASSETS.md §5 (e.g. assets/source/tile_wall.png). Any size.\n`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const files = readdirSync(SRC).filter(f => f.toLowerCase().endsWith('.png'));
if (!files.length) { console.error(`\n  assets/source/ has no PNG files.\n`); process.exit(1); }

console.log(`\n  Ingesting ${files.length} source image(s)${autokey ? ' (--autokey)' : ''}\n`);
let ok = 0;
for (const f of files) {
  const name = basename(f, '.png');
  try {
    const img = decodePng(readFileSync(join(SRC, f)));
    const px = convert(img);
    writeFileSync(join(OUT, `${name}.png`), encodePng(SIZE, SIZE, px));
    let opaque = 0;
    for (let i = 0; i < SIZE * SIZE; i++) if (px[i*4+3]) opaque++;
    console.log(`  ✓ ${name.padEnd(24)} ${String(img.width).padStart(4)}×${String(img.height).padEnd(4)} → 32×32   ` +
                `lum ${lumOf(px).toFixed(1).padStart(5)}   ${((opaque/256)*100).toFixed(0).padStart(3)}% opaque`);
    ok++;
  } catch (e) {
    console.log(`  ✗ ${name.padEnd(24)} ${e.message}`);
  }
}
console.log(`\n  ${ok}/${files.length} converted into assets/sprites/`);
console.log(`  Next: node tools/validate-assets.mjs   then   node tools/preview.mjs\n`);
