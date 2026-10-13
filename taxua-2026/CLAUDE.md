# CLAUDE.md

Guidance for Claude Code when working inside **taxua-2026**.

## Project overview

Single-page static website (Vietnamese) for the group trip to Tà Xùa, 2026. Same family as `../hue-2026` and `../dalat-2026`: itinerary, crew, packing list, places to take photos, food. Tone is playful, written for close friends.

Status: mock-up. `data.js` holds draft content (dates, itinerary, roles not final).

## Visual concept — "Nhật ký săn mây"

Cloud-hunting field journal: misty background, H'Mông indigo as the main color, sunrise peach/pink accents, a thin brocade band (`.loom-band`). Color tokens and their roles are in `style.css` `:root`. `--dawn` and `--peach` are decoration only, never text color on light backgrounds.

Clouds and the ridge-line section divider are meant to be inline SVG/CSS, not images. Stickers are PNGs in the dalat watercolor-pencil style; see `STICKER-PROMPTS.md` for the list and prompts.

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
- Crew avatars are positional: `members[i]` uses `figures/people/${i + 1}.png`. Keep the array order in sync with the file numbering.
