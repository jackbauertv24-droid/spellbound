#!/usr/bin/env node
/**
 * Spellbound level verifier — zero dependencies.
 *
 *   node tools/verify-levels.mjs
 *
 * Extracts the DOM-free simulation block from index.html, loads it in Node, and
 * runs every level's reference solution against it. A level that cannot be
 * completed, overruns its torch, or has a malformed map fails the build.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const a = html.indexOf('/*__SIM_START__*/'), b = html.indexOf('/*__SIM_END__*/');
if (a < 0 || b < 0) { console.error('\n  Could not find the simulation block in index.html\n'); process.exit(1); }

const { LEVELS, runProgram } = new Function(
  html.slice(a, b) + '\n; return { LEVELS, runProgram };')();

console.log(`\n  Verifying ${LEVELS.length} levels\n`);
let bad = 0;

for (const lv of LEVELS) {
  const errs = [];

  const w = lv.map[0].length;
  lv.map.forEach((r, i) => { if (r.length !== w)
    errs.push(`map row ${i} is ${r.length} chars, row 0 is ${w} — all rows must match`); });
  const flat = lv.map.join('');
  const count = ch => [...flat].filter(c => c === ch).length;
  if (count('@') !== 1) errs.push(`expected exactly one '@' hero start, found ${count('@')}`);
  if (count('>') < 1)  errs.push(`no '>' exit stair`);
  for (const ch of new Set(flat)) if (!'#., @>gkD!s'.includes(ch)) errs.push(`unknown map character ${JSON.stringify(ch)}`);
  if (!lv.solution) errs.push('no reference solution');

  let res = null;
  if (!errs.length) {
    try { res = runProgram(lv, lv.solution); }
    catch (e) { errs.push(`solution threw: ${e.message}`); }
    if (res && !res.won) errs.push(`solution does not reach the stair — ${res.error ? res.error.msg.replace(/<[^>]+>/g,'') : 'unknown'}`);
    if (res && res.turns > lv.torch) errs.push(`solution takes ${res.turns} turns but torch is ${lv.torch}`);
  }

  // the starter code must at least parse, or the player opens a broken editor
  if (lv.starter) {
    try { new Function('hero','log','__g', lv.starter); }
    catch (e) { errs.push(`starter code does not parse: ${e.message}`); }
  }

  if (errs.length) {
    bad++;
    console.log(`  ✗ ${String(lv.id).padStart(2)}. ${lv.title}`);
    for (const e of errs) console.log(`       ${e}`);
  } else {
    const slack = lv.torch - res.turns;
    const parNote = res.turns > lv.par ? `  par ${lv.par} — solution is ${res.turns - lv.par} over` : `  par ${lv.par}`;
    console.log(`  ✓ ${String(lv.id).padStart(2)}. ${lv.title.padEnd(24)} ${String(res.turns).padStart(3)} turns / ${String(lv.torch).padStart(3)} torch (${slack} spare)${parNote}`);
  }
}

console.log(bad ? `\n  FAILED — ${bad} of ${LEVELS.length} levels need work\n`
                : `\n  All ${LEVELS.length} levels are solvable.\n`);
process.exit(bad ? 1 : 0);
