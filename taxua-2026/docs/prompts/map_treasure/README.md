# Treasure-atlas artwork prompts

[Documentation index](../../README.md) · [Redesign plan](../../map-treasure-plan.md) · [Existing map artwork](../map_artwork/README.md)

All **six images are now supplied and imported**, including the optional welcome illustration. These briefs remain for reference and regeneration. Copy one complete fenced prompt per generation; every prompt is standalone, begins with “Generate” and needs no attached images.

The direction is a lightly weathered adventure-game atlas painted for the existing Tà Xùa watercolor journal. The generated images are separate UI ingredients, not a rendered website, a complete interface or a replacement geographic map. All Vietnamese text will be added in code.

| Prompt | Save as | Canvas | Intended use |
| --- | --- | --- | --- | 
| [01 Quiet parchment](01_parchment.md) | `map_treasure_parchment.png` | 1024 × 1024, opaque | Low-contrast shell/notes texture |
| [02 Rolled atlas](02_rolled_atlas.md) | `map_treasure_scroll.png` | 1536 × 1024, transparent | Map-entry illustration, about 130–170px wide |
| [03 Pocket compass](03_compass.md) | `map_treasure_compass.png` | 1024 × 1024, transparent | Labelled return-to-day control, about 48–64px |
| [04 Blank title cartouche](04_cartouche.md) | `map_treasure_cartouche.png` | 1536 × 1024, transparent | Desktop title surround, about 300–380px wide |
| [05 Ochre brush swipe](05_day_swipe.md) | `map_treasure_day_swipe.png` | 1536 × 1024, transparent | Selected-date background, about 90–120px wide |
| [06 Explorer field kit](06_field_kit.md) | `map_treasure_field_kit.png` | 1536 × 1024, transparent | Optional welcome illustration, about 180–220px wide |

Use the closest native size at the requested aspect ratio if the generator has fixed sizes. Do not upscale. The supplied PNG originals are preserved under `figures/raw/map_treasure/`; optimized WebPs are under `figures/decor/painted/`. The [import manifest](../../../data/sources/map-treasure-artwork.json) records original download names, dimensions, trims and hashes. Run `python3 scripts/prepare_map_treasure.py` from the site root with Pillow installed to reproduce them. It refuses to replace an existing master. Keep new downloads in `figures/raw/` under their original names until import.

## Check before keeping an output

- Paper: very light cream with restrained grain; body text must remain readable. Check repeated edges for obvious seams. It has no fake frame, torn outer boundary or baked-in decoration.
- Transparent pieces: actual alpha, with clear space around the full silhouette. Inspect against both dark teal and cream. A white rectangle or painted checkerboard is not transparency.
- Compass: one clear north-up needle and a simple silhouette; inspect at 48px. Cartouche: the interior remains transparent and empty. Swipe: the center is pale enough for dark text.
- All: no generated lettering, watermarks, fake screenshots, map coordinates or invented venue geometry. Avoid dark burnt parchment, glossy game-interface metal and heavy shadows; those clash with the existing illustration style.

The existing paper frame and location stickers already cover their subjects. Functional glyphs, place names, date labels, connecting lines, selected-place circles and hover/focus states will be rendered in code. No additional café, waterfall, mountain, tree, bus or marker sticker batch is needed.
