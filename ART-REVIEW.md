# Art review — round 1

Reviewed commit: `c86516e` *feat(art): add complete Tier 1 16x16 sprite set*

**Verdict: rejected.** All 43 sprites pass every format rule in §2 and §3 — exact
16×16, binary alpha, strict palette conformance. The tileset nonetheless makes the
game unplayable, and the sprite work is genuinely good. Details below so round 2
only touches what is broken.

Regenerate the evidence yourself with `node tools/preview.mjs` and look at
`review/room.png`.

---

## ✅ What was right — do not change these

| Check | Result |
|---|---|
| All 43 Tier 1 files present, exact filenames | ✅ |
| Exactly 16×16, 8-bit RGBA, binary alpha | ✅ |
| Every colour inside Torchlight 24 | ✅ |
| `*_west_*` sprites are **exact** mirrors of `*_east_*` | ✅ verified pixel by pixel |
| North-facing sprites show no face | ✅ 0 skin pixels in `hero_walk_north_0`, 6 in `hero_walk_south_0` |
| Characters fill the tile | ✅ hero 51%, goblin 46% of tile area, both based at row 15 |
| Hero vs goblin distinguishable | ✅ blue upright vs green hunched reads instantly |
| Key vs potion distinguishable | ✅ gold key shape vs red flask |

The **characters, items, effects and UI are accepted as-is.** Do not regenerate them.

---

## ❌ What must be fixed — tiles only

### 1. Floors and walls are indistinguishable — contrast 1.35:1

The single most important visual rule in the specification (§1 rule 2). Measured:

| Tile | Mean luminance | Contrast vs `tile_wall` |
|---|---|---|
| `tile_wall` | 59.0 | — |
| `tile_floor_a` | 38.3 | **1.35:1** |
| `tile_floor_b` | 38.3 | **1.35:1** |
| `tile_floor_c` | 37.4 | **1.36:1** |
| `tile_floor_cracked` | 38.3 | **1.35:1** |

Required: **≥ 2.5:1**. In `review/room.png` the corridors vanish — the room reads as
one continuous brick surface and the player cannot see where the hero may walk.

**Root cause is perspective, not just value.** Both tiles were drawn as the *same*
side-on brick masonry. A wall is a vertical face seen from the side; a floor is the
ground seen from above. Because the motif matched too, even the pattern gave no cue.

Fix: rebuild `tile_wall` brighter (body `STONE_L` `#676078`, top-lit edge `STONE_H`
`#938ca0`, `STONE_D` mortar → luminance ≈ 101) and redraw floors as flat flagstones
from above (`STONE_D` + `SHADOW`, `STONE_M` joints → luminance ≈ 35). That yields
**2.73:1**, verified achievable within the palette.

### 2. The exit does not read as the goal

`tile_stairs_down` luminance 62.7 — *dimmer* than `tile_door_closed` (65.4) and barely
above `tile_wall_torch_0` (62.9). The goal tile of every level is currently less
eye-catching than a door. Required: **≥ 90**. Run `FLAME_M`/`FLAME_L` torchlight along
each step edge.

### 3. Floor variants are nearly identical

`tile_floor_a` and `tile_floor_cracked` differ in **10 of 256 pixels**. Variants exist
to break up repetition across a room; at 4% difference they are the same tile.
Required: **≥ 10%** difference. Give each variant a genuinely different slab layout.

---

## Why this got through

The specification stated these requirements in prose — "clearly recessed/darker",
"clearly brighter/heavier" — and the validator only checked pixel format. A generator
could satisfy every checkable rule and still produce this. That was a specification
defect, not a generation failure.

Both have been fixed: **ASSETS.md §3B** now states the thresholds numerically with
verified recipes that hit them, and `tools/validate-assets.mjs` enforces them, so
round 2 can self-check before pushing.

---

## Round 2 scope

Regenerate **six tiles only**:

`tile_wall.png` · `tile_floor_a.png` · `tile_floor_b.png` · `tile_floor_c.png` ·
`tile_floor_cracked.png` · `tile_stairs_down.png`

Then:

```bash
node tools/validate-assets.mjs   # must exit 0, now includes the §3B gates
node tools/preview.mjs           # then open review/room.png and look at it
```

Leave the other 37 sprites untouched.
