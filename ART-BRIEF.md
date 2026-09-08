# Spellbound — Sprite Sheet Brief

**You are producing pixel art for a game. Deliver ONE PNG file.**

This document is complete and self-contained. Everything you need — the layout,
the palette, every sprite description, and the rules your output must satisfy — is
below. You do not need any other file.

---

## 1. What you are making

A single spritesheet containing **43 sprites** for a 2D top-down dungeon game,
laid out on a fixed **8 × 8 grid**. Only the first six rows carry sprites — the
last two rows are blank, so the sheet is square and straightforward to generate.

**Deliverable: one PNG. Ideal size 2048 × 2048 (256 × 256 per cell).**
Any square size works provided width and height both divide evenly by 8.
Minimum useful size is 128 × 128 (16px cells).

Each sprite is designed to be displayed at **16 × 16 pixels**. Your cells are
larger only so you have room to draw; the art is downsampled to 16 × 16 on
import. Section 5 explains what that means for your linework — it is the single
most important technical constraint in this brief.

---

## 2. The game, and why legibility beats beauty here

Spellbound is a puzzle game that teaches programming. The player controls a hero
by **writing JavaScript**, not with a keyboard or controller:

```js
while (hero.see('north') !== 'wall') {
  hero.move('north');
}
if (hero.see('east') === 'goblin') {
  hero.attack('east');
}
```

The player writes code that **branches on what they visually identify on screen**.
So legibility is a gameplay requirement, not an aesthetic preference. Three rules
outrank prettiness, and art that breaks them is unusable no matter how good it
looks:

1. **Walkable floor vs. solid wall must be unmistakable.** If the player cannot
   see where the hero may walk, they cannot write a correct program. This is the
   most important requirement in this document. Walls are **light**; floors are
   **dark**. See the measured thresholds in §8.
2. **Every entity must be identifiable at a glance at 16 × 16.** If a key can be
   mistaken for a potion, or a goblin for the hero, the player's reasoning fails
   through no fault of their own. Distinct silhouettes, distinct dominant hues.
3. **Facing direction must be obvious.** The player's core verb is
   `hero.move('north')`. A hero facing north must plainly read as seen **from
   behind** — no face visible.

### Setting and tone

A dark stone dungeon lit by torchlight. Earnest AD&D fantasy, not comedic.

**Draw everything at full, even, natural brightness.** The game engine applies its
own torchlight and shadow at runtime. Do not paint shadow, vignetting, ambient
darkening or glow into the art — it would double up and turn to mud.

### The two characters

**The hero** is an **apprentice wizard** — young, small, upright, in a blue hooded
robe. The defining prop is an **open spellbook held in one hand**: in this game
code *is* magic, so the book is the character. He has no sword; his attack is a
gesture from the book.

**The goblin** is small, green, **hunched**, with a crude club or dagger. At 16×16
it must never be confusable with the hero — opposite posture (hunched vs upright)
and an unmistakably different dominant colour (green vs blue).

---

## 3. Output format

| Property | Value |
|---|---|
| Files delivered | **exactly one PNG** |
| Grid | 8 × 8 equal square cells; sprites occupy rows 1–6 only |
| Ideal size | 2048 × 2048 (256 × 256 cells) |
| Accepted | any square size where width and height both divide evenly by 8 |
| Colour | only the 24 palette colours in §4, plus the background key colour |
| Cell order | fixed — see §7. Cells must not be reordered |

There are 64 cells and 43 sprites; **21 cells are intentionally blank** — r2c8,
r6c5–r6c8, and all of rows 7 and 8. Fill every blank cell with the background
colour and draw nothing in them.

### Background and transparency

Sprites need transparent backgrounds, but you do not have to output real alpha.

**Fill the background of every character, item, effect and UI cell with pure
magenta `#d020d0`.** It is knocked out automatically on import. Magenta appears
nowhere in the palette, so it cannot be confused with artwork. Real PNG alpha also
works if your tool supports it — either is fine, and you may use both.

**Tile cells are the exception: they must be filled edge to edge with artwork and
contain no background at all.** Tiles are ground and wall surfaces that butt up
against each other seamlessly. The ten tile cells are all of row 1, plus cells
r2c1 and r2c2.

---

## 4. Palette — "Torchlight 24"

**Use only these 24 colours.** Not "close to" — these exact values. A shared
palette is what makes 43 separately-drawn sprites look like one game. Colours are
snapped to the nearest palette entry on import, so drifting off-palette means
losing control of the result.

### Stone & shadow — walls, floors, outlines
| Hex | Name | Use |
|---|---|---|
| `#0b0910` | VOID | outlines, darkest shadow |
| `#17141f` | SHADOW | deep shade, floor recesses |
| `#2b2739` | STONE_D | floor base, wall mortar |
| `#443f57` | STONE_M | mid stone, floor joints |
| `#676078` | STONE_L | **wall body** |
| `#938ca0` | STONE_H | **wall top highlight**, chips |

### Wood & leather — doors, staves, handles
| Hex | Name | Use |
|---|---|---|
| `#3a2418` | WOOD_D | door shadow, wood outlines |
| `#6b4227` | WOOD_M | door planks, club shaft |
| `#a86b3c` | WOOD_L | lit plank edges, leather |

### Fire & gold — torches, keys, magic
| Hex | Name | Use |
|---|---|---|
| `#c2531f` | FLAME_D | flame base |
| `#f0a447` | FLAME_M | flame body, gold key |
| `#ffd98a` | FLAME_L | flame core, gold highlight, sparks |

### Skin
| Hex | Name | Use |
|---|---|---|
| `#b07a52` | SKIN_D | shaded face and hands |
| `#e8c39e` | SKIN_L | lit face and hands |

### Robe blue — the hero only
| Hex | Name | Use |
|---|---|---|
| `#1f3f63` | ROBE_D | robe shadow |
| `#2f5d8a` | ROBE_M | robe body |
| `#4a8fc7` | ROBE_L | robe highlight, magic glow |

### Goblin green — the enemy only
| Hex | Name | Use |
|---|---|---|
| `#35542a` | GOB_D | goblin shadow |
| `#4f7a3a` | GOB_M | goblin skin |
| `#7cb551` | GOB_L | goblin highlight |

### Red — potions and damage
| Hex | Name | Use |
|---|---|---|
| `#7a1f1f` | BLOOD_D | potion shadow |
| `#a32b2b` | BLOOD_M | potion body |
| `#d94f4f` | BLOOD_L | potion highlight |

### Light
| Hex | Name | Use |
|---|---|---|
| `#e8e0d0` | BONE | paper, spellbook pages, bone, teeth |

Background key colour (not part of the palette, knocked out on import): `#d020d0`.

---

## 5. The critical constraint: everything is downsampled to 16 × 16

Each cell becomes a **16 × 16 sprite**. At the ideal 256 × 256 cell size, **one
final pixel is a 16 × 16 block of your image**.

**Any feature thinner than one full block disappears.** This is measured, not
theoretical: a test wall tile drawn at 320 × 320 with 5-pixel mortar lines came
back as a *single flat colour*, because 5 pixels is a quarter of one output pixel.
Every scrap of brick detail averaged away.

Therefore, at 256 × 256 cells:

- **Every feature must be at least 16 source pixels thick.** A "1-pixel outline"
  on the final sprite means a **16-pixel-wide band** in your image.
- **Align everything to the 16-pixel grid.** Treat the cell as a 16 × 16 board of
  chunky blocks and fill whole blocks. Do not draw between them.
- **No anti-aliasing, no gradients, no blur, no soft shadows, no dithering.** Each
  16 × 16 block should be one flat colour.

The cleanest way to satisfy all of this: **draw true 16 × 16 pixel art and scale it
up by 16 with nearest-neighbour** (no smoothing). If your tool can emit true
low-resolution pixel art directly, that is the best possible input.

### Other drawing rules

- **Light comes from directly above.** Highlights on top surfaces, shade beneath.
  Consistent across every sprite. Never light from an angle.
- **Outline characters and items** with a 1-pixel dark border (`#0b0910` VOID, or
  the darkest shade of that sprite's own colour ramp). This keeps them readable
  against the floor. Tiles are not outlined.
- **Characters stand on the ground:** feet at the bottom row of the cell, head no
  higher than one row down from the top, horizontally centred. They should fill
  roughly half the cell area — not a tiny figure in a large empty square.
- **Walls are a vertical face seen from the side**; **floors are ground seen from
  above.** Do not give them the same motif. A floor that looks like a brick wall
  is wrong, and it is the mistake that sank the previous attempt: both used
  side-on brickwork, so even the pattern gave the player no cue about what was
  walkable.

---

## 6. Animation frames

Several sprites come in pairs (`_0` and `_1`) forming a two-frame walk cycle.
**Frames must differ only slightly** — legs swapped and a one-pixel body bob.
Alternating them should read as walking, not as two different characters.

Similarly, the two wall-torch frames differ only in the flame shape, by the
equivalent of two to four final pixels, so they read as a flicker.

**West-facing sprites should be exact horizontal mirrors of the east-facing ones.**
Draw east, flip it for west. (The hero's spellbook swapping hands is fine and
normal for pixel art.)

---

## 7. The grid — what goes in every cell

Read left to right, top to bottom. **Do not reorder.**

### Row 1 — tiles (fill edge to edge, no background)

| Cell | Sprite | Description |
|---|---|---|
| r1c1 | `tile_floor_a` | Stone flagstones seen **from above**. Flat ground, slab joints, no vertical brick coursing and no top-lit edge. Dark and low-contrast — this is background and must never compete with figures standing on it. Mostly `STONE_D` and `SHADOW`, with `STONE_M` joints. **Must be dark: see §8.** |
| r1c2 | `tile_floor_b` | Second flagstone variant — a visibly different slab layout and joint placement. Same darkness as r1c1. Must differ from the other floors across at least 10% of the final pixels. |
| r1c3 | `tile_floor_c` | Third flagstone variant, again a clearly different slab arrangement. The engine mixes these three at random to break up repetition. |
| r1c4 | `tile_floor_cracked` | Damaged flagstone with an obvious chip or fissure. Used as a visible accent, so make the damage plainly readable — not a couple of stray pixels. |
| r1c5 | `tile_wall` | Solid stone block wall — a **vertical face seen from the side**. Must read as raised, heavy and impassable: body in `STONE_L`, bright top edge in `STONE_H`, `STONE_D` mortar lines and shaded base. **Must be clearly lighter than every floor tile: see §8. This is the most important tile in the sheet.** |
| r1c6 | `tile_wall_torch_0` | The same wall with a lit iron sconce mounted on it, flame frame 1. Wood/iron bracket, `FLAME_D`/`FLAME_M`/`FLAME_L` flame. |
| r1c7 | `tile_wall_torch_1` | Identical wall and bracket, flame frame 2 — the flame differs by only two to four final pixels so the pair reads as a flicker. |
| r1c8 | `tile_door_closed` | A shut wooden door in a stone frame. Planks in `WOOD_M`/`WOOD_L`, visible keyhole or iron band. Must read as *a thing that opens*, clearly not a wall. |

### Row 2 — tiles, items and UI

| Cell | Sprite | Description |
|---|---|---|
| r2c1 | `tile_door_open` | The same door standing open, dark passage visible through the gap. Instantly distinguishable from r1c8 at a glance. **Fill edge to edge — this is a tile.** |
| r2c2 | `tile_stairs_down` | A stone stairway descending into the floor — the level exit. This is the **goal of every level and must be the most eye-catching tile in the game**: run `FLAME_M`/`FLAME_L` torchlight along each step edge. **Must be bright: see §8. Fill edge to edge — this is a tile.** |
| r2c3 | `item_key` | Gold key on magenta. `FLAME_M` body with `FLAME_L` highlights. Unmistakable key silhouette — round bow, shaft, visible teeth. Must never be confusable with the potion. |
| r2c4 | `item_potion` | Round-bottomed glass flask of red liquid with a cork stopper. `BLOOD_M` body, `BLOOD_L` highlight, `WOOD_M` cork. Red so it never reads as the gold key. |
| r2c5 | `item_scroll` | A rolled parchment scroll, `BONE` paper with `WOOD_M` end caps. |
| r2c6 | `ui_torch` | A small lit torch icon for the heads-up display — wooden shaft, bright flame. Read at a glance as an icon. |
| r2c7 | `ui_heart` | A classic pixel heart in `BLOOD_M`/`BLOOD_L` with a `BONE` glint, for the hero's health. |
| r2c8 | *(blank)* | Leave as background. |

### Row 3 — hero walk cycle

The apprentice wizard: blue hooded robe, open spellbook in one hand, upright.

| Cell | Sprite | Description |
|---|---|---|
| r3c1 | `hero_walk_south_0` | **Facing the viewer.** Face visible under the hood, spellbook held forward. Neutral standing pose — also used as the idle frame. |
| r3c2 | `hero_walk_south_1` | Same, opposite leg forward, body bobbed one pixel. Only the legs and height change. |
| r3c3 | `hero_walk_north_0` | **Seen from behind.** No face at all — back of the hood, robe from the rear, the book's edge just visible at one side. Must be unmistakably a back view. |
| r3c4 | `hero_walk_north_1` | Second walk frame from behind. |
| r3c5 | `hero_walk_east_0` | Profile facing **right**. Book held ahead, clear side-on silhouette. |
| r3c6 | `hero_walk_east_1` | Second walk frame, profile right. |
| r3c7 | `hero_walk_west_0` | Profile facing **left** — exact horizontal mirror of r3c5. |
| r3c8 | `hero_walk_west_1` | Exact horizontal mirror of r3c6. |

### Row 4 — hero attacks, hurt, and the strike effect

| Cell | Sprite | Description |
|---|---|---|
| r4c1 | `hero_attack_south` | Casting toward the viewer: book raised, free hand thrust forward, a `ROBE_L`/`FLAME_L` spark at the fingertips. A clear lunge, obviously not a walk frame. |
| r4c2 | `hero_attack_north` | Casting away from the viewer, seen from behind. |
| r4c3 | `hero_attack_east` | Casting to the right. |
| r4c4 | `hero_attack_west` | Casting to the left — mirror of r4c3. |
| r4c5 | `hero_hurt` | Recoiling backward, arms up, `BLOOD_M` accent marking the hit. One frame, used for every facing. |
| r4c6 | `fx_slash_0` | Impact effect frame 1: a thin bright arc in `FLAME_L`/`BONE` on magenta. Drawn over the struck tile, so mostly empty space. |
| r4c7 | `fx_slash_1` | Frame 2: the arc at full extent — widest, brightest, most of the cell's width. |
| r4c8 | `fx_slash_2` | Frame 3: the arc breaking apart into fragments as it fades. |

### Row 5 — goblin walk cycle

Small, green, hunched, crude weapon. Silhouette must not resemble the hero.

| Cell | Sprite | Description |
|---|---|---|
| r5c1 | `goblin_walk_south_0` | **Facing the viewer.** Hunched forward, pointed ears, small dark eyes, crude club or dagger in one hand. |
| r5c2 | `goblin_walk_south_1` | Second walk frame. |
| r5c3 | `goblin_walk_north_0` | **Seen from behind** — back, ear tips in silhouette, weapon edge just visible. No face. |
| r5c4 | `goblin_walk_north_1` | Second walk frame from behind. |
| r5c5 | `goblin_walk_east_0` | Profile facing **right**, hunch clearly readable in the silhouette. |
| r5c6 | `goblin_walk_east_1` | Second walk frame, profile right. |
| r5c7 | `goblin_walk_west_0` | Mirror of r5c5. |
| r5c8 | `goblin_walk_west_1` | Mirror of r5c6. |

### Row 6 — goblin attacks

| Cell | Sprite | Description |
|---|---|---|
| r6c1 | `goblin_attack_south` | Weapon raised and swinging toward the viewer. |
| r6c2 | `goblin_attack_north` | Attacking away from the viewer. |
| r6c3 | `goblin_attack_east` | Attacking to the right. |
| r6c4 | `goblin_attack_west` | Mirror of r6c3. |
| r6c5–r6c8 | *(blank)* | Leave as background. |

### Rows 7 and 8 — entirely blank

Draw nothing. These rows exist only so the sheet is square and easy to generate.
Fill all 16 cells with the background colour.

---

## 8. Measurable requirements

These are checked automatically on import and are the difference between usable
and unusable art. Luminance is `0.2126·R + 0.7152·G + 0.0722·B` averaged over the
sprite's visible pixels, on a 0–255 scale.

| Requirement | Threshold |
|---|---|
| `tile_wall` mean luminance | **≥ 85** |
| Every floor tile mean luminance | **≤ 48** |
| Floor vs `tile_wall` contrast ratio | **≥ 2.5 : 1** |
| `tile_stairs_down` mean luminance | **≥ 90** |
| Difference between floor variants | **≥ 10%** of pixels |

**These are achievable — here are mixes verified to hit them:**

- **Wall** — about 60% `STONE_L` `#676078`, 25% `STONE_H` `#938ca0` on the top-lit
  edge, 15% `STONE_D` `#2b2739` for mortar and shaded base → luminance ≈ 101,
  contrast **2.73 : 1**. ✅
- **Floors** — about 55% `STONE_D` `#2b2739`, 40% `SHADOW` `#17141f`, 5%
  `STONE_M` `#443f57` for slab joints → luminance ≈ 35. ✅
- **Stairs** — about 45% `STONE_L`, 25% `FLAME_M` `#f0a447` and 15% `FLAME_L`
  `#ffd98a` catching torchlight on the step edges, 15% `STONE_D` in the shadowed
  drop → luminance ≈ 127. ✅

The short version: **build walls out of the two lightest stone colours, floors out
of the two darkest, and light the stairs with fire colours.**

---

## 9. Before you deliver — check each of these

- [ ] Exactly **one** PNG file
- [ ] The image is square, and its size divides evenly by 8 (ideally 2048 × 2048)
- [ ] All 43 sprites present, in the exact cell order of §7, none reordered
- [ ] The blank cells — r2c8, r6c5–r6c8, and all of rows 7 and 8 — are background only
- [ ] Only the 24 palette colours of §4 appear, plus `#d020d0` background
- [ ] No anti-aliasing, gradients, blur or soft shadows anywhere
- [ ] Every feature is at least one full final pixel thick (a 16-pixel block at
      256px cells) — nothing thinner, or it vanishes
- [ ] The ten tile cells (all of row 1, plus r2c1 and r2c2) are filled edge to
      edge with **no** magenta
- [ ] Every other cell has a magenta or transparent background
- [ ] `tile_wall` is clearly **lighter** than every floor tile (§8)
- [ ] `tile_stairs_down` is the brightest, most eye-catching tile
- [ ] Hero facing north shows **no face** and cannot be mistaken for facing south
- [ ] Hero (blue, upright) and goblin (green, hunched) are distinct at a glance
- [ ] Key and potion cannot be mistaken for each other
- [ ] Walk frame pairs differ only slightly; west sprites mirror east sprites
- [ ] No shadow, vignette or glow painted into the art — the engine adds lighting
