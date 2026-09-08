# Spellbound — Art Asset Specification

**Audience:** whoever (human or model) is producing the sprites.
**Status:** authoritative. If this document and any other file disagree, this wins.

Read §1 and §3 before generating anything. §3 is where AI image generators
usually fail, and failing it means the art is unusable regardless of how good it
looks.

---

## 1. What the art has to do

This is a puzzle game about programming. The player writes code like:

```js
while (hero.see('north') !== 'wall') {
  hero.move('north');
}

if (hero.see('east') === 'goblin') {
  hero.attack('east');
}
```

The player's **code branches on what they visually identify on screen**. So sprite
legibility is not decoration here — it is a gameplay requirement. Three rules
follow from that, and they outrank prettiness:

1. **Every entity must be identifiable at a glance, at 16×16.** If the player
   confuses a key with a potion, or a door with a wall, their program is wrong
   through no fault of their reasoning. Distinct silhouettes, distinct dominant
   hues.
2. **Walkable vs. blocked must be unmistakable.** Floor tiles must read as
   clearly recessed/darker, walls as clearly solid/raised. This is the single
   most important visual distinction in the game.
3. **Facing direction must be obvious.** The player's core verb is
   `hero.move('north')`. When the hero faces north, the sprite must plainly read
   as "seen from behind."

### The setting

A dark stone dungeon lit by torchlight. The engine renders a warm radial light
around the hero and leaves unexplored tiles near-black, so **sprites should be
drawn at their natural, fully-lit colours** — do not bake shadow or vignette into
the art. The engine handles lighting.

### The hero

An **apprentice wizard**, not a fighter. The defining prop is an **open spellbook
held in one hand** — in this game, code *is* magic, so the book is the character.
Blue hooded robe, young, small. Do not give them a sword; the "attack" is a
gesture from the book.

### The enemy

A **goblin**: small, green, hunched, crude weapon. Must not be mistakable for the
hero at 16px — different silhouette (hunched vs. upright) and an unmistakably
different dominant colour (green vs. blue).

---

## 2. Format

| Property | Value |
|---|---|
| Format | PNG, 8-bit RGBA (colour type 6) |
| Sprite size | **exactly 16 × 16 pixels** |
| Background | fully transparent (alpha = 0) |
| Alpha values | **only 0 or 255** — no partial transparency anywhere |
| Colours | only the palette in §4 |
| Location | `assets/sprites/<exact-filename>.png` |
| Scaling at runtime | 3×, nearest-neighbour |

One file per frame. No packed spritesheets — individual files make single-sprite
fixes cheap. The engine packs them into an atlas at build time.

---

## 3. Technical rules — read this twice

These are the requirements AI image generators most often violate. The validator
enforces all of them.

**3.1 — The file must be 16×16 pixels, not a large picture of a small sprite.**
This is the #1 failure. A 1024×1024 render of a pixel-art character is *not* a
16×16 sprite. If your pipeline generates large, you must downsample to exactly
16×16 such that every output pixel is one deliberate colour — then verify by
opening the file and confirming it is 16 pixels wide.

**3.2 — No anti-aliasing.** No soft edges, no gradients, no blur, no glow, no
drop shadows, no dithering into intermediate tones. Every pixel is one flat
palette colour. If you can see a halo of in-between colours around a shape, the
sprite is wrong.

**3.3 — Alpha is binary.** A pixel is either fully opaque or fully invisible.
Semi-transparent edge pixels are the fingerprint of a resized raster and will
fail validation.

**3.4 — Colours must match the palette exactly.** Not "close to" — the exact hex
values in §4. Snap every colour. A palette of 24 shared colours is what makes 40
independently-generated sprites look like one game instead of forty.

**3.5 — 1-pixel dark outline on all characters and items.** Use `#0b0910`
(VOID) or the darkest shade of the sprite's own ramp. Outlines are what keep
sprites readable against floor tiles. Tiles themselves are not outlined.

**3.6 — Lighting from directly above.** Highlights on top surfaces, shadow
underneath. Consistent across every sprite. Do not light from an angle.

**3.7 — Characters stand on the tile floor.** Feet/base at row 15 (the bottom
row), head no higher than row 1. Characters may be narrower than 16px but must be
horizontally centred.

**3.8 — Tiles are edge-to-edge and seamless.** Floor and wall tiles fill all
256 pixels with alpha 255 and must tile with themselves without visible seams.

---

## 3B. Measurable visual requirements — enforced by the validator

The rules in §1 used to be prose, and prose was not enough: the first round of art
satisfied every pixel-level rule in §2 and §3 perfectly and was still unplayable,
because floors and walls came out at a **1.35:1** contrast ratio and the room read
as one continuous brick surface. These thresholds now make §1 checkable.

| Requirement | Threshold | Why |
|---|---|---|
| `tile_wall` mean luminance | **≥ 85** | Walls must read as lit, raised and solid. |
| Floor tile mean luminance | **≤ 48** | Floors are background; they must never compete with entities standing on them. |
| Floor vs `tile_wall` contrast | **≥ 2.5 : 1** | The player must tell walkable from blocked instantly. Most important rule in this document. |
| `tile_stairs_down` luminance | **≥ 90** | The exit is the goal of every level; it must be the most eye-catching tile on screen. |
| Difference between floor variants | **≥ 10%** of pixels | Variants exist to break up visible repetition; near-identical variants are pointless. |

Luminance is `0.2126·R + 0.7152·G + 0.0722·B` averaged over opaque pixels;
contrast is the standard WCAG relative-luminance ratio.

### These thresholds are achievable — here are recipes that hit them

Verified against the palette, comfortably inside the limits:

- **Walls** — ~60% `STONE_L` `#676078`, ~25% `STONE_H` `#938ca0` on the top-lit edge,
  ~15% `STONE_D` `#2b2739` for mortar lines and the shaded base. → luminance ≈ 101, contrast **2.73:1**. ✅
- **Floors** — ~55% `STONE_D` `#2b2739`, ~40% `SHADOW` `#17141f`, ~5% `STONE_M` `#443f57`
  for flagstone joints. → luminance ≈ 35. ✅
- **Stairs** — ~45% `STONE_L`, ~25% `FLAME_M` `#f0a447` and ~15% `FLAME_L` `#ffd98a` catching
  the torchlight on each step edge, ~15% `STONE_D` in the shadowed drop. → luminance ≈ 127. ✅

### The underlying mistake to avoid: perspective

Floors and walls are seen from **different angles** and must be drawn that way.

- A **wall** is a vertical face seen from the **side**: brick or block courses, a bright
  top edge where light lands, shadow at the base.
- A **floor** is the ground seen from **above**: flagstones, flat, joints between slabs,
  no top-lit edge and no vertical brick coursing.

If your floor tile looks like a brick wall, it is wrong no matter how good it looks in
isolation. In the first round both used the same side-on masonry motif, so even the
*pattern* gave the player no cue about what was walkable.

---

## 4. Palette — "Torchlight 24"

Every opaque pixel must be one of these exact values.

### Neutrals — stone, shadow, outlines
| Hex | Name | Use |
|---|---|---|
| `#0b0910` | VOID | outlines, unexplored, darkest shadow |
| `#17141f` | SHADOW | deep shade, floor recesses |
| `#2b2739` | STONE_D | wall shadow side, floor base |
| `#443f57` | STONE_M | wall body, floor mid |
| `#676078` | STONE_L | wall lit face, floor highlight |
| `#938ca0` | STONE_H | top edge highlight, chips |

### Wood & leather — doors, staves, handles
| Hex | Name | Use |
|---|---|---|
| `#3a2418` | WOOD_D | door shadow, outlines on wood |
| `#6b4227` | WOOD_M | door planks, staff shaft |
| `#a86b3c` | WOOD_L | lit plank edges, leather |

### Fire & gold — torches, keys, magic
| Hex | Name | Use |
|---|---|---|
| `#c2531f` | FLAME_D | flame base |
| `#f0a447` | FLAME_M | flame body, gold key |
| `#ffd98a` | FLAME_L | flame core, gold highlight, sparkle |

### Skin
| Hex | Name | Use |
|---|---|---|
| `#b07a52` | SKIN_D | shaded face/hands |
| `#e8c39e` | SKIN_L | lit face/hands |

### Robe blue — the hero
| Hex | Name | Use |
|---|---|---|
| `#1f3f63` | ROBE_D | robe shadow |
| `#2f5d8a` | ROBE_M | robe body |
| `#4a8fc7` | ROBE_L | robe highlight, magic glow |

### Goblin green — the enemy
| Hex | Name | Use |
|---|---|---|
| `#35542a` | GOB_D | goblin shadow |
| `#4f7a3a` | GOB_M | goblin skin |
| `#7cb551` | GOB_L | goblin highlight |

### Red — potions, damage
| Hex | Name | Use |
|---|---|---|
| `#7a1f1f` | BLOOD_D | potion shadow |
| `#a32b2b` | BLOOD_M | potion body |
| `#d94f4f` | BLOOD_L | potion highlight |

### Light
| Hex | Name | Use |
|---|---|---|
| `#e8e0d0` | BONE | paper, spellbook pages, bone, teeth |

---

## 5. Sprite inventory

Filenames are the contract. Use them exactly — lowercase, underscores, `.png`.

### Tier 1 — required (43 files). The game cannot ship without these.

#### Tiles — 10 files, fully opaque, seamless

| Filename | Description |
|---|---|
| `tile_floor_a.png` | Stone flagstones seen **from above** — not brick coursing seen from the side. Mid-dark and low contrast: this is background and must never compete with the entities standing on it. **Mean luminance ≤ 48** (§3B). |
| `tile_floor_b.png` | Second flagstone variant, different slab layout and joint placement. Same value range as A, but must differ from the other variants in **at least 10% of pixels** (§3B). |
| `tile_floor_c.png` | Third flagstone variant, again a visibly different slab layout. Randomly mixed by the engine to break up repetition across a room. |
| `tile_floor_cracked.png` | Visibly damaged flagstone with a chip or fissure. Must differ from `tile_floor_a` in at least 10% of pixels — in round 1 it differed in only 10 of 256, so the accent was invisible. |
| `tile_wall.png` | Solid stone block wall, drawn as a **vertical face seen from the side**. Must read as raised and impassable: body in `STONE_L`, top-lit edge in `STONE_H`, `STONE_D` for mortar and the shaded base. **Mean luminance ≥ 85, and ≥ 2.5:1 contrast against every floor tile** (§3B). |
| `tile_wall_torch_0.png` | Wall tile with a lit wall sconce, flame frame 1. |
| `tile_wall_torch_1.png` | Same sconce, flame frame 2 — flame shape differs by 2–4 pixels only. Alternating these two must read as a flicker, not a jump. |
| `tile_door_closed.png` | Wooden door in a stone frame, shut. Visible keyhole or iron band. Must read as "a thing that opens", not as wall. |
| `tile_door_open.png` | Same door standing open — dark passage visible through the gap. Must be instantly distinguishable from closed at a glance. |
| `tile_stairs_down.png` | Descending stone stairway — the level exit, and the goal of every level. It must be the **most eye-catching tile in the game**: run `FLAME_M`/`FLAME_L` torchlight along each step edge. **Mean luminance ≥ 90** (§3B). |

#### Items — 3 files, transparent background, outlined

| Filename | Description |
|---|---|
| `item_key.png` | Gold key, `FLAME_M`/`FLAME_L`. Unmistakable key silhouette — bow, shaft, visible teeth. |
| `item_potion.png` | Round-bottomed flask of red liquid with a cork. Red body so it never reads as the gold key. |
| `item_scroll.png` | Rolled parchment, `BONE` with wood ends. Reserved for future spell pickups. |

#### Hero — 13 files, transparent, outlined

Apprentice wizard: blue hooded robe, **open spellbook in one hand**, small and
upright.

| Filename | Description |
|---|---|
| `hero_walk_south_0.png` | Facing the viewer (south = toward camera). Face visible under hood, book held forward. Neutral stance — this is also the idle frame. |
| `hero_walk_south_1.png` | Same, opposite leg forward. Differs from frame 0 by only a few pixels — legs and a 1px body bob. |
| `hero_walk_north_0.png` | Seen **from behind**: no face, back of hood, book edge visible at the side. Must be unambiguous that we are looking at their back. |
| `hero_walk_north_1.png` | Walk frame 2, from behind. |
| `hero_walk_east_0.png` | Profile facing right. Book held ahead. Clear side-on silhouette. |
| `hero_walk_east_1.png` | Walk frame 2, profile right. |
| `hero_walk_west_0.png` | Profile facing left. May be a horizontal mirror of east — still deliver the file. |
| `hero_walk_west_1.png` | Walk frame 2, profile left. |
| `hero_attack_south.png` | Casting toward viewer: book raised, free hand thrust forward, `ROBE_L`/`FLAME_L` spark at the fingertips. A clear lunge, distinct from walking. |
| `hero_attack_north.png` | Casting away from viewer. |
| `hero_attack_east.png` | Casting right. |
| `hero_attack_west.png` | Casting left. |
| `hero_hurt.png` | Recoiling, `BLOOD_M` accent. One frame, used for any facing. |

#### Goblin — 12 files, transparent, outlined

Small, green, hunched, crude weapon. Silhouette must not resemble the hero.

| Filename | Description |
|---|---|
| `goblin_walk_south_0.png` | Facing viewer. Hunched posture, pointed ears, small dark eyes, crude club or dagger. |
| `goblin_walk_south_1.png` | Walk frame 2. |
| `goblin_walk_north_0.png` | From behind — back, ear tips, weapon edge. |
| `goblin_walk_north_1.png` | Walk frame 2. |
| `goblin_walk_east_0.png` | Profile right. Hunch clearly readable in silhouette. |
| `goblin_walk_east_1.png` | Walk frame 2. |
| `goblin_walk_west_0.png` | Profile left (may mirror east). |
| `goblin_walk_west_1.png` | Walk frame 2. |
| `goblin_attack_south.png` | Weapon raised and swinging toward viewer. |
| `goblin_attack_north.png` | Attacking away from viewer. |
| `goblin_attack_east.png` | Attacking right. |
| `goblin_attack_west.png` | Attacking left. |

#### Effects — 3 files, transparent

| Filename | Description |
|---|---|
| `fx_slash_0.png` | Impact frame 1: a thin bright arc, `FLAME_L`/`BONE`. |
| `fx_slash_1.png` | Frame 2: arc at full extent, widest and brightest. |
| `fx_slash_2.png` | Frame 3: arc breaking up as it fades. Played over the struck tile. |

#### UI — 2 files, transparent

| Filename | Description |
|---|---|
| `ui_torch.png` | Small lit torch icon for the "turns remaining" HUD readout. |
| `ui_heart.png` | Heart icon for hero HP. |

---

### Tier 2 — optional polish. Only after Tier 1 passes validation.

| Filename | Description |
|---|---|
| `goblin_death_0.png` `_1` `_2` | Three-frame collapse and fade. |
| `fx_pickup_0.png` `_1` `_2` | Gold sparkle burst when an item is taken. |
| `fx_cast_0.png` `_1` `_2` | Blue magic flourish played when the player presses Run. |
| `hero_idle_south_0.png` `_1` | Gentle breathing loop for when the hero is standing still. |
| `tile_floor_moss.png` | Mossy flagstone variant (add `#35542a` GOB_D as the moss tone). |
| `tile_wall_cracked.png` | Damaged wall variant. |
| `skeleton_walk_south_0.png` … | A second monster type for later chapters — same 12-file structure as the goblin, in `BONE`/`STONE` tones. |

---

## 6. Verify before you hand it back

Two gates. Both must pass, in this order.

### 6.1 — The validator (automated, mandatory)

```bash
node tools/validate-assets.mjs
```

Zero dependencies, needs only Node. **Format checks**, per file:

- exact 16×16 dimensions
- 8-bit RGBA
- alpha strictly 0 or 255
- every opaque colour present in the Torchlight 24 palette
- opaque-everywhere for tiles, transparent background for sprites
- all Tier 1 filenames present, none misspelled

**Visual-readability checks** (§3B), across files:

- `tile_wall` mean luminance ≥ 85
- every floor tile ≤ 48, and ≥ 2.5:1 contrast against `tile_wall`
- `tile_stairs_down` ≥ 90
- floor variants differ from each other by ≥ 10% of pixels

It prints failures with offending pixel coordinates, colours and measured ratios,
and on success writes `assets/manifest.json` for the engine.

### 6.2 — The preview (visual, mandatory)

```bash
node tools/preview.mjs
```

Writes `review/contact.png` (every sprite at 6×) and `review/room.png` (an
assembled 9×7 dungeon with hero, goblin, key, door, torches and the exit).

**Open `review/room.png` and look at it.** The numeric gates in §3B are a floor,
not a ceiling — art can satisfy every one of them and still read badly once
assembled. In `review/room.png` you must be able to see, without effort:

- where the corridors are
- which tiles the hero can walk on
- the hero, at a glance, distinct from the goblin
- the exit stair, drawing the eye as the goal

If you cannot, the art is not done regardless of what the validator says.

**Iterate until both pass.** Art that fails either cannot be used by the game.

---

## 7. Definition of done

- [ ] All 43 Tier 1 files exist in `assets/sprites/` with exact filenames
- [ ] `node tools/validate-assets.mjs` exits 0 — this now includes the §3B visual gates
- [ ] `node tools/preview.mjs` regenerated, and `review/room.png` was actually **looked at**
- [ ] Scaled 3× with nearest-neighbour, hero and goblin are distinguishable instantly
- [ ] Wall tiles are obviously impassable next to floor tiles
- [ ] Hero facing north is obviously "from behind" and not confusable with south
- [ ] Key and potion cannot be mistaken for each other
- [ ] `tile_stairs_down.png` draws the eye as the goal
- [ ] Committed and pushed, with the art's origin and licence stated in the commit message
