# Art review — round 1: rejected

Reviewed commit: `c86516e` *feat(art): add complete Tier 1 16x16 sprite set*

**Verdict: rejected on method, and separately on tileset readability.**
All 43 sprites must be reproduced. The rejected work is preserved under
`rejected/round1/` — do not revive or extend it.

---

## Reason 1 — the art was not drawn or generated (blocking)

The sprites were hand-written as palette-indexed character grids inside a
924-line script, `rejected/round1/generate-sprites.mjs`:

```
SPRITES['tile_wall'] = `
4444444444444444
3333333333333333
32222223S3222223
...
```

The script rendered those grids to PNG, so the output files were technically
valid and passed every format check in §2 and §3. But encoding pixels as text in
source code is not art production, and it is explicitly not what this project
wants. See **ASSETS.md §2B** for the required method and the tool options.

This alone requires all 43 sprites to be redone, including the ones whose
*execution* was fine.

## Reason 2 — the tileset was unreadable (would have blocked anyway)

Independently of method, the tiles failed the core visual requirement.

| Tile | Mean luminance | Contrast vs `tile_wall` | Required |
|---|---|---|---|
| `tile_wall` | 59.0 | — | ≥ 85 |
| `tile_floor_a` | 38.3 | **1.35:1** | ≥ 2.5:1 |
| `tile_floor_b` | 38.3 | **1.35:1** | ≥ 2.5:1 |
| `tile_floor_c` | 37.4 | **1.36:1** | ≥ 2.5:1 |
| `tile_floor_cracked` | 38.3 | **1.35:1** | ≥ 2.5:1 |

In an assembled room the corridors vanished — floors and walls read as one
continuous brick surface, so the player could not see where the hero may walk.
Two further failures: `tile_stairs_down` (62.7) was *dimmer* than
`tile_door_closed` (65.4), so the goal tile of every level did not draw the eye;
and `tile_floor_a` and `tile_floor_cracked` differed in **10 of 256 pixels**,
making the variant pointless.

**Root cause was perspective as much as value.** Floors and walls used the same
side-on brick masonry motif. A wall is a vertical face seen from the side; a
floor is ground seen from above. With the motif matched too, even the pattern
gave the player no cue.

---

## What round 1 did get right — worth reproducing

These are the qualities to preserve when the art is redone properly:

| Property | Round 1 |
|---|---|
| `*_west_*` an exact mirror of `*_east_*` | ✅ verified pixel by pixel |
| North-facing sprites show no face | ✅ 0 skin pixels facing north, 6 facing south |
| Characters fill and sit on the tile | ✅ hero 51%, goblin 46% of tile area, based at row 15 |
| Hero vs goblin instantly distinct | ✅ blue upright vs green hunched |
| Key vs potion instantly distinct | ✅ gold key shape vs red flask |

Look at `rejected/round1/sprites/` for reference on silhouette and posture — the
character work was sound. Reproduce those qualities; do not reproduce the method.

---

## Why round 1 got as far as it did

The specification stated the readability requirements in prose — "clearly
recessed/darker", "clearly brighter/heavier" — and said nothing at all about how
the art should be produced. The validator only checked pixel format. A model
could therefore satisfy every checkable rule and still deliver this.

That was a specification defect. Three things now close it:

- **ASSETS.md §2B** states the required production method and prohibits encoding
  pixels as text, with the pipeline and resolution guidance
- **ASSETS.md §3B** turns the readability rules into numeric thresholds, each with
  a palette recipe verified to reach it
- **`tools/validate-assets.mjs`** enforces those thresholds and exits non-zero;
  **`tools/preview.mjs`** renders a room so the result can be judged by eye

---

## Round 2 scope

Reproduce **all 43 Tier 1 sprites** per ASSETS.md §5, using a real image
generator or pixel-art editor (§2B).

```bash
# 1. put generated artwork in assets/source/, named as in ASSETS.md §5
node tools/ingest-art.mjs --autokey   # → 16x16, palette-snapped, binary alpha
node tools/validate-assets.mjs        # format + §3B readability gates; must exit 0
node tools/preview.mjs                # then open review/room.png and look at it
```

State the art's origin and licence in the commit message.
