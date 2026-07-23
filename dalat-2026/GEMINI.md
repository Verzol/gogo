# GEMINI.md — Development Guide for dalat-2026

Guidance file for AI Agents (Gemini / Antigravity) when working inside the **dalat-2026** repository.

---

## 1. Project Overview

A 4-day Da Lat trip website displaying itinerary, places, food + interactive trip features (Chat, Confessions, Minigames) for a group of ~10 people.

- **Goal**: Serve both as a smooth, lightweight itinerary guide during the trip, and as a lasting souvenir scrapbook of photos & memories after the trip.
- **Philosophy**: Purely static by default (0 JS for content), light interactivity where needed (Svelte Islands), and built-in data freezing (Archive Mode) so it exists indefinitely without ongoing maintenance costs.

---

## 2. Architecture & Stack

```
Astro 5 (Static HTML, 0 JS) ──► Svelte Islands (Chat / Game / Confession)
                                         │
                                         ▼
                                Supabase (Auth + RLS + Storage)
                                         │
                                         ▼
                                Archive Mode (npm run archive -> static JSON)
```

- **Framework**: Astro 5 (Static page rendering).
- **Interactivity**: Svelte Islands (client-side JS is loaded only for interactive modules like chat/game/confession).
- **Backend / Database**: Supabase (Invite-code Auth via Edge Function `redeem-invite`, Postgres RLS, Realtime broadcast, Private Storage).
- **Data Source**: `src/data/lich-trinh.ts` is the Single Source of Truth for itinerary & locations.
- **Archive System**: `npm run archive` exports all chat/confession/game data to `src/data/archive.json`. When Supabase is paused or offline, the site automatically falls back to read-only souvenir mode.

---

## 3. Design Aesthetics (Hybrid Scrapbook "Da Lat Railway Station")

The project combines a **1930s Da Lat Railway Station Pine Forest Palette** with a **Scrapbook / Journal Layout** inherited from `hue-2026`:

### 3.1 Atmosphere & English Design Tokens
- **Main Background**: Pine forest gradient shifting from mountain base deep green (`--forest-deep: #0E211C`) to pine green (`--forest: #17342C`) and mountain mist (`--mountain-mist: #35564A`).
- **Scrapbook Cards**: Warm cream paper (`--paper: #F4EFDD`), deep charcoal text (`--charcoal: #0B1A16`).
- **Accents**:
  - **Brass Gold (`--brass: #D5A24A`)**: Journey structure, train tracks (`--track-line`), station numbers, timeline connectors.
  - **Terracotta Red (`--terracotta: #E07A56`)**: Alerts, reminders, important notes.
  - **Sage Green (`--sage: #7FA88B`)**: Secondary badges, detailed information.

### 3.2 UI Scrapbook Elements
- **Tilted Cards**: Train ticket cards, polaroids, and location notes slightly rotated randomly from `-1.5deg` to `1.5deg` to simulate hand-pasted scrapbook items.
- **Washi Tape**: Semi-transparent wash tape strips (`--tape-brass`, `--tape-terracotta`) placed over card corners or polaroid borders.
- **Hand-pasted Stickers**: Art Deco flat vector stickers (`HinhSticker.astro`) placed randomly or anchored to card edges to fill column space.
- **Paper Texture & Drop Shadows**: Subtle paper texture background with thin deep natural drop shadows (`--shadow-paper: 4px 6px 0 rgb(11 26 22 / 0.25)`).

### 3.3 Typography
- **Display (Headings)**: `Prata` (`--font-display` — 1930s French vintage poster Didone serif).
- **Label / Hour (Time badges & Station numbers)**: `Oswald` (`--font-label` — Narrow sans-serif, train timetable formatting).
- **Body (Content)**: `Be Vietnam Pro` (`--font-body` — Clean, excellent readability).
- **Handwritten Accent (Notes)**: `Dancing Script` / `Baloo 2` (`--font-hand` — Handwritten notes on Polaroids or Washi tape).

---

## 4. Coding Principles & Workflow

1. **Zero JS Default**: Do not add client-side JS to pages unless strictly required. All interactive components must be written as Svelte islands located in `src/islands/`.
2. **Strict Token Usage**: Always use CSS variables from `src/styles/tokens.css` with standard English naming (`--forest`, `--brass`, `--paper`, `--charcoal`...). Do not hardcode Hex color codes directly in components.
3. **Supabase RLS Security**:
   - Never grant `insert/update/delete` to the `anon` role.
   - All RLS policies must use `to authenticated` and match `auth.uid() = author_id`.
   - `role` must be stored in `app_metadata` (do not use `user_metadata`).
4. **Sticker Standards**:
   - Clean SVG stickers are drawn in `src/components/HinhSticker.astro`.
   - AI-generated sticker images must follow the guidelines in `STICKER-PROMPTS.md` (pure white `#FFFFFF` background, no gradients, exact 6 Hex colors).
5. **Responsive Standards**:
   - `< 40rem`: Mobile (Single vertical column stack).
   - `52rem`: Tablet (Time separated into left column, 2-column timetable).
   - `68rem`: Desktop (3-column timetable + margin stickers & side notes).

---

## 5. Directory Structure

```
dalat-2026/
├── frontend/           # Astro 5 web app (Static render + Svelte Islands)
│   ├── src/
│   │   ├── data/       # lich-trinh.ts (Primary content) + archive.json
│   │   ├── components/ # .astro static components (Nav, VeTau, NgayLich...)
│   │   ├── islands/    # .svelte islands (Chat, Game, Confession)
│   │   ├── layouts/    # Base.astro
│   │   ├── pages/      # index.astro, stickers.astro
│   │   ├── styles/     # tokens.css, global.css
│   │   └── lib/        # Supabase client & RPC wrappers
│   ├── figures/        # Polaroid & sticker assets
│   ├── astro.config.mjs
│   └── package.json
├── backend/            # Supabase database & backend scripts
│   ├── supabase/
│   │   ├── migrations/ # 001_, 002_ SQL migration scripts
│   │   └── functions/  # Edge Functions (e.g. redeem-invite)
│   └── scripts/
│       └── archive.js  # Script to export JSON when archiving the trip
├── package.json        # Root package.json (dev/build/archive orchestration)
├── ARCHITECTURE.md     # Detailed Supabase architecture & data flow
├── STICKER-PROMPTS.md  # AI sticker generation prompts & style rules
└── GEMINI.md           # This development guide
```
