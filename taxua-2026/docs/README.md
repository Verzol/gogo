# Tà Xùa x gogo · Nhật ký săn mây

Vietnamese trip journal for **22–25 October 2026**: 24 schedule events, 18 researched stops, seven travelers and one symbolic fund pig. The page pairs documentary photos with six composed watercolor worlds, reversible scroll reveals and playful transparent layouts.

## Start a session

Read [AGENTS.md](../AGENTS.md), then the guide for the feature you are changing. Paths in feature tables are relative to `taxua-2026/`; maintenance commands run from `taxua-2026/` unless stated otherwise.

| Task / feature | Guide |
| --- | --- |
| Schedule, place descriptions, notes/photos, packing, destinations, food and costs | [Travel story](story.md) |
| Illustrated worlds, chapter mapping, cutouts and scenery preparation | [Scenery](scenery.md) |
| Scroll reveals, background dissolves, navigation, gestures and spacing | [Motion](motion.md) |
| Hero 7+1, crew, member wheel, arrival countdown and MoMo invitation | [Group features](group.md) |
| Logo, fonts, stickers, icon sprite and licenses | [Identity](identity.md) |
| Photo selection, conversion, captions, credits and rights | [Photo assets](assets.md) |
| Drive, Sheets, Docs, Slides, local snapshots and refresh workflow | [Sources](sources.md) |
| Preview, focused browser checks and evidence limits | [Verification](verification.md) |
| Cloud opening, ambient motion and live trip-day weather | [Sky and weather](weather.md) · [Design plan](sky-weather-plan.md) |
| Mobile cloud density, navigation, readability and responsive improvements | [Audit and plan](mobile-ui-plan.md) · [Implementation review](mobile-ui-review.md) |

## Documentation layout

- `docs/README.md`: entry point and feature index.
- `docs/*.md`: feature guides, sources, verification, architecture and recorded review.
- `docs/research/`: place research and identity caveats.
- `docs/prompts/stickers.md`: paired sticker brief; `docs/prompts/illustrated_scenery/`: large-art prompts and sheet map.
- `AGENTS.md` stays at the site root. Raw source JSON, artwork, licenses and browser evidence remain beside their owning assets/tools.

## Run and publish

Open `index.html` directly, or use **http://127.0.0.1:8000/taxua-2026/** when port 8000 serves the repository root. A server started inside this folder uses **http://127.0.0.1:8000/**. Check/reuse an existing server; if unused, from `taxua-2026/` run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Plain HTML/CSS/classic JS; no build, framework, runtime npm, CDN, backend or Google login. Artwork, fonts and libraries are local; the optional trip-day forecast fetches Open-Meteo data. Render Static Site: root `taxua-2026`, empty build command, publish directory `.`; no environment variables.

## Code map

- `data.js` = trip content; `assets.js` = generated photo metadata; `index.html` = shell/order/navigation.
- `main.js` = rendering, useful controls and native scenery fallback; `scene-config.js` = period/chapter presets.
- `weather.js` / `weather.css` = optional Open-Meteo forecast and hero sky effects.
- `scenery.js` / `scenery.css` = painted stage; `motion.js` = optional GSAP enhancement.
- `style.css`, `countdown.css`, `fonts.css` = page, clock and typography.
- `scripts/` = optional preparation/verification helpers; `data/sources/` = provenance snapshots, not runtime fetches.
- `figures/raw/` = supplied masters; other `figures/` folders = local runtime assets/retained references.
- `itinerary.html` = generated full reading copy; `review/` = historical browser evidence. `backend/` is reserved and unused.

Section order: **hero → itinerary → crew → fund → packing → destinations → food → practical → footer**.

After content edits: `node scripts/export_itinerary.cjs`. Keep the owning guide current. [Architecture](architecture.md) is the architecture pointer; [Recorded review](review.md) indexes recorded evidence, not a fresh test result.
