#!/usr/bin/env node
/**
 * Inline every sprite into index.html as base64, so the game is one file that
 * runs by double-clicking it — no server, no asset folder, no CORS.
 *
 *   node tools/embed-atlas.mjs
 *
 * Re-run after changing the art. Requires validate-assets.mjs to have passed.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES = join(ROOT, 'assets', 'sprites');
const HTML = join(ROOT, 'index.html');

if (!existsSync(SPRITES)) { console.error('\n  No assets/sprites/ — run the ingest first.\n'); process.exit(1); }

const files = readdirSync(SPRITES).filter(f => f.endsWith('.png')).sort();
if (!files.length) { console.error('\n  assets/sprites/ is empty.\n'); process.exit(1); }

const atlas = {};
let raw = 0;
for (const f of files) {
  const buf = readFileSync(join(SPRITES, f));
  raw += buf.length;
  atlas[basename(f, '.png')] = buf.toString('base64');
}

let html = readFileSync(HTML, 'utf8');
const marker = '/*__ATLAS__*/';
const at = html.indexOf(marker);
if (at < 0) { console.error(`\n  Marker ${marker} not found in index.html\n`); process.exit(1); }
const end = html.indexOf(';', at);
if (end < 0) { console.error('\n  Could not find the end of the ATLAS statement.\n'); process.exit(1); }

const json = JSON.stringify(atlas);
html = html.slice(0, at) + marker + ' ' + json + html.slice(end);
writeFileSync(HTML, html);

const kb = n => (n/1024).toFixed(1) + ' KB';
console.log(`\n  Embedded ${files.length} sprites — ${kb(raw)} raw → ${kb(json.length)} base64`);
console.log(`  index.html is now ${kb(Buffer.byteLength(html))}, self-contained.\n`);
