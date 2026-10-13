# CLAUDE.md

Guidance for Claude Code when working inside **taxua-2026**.

## Project overview

Single-page static website (Vietnamese) for the group trip to Tà Xùa, 2026. Same family as `../hue-2026` and `../dalat-2026`: itinerary, crew, packing list, places to take photos, food. Tone is playful, written for close friends.

Status: mock-up. `data.js` holds draft content (dates, itinerary, roles not final).

## Visual concept — "Nhật ký săn mây"

Cloud-hunting journal with two page-wide themes: pale clouds and gentle morning sunlight in light mode, deep mountain blues and icy highlights in dark mode. The gogo logo, watercolor stickers and journal typography remain the brand anchors. Fraunces is retained from the existing journal identity, not introduced as a new default. A thin brocade band (`.loom-band`) remains. Color tokens live in `style.css`: `:root` for light, `[data-theme="dark"]` for dark, with a system-preference fallback without JavaScript. `--indigo` is the single interface accent; warm sunlight is decorative.

The nav's Sáng/Tối controls set `data-theme` on the document root. The default follows `prefers-color-scheme`; a manual choice is saved under `taxua-2026-theme`. An inline script applies it before the first paint, and `initTheme()` synchronizes the controls, system changes and other tabs. Storage failures do not stop rendering or switching. Layout dials: `DESIGN_VARIANCE: 6`, `MOTION_INTENSITY: 4`, `VISUAL_DENSITY: 4`. Surface radii are 14px, nested controls 10px, theme controls and the hero CTA use pills.

The large cloud-sea edge and ridge-line section divider are SVG/CSS. Small decorative clouds and other stickers use paired day/night images in the dalat watercolor-pencil style; see `STICKER-PROMPTS.md` for the inventory and extraction instructions.

## Stack

- Plain static HTML/CSS/JS: no framework, no build step, no npm. Same as hue-2026.
- No backend yet. `backend/` is reserved in case realtime features (chat, confessions, games) come back. If so, follow hue-2026's pattern: Supabase, hand-run SQL migrations in `backend/*.sql`.

## Running

Open `index.html` directly in a browser (`file://` works), or serve the folder with any static server, e.g. `npx serve .`.

Keep it that way: do not add ES modules (`import`/`export`, `type="module"`). Browsers block module imports over `file://`.

## Deployment (Render)

Static Site, root directory `taxua-2026`, build command empty, publish directory `.`. No environment variables.

## Structure

```
taxua-2026/
├── index.html      # page shell, empty section containers (#crewGrid, #daysList, ...)
├── data.js         # global TRIP_DATA — all trip content, edit here
├── main.js         # reads TRIP_DATA, renders each section, nav toggle
├── style.css       # :root tokens + styles
├── STICKER-PROMPTS.md  # sticker list + generation prompts
├── figures/        # people/ places/ food/ decor/ (stickers), raw/ (source sticker sheets, not used by the page)
├── backend/        # reserved, empty
└── data/           # source spreadsheets/notes the content is transcribed from; not read at runtime
```

## Conventions

- Content changes go in `data.js` only. Rendering lives in `main.js`. This is the split from hue-2026.
- `data.js` must load before `main.js` (script tag order in `index.html`), since `main.js` reads the global `TRIP_DATA`.
- Logo source: `figures/decor/logo.png` (512px, nav + footer) and `favicon.png` (64px), cleaned from `figures/raw/Whimsical Gogo Mountain Sticker.png`. Flat cartoon style like hue-2026's logo, unlike the watercolor stickers, so it reads at favicon size.
- Stickers in `figures/decor/` use `<subject>_day.png` / `<subject>_night.png` and matching WebP copies. `mountain_sky` is the neutral name for sunrise by day and moonlit mountains by night. The original sheets remain in `figures/raw/`; the original day cutouts were renamed without changing their pixels. Logo and favicon remain shared across themes.
- `data.js` uses the daytime PNG path. `stickerImage()` renders the current theme's WebP and adds `data-sticker`; `initTheme()` swaps marked image sources in place, preserving selected itinerary tabs and expanded details. Static decorative images also carry `data-sticker`. The hero preload follows the initial theme. Night artwork uses its supplied colors, without a grayscale/recolor filter. Below-the-fold images load lazily.
- `scripts/extract_night_stickers.py` is a one-off utility requiring Pillow, NumPy and SciPy. It extracts the 11 subjects from `Watercolor Adventure Sticker Collection Night.png`, retains the white sticker borders and removes adjacent fragments using the source alpha channel. Night PNGs use a 5px margin; original day PNGs stay intact. Both WebPs are normalized to a shared canvas per subject, with equal opaque bounding-box area and proportional scaling, so theme changes keep the same apparent size without stretching or clipping. It is not a runtime or build dependency.
- Crew currently has no photos: initials render without requesting missing files. Optional `members[i].image` can point to a real photo, such as `figures/people/1.png`.
- Existing fonts are self-hosted through `fonts.css`, with OFL licenses in `figures/fonts/`. Theme/menu icons are official Tabler assets in `figures/icons/`, with their MIT license. No runtime CDN or npm dependency is needed.
