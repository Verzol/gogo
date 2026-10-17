# Logo, typography, stickers and icons

[Documentation index](README.md) · [Scenery artwork](scenery.md) · [Photo assets](assets.md)

## Visual identity

Open watercolor mountain scrapbook, Vietnamese copy for friends, generous visible scenery and transparent content. Keep playful handwriting, loose doodles and floating icon controls; avoid opaque card stacks and formal dashboard components.

- `style.css` owns page tokens/layout; `scenery.css` owns the illustrated stage; `fonts.css` owns local font faces.
- Patrick Hand: headings, times and short annotations. Be Vietnam Pro: body/UI. Fraunces: standalone reading copy. WOFF2 files and OFL licenses stay in `figures/fonts/`.
- The private diary uses Mali 400/500 for writing/captions and Dancing Script 400–700 for names/cover titles, with Be Vietnam Pro controls. These self-hosted WOFF2 subsets preserve Vietnamese and combining marks plus shaping tables; their OFL licenses stay with the fonts. See [book materials](diary.md#book-materials-and-motion).
- No reading-theme selector, system-color override or `taxua-2026-theme` persistence. Scene phase governs contrast/artwork; packing storage is separate.

## Shared controls

`controls.css` applies translucent jade surfaces, cream text, sunrise-peach borders and irregular corners to inputs, checks and menus. Paper contexts such as the atlas use dark jade ink and cream menus. The games use painted objects as primary controls, quick choice chips and optional configuration drawers. Keep these surfaces transparent enough to preserve the illustrated world without weakening text or focus visibility. Behavior, keyboard support and native fallbacks are documented in [Shared controls](controls.md).

## Logo

- Original user upload “Gogo Mountain Sunrise Emblem.png” is preserved as `figures/raw/gogo_mountain_sunrise.png`.
- Current derivatives: transparent `figures/decor/logo.png` and lossless `logo.webp` (512px square), `favicon.png` (64px). The old dinosaur/cloudscape logos were replaced and their sources removed.
- Trim empty margins/alpha specks below 32/255; center the complete emblem with 4% padding. Do not clip the cloud/mountain/sunrise or “gogo” lettering.
- Display sizes: nav 80px desktop/tablet, 44px phone/short landscape; footer 160px/128px. Keep brand text proportional and phone chapter/menu offsets aligned with the actual nav height.
- Both HTML pages/exporter use cache suffix `?v=sunrise-2026`; update all references together on replacement. There is no dedicated logo-generation helper.

## Paired stickers

- Eleven subjects: `cloud_1`, `cloud_2`, `dino_ridge`, `dolphin_rock`, `lone_tree`, `peach_branch`, `shan_tea`, `tao_meo`, `pork_skewer`, `black_chicken`, `mountain_sky`.
- Master cutouts: `figures/decor/<subject>_day.png` / `_night.png`; runtime uses matching normalized WebPs. Source sheets stay in `figures/raw/`.
- `data.js` uses daytime PNG paths; `stickerPath()`/`stickerImage()` choose runtime WebP variants. `data-sticker-phase` fixes schedule artwork to its own period; only unfixed artwork follows the active chapter.
- Day headings stay daytime. Schedule notes use `phaseIcon()` Lucide icons, including sunrise for predawn. Never swap morning schedule art to night because another section became active.
- Night artwork keeps supplied colors; no grayscale/CSS recoloring. Logo/favicon do not switch.
- Regeneration/style prompt: [Sticker prompts](prompts/stickers.md). The extraction helper needs Pillow, NumPy and SciPy; it keeps day PNG pixels and normalizes both WebP canvases to equal apparent size.
- New painted bus/coffee/backpack/headlamp stickers use `figures/decor/painted/` and the [illustrated pipeline](scenery.md), not the paired-sheet extractor.

## Scrollbar artwork

The Sợi mây page scrollbar uses a single watercolor cloud with eight scenery/period palettes, a solid progress line and dotted track. The ribbon remains removed. The colors follow the dominant scenery world and reading period and leave panel scrollbars quiet. The untouched Sunburst sheet, exact request and reference hashes live in `figures/raw/scrollbar/`; source/crop/derivative hashes are in `data/sources/scrollbar-artwork.json`. See [Scrollbar prompts](prompts/scrollbar/README.md) and [behavior/fallbacks](controls.md#sợi-mây--page-and-panel-scrollbars). The eight current derivatives reuse the existing paired cloud stickers; six have explicit scrollbar-only pigment palettes while the supplied masters and their normal uses stay unchanged; the earlier generated ribbon sheet remains archived. No runtime generation is required.

## Cursor artwork

The normal cursor is a slim ivory watercolor arrow with a jade edge; enabled controls use a matching plain pointing hand. Neither has clouds, cuffs or side decorations. The diary section and its dialogs use the separate ochre wooden pencil with an indigo band. Eight scenery/period pigment palettes match the cloud scrollbar. Native 32px PNG cursors retain precise hotspots and a fine ivory keyline for light/dark contrast. A matching I-beam, open/closed drag hands, hourglass, unavailable symbol, progress pointer, move/resize arrows and zoom magnifiers complete the 15-state set. Each retains its semantic native fallback; the diary keeps its pencil for idle/writing surfaces. Original Sunburst artwork, references and derivative provenance are preserved separately from the supplied stickers. See [Cursor prompts and preparation](prompts/cursor/README.md) and [behavior and fallbacks](controls.md#painted-cursors).

## Member wheel artwork

The member wheel uses separate painted rim, pointer and blank hub assets, combined with code-rendered sectors and live labels. Its original, preparation helper and provenance are documented in [Group features](group.md#vòng-quay-trên-mây); the [wheel prompt](prompts/wheel.md) preserves the generation brief. Keep the artwork's transparent interior and measured alignment; do not flatten labels into a raster image.

The [random-game artwork collection](game-artwork.md) extends these materials to coins, dice, playing cards, drawing sticks and a lottery bag. Its 9Router-generated masters, exact prompts, transparent cutouts and provenance support the integrated [random-game collection](games.md). Runtime labels remain live HTML over the painted objects.

## Lucide icons and libraries

- 56 official Lucide 1.23.0 icons are inline symbols `#trip-<name>` in `index.html`, including fullscreen map controls, the member-wheel shortcut, seven game action/state icons and the diary's refresh/close/logout controls. `icon()` and static navigation reference the same-document sprite, including under `file://`.
- Add icon names in `scripts/prepare_icons.cjs`, then run `node scripts/prepare_icons.cjs` from `taxua-2026/`. Preserve official geometry rather than hand-editing paths.
- `vendor/lucide-1.23.0.min.js` is preparation-only; visitors do not download the full bundle. Archived Tabler symbols in `figures/icons/` / `figures/scenery/` are unused.
- Local GSAP/ScrollTrigger 3.15.0 enhance motion. Versions, checksums and licenses: [Library versions and licenses](vendor.md). GSAP Standard License, Lucide ISC, legacy Tabler MIT and font OFLs must stay with the assets.

For artwork changes run `verify_artwork.cjs`; check nav/menu/brand proportions at desktop and phone widths. [Verification guide](verification.md).
