# Tà Xùa contributor instructions

Applies only to `taxua-2026/`. This site has its own architecture; sibling Hue chat/backend instructions do not apply.

## Start here

1. Read [docs/README.md](docs/README.md) for the feature map and preview commands.
2. Read only the feature guide relevant to the task, then inspect its listed code owners.
3. Check `git status --short`; preserve unrelated edits and supplied originals.

## Implementation rules

- Plain HTML/CSS/classic JavaScript; keep HTTP and `file://` working. No ES modules, framework, build step, CDN or backend requirement.
- Keep script order: `data.js` → `assets.js` → `scene-config.js` → `scenery.js` → `main.js` → GSAP → ScrollTrigger → `motion.js` → optional `weather.js`.
- Edit trip content in `data.js`; rendering/controls in `main.js`; optional story animation in `motion.js`; optional forecast state in `weather.js`. Use descriptive camelCase and two-space indentation where practical.
- Regenerate `itinerary.html` after content changes: `node scripts/export_itinerary.cjs` from `taxua-2026/`.
- `assets.js` is generated. Change its source records and use the photo pipeline in [Photo assets](docs/assets.md); preserve credits, source mappings and captions.
- Store new assets in the matching `figures/` subfolder with lowercase underscore names. Preserve raw uploads; optimize derivatives without upscaling.

## Preserve these decisions

- Open, playful Vietnamese watercolor journal: transparent content, floating Lucide controls, Patrick Hand headings and Be Vietnam Pro body text.
- Six composed illustrated worlds; photos belong inside stories. No photographic wallpapers, fixed bottom cloud bank, broad white wash, backdrop blur or Sáng/Tối/Tự động switch.
- Afternoon sun has no aura/ray ring (`rays:false`). Keep the current compact spacing and reversible scroll reveals; no scroll hijacking or pinning.
- Retain 24 source events, 18 place guides, exact/null times, optional flags, source rows, warnings and visible illustrative captions.
- Seven real travelers; hero `7 +1` refers to the fund pig. Section order is itinerary → crew → fund → packing → destinations → food → practical.
- Fund: “Thành viên thứ 8: Heo đất!”, “Heo đất cũng đi Tà Xùa.”, 2.400.000 ₫ per person. Preserve the exact MoMo URL in `TRIP_DATA.fund`.
- Countdown follows the `arrival` event in Vietnam time, currently 03:00 on 23 October 2026; departure is a different event.
- Keep reduced-motion/missing-GSAP fallbacks, native anchors, keyboard controls, print and the standalone reading copy usable.

## Validation and documentation

- Reuse port 8000 when already serving the repo; check its root before choosing the preview URL.
- Run checks appropriate to the changed feature; see [docs/verification.md](docs/verification.md). There is no npm test/build command.
- For visual/interaction changes, inspect desktop and phone rendering and browser errors. Report only checks actually run; old `review/` files are historical evidence.
- Keep all project documentation under `docs/`; this root `AGENTS.md` is the sole instruction file.
- Update the owning feature guide when behavior changes. Put external links in [docs/sources.md](docs/sources.md), per-image provenance in source JSON, and keep this entry file short.
