# Illustrated journal controls

[Documentation index](README.md) · [Artwork prompts](prompts/ui_artwork/README.md) · [Photo backs](journal-objects.md)

## What changed

- The existing date rail opens an illustrated list of that day's real stops. Times, periods, unknown times and optional flags come from `TRIP_DATA.days`; links use existing event IDs. The highlighted stop means the current reading location. It does not record visits or save progress.
- Desktop uses the existing outer margin; phones and short landscape keep the four dates above an expandable stop list. Escape and the close button restore focus to the list toggle. Choosing a stop closes the list and follows its native anchor. Clicking outside dismisses it. The list scrolls within the available viewport and the rail is hidden/inert outside the itinerary. Its dark background is 50% opaque on desktop and 72% on compact screens to keep overlapping page text subdued; menu text stays fully opaque with a small contrast shadow, without backdrop blur.
- Five later scenery worlds use the supplied low-valley terrain, with a portrait composition on phones. Their original skies, celestial pieces, chapter mapping and small landmarks remain. Sunrise keeps its original layered opening; afternoon still has no sun rays. Body text finishes its reveal at 76% viewport height; photographs keep the longer 54% reveal endpoint.
- The **Mở bản đồ** signs have been removed at user request, with no replacement control yet. The twelve original `mapQuery` values and supplied sign artwork are retained for later use. The pickup warning remains visible.
- Three two-photo stacks expose a corner of the other real photograph. Selecting that native button by click, tap or keyboard brings it forward and focuses the main print. The visible counter and previous/next arrows are removed; photo position is announced only to screen readers. Selection starts on the front. The full-size photograph still flips discreetly; captions remain outside both controls.
- All seven packing items retain their original text, order, indices and storage key. Six new cutouts join the existing headlamp and backpack. Phones use two columns. Native checkboxes allow checking, reviewing and undoing without dragging or moving items. Reduced motion and the existing pause control suppress decorative feedback.

## Artwork organization

The four PNG masters are preserved byte-for-byte in [figures/raw/ui_artwork](../figures/raw/ui_artwork/):

| Master | Supplied filename |
| --- | --- |
| `packing_sheet.png` | Watercolor Outdoor Adventure Sticker Sheet.png |
| `trail_sign.png` | Rustic Blank Watercolor Arrow Sign.png |
| `quiet_terrain_wide.png` | Layered Teal Watercolor Mountain Ridge.png |
| `quiet_terrain_portrait.png` | Watercolor Mountain Valley Cutout.png |

[Import manifest](../data/sources/ui-artwork.json) records original names, SHA-256 hashes, dimensions, measured cell crops, alpha trims, palette transforms, output sizes and file paths. The sign derivative is retained but is no longer loaded by the page. Runtime WebP cutouts are under `figures/decor/painted/ui_*`; terrain is under `figures/scenery/painted/ui_quiet_terrain_*`. Night and bluehour are documented recolors of the supplied day paintings. No native image is enlarged and the original runtime art is retained.

Reproduce with Python, Pillow and NumPy:

```sh
python3 scripts/prepare_ui_artwork.py
```

The importer moves named uploads only when their canonical destination does not exist. It refuses master replacement and can regenerate derivatives from the preserved masters. Crops follow this sheet's actual gutters rather than the prompt's ideal grid.

## Owners and review

- `main.js`: stop index, current-reading highlight, previews and packing markup.
- `index.html` / `style.css`: index shell and responsive controls.
- `scenery.js` / `scenery.css`: portrait terrain selection, decoding and framing.
- `motion.js`: earlier text reveal; independent photo/deck gestures remain.
- `scripts/prepare_ui_artwork.py`: reproducible import; `scripts/verify_ui_artwork.cjs`: integrated acceptance checks.

Run the focused helper and relevant regressions from [Verification](verification.md). Evidence belongs outside the source tree. Canonical schedule data, generated photo metadata and the standalone itinerary do not need regeneration for these rendering changes.

## Verified import and implementation · 16 October 2026

The initial implementation, before the sign removal and transparent-menu revision, passed 1,216 assertions across eight Chromium suites:

| Suite | Assertions |
| --- | ---: |
| New UI artwork and integrated controls | 131 |
| Photo turns and decks | 50 |
| Story fidelity and pacing | 56 |
| Mobile UI | 108 |
| Full journey | 303 |
| Illustrated scenery | 106 |
| Reversible reveals | 379 |
| Motion and navigation | 83 |

Reports and screenshots are under `/tmp/taxua-ui-regression/`, with the new integration report in `new/checks.json` and the final photo rerun in `final-photos/journal-checks.json`. Desktop, 390px/320px phones and short landscape were covered; focused checks include 200% text, actual preview selection, native history, storage denial, missing GSAP, direct-file loading, reduced motion, pause and print. Existing suites also cover tablet and 2560px views. Screenshots were visually reviewed on desktop and phone; this is browser emulation, not physical-device or cross-browser certification.

The enlarged landscape review also found overflow in the existing fund amount and practical-cost columns. Their layout now reflows without changing the amount or copy. That initial revision allowed the added Maps signs in its length assertion. After removing them, the original 13–30% compact-story reduction check is restored; separate reading-space assertions remain.

All four raw hashes match the manifest; regenerating thirteen WebP assets and the manifest produces identical bytes. Derivatives total 1,042,920 bytes, with no upscaling. Changed JavaScript and importer syntax checks, 223 local documentation references and `git diff --check` passed. `data.js`, `assets.js` and `itinerary.html` remain unchanged.

## Follow-up · sign removal and transparent menu

Removed all runtime sign markup, styling and reveal hooks. The uploaded master, optimized derivative and original map queries remain available for a future replacement. The day menu now uses a translucent dark tint with a lighter border/shadow; labels remain fully opaque. Compact screens use a slightly stronger tint to subdue overlapping article text.

The updated UI helper passed 135 assertions and the story helper passed 56, restoring its original compact-pacing threshold. Reports are under `/tmp/taxua-menu-revision/`. The final compact tint was then reviewed on desktop and phone with actual day selection and Escape dismissal: no browser errors or horizontal overflow, and no Maps signs rendered. JavaScript syntax, 223 local documentation references and `git diff --check` passed. The earlier eight-suite totals above describe the initial import, not a fresh run for this follow-up.
