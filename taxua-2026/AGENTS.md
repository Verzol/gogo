# Tà Xùa contributor instructions

Applies only to `taxua-2026/`. This site has its own architecture; sibling Hue chat/backend instructions do not apply.

## Start here

1. Read [docs/README.md](docs/README.md) for the feature map and preview commands.
2. Read only the feature guide relevant to the task, then inspect its listed code owners.
3. Check `git status --short`; preserve unrelated edits and supplied originals.

## Implementation rules

- Plain HTML/CSS/classic JavaScript; keep the public trip working over HTTP and `file://`. No frontend ES modules, framework, build step or CDN requirement. The optional private diary alone uses Supabase; read [its backend guide](docs/diary-backend.md) before changing it.
- Keep script order: `data.js` → `assets.js` → `scene-config.js` → `scenery.js` → `main.js` → optional `games.js` → optional `controls.js` → GSAP → ScrollTrigger → `motion.js` → optional `weather.js`.
- Diary scripts load independently at the end: `diary-config.js` → `diary-api.js` → optional `diary-motion.js` → `diary.js`. Keep its private schema, bucket and function isolated from Hue; never export private diary data into static HTML.
- Edit trip content in `data.js`; rendering/controls in `main.js`; optional story animation in `motion.js`; optional forecast state in `weather.js`; additional random-game controls/layout in `games.js` / `games.css`; shared input styling and progressive dropdowns in `controls.css` / `controls.js`. Use descriptive camelCase and two-space indentation where practical.
- Regenerate `itinerary.html` after content changes: `node scripts/export_itinerary.cjs` from `taxua-2026/`.
- `assets.js` is generated. Change its source records and use the photo pipeline in [Photo assets](docs/assets.md); preserve credits, source mappings and captions.
- Store new assets in the matching `figures/` subfolder with lowercase underscore names. Preserve raw uploads; optimize derivatives without upscaling. Exception: remove tamle's identity photo after validating his generated sticker, as requested; retain the generated master.

## Preserve these decisions

- Open, playful Vietnamese watercolor journal: transparent content, floating Lucide controls, Patrick Hand headings and Be Vietnam Pro body text.
- Six composed illustrated worlds; photos belong inside stories. No photographic wallpapers, fixed bottom cloud bank, broad white wash, backdrop blur or Sáng/Tối/Tự động switch.
- Afternoon sun has no aura/ray ring (`rays:false`). Keep the current compact spacing and reversible scroll reveals; no scroll hijacking or pinning.
- Retain 24 source events, 18 place guides, exact/null times, optional flags, source rows, warnings and visible illustrative captions.
- Eight real travelers; hero `8 +1` refers to the fund pig. Section order is itinerary → crew → fund → packing → destinations → food → practical.
- Fund: “Thành viên thứ 9: Heo đất!”, “Heo đất cũng đi Tà Xùa.”, 2.400.000 ₫ per person. Preserve the exact MoMo URL in `TRIP_DATA.fund`.
- Countdown follows the `arrival` event in Vietnam time, currently 03:00 on 23 October 2026; departure is a different event.
- Keep reduced-motion/missing-GSAP fallbacks, native anchors, keyboard controls, print and the standalone reading copy usable.

## Validation and documentation

- Reuse port 8000 when already serving the repo; check its root before choosing the preview URL.
- Run checks appropriate to the changed feature; see [docs/verification.md](docs/verification.md). There is no npm test/build command.
- For visual/interaction changes, inspect desktop and phone rendering and browser errors. Report only checks actually run; old `review/` files are historical evidence.
- Keep all project documentation under `docs/`; this root `AGENTS.md` is the sole instruction file.
- Update the owning feature guide when behavior changes. Put external links in [docs/sources.md](docs/sources.md), per-image provenance in source JSON, and keep this entry file short.
