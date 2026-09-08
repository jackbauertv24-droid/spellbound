# Spellbound — design spec v1

A single-file, dependency-free web game that teaches programming. The player is an
apprentice wizard; the only way to act in the world is to **inscribe JavaScript**.
Code is literally the magic.

---

## 1. Locked decisions

| Area | Decision |
|---|---|
| Control | Player writes a script that runs top-to-bottom. Each `hero.*` command costs one game turn. |
| Audience | Total beginner. Level 1 teaches "call a command". |
| Level | Grid dungeon room. Win = reach the exit (plus level-specific conditions). |
| Rendering | Canvas 2D, dark torchlit dungeon, warm light pooling on the hero, unexplored tiles dark. |
| Language | Real JavaScript, executed for real. No enforced subset — levels only *teach* what they need. |
| Failure guard | Torch budget (turns). Running out = "Your torch gutters out in the dark." |
| Run loop | Run → watch the animation → edit → rerun. Instant reset. Currently-executing line is highlighted during playback. |
| Randomness | None. Fully deterministic — a correct program always wins. |
| Sensing | Adjacent tiles only (`hero.see(dir)`). No map access. |
| Directions | Cardinal strings: `'north' | 'south' | 'east' | 'west'`. |
| Teaching | Three layers: briefing scroll + starter code in the editor + persistent Spellbook panel. |
| Editor | Plain textarea, line numbers, tab support. Investment goes into **friendly error translation**. |
| Persistence | localStorage: furthest level, per-level saved code, best turn counts. |
| Structure | Level select map screen; levels defined as a plain data array. |

---

## 2. The core architectural trick: simulate first, animate after

Because the game is **deterministic** and the player **doesn't step through code live**,
we do not need generators, async, or a JS interpreter.

1. Run the player's code synchronously to completion inside a `new Function(...)` sandbox.
   Every `hero.*` call mutates a simulation state and **appends a frame to a trace**.
2. If it terminates, we now hold the entire trace.
3. Animate the trace on canvas at a comfortable pace.

This buys us full real JavaScript for free — `forEach`, arrow functions, closures,
recursion, anything the player knows — with none of the transform machinery.

**Two guards, one message.** Torch runs out when the *turn count* exceeds the budget.
A separate invisible statement cap (~200k executed `hero.*` calls, plus a wall-clock
check) catches `while(true){}` loops that consume no turns at all. Both surface to the
player as the same torch-gutters-out failure, so the fiction never breaks.

Both are implemented by throwing a sentinel error from inside the hero API, caught by
the runner.

---

## 3. The Spellbook (API surface)

Commands that **cost a turn**:

```js
hero.move(dir)      // walk one tile; blocked by walls and closed doors
hero.attack(dir)    // strike an adjacent creature
hero.take()         // pick up whatever is on the hero's tile
hero.open(dir)      // open an adjacent door (needs the matching key)
hero.drink('potion')// restore hp
hero.wait()         // pass a turn
```

Commands that are **free** (no turn, no torch):

```js
hero.see(dir)  // → 'wall' | 'floor' | 'door' | 'goblin' | 'key' | 'potion' | 'exit'
hero.atExit()  // → boolean
hero.hp        // number, read-only
hero.torch     // turns remaining, read-only
hero.has(item) // → boolean, inventory check
log(value)     // prints to the adventure log — this is print debugging, taught explicitly
```

Deliberately absent: any way to read the whole map. Fog of war is what forces the
player to write loops and conditions instead of hardcoding a path they can see with
their eyes.

---

## 4. Curriculum — 14 levels, five chapters

**I. The Apprentice's Cell — a command is a sentence**
1. **First Word** — one `hero.move('east')`. The whole lesson: code is instructions you call.
2. **Four Steps** — several calls. Statements run *in order*, top to bottom.
3. **The Bent Corridor** — a path with turns. Torch budget becomes visible; a wasted move costs.

**II. The Long Halls — repetition**
4. **The Long Hall** — 12 identical moves. Introduce `for (let i = 0; i < 12; i++)`.
5. **The Locked Door** — `hero.take()` and `hero.open()`, wrapped in loops.
6. **The Unmeasured Hall** — corridor of *unknown* length. `while (hero.see('north') !== 'wall')`. First sensing.

**III. The Forking Dark — choice**
7. **The Fork** — `if / else` on `hero.see()`.
8. **The Goblin Guard** — `hero.attack()`; attack if a goblin is ahead, otherwise move.
9. **The Warren** — several goblins and dead ends; `while` and `if` combined.

**IV. What the Mind Holds — variables, arrays, objects**
10. **Count the Steps** — `let steps = 0`, increment, arithmetic, `log(steps)`.
11. **The Rune Sequence** — `const path = ['north','north','east']` and `for (const dir of path)`.
12. **The Alchemist's Ledger** — read `hero.hp`, drink a potion only when hurt. Properties and comparison.

**V. Spells of Your Own Making — functions**
13. **Inscribe a Spell** — `function clearRoom(dir) { ... }`, called three times. Naming a procedure.
14. **The Labyrinth of Sarn** — graduation. A maze that cannot be solved without a real algorithm (wall-following), using every idea so far.

---

## 5. Level data shape

Levels are data, not code, so new content is authored by adding an object:

```js
{
  id: 6,
  chapter: 'The Long Halls',
  title: 'The Unmeasured Hall',
  concept: 'while',
  torch: 30,
  par: 14,                       // turns for a "clean cast" victory rating
  map: [
    '#########',
    '#@......#',
    '#######.#',
    '#......>#',
    '#########',
  ],
  legend: { '@': 'hero', '#': 'wall', '.': 'floor', '>': 'exit',
            'g': 'goblin', 'k': 'key', 'D': 'door', '!': 'potion' },
  briefing: 'You cannot see the end of this hall...',
  teaches: 'while — repeat *as long as* something is true.',
  starter: "// Walk north until a wall stops you.\nwhile (hero.see('north') !== 'wall') {\n  \n}",
  win: (s) => s.hero.atExit,
}
```

---

## 6. Friendly errors — the highest-value component

Every thrown error is translated before it reaches the player. The raw message is
available behind a "show the arcane text" toggle, so the player eventually learns to
read real JS errors.

| Real error | What the player sees |
|---|---|
| `hero.mvoe is not a function` | ✗ Line 2 — There's no spell called **mvoe**. Did you mean **move**? |
| `Unexpected end of input` | ✗ You opened a `{` on line 3 but never closed it. Every `{` needs a `}`. |
| `x is not defined` | ✗ Line 4 — Nothing has been named **x** yet. Did you mean to write `let x = ...` first? |
| `Unexpected token }` | ✗ Line 5 — This `}` doesn't have an opening `{` to match. |
| Turn budget exceeded | ✗ Turn 40 — Your torch gutters out in the dark. Your spell never reached the stair. |
| Walked into a wall | ✗ Turn 6 — You walk face-first into cold stone. Check what's north before you move. |

Levenshtein distance against the Spellbook powers the "did you mean" suggestions.
Line numbers come from offsetting the stack trace by the wrapper preamble.

---

## 7. Screen layout

```
┌─────────────────────────────┬──────────────────────────┐
│                             │  BRIEFING (scroll)       │
│      CANVAS — dungeon       │  ─────────────────────── │
│      torchlit, fog          │  editor (textarea)       │
│      🔥 torch: 28           │  ─────────────────────── │
│                             │  [ Run ]  [ Reset ] 🔥28 │
├─────────────────────────────┤  ─────────────────────── │
│  ADVENTURE LOG              │  SPELLBOOK (collapsible) │
│  > You strike the goblin.   │  hero.move(dir)     ...  │
└─────────────────────────────┴──────────────────────────┘
```

---

## 8. Build order

1. Sim core + trace recorder + hero API + guards.
2. Canvas renderer with torch light and fog.
3. Editor, Run button, trace playback with line highlighting.
4. Error translation layer.
5. Levels 1–6, playtest the difficulty of the ramp.
6. Briefing / Spellbook / adventure log panels.
7. Map screen, localStorage, victory stats.
8. Levels 7–14.

Ship target: one `index.html`, no build step, no network requests.
