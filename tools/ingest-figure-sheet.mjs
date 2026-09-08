#!/usr/bin/env node
/**
 * Spellbound figure-sheet ingest — for a LABELLED sheet with irregular rows.
 *
 *   node tools/ingest-figure-sheet.mjs [path]     default: assets/source/spritesheet.png
 *
 * Image models tend to return a labelled *figure* of a sprite sheet rather than a
 * mechanical grid: a caption strip under every cell, and rows of slightly
 * different heights. tools/ingest-sheet.mjs assumes a uniform grid and would
 * slice the captions into the sprites. This tool measures the sheet instead:
 *
 *   1. columns are found from the dark vertical separator lines
 *   2. rows are found from the caption strips (bands with no magenta and a dark
 *      background), and each row keeps its own measured height
 *   3. each cell's artwork is located by its own bounding box, so per-cell
 *      padding does not matter
 *   4. tiles are stretched to fill; entities keep their aspect ratio and are
 *      bottom-aligned and centred, the way they stand on a floor tile
 *
 * Then, as elsewhere: box-downsample in linear light, snap to Torchlight 24,
 * binarise alpha. Magenta #d020d0 is background for non-tile cells.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng } from './png.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'sprites');
const SIZE = 32, COLS = 8;

const LAYOUT = [
 ['tile_floor_a','tile_floor_b','tile_floor_c','tile_floor_cracked','tile_wall','tile_wall_torch_0','tile_wall_torch_1','tile_door_closed'],
 ['tile_door_open','tile_stairs_down','item_key','item_potion','item_scroll','ui_torch','ui_heart',null],
 ['hero_walk_south_0','hero_walk_south_1','hero_walk_north_0','hero_walk_north_1','hero_walk_east_0','hero_walk_east_1','hero_walk_west_0','hero_walk_west_1'],
 ['hero_attack_south','hero_attack_north','hero_attack_east','hero_attack_west','hero_hurt','fx_slash_0','fx_slash_1','fx_slash_2'],
 ['goblin_walk_south_0','goblin_walk_south_1','goblin_walk_north_0','goblin_walk_north_1','goblin_walk_east_0','goblin_walk_east_1','goblin_walk_west_0','goblin_walk_west_1'],
 ['goblin_attack_south','goblin_attack_north','goblin_attack_east','goblin_attack_west',null,null,null,null],
];

const PALETTE = ['0b0910','17141f','2b2739','443f57','676078','938ca0','3a2418','6b4227','a86b3c',
  'c2531f','f0a447','ffd98a','b07a52','e8c39e','1f3f63','2f5d8a','4a8fc7','35542a','4f7a3a','7cb551',
  '7a1f1f','a32b2b','d94f4f','e8e0d0'].map(h => ({
    r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }));

const snap = (r,g,b) => {
  let best = PALETTE[0], bd = Infinity;
  for (const p of PALETTE) { const dr=r-p.r, dg=g-p.g, db=b-p.b;
    const d = 2.4*dr*dr + 4.6*dg*dg + 0.9*db*db; if (d < bd) { bd = d; best = p; } }
  return best;
};
const toLin = v => { const c = v/255; return c <= 0.04045 ? c/12.92 : ((c+0.055)/1.055)**2.4; };
const toSrgb = v => 255 * (v <= 0.0031308 ? v*12.92 : 1.055*v**(1/2.4) - 0.055);

const path = process.argv.slice(2).find(a => !a.startsWith('--')) || join(ROOT,'assets','source','spritesheet.png');
if (!existsSync(path)) { console.error(`\n  No sheet at ${path}\n`); process.exit(1); }
const img = decodePng(readFileSync(path));
const { width: W, height: H, px: d } = img;

const isMag = i => d[i] > 120 && d[i+2] > 120 && d[i+1] < 110 && (d[i]-d[i+1]) > 50 && (d[i+2]-d[i+1]) > 50;
const isDark = i => d[i] < 45 && d[i+1] < 45 && d[i+2] < 45;

/* --- columns: uniform pitch from the dark separator lines --- */
const colDark = [];
for (let x = 0; x < W; x++) { let k = 0;
  for (let y = 0; y < H; y++) if (isDark((y*W+x)*4)) k++;
  colDark.push(k / H); }
let seps = [], run = null;
for (let x = 0; x <= W; x++) {
  const s = x < W && colDark[x] > 0.55;
  if (s && run === null) run = x;
  if (!s && run !== null) { seps.push((run + x - 1) / 2); run = null; }
}
const colW = seps.length >= 2
  ? Math.round((seps[seps.length-1] - seps[0]) / (seps.length - 1))
  : Math.round(W / COLS);

/* --- rows: caption strips are bands with zero magenta --- */
const magRow = [];
for (let y = 0; y < H; y++) { let m = 0;
  for (let x = 0; x < W; x++) if (isMag((y*W+x)*4)) m++;
  magRow.push(m); }
let bands = [], s2 = null;
for (let y = 0; y <= H; y++) {
  const zero = y < H && magRow[y] === 0;
  if (zero && s2 === null) s2 = y;
  if (!zero && s2 !== null) { if (y - s2 > 8) bands.push([s2, y-1]); s2 = null; }
}
// content rows are the gaps between caption strips
const rows = [];
let cursor = 0;
for (const [a, b] of bands) { if (a - cursor > 20) rows.push([cursor, a-1]); cursor = b + 1; }
if (H - cursor > 20) rows.push([cursor, H-1]);
while (rows.length > LAYOUT.length) rows.pop();

console.log(`\n  Sheet ${W}×${H}   columns ${COLS} @ ${colW}px   rows detected: ${rows.length}`);
rows.forEach((r,i) => console.log(`    row ${i+1}: y ${r[0]}..${r[1]}  (${r[1]-r[0]+1}px)`));
if (rows.length !== LAYOUT.length) {
  console.error(`\n  Expected ${LAYOUT.length} content rows, found ${rows.length}. ` +
                `The caption strips could not be located reliably.\n`);
  process.exit(1);
}

function bbox(x0, y0, x1, y1) {
  let mnx=1e9, mny=1e9, mxx=-1, mxy=-1;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (isMag((y*W+x)*4)) continue;
    if (x < mnx) mnx = x; if (x > mxx) mxx = x;
    if (y < mny) mny = y; if (y > mxy) mxy = y; }
  return mxx < 0 ? null : [mnx, mny, mxx, mxy];
}
function sample(sx0, sy0, sx1, sy1) {
  let lr=0, lg=0, lb=0, n=0, mag=0, tot=0;
  for (let y = Math.floor(sy0); y < Math.max(Math.floor(sy0)+1, Math.ceil(sy1)); y++)
    for (let x = Math.floor(sx0); x < Math.max(Math.floor(sx0)+1, Math.ceil(sx1)); x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = (y*W+x)*4; tot++;
      if (isMag(i)) { mag++; continue; }
      lr += toLin(d[i]); lg += toLin(d[i+1]); lb += toLin(d[i+2]); n++; }
  if (!n || mag/Math.max(1,tot) > 0.5) return null;
  return snap(Math.round(toSrgb(lr/n)), Math.round(toSrgb(lg/n)), Math.round(toSrgb(lb/n)));
}

mkdirSync(OUT, { recursive: true });
let count = 0;
for (let r = 0; r < LAYOUT.length; r++) {
  for (let c = 0; c < COLS; c++) {
    const name = LAYOUT[r][c];
    if (!name) continue;
    const [ry0, ry1] = rows[r], cx0 = c*colW, cx1 = Math.min(W-1, cx0 + colW - 1);
    const bb = bbox(cx0, ry0, cx1, ry1);
    if (!bb) { console.log(`  ✗ ${name}: cell is entirely background`); continue; }
    const [x0, y0, x1, y1] = bb;
    const out = new Uint8Array(SIZE*SIZE*4);
    const isTile = name.startsWith('tile_');
    if (isTile) {
      const bw = (x1-x0+1)/SIZE, bh = (y1-y0+1)/SIZE;
      for (let ty = 0; ty < SIZE; ty++) for (let tx = 0; tx < SIZE; tx++) {
        const p = sample(x0+tx*bw, y0+ty*bh, x0+(tx+1)*bw, y0+(ty+1)*bh) || snap(43,39,57);
        const t = (ty*SIZE+tx)*4; out[t]=p.r; out[t+1]=p.g; out[t+2]=p.b; out[t+3]=255; }
    } else {
      const sw = x1-x0+1, sh = y1-y0+1;
      const scale = Math.min(SIZE/sw, SIZE/sh);
      const ow = Math.max(1, Math.round(sw*scale)), oh = Math.max(1, Math.round(sh*scale));
      const ox = Math.floor((SIZE-ow)/2), oy = SIZE-oh;
      const bw = sw/ow, bh = sh/oh;
      for (let ty = 0; ty < oh; ty++) for (let tx = 0; tx < ow; tx++) {
        const p = sample(x0+tx*bw, y0+ty*bh, x0+(tx+1)*bw, y0+(ty+1)*bh);
        if (!p) continue;
        const t = ((oy+ty)*SIZE + ox+tx)*4;
        out[t]=p.r; out[t+1]=p.g; out[t+2]=p.b; out[t+3]=255; }
    }
    writeFileSync(join(OUT, `${name}.png`), encodePng(SIZE, SIZE, out));
    count++;
  }
}
console.log(`\n  ${count} sprites written to assets/sprites/ at ${SIZE}×${SIZE}`);
console.log(`  Next: node tools/validate-assets.mjs   then   node tools/preview.mjs\n`);
