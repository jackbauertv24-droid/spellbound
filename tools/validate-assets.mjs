#!/usr/bin/env node
/**
 * Spellbound asset validator — zero dependencies, Node only.
 *
 * Enforces ASSETS.md. Run:  node tools/validate-assets.mjs
 * Exits 0 and writes assets/manifest.json when every Tier 1 sprite passes.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPRITE_DIR = join(ROOT, 'assets', 'sprites');
const SIZE = 32;

const PALETTE = {
  '0b0910': 'VOID',    '17141f': 'SHADOW',  '2b2739': 'STONE_D', '443f57': 'STONE_M',
  '676078': 'STONE_L', '938ca0': 'STONE_H', '3a2418': 'WOOD_D',  '6b4227': 'WOOD_M',
  'a86b3c': 'WOOD_L',  'c2531f': 'FLAME_D', 'f0a447': 'FLAME_M', 'ffd98a': 'FLAME_L',
  'b07a52': 'SKIN_D',  'e8c39e': 'SKIN_L',  '1f3f63': 'ROBE_D',  '2f5d8a': 'ROBE_M',
  '4a8fc7': 'ROBE_L',  '35542a': 'GOB_D',   '4f7a3a': 'GOB_M',   '7cb551': 'GOB_L',
  '7a1f1f': 'BLOOD_D', 'a32b2b': 'BLOOD_M', 'd94f4f': 'BLOOD_L', 'e8e0d0': 'BONE',
};

const TILES = [
  'tile_floor_a', 'tile_floor_b', 'tile_floor_c', 'tile_floor_cracked',
  'tile_wall', 'tile_wall_torch_0', 'tile_wall_torch_1',
  'tile_door_closed', 'tile_door_open', 'tile_stairs_down',
];
const DIRS = ['south', 'north', 'east', 'west'];
const SPRITES = [
  'item_key', 'item_potion', 'item_scroll',
  ...DIRS.flatMap(d => [`hero_walk_${d}_0`, `hero_walk_${d}_1`]),
  ...DIRS.map(d => `hero_attack_${d}`), 'hero_hurt',
  ...DIRS.flatMap(d => [`goblin_walk_${d}_0`, `goblin_walk_${d}_1`]),
  ...DIRS.map(d => `goblin_attack_${d}`),
  'fx_slash_0', 'fx_slash_1', 'fx_slash_2',
  'ui_torch', 'ui_heart',
];
const REQUIRED = [...TILES, ...SPRITES];

/* ---------------------------------------------------------------- PNG decode */

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePng(buf) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) throw new Error('not a PNG file');

  let pos = 8, ihdr = null, palette = null, trns = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0), height: data.readUInt32BE(4),
        depth: data[8], colorType: data[9], interlace: data[12],
      };
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (!ihdr) throw new Error('missing IHDR chunk');
  if (ihdr.depth !== 8) throw new Error(`bit depth is ${ihdr.depth}, must be 8`);
  if (ihdr.interlace) throw new Error('interlaced PNGs are not supported — save without Adam7');

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ihdr.colorType];
  if (!channels) throw new Error(`unsupported colour type ${ihdr.colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const { width: w, height: h } = ihdr;
  const stride = w * channels;
  const out = Buffer.alloc(h * stride);

  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      else if (filter !== 0) throw new Error(`bad scanline filter ${filter}`);
      out[y * stride + x] = v & 0xff;
    }
  }

  // Normalise everything to RGBA.
  const px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const s = i * channels, d = i * 4;
    if (ihdr.colorType === 6) { px[d] = out[s]; px[d+1] = out[s+1]; px[d+2] = out[s+2]; px[d+3] = out[s+3]; }
    else if (ihdr.colorType === 2) { px[d] = out[s]; px[d+1] = out[s+1]; px[d+2] = out[s+2]; px[d+3] = 255; }
    else if (ihdr.colorType === 0) { px[d] = px[d+1] = px[d+2] = out[s]; px[d+3] = 255; }
    else if (ihdr.colorType === 4) { px[d] = px[d+1] = px[d+2] = out[s]; px[d+3] = out[s+1]; }
    else if (ihdr.colorType === 3) {
      const idx = out[s];
      px[d] = palette[idx*3]; px[d+1] = palette[idx*3+1]; px[d+2] = palette[idx*3+2];
      px[d+3] = trns && idx < trns.length ? trns[idx] : 255;
    }
  }
  return { width: w, height: h, colorType: ihdr.colorType, px };
}

/* ------------------------------------------------------------------ checking */

const hex = (r, g, b) =>
  [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

function check(name, isTile) {
  const file = join(SPRITE_DIR, `${name}.png`);
  const errs = [];
  if (!existsSync(file)) return [`missing file — expected assets/sprites/${name}.png`];

  let img;
  try { img = decodePng(readFileSync(file)); }
  catch (e) { return [`cannot decode: ${e.message}`]; }

  if (img.width !== SIZE || img.height !== SIZE) {
    errs.push(`is ${img.width}×${img.height}, must be exactly ${SIZE}×${SIZE} ` +
              `(a large render of a small sprite is not a sprite — downsample with nearest-neighbour)`);
    return errs;
  }
  if (img.colorType !== 6) {
    errs.push(`colour type ${img.colorType}; save as 8-bit RGBA (type 6) so transparency is explicit`);
  }

  const partial = [], offPalette = new Map();
  let opaque = 0, transparent = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      const a = img.px[i + 3];
      if (a !== 0 && a !== 255) { if (partial.length < 6) partial.push(`(${x},${y}) alpha=${a}`); continue; }
      if (a === 0) { transparent++; continue; }
      opaque++;
      const h = hex(img.px[i], img.px[i + 1], img.px[i + 2]);
      if (!PALETTE[h]) {
        const at = offPalette.get(h) || [];
        if (at.length < 4) at.push(`(${x},${y})`);
        offPalette.set(h, at);
      }
    }
  }

  if (partial.length) {
    errs.push(`semi-transparent pixels (alpha must be 0 or 255) — e.g. ${partial.join(', ')}` +
              `${partial.length >= 6 ? ' …' : ''}. This is the signature of a resized/anti-aliased image.`);
  }
  if (offPalette.size) {
    const listed = [...offPalette.entries()].slice(0, 8)
      .map(([h, at]) => `#${h} at ${at.join(' ')}`).join('; ');
    errs.push(`${offPalette.size} colour(s) outside the Torchlight 24 palette — ${listed}` +
              `${offPalette.size > 8 ? ' …' : ''}. Snap every colour to an exact palette value.`);
  }
  if (isTile && transparent > 0) {
    errs.push(`${transparent} transparent pixel(s); tiles must be fully opaque edge to edge`);
  }
  if (!isTile && opaque === SIZE * SIZE) {
    errs.push(`no transparent background; entity and item sprites must sit on transparency`);
  }
  if (!isTile && opaque === 0) errs.push(`fully transparent — the sprite is empty`);
  return errs;
}

/* --------------------------------------------------------------------- main */

if (!existsSync(SPRITE_DIR)) {
  console.error(`\n  No assets/sprites/ directory. Create it and add the PNGs listed in ASSETS.md.\n`);
  process.exit(1);
}

console.log(`\n  Spellbound asset validation — ${REQUIRED.length} required sprites\n`);

let failed = 0, missing = 0;
for (const name of REQUIRED) {
  const errs = check(name, TILES.includes(name));
  if (!errs.length) continue;
  failed++;
  if (errs[0].startsWith('missing file')) missing++;
  console.log(`  ✗ ${name}.png`);
  for (const e of errs) console.log(`      ${e}`);
}

const known = new Set(REQUIRED.map(n => `${n}.png`));
const extra = readdirSync(SPRITE_DIR).filter(f => f.endsWith('.png') && !known.has(f));
if (extra.length) {
  console.log(`\n  note: ${extra.length} file(s) not in the Tier 1 list (Tier 2 or misspelled?):`);
  console.log(`      ${extra.join(', ')}`);
}

if (failed) {
  console.log(`\n  FAILED — ${failed} of ${REQUIRED.length} sprites need work` +
              `${missing ? ` (${missing} not yet created)` : ''}.`);
  console.log(`  See ASSETS.md §3 for the rules and §5 for the sprite list.\n`);
  process.exit(1);
}

/* ------------------------------------------------------- visual relationships */
/* Format conformance is not enough: art can satisfy every pixel rule and still be
   unreadable. These gates encode the requirements of ASSETS.md §1 numerically. */

const lumOf = (name) => {
  const img = decodePng(readFileSync(join(SPRITE_DIR, `${name}.png`)));
  let sum = 0, n = 0;
  for (let i = 0; i < img.width * img.height; i++) {
    if (img.px[i * 4 + 3] === 0) continue;
    sum += 0.2126 * img.px[i*4] + 0.7152 * img.px[i*4+1] + 0.0722 * img.px[i*4+2];
    n++;
  }
  return sum / n;
};
const srgb = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const contrast = (a, b) => {
  const A = srgb(a), B = srgb(b);
  return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05);
};

const FLOORS = ['tile_floor_a', 'tile_floor_b', 'tile_floor_c', 'tile_floor_cracked'];
const MIN_CONTRAST  = 2.5;  // floor vs wall — the core readability rule
const MAX_FLOOR_LUM = 48;   // floors stay recessive
const MIN_WALL_LUM  = 85;   // walls read as lit, raised, solid
const MIN_STAIR_LUM = 90;   // the goal must be the brightest tile

const visual = [];
const wallLum = lumOf('tile_wall');

if (wallLum < MIN_WALL_LUM) {
  visual.push(
    `tile_wall luminance is ${wallLum.toFixed(1)}, must be at least ${MIN_WALL_LUM}. ` +
    `Walls must read as lit and raised — build the face from STONE_L (#676078) and ` +
    `STONE_H (#938ca0), reserving STONE_D for mortar lines and the shaded base.`);
}

for (const f of FLOORS) {
  const fl = lumOf(f);
  const c = contrast(fl, wallLum);
  if (fl > MAX_FLOOR_LUM) {
    visual.push(
      `${f} luminance is ${fl.toFixed(1)}, must be at most ${MAX_FLOOR_LUM}. Floors are ` +
      `background and must never compete with the entities standing on them — keep them ` +
      `in SHADOW (#17141f) and STONE_D (#2b2739).`);
  }
  if (c < MIN_CONTRAST) {
    visual.push(
      `${f} against tile_wall has a contrast ratio of only ${c.toFixed(2)}:1, must be at ` +
      `least ${MIN_CONTRAST}:1. At this ratio the player cannot tell walkable floor from ` +
      `solid wall, which makes the game unplayable. This is the most important visual ` +
      `rule in the specification.`);
  }
}

const stairLum = lumOf('tile_stairs_down');
if (stairLum < MIN_STAIR_LUM) {
  visual.push(
    `tile_stairs_down luminance is ${stairLum.toFixed(1)}, must be at least ${MIN_STAIR_LUM}. ` +
    `The exit is the goal of every level and must be the most eye-catching tile on screen — ` +
    `add FLAME_M (#f0a447) / FLAME_L (#ffd98a) highlights along the stair edges.`);
}

for (let i = 0; i < FLOORS.length; i++) {
  for (let j = i + 1; j < FLOORS.length; j++) {
    const a = decodePng(readFileSync(join(SPRITE_DIR, `${FLOORS[i]}.png`)));
    const b = decodePng(readFileSync(join(SPRITE_DIR, `${FLOORS[j]}.png`)));
    let diff = 0;
    for (let p = 0; p < SIZE * SIZE; p++) {
      if (a.px[p*4] !== b.px[p*4] || a.px[p*4+1] !== b.px[p*4+1] || a.px[p*4+2] !== b.px[p*4+2]) diff++;
    }
    if (diff < SIZE * SIZE * 0.10) {
      visual.push(
        `${FLOORS[i]} and ${FLOORS[j]} differ in only ${diff} of ${SIZE * SIZE} pixels. Floor variants ` +
        `exist to break up visible repetition across a room; make them at least 10% different.`);
    }
  }
}

if (visual.length) {
  console.log(`  ✓ All ${REQUIRED.length} sprites pass the format checks.\n`);
  console.log(`  ✗ VISUAL READABILITY — ${visual.length} problem(s):\n`);
  for (const v of visual) console.log(`      • ${v}\n`);
  console.log(`  FAILED — this art is technically correct but not playable.`);
  console.log(`  See ASSETS.md §1 (what the art has to do) and §4 (palette).\n`);
  process.exit(1);
}

const animation = {};
for (const n of REQUIRED) {
  const m = n.match(/^(.*)_(\d+)$/);
  if (!m) continue;
  (animation[m[1]] ||= []).push(`${n}.png`);
}
for (const k of Object.keys(animation)) animation[k].sort();

writeFileSync(join(ROOT, 'assets', 'manifest.json'), JSON.stringify({
  generatedBy: 'tools/validate-assets.mjs',
  tileSize: SIZE,
  palette: Object.fromEntries(Object.entries(PALETTE).map(([h, n]) => [n, `#${h}`])),
  tiles: TILES.map(n => `${n}.png`),
  sprites: SPRITES.map(n => `${n}.png`),
  animations: animation,
}, null, 2) + '\n');

console.log(`  ✓ All ${REQUIRED.length} sprites pass.`);
console.log(`  ✓ Wrote assets/manifest.json\n`);
