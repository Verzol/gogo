# Painted cursors

[Documentation index](../../README.md) · [Cursor behavior](../../controls.md#painted-cursors)

The current [plain arrow and hand prompt](03_simple_cursors.md) replaces the original cloud-decorated design. Both are simple continuous cursor silhouettes, without clouds, cuffs, side objects or other ornaments. Ivory paper pigment and a jade edge fit the travel journal. The [interaction-state sheet](04_interaction_states.md) adds open/closed hands, a text I-beam, hourglass, unavailable symbol and move arrows. The [resize/zoom sheet](05_resize_zoom_states.md) adds horizontal, vertical and both diagonal resize arrows plus zoom in/out. A progress pointer combines the arrow and hourglass. All 15 states use eight scenery/period palettes: 120 transparent PNGs, totaling 235,257 bytes, plus the separate diary pencil.

The three masters were generated through **9Router**, model `cx/gpt-image-2.5-sunburst`, high quality, requested transparent 1536×1024 PNG, with the diary pencil and then the plain cursor sheet as pigment/edge references. Their untouched responses, request metadata and reference hashes live in `figures/raw/cursor/revision_2/`. No runtime generation is used.

Run from `taxua-2026/`:

```sh
python3 scripts/prepare_cursor_artwork.py --preview /tmp/taxua-cursor-states.png
```

The helper verifies each master hash, extracts each cell's main alpha object and preserves the detached plus/minus within the zoom lenses, trims and downsamples without upscaling. Each transparent 32×32 PNG fits its silhouette within 28px and has a fine ivory keyline for light/dark contrast. Eight pigment maps retain the watercolor texture and distinguish sky, night, predawn, dawn, morning, noon, afternoon and evening. Runtime assets stay in `figures/decor/painted/cursor/`; The helper also generates `cursor-palettes.css`, imported by `cursor.css`, with a new cache suffix for the replacement artwork.

`data/sources/cursor-artwork.json` records generation, crops, measured hotspots, dimensions, byte sizes and SHA-256 hashes. Hotspots are synchronized with the generated CSS: arrow **2,2**, pointing hand **14,2**, progress **3,3**, zoom lens **12,12**, and **16,16** for the other interaction symbols. Hollow symbols deliberately place their hotspot in the center. The separate diary pencil is unchanged.

The contact sheet shows actual 32px artwork and 3× detail on light and dark surfaces. A second `_palettes.png` sheet shows all 120 variants at actual size. Browser screenshots omit OS cursors; the focused helper adds temporary, noninteractive artwork overlays to its hero screenshots. These previews show the PNGs and size, not a capture of the OS pointer. Physical-device OS scaling remains a separate manual check.

The [original two-shape prompt](01_cloud_cursors.md), original generated sheet and request remain archived in `figures/raw/cursor/`. `original_manifest.json` preserves the earlier derivative hashes, crop geometry and palettes. The original cloud-decorated sheet is no longer the runtime source.

## Diary pencil

The [pencil prompt](02_diary_pencil.md) adds a **plain wooden pencil with no cloud decoration**, as requested. It was generated through 9Router with `cx/gpt-image-2.5-sunburst`, high quality and transparent background, using a text-only request. The requested canvas was 1024×1024; the returned master is 1254×1254. The untouched master and request metadata are in `figures/raw/cursor/pencil/`.

```sh
python3 scripts/prepare_diary_pencil.py --preview /tmp/taxua-diary-pencil.png
```

The helper preserves the original ochre wood, indigo band and graphite pigment, removes detached alpha specks, trims and downsamples without upscaling, then adds a fine ivory keyline. The transparent 32×32 PNG is `figures/decor/painted/cursor/diary_pencil.png` (1,746 bytes). Its graphite hotspot is **2,29**; generation, crop and derivative hashes are in `data/sources/diary-pencil-artwork.json`. This pencil belongs to the diary's stable paper/fabric palette rather than changing with the surrounding scenery. Behavior and native fallbacks are described in [Shared controls](../../controls.md#painted-cloud-cursors).
