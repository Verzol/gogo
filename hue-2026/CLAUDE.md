# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A single-page static website (Vietnamese-language) presenting the itinerary for a group trip to Huế (16–20/07). No framework, no build step, no test suite — plain HTML/CSS/JS served as static files.

## Running locally

There is no dev server or build command. Open `index.html` directly in a browser, or serve the directory with any static file server, e.g.:

```
npx serve .
```

`package.json` only declares two dependencies (`jimp`, `xlsx`) used by one-off Node scripts for image processing / spreadsheet reading — they are not part of the site runtime and there are no npm scripts defined.

## Architecture

- `index.html` — page shell/markup only. Each content section (`#crew`, `#timeline`, `#games`, `#destinations`, `#food`) has an empty container element (e.g. `#crewGrid`, `#daysList`) that is populated at runtime.
- `data.js` — defines the single global `TRIP_DATA` object (trip metadata, `members`, `days[].blocks`, `destinations`, `food`, `games`). **This is the intended file to edit when updating trip content** — it's designed so content changes don't require touching `style.css` or `index.html` (see the comment at the top of the file).
- `script.js` — on `DOMContentLoaded`, reads `TRIP_DATA` and renders each section into its container via template-literal `innerHTML` (crew cards, horizontal-scrapbook timeline, destination/food/game cards, and randomly-placed hero stickers). `data.js` must load before `script.js` (see script tag order in `index.html`).
- `style.css` — single stylesheet driven by CSS custom properties defined in `:root` (color tokens like `--ink`, `--pink`, `--avocado`; font tokens `--font-display`/`--font-body`/`--font-doodle`). Visual style is a hand-drawn "scrapbook" theme (rotated cards, paper textures, sticker images).
- `figures/` — image assets: numbered member photos (`1.png`–`10.png`, also reused as hero stickers), destination photos, logo, background textures, stickers.
- `data/` — source spreadsheets (`.xlsx`) that the trip content in `data.js` was transcribed from; not read at runtime.
- `crop.js`, `crop_hero.js`, `crop_hero_layout.js` — standalone one-off Node scripts (using `jimp`) for cropping/processing images in `figures/` during content prep. Run manually with `node <script>.js`; not wired into any build process, and paths inside them are specific to whatever image was being processed at the time (expect to edit paths before reuse).

## Content editing conventions

- Timeline days are ordered arrays under `TRIP_DATA.days`, each with a `blocks` array of `{ time, activity, note }` — `note` is optional and omitted from render if empty.
- `destinations` entries support an optional `image` field (path under `figures/`); if omitted, the UI renders a placeholder colored box instead of a photo.
- Crew member avatars are wired positionally: `data.members[i]` renders using `figures/${i + 1}.png`, so the `members` array order must stay in sync with the numbered figures.
