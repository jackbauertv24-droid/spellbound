#!/usr/bin/env node
/**
 * Spellbound sheet ingest — slices ONE spritesheet into the 43 game sprites.
 *
 *   node tools/ingest-sheet.mjs [path] [--key=#d020d0] [--threshold=128]
 *
 * Default path: assets/source/spritesheet.png
 *
 * The sheet is an 8x8 grid of equal square cells, in the fixed order below
 * (ART-BRIEF.md §7). Only the first six rows carry sprites; rows 7 and 8 are
 * blank so the sheet is square and easy for an image generator to produce.
 * Cell size is derived from the image: a square 2048x2048 (256px cells) is
 * ideal, 128x128 (16px cells) is the minimum.
 *
 * Per cell: box-downsample to 32x32 in linear light, snap to the Torchlight 24
 * palette, binarise alpha.
 *
 * Transparency: cells in the TILES set are forced fully opaque (tiles are
 * edge-to-edge ground and wall). Every other cell treats --key (default
 * magenta #d020d0) as background, in addition to any real alpha in the file.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng } from './png.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'sprites');
const SIZE = 32, COLS = 8, ROWS = 8;

/** Sheet order — row by row, left to right. null = intentionally blank cell. */
const LAYOUT = [
  'tile_floor_a','tile_floor_b','tile_floor_c','tile_floor_cracked',
  'tile_wall','tile_wall_torch_0','tile_wall_torch_1','tile_door_closed',

  'tile_door_open','tile_stairs_down','item_key','item_potion',
  'item_scroll','ui_torch','ui_heart',null,

  'hero_walk_south_0','hero_walk_south_1','hero_walk_north_0','hero_walk_north_1',
  'hero_walk_east_0','hero_walk_east_1','hero_walk_west_0','hero_walk_west_1',

  'hero_attack_south','hero_attack_north','hero_attack_east','hero_attack_west',
  'hero_hurt','fx_slash_0','fx_slash_1','fx_slash_2',

  'goblin_walk_south_0','goblin_walk_south_1','goblin_walk_north_0','goblin_walk_north_1',
  'goblin_walk_east_0','goblin_walk_east_1','goblin_walk_west_0','goblin_walk_west_1',

  'goblin_attack_south','goblin_attack_north','goblin_attack_east','goblin_attack_west',
  null,null,null,null,

  // rows 7 and 8 are unused; the sheet is square so it is easy to generate
  null,null,null,null,null,null,null,null,
  null,null,null,null,null,null,null,null,
];

const TILES = new Set(LAYOUT.filter(n => n && n.startsWith('tile_')));

const PALETTE = [
  '0b0910','17141f','2b2739','443f57','676078','938ca0','3a2418','6b4227',
  'a86b3c','c2531f','f0a447','ffd98a','b07a52','e8c39e','1f3f63','2f5d8a',
  '4a8fc7','35542a','4f7a3a','7cb551','7a1f1f','a32b2b','d94f4f','e8e0d0',
].map(h => ({ hex: h, r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }));

const argv = process.argv.slice(2);
const flag = (name, def) => {
  const a = argv.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : def;
};
const sheetPath = argv.find(a => !a.startsWith('--')) || join(ROOT, 'assets', 'source', 'spritesheet.png');
const threshold = Number(flag('threshold', '128'));
const keyHex = flag('key', '#d020d0').replace('#', '').toLowerCase();
const KEY = { r: parseInt(keyHex.slice(0,2),16), g: parseInt(keyHex.slice(2,4),16), b: parseInt(keyHex.slice(4,6),16) };
const KEY_TOL = 60 * 60 * 3;   // squared distance; generous, backgrounds drift after compression

const toLinear = v => { const c = v/255; return c <= 0.04045 ? c/12.92 : ((c+0.055)/1.055) ** 2.4; };
const toSrgb  = v => 255 * (v <= 0.0031308 ? v*12.92 : 1.055 * v**(1/2.4) - 0.055);
const snap = (r,g,b) => {
  let best = PALETTE[0], bd = Infinity;
  for (const p of PALETTE) {
    const dr=r-p.r, dg=g-p.g, db=b-p.b;
    const d = 2.4*dr*dr + 4.6*dg*dg + 0.9*db*db;
    if (d < bd) { bd = d; best = p; }
  }
  return best;
};
const isKey = (r,g,b) => {
  const dr=r-KEY.r, dg=g-KEY.g, db=b-KEY.b;
  return dr*dr + dg*dg + db*db < KEY_TOL;
};

function cellToSprite(img, cx, cy, cw, ch, opaque) {
  const out = new Uint8Array(SIZE*SIZE*4);
  const bw = cw/SIZE, bh = ch/SIZE;
  for (let ty = 0; ty < SIZE; ty++) {
    for (let tx = 0; tx < SIZE; tx++) {
      const x0 = cx + Math.floor(tx*bw), x1 = cx + Math.max(Math.floor(tx*bw)+1, Math.round((tx+1)*bw));
      const y0 = cy + Math.floor(ty*bh), y1 = cy + Math.max(Math.floor(ty*bh)+1, Math.round((ty+1)*bh));
      let lr=0, lg=0, lb=0, aSum=0, n=0;
      for (let y = y0; y < Math.min(y1, cy+ch); y++) {
        for (let x = x0; x < Math.min(x1, cx+cw); x++) {
          const i = (y*img.width + x)*4;
          const r = img.px[i], g = img.px[i+1], b = img.px[i+2];
          let a = img.px[i+3];
          if (!opaque && isKey(r,g,b)) a = 0;
          n++; aSum += a;
          if (a === 0) continue;
          const w = a/255;
          lr += toLinear(r)*w; lg += toLinear(g)*w; lb += toLinear(b)*w;
        }
      }
      const d = (ty*SIZE + tx)*4;
      const meanA = aSum / Math.max(1, n);
      if (!opaque && meanA < threshold) { out[d]=out[d+1]=out[d+2]=out[d+3]=0; continue; }
      const wsum = (aSum/255) || 1;
      const p = snap(Math.round(toSrgb(lr/wsum)), Math.round(toSrgb(lg/wsum)), Math.round(toSrgb(lb/wsum)));
      out[d]=p.r; out[d+1]=p.g; out[d+2]=p.b; out[d+3]=255;
    }
  }
  return out;
}

const lumOf = px => {
  let s=0,n=0;
  for (let i=0;i<SIZE*SIZE;i++){ if(!px[i*4+3]) continue; s+=0.2126*px[i*4]+0.7152*px[i*4+1]+0.0722*px[i*4+2]; n++; }
  return n ? s/n : 0;
};

if (!existsSync(sheetPath)) {
  console.error(`\n  No sheet at ${sheetPath}\n\n  Save the spritesheet as assets/source/spritesheet.png, or pass its path:\n` +
                `    node tools/ingest-sheet.mjs path/to/sheet.png\n`);
  process.exit(1);
}

let img;
try { img = decodePng(readFileSync(sheetPath)); }
catch (e) { console.error(`\n  Cannot read the sheet: ${e.message}\n`); process.exit(1); }

if (img.width % COLS || img.height % ROWS) {
  console.error(`\n  Sheet is ${img.width}×${img.height}, which does not divide into an ${COLS}×${ROWS} grid ` +
                `of equal cells.\n  Width must be a multiple of ${COLS} and height a multiple of ${ROWS}. ` +
                `Ideal: 2048×1536.\n`);
  process.exit(1);
}
const cw = img.width / COLS, ch = img.height / ROWS;
if (cw !== ch) console.log(`\n  warning: cells are ${cw}×${ch}, not square — sprites will be squashed.`);

mkdirSync(OUT, { recursive: true });
console.log(`\n  Sheet ${img.width}×${img.height} → ${COLS}×${ROWS} grid, ${cw}×${ch} per cell\n`);

let n = 0;
for (let i = 0; i < LAYOUT.length; i++) {
  const name = LAYOUT[i];
  if (!name) continue;
  const col = i % COLS, row = (i / COLS) | 0;
  const opaque = TILES.has(name);
  const px = cellToSprite(img, col*cw, row*ch, cw, ch, opaque);
  writeFileSync(join(OUT, `${name}.png`), encodePng(SIZE, SIZE, px));
  let op = 0;
  for (let p = 0; p < SIZE*SIZE; p++) if (px[p*4+3]) op++;
  const warn = !opaque && op === SIZE*SIZE ? '  ← no transparency found' : (!opaque && op < 20 ? '  ← nearly empty' : '');
  console.log(`  ✓ r${row+1}c${col+1}  ${name.padEnd(22)} lum ${lumOf(px).toFixed(1).padStart(5)}  ${String(Math.round(op/(SIZE*SIZE)*100)).padStart(3)}% opaque${warn}`);
  n++;
}
console.log(`\n  ${n} sprites written to assets/sprites/`);
console.log(`  Next: node tools/validate-assets.mjs   then   node tools/preview.mjs\n`);
