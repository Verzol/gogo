# GEMINI.md — Development Guide for dalat-2026

Guidance file for AI Agents (Gemini / Antigravity / Claude) when working inside the **dalat-2026** repository.

---

## 1. Project Overview

A single-page website for a 10-person Đà Lạt trip (3 days), styled as a playful "internal edition" travel zine/dossier.

- **Goal**: a pocket itinerary guide before/during the trip, and a lasting scrapbook souvenir afterward.
- **Scope**: purely static. There is **no backend**. An earlier plan explored Astro + Svelte islands + Supabase (auth, realtime chat, confessions, a mini-game) — that plan was dropped. The "Hòm thư" (memories/confessions) section that references this idea in copy is currently just a static empty-state placeholder with no wiring behind it.
- **Tone**: light-hearted, playful, addressed to close friends ("tấu hài" — comic/banter register), not a polished travel-agency tone.

---

## 2. Stack

- **Vite** (`frontend/package.json` — `npm run dev` / `build` / `preview`), plain HTML/CSS/JS. No framework, no build-time templating.
- **Leaflet.js** (via CDN `<script>`/`<link>`, global `L`) for the interactive destinations map in `main.js`.
- Google Fonts loaded via `<link>` in `index.html` — no local font files.
- No client-side data layer, no auth, no database. All content is hardcoded directly in `index.html`.

---

## 3. Design Aesthetics — "Passport & Field Journal"

A scrapbook/travel-dossier concept: pastel avocado backdrop, ink-stamp red accents, stickers scattered like pasted ephemera (stamps, torn tickets, polaroids, pine cones).

### 3.1 Color tokens (`style.css` `:root`)
| Token | Hex | Role |
|---|---|---|
| `--bg` | `#dde8c4` | Pastel avocado green — page background |
| `--bg-deep` | `#cddb9f` | Deeper avocado, used in gradients/glows |
| `--cream` | `#f8f6ea` | Card/surface paper (warm, never stark white) |
| `--cream-2` | `#f1eddb` | Secondary card surface |
| `--ink` | `#2a2620` | Near-black body/heading text |
| `--ink-soft` | `#6b6250` | Secondary text |
| `--forest` | `#46592f` | Deep avocado-forest accent (eyebrows, nav, headings) |
| `--clay` | `#a3311f` | Ink-stamp red — the primary accent color |
| `--clay-soft` | `#c97b5e` | Softer red-orange, feature-card details |
| `--brass` | `#8a6a35` | Brass/kraft accent for dashed "index card" borders |
| `--line` | `#c9d9a6` | Hairline dividers |

Shadows are flat/hard-offset (`10px 12px 0 rgba(42,38,32,.14)`), not soft blurred lifts — cards read as cut paper/index cards, not SaaS panels. Border radii are small (6–10px), reinforcing the same paper-cutout feel.

### 3.2 Typography
- **Display** (`.display` — headings, hero title): **EB Garamond**. Chosen deliberately over a trendier variable serif — it reads as an actual document/passport typeface, not a design trend.
- **Utility / labels** (`.eyebrow`, `.day-when`, coordinate tags `.co`): **Space Mono**, uppercase, tight tracking — a typewriter/stamped-label voice for anything that's data or metadata rather than prose.
- **Body**: **Be Vietnam Pro** — kept for proven Vietnamese diacritic support and neutral readability.

### 3.3 Signature element — the seal
A rotating passport-stamp ring (`.seal` / `.seal-ring`, inline SVG `<textPath>` on a circle) wraps the existing stamp graphics in the hero and the "Hòm thư" section. It is the one deliberately showy element on the page; everything else stays restrained around it. Built in pure CSS/SVG — no extra image assets needed.

Implementation note: `.seal` uses `aspect-ratio:1/1` with the ring and image both `position:absolute` inside it, so they stay concentric regardless of the parent's computed height. Do not go back to margin-based centering here — that was the bug that caused the ring and stamp to visually separate.

### 3.4 Motion
- Idle sticker sway (`@keyframes stickerSway`) — every `.sticker` gently rotates/bobs on a loop, staggered via `nth-of-type` so they don't move in sync.
- Staggered hero entrance — `.hero-masthead`, `.hero-title`, `.hero-lower` each get a different `transition-delay` so the hero cascades in as one orchestrated moment rather than a scattered reveal.
- Scroll-triggered reveal (`.reveal` / `IntersectionObserver` in `main.js`) for section content below the fold.
- Active-section nav highlight — `initActiveSection()` in `main.js` toggles `.is-active` on the matching `.nav-links a` as the user scrolls.
- A faint fixed paper-grain overlay (`body::before`, SVG `feTurbulence`, `mix-blend-mode:multiply`, ~5% opacity) ties every surface back to "printed on paper."
- All animation respects `prefers-reduced-motion: reduce`.

---

## 4. Sticker system — read this before adding more

Stickers (`.sticker` class, absolutely positioned `<img>` tags) are scattered across every section reusing the 18 PNGs in `frontend/figures/`. They are **decorative and must never sit on top of readable text.**

**Critical stacking rule** (this was a real bug, hit twice during development): stickers must always render *behind* real content.
- `.wrap` (the content container in every section) is `position:relative;z-index:2`.
- `.sticker` (and `.seal`) is `position:absolute;z-index:1`.
- Because both are positioned elements in the same stacking context, `.wrap` always wins and paints on top — text stays legible even where a sticker geometrically overlaps it, since the sticker only shows through the wrap's transparent gaps.
- If a sticker is nested one level deeper than `.wrap` (e.g. inside `.packing-inner`, alongside `.pack-left`/`.checklist`), the sibling content box needs its own explicit `position:relative;z-index:2` too — the rule does not automatically cascade to nested stacking contexts.
- When adding a sticker to a **new** nested container, always double check it doesn't visually cover text before calling it done — don't assume the global rule alone protects you.

**Asset reuse**: prefer reusing an existing figure (rotated/resized differently) over generating a new image — nearly every asset already appears in more than one section. Only reach for image generation (see `STICKER-PROMPTS.md`) when no existing asset fits (e.g. the planned per-member stickers, not yet designed).

---

## 5. Coding Principles

1. **No framework migration** — stay plain Vite + HTML/CSS/JS unless the user explicitly asks to add Astro/Svelte/a backend back in.
2. **No hardcoded one-off colors** — use the `:root` custom properties in `style.css`; if a new hardcoded `rgba(...)` literal is unavoidable (e.g. matching a CSS var's value inside a `rgba()`), keep it derived from the same token so a future palette change stays a single-file edit.
3. **Vietnamese text** — always verify new/changed copy renders correctly with diacritics in both EB Garamond and Space Mono at the sizes used (Space Mono especially, since it's used at small label sizes).
4. **Responsive**: check the `@media(max-width:940px)` (nav), `@media(max-width:720px)` (stickers/hero-lower), and `@media(max-width:560px)`/`@media(max-width:520px)` (crew grid/places grid) breakpoints when changing layout — several sections hide the denser sticker set below 720px intentionally, to avoid clutter/collision risk on narrow viewports.
5. **Motion**: respect `prefers-reduced-motion` for any new animation, matching the existing pattern in `style.css`.

---

## 6. Directory Structure

```
dalat-2026/
├── frontend/              # The entire site — Vite + plain HTML/CSS/JS
│   ├── index.html         # All page content/markup (single page)
│   ├── main.js            # Mobile nav, scroll reveal, Leaflet map, active-nav highlight
│   ├── style.css          # Design tokens + all styling
│   ├── figures/           # 18 hand-drawn watercolor-pencil sticker/photo PNGs
│   ├── package.json       # vite dev/build/preview scripts
│   └── package-lock.json
├── ARCHITECTURE.md        # Confirms: static only, no backend
├── STICKER-PROMPTS.md     # Style guide + prompts for generating NEW stickers (e.g. member stickers)
└── GEMINI.md              # This file
```
