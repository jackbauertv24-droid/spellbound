# Spellbound

An RPG puzzle game where the only way to act in the world is to **write JavaScript**.

You are an apprentice wizard. You have no controller and no keyboard controls. You
inscribe a script, you cast it, and you watch your hero carry out exactly what you
wrote — including the parts you got wrong. The game teaches programming from
"call a command" up to writing your own maze-solving algorithm.

Single HTML page. No frameworks, no build step, no network requests at runtime.

---

## Status

| Stage | State |
|---|---|
| Game design | ✅ Complete — see [`DESIGN.md`](DESIGN.md) |
| Art specification | ✅ Complete — see [`ASSETS.md`](ASSETS.md) |
| Art production | ✅ **Complete — all 43 sprites pass `tools/validate-assets.mjs`** |
| Engine implementation | ✅ **Playable — 14 levels, `index.html`** |

---

## Play it

### ▶ [jackbauertv24-droid.github.io/spellbound](https://jackbauertv24-droid.github.io/spellbound/)

Or clone the repo and open **`index.html`** directly — that single file *is* the
whole game, with the art inlined as base64. No server, no build step, no
dependencies, nothing to install.

---

## 📌 If you are an AI model assigned to produce art

Read **[`ART-BRIEF.md`](ART-BRIEF.md)** — a single self-contained document.
Deliver one PNG spritesheet; the maintainer imports it with `tools/ingest-sheet.mjs`.

---

## Repository layout

```
index.html                 The game. Open it in a browser.
DESIGN.md                  Game design: mechanics, curriculum, hero API
ASSETS.md                  Art specification
ART-BRIEF.md               Single-file brief for an art model
ART-REVIEW.md              Feedback on past art rounds
assets/sprites/            43 sprites, 32x32, Torchlight 24 palette
assets/source/             Delivered spritesheets
rejected/round1/           Rejected art, kept for reference
tools/                     See below
```

## Tools

All zero-dependency, Node only.

| Command | What it does |
|---|---|
| `node tools/verify-levels.mjs` | Loads the engine and proves every level is solvable by its reference solution |
| `node tools/smoke-test.mjs` | Boots the whole page against a DOM stub and plays every level |
| `node tools/validate-assets.mjs` | Sprite format + visual-readability gates |
| `node tools/embed-atlas.mjs` | Inlines `assets/sprites/` into `index.html` as base64 |
| `node tools/preview.mjs` | Renders `review/contact.png` and `review/room.png` |
| `node tools/ingest-sheet.mjs` | Slices a uniform spritesheet into the 43 sprites |
| `node tools/ingest-figure-sheet.mjs` | Same, for a captioned sheet with irregular rows |
| `node tools/ingest-art.mjs` | Converts individual source images |

After changing art: ingest → `validate-assets` → `embed-atlas` → `smoke-test`.

## License

Code: MIT. Art contributed to `assets/` must be original or CC0 — state which in
your commit message.
