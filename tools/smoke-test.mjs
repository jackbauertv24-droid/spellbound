#!/usr/bin/env node
/**
 * Spellbound smoke test — runs the real page code against a minimal DOM stub.
 *
 *   node tools/smoke-test.mjs
 *
 * This catches what a syntax check cannot: element ids that do not exist,
 * typos in handler wiring, and crashes in the render path. It loads BOTH script
 * blocks from index.html, boots the app, then plays every level's reference
 * solution through loadLevel/run and draws the resulting frames.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (scripts.length < 2) { console.error('\n  Expected two <script> blocks, found ' + scripts.length + '\n'); process.exit(1); }

/* ------------------------------------------------------------- DOM stub --- */
const made = new Map();
const mkClassList = () => { const s = new Set(); return {
  add:(...c)=>c.forEach(x=>s.add(x)), remove:(...c)=>c.forEach(x=>s.delete(x)),
  toggle:(c,f)=>{ const on = f===undefined ? !s.has(c) : f; on ? s.add(c) : s.delete(c); },
  contains:c=>s.has(c) }; };
const mkEl = (id='') => {
  const el = {
    id, textContent:'', innerHTML:'', className:'', value:'',
    style:{}, dataset:{}, children:[], childElementCount:0,
    scrollTop:0, scrollHeight:0, selectionStart:0, selectionEnd:0, disabled:false,
    classList: mkClassList(),
    appendChild(c){ this.children.push(c); this.childElementCount = this.children.length; return c; },
    querySelectorAll(){ return []; },
    addEventListener(){}, scrollIntoView(){}, focus(){},
    getContext(){ return ctx2d; },
  };
  return el;
};
const noop = () => {};
const ctx2d = new Proxy({ canvas:{}, imageSmoothingEnabled:false }, {
  get(t, k){
    if (k in t) return t[k];
    if (k === 'createRadialGradient' || k === 'createLinearGradient')
      return () => ({ addColorStop: noop });
    return noop;
  },
  set(t, k, v){ t[k] = v; return true; },
});

const document = {
  getElementById(id){ if (!made.has(id)) made.set(id, mkEl(id)); return made.get(id); },
  createElement(){ return mkEl(); },
  addEventListener: noop,
};
class Image {
  constructor(){ this._src=''; }
  set src(v){ this._src = v; setTimeout(() => this.onload && this.onload(), 0); }
  get src(){ return this._src; }
}
const localStorage = { _d:{}, getItem(k){ return this._d[k] ?? null; }, setItem(k,v){ this._d[k]=v; }, removeItem(k){ delete this._d[k]; } };
let rafId = 0; const rafs = new Map();
const requestAnimationFrame = fn => { const id = ++rafId; rafs.set(id, fn); return id; };
const cancelAnimationFrame = id => rafs.delete(id);
const performance = { now: () => Date.now() };

/* --------------------------------------------------------------- run it --- */
const sandbox = new Function(
  'document','Image','localStorage','requestAnimationFrame','cancelAnimationFrame','performance','setTimeout','console',
  scripts[0] + '\n' + scripts[1] + '\n; return { LEVELS, loadLevel, run, runProgram, drawFrame, buildWorld, renderMap, showWin, __state:()=>({level, world}) };'
);

let api;
try {
  api = sandbox(document, Image, localStorage, requestAnimationFrame, cancelAnimationFrame, performance, setTimeout, console);
} catch (e) {
  console.error(`\n  ✗ Page code threw while loading: ${e.message}\n${e.stack.split('\n').slice(0,4).join('\n')}\n`);
  process.exit(1);
}

console.log(`\n  Smoke test — ${api.LEVELS.length} levels through the real UI path\n`);
let bad = 0;
for (const lv of api.LEVELS) {
  try {
    api.loadLevel(lv.id);
    const res = api.runProgram(lv, lv.solution);
    if (!res.won) { console.log(`  ✗ ${lv.id}. ${lv.title}: solution did not win`); bad++; continue; }
    // draw every frame, exactly as playback would
    for (let i = 0; i < res.frames.length; i++)
      api.drawFrame(res.frames[i], i ? res.frames[i-1] : null, 1);
    console.log(`  ✓ ${String(lv.id).padStart(2)}. ${lv.title.padEnd(24)} ${String(res.frames.length).padStart(3)} frames rendered`);
  } catch (e) {
    console.log(`  ✗ ${lv.id}. ${lv.title}: ${e.message}`);
    console.log(`       ${(e.stack||'').split('\n')[1]?.trim() || ''}`);
    bad++;
  }
}
try { api.renderMap(); console.log('\n  ✓ level select renders'); }
catch (e) { console.log(`\n  ✗ level select: ${e.message}`); bad++; }

// a deliberately broken spell must produce a friendly error, not a crash
try {
  api.loadLevel(1);
  const r = api.runProgram(api.LEVELS[0], "hero.mvoe('east');");
  const plain = r.error ? r.error.msg.replace(/<[^>]+>/g,'') : '(none)';
  console.log(`  ✓ typo handling: ${plain}`);
  if (!/mvoe/.test(plain) || !/move/.test(plain)) { console.log('    ✗ expected a did-you-mean suggestion'); bad++; }
} catch (e) { console.log(`  ✗ typo handling crashed: ${e.message}`); bad++; }

console.log(bad ? `\n  FAILED — ${bad} problem(s)\n` : `\n  Page boots and every level plays.\n`);
process.exit(bad ? 1 : 0);
