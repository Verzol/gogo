# Tà Xùa x gogo · Nhật ký săn mây

Vietnamese trip journal for **22–25 October 2026**: 24 schedule events, 18 researched stops, seven travelers and one symbolic fund pig. The page pairs documentary photos with six composed watercolor worlds, reversible scroll reveals and playful transparent layouts.

## Start a session

Read [AGENTS.md](../AGENTS.md), then the guide for the feature you are changing. Paths in feature tables are relative to `taxua-2026/`; maintenance commands run from `taxua-2026/` unless stated otherwise.

| Task / feature | Guide |
| --- | --- |
| Schedule, place descriptions, notes/photos, packing, destinations, food and costs | [Travel story](story.md) |
| Illustrated worlds, chapter mapping, cutouts and scenery preparation | [Scenery](scenery.md) |
| Scroll reveals, background dissolves, navigation, gestures and spacing | [Motion](motion.md) |
| Tappable pig, draggable coins, sun/moon, clouds and coffee steam | [Playful painted objects](playful.md) |
| Click-to-flip story photographs | [Journal objects](journal-objects.md) |
| Trail index, photo previews, packing cutouts and quiet terrain | [Illustrated journal controls](ui-artwork.md) |
| Embedded atlas, place previews, day exploration and geographic coverage | [Maps](maps.md) · [Design plan](map-plan.md) · [Fullscreen plan](map-fullscreen-plan.md) |
| Adventure-game map menu, parchment UI and generation briefs | [Treasure-atlas plan](map-treasure-plan.md) · [Artwork prompts](prompts/map_treasure/README.md) |
| Hero 7+1, crew, member wheel, arrival countdown and MoMo invitation | [Group features](group.md) |
| Private crew diary: old-book spreads, first-claim passwords, private drafts and trip photos | [Diary](diary.md) · [Backend and operations](diary-backend.md) · [Design plan](diary-plan.md) · [Book redesign](diary-redesign.md) |
| Six random games: wheel, coin, dice, cards, sticks and lottery bag | [Games](games.md) · [Game artwork](game-artwork.md) · [Exact prompts](prompts/random_games/README.md) |
| Themed checkboxes, fields, sliders and accessible dropdown menus | [Shared controls](controls.md) |
| Painted cloud scrollbar, native panel bars and fallbacks | [Shared controls](controls.md#sợi-mây--page-and-panel-scrollbars) · [Design and artwork plan](scrollbar-plan.md) |
| Watercolor cursor states, diary pencil and scenery palettes | [Shared controls](controls.md#painted-cloud-cursors) · [Artwork prompts](prompts/cursor/README.md) |
| Logo, fonts, stickers, icon sprite and licenses | [Identity](identity.md) |
| Photo selection, conversion, captions, credits and rights | [Photo assets](assets.md) |
| Drive, Sheets, Docs, Slides, local snapshots and refresh workflow | [Sources](sources.md) |
| Preview, focused browser checks and evidence limits | [Verification](verification.md) |
| Cloud opening, ambient motion and live trip-day weather | [Sky and weather](weather.md) · [Design plan](sky-weather-plan.md) |
| Mobile cloud density, navigation, readability and responsive improvements | [Audit and plan](mobile-ui-plan.md) · [Implementation review](mobile-ui-review.md) |
| Separate interactive concepts: passport, film, cloud notebook, zine and nine more | [13-demo gallery and guide](demos.md) |

## Documentation layout

- `docs/README.md`: entry point and feature index.
- `docs/*.md`: feature guides, sources, verification, architecture and recorded review.
- `docs/research/`: place research and identity caveats.
- `docs/prompts/stickers.md`: paired sticker brief; `docs/prompts/illustrated_scenery/`: large-art prompts and sheet map.
- [UI artwork prompts](prompts/ui_artwork/README.md): missing packing objects, blank trail sign and optional quiet terrain layers.
- [Map artwork prompts](prompts/map_artwork/README.md): generation briefs and import mapping for all eleven supplied map assets.
- [Member scarf sticker prompt](prompts/people.md): photo identity, Tây Bắc fabric references and the seven imported scarf portraits.
- `AGENTS.md` stays at the site root. Raw source JSON, artwork, licenses and browser evidence remain beside their owning assets/tools.

## Run and publish

Open `index.html` directly, or use **http://127.0.0.1:8000/taxua-2026/** when port 8000 serves the repository root. A server started inside this folder uses **http://127.0.0.1:8000/**. Check/reuse an existing server; if unused, from `taxua-2026/` run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Plain HTML/CSS/classic JS; no build, framework, runtime npm, frontend CDN library dependency or Google login. The public trip needs no backend. The optional private diary uses the configured Supabase function; see [operations](diary-backend.md). Artwork, fonts and browser libraries are local; the optional forecast fetches Open-Meteo data and the embedded map requests OSM France tiles when opened. Render Static Site: root `taxua-2026`, empty build command, publish directory `.`; no frontend environment variables.

## Code map

- `data.js` = trip content; `assets.js` = generated photo metadata; `index.html` = shell/order/navigation.
- `controls.css` / `controls.js` = shared themed inputs and progressive select menus.
- `scrollbar.css` / `scrollbar.js` = native scrollbar palette and optional painted desktop page control.
- `cursor.css` / generated `cursor-palettes.css` = native painted cursor states and diary pencil, using the existing scenery/period state; no cursor script.
- `games.js` / `games.css` = random-game picker and five chance objects; the wheel stays in `main.js`.
- `diary.js` / `diary.css` = optional private book/reader/editor; `diary-motion.js` / `diary-motion.css` own decorative geometry/materials and `diary-materials.css` contains generated frame coordinates; `diary-api.js` handles authenticated requests and `diary-config.js` contains its public endpoint.
- `main.js` = rendering, useful controls and native scenery fallback; `scene-config.js` = period/chapter presets.
- `weather.js` / `weather.css` = optional Open-Meteo forecast and hero sky effects.
- `map-data.js` / `trip-map.js` / `trip-map.css` = geographic registry and optional embedded atlas/previews; local Leaflet is prepared near map entries and executes on demand.
- `scenery.js` / `scenery.css` = painted stage; `motion.js` = optional GSAP enhancement.
- `playful.js` / `playful.css` = optional painted-object reactions, bounded drags and accessible scenery controls.
- `style.css`, `countdown.css`, `fonts.css` = page, clock and typography.
- `scripts/` = optional preparation/verification helpers; `data/sources/` = provenance snapshots, not runtime fetches.
- `figures/raw/` = supplied masters; other `figures/` folders = local runtime assets/retained references.
- `itinerary.html` = generated public reading copy; `review/` = historical browser evidence. `backend/supabase/` holds the optional diary migrations/function, independently of Hue.

Section order: **hero → itinerary → crew → fund → packing → destinations → food → practical → footer**.

After content edits: `node scripts/export_itinerary.cjs`. Keep the owning guide current. [Architecture](architecture.md) is the architecture pointer; [Recorded review](review.md) indexes recorded evidence, not a fresh test result.
