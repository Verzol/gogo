# CLAUDE.md

Guidance for Claude Code when working inside **taxua-2026**.

## Project overview

Single-page static website (Vietnamese) for the group trip to Tà Xùa, 2026. Same family as `../hue-2026` and `../dalat-2026`: itinerary, crew, packing list, places to take photos, food. Tone is playful, written for close friends.

Status: complete local implementation of the 22-25 October 2026 trip journal. The detailed live schedule and selected assets were refreshed on 14 October 2026. `data.js` retains exact/null times, optional activities and source-row references; playful crew roles remain informal. See README.md, IMPLEMENTATION.md and ASSETS.md for maintenance and verification.

## Visual concept — "Nhật ký săn mây"

The current design is an open, playful scrapbook over full-color scenic photography. It follows the user's 14 October redesign direction: no permanent foreground cloud bank or artificial mountain ridges, no broad white wash, transparent content containers, and floating Lucide icon controls inspired by Hue. Small feathered contrast gradients sit behind reading clusters without blurring the photographs.

Headings, time stamps and short annotations use the existing self-hosted Patrick Hand; body text remains Be Vietnam Pro. Fraunces is available for the standalone reading copy but is not the interactive page's display font. Use existing gogo artwork and natural photograph colors. Layout dials: DESIGN_VARIANCE 8 / MOTION_INTENSITY 5 / VISUAL_DENSITY 3.

There are no Sáng/Tối/Tự động switches, saved reading themes or system-color overrides. `scene-config.js` groups photographs into broader scenery chapters; labels and stickers still follow each itinerary period. `JourneyUI.setChapter()` synchronizes navigation contrast and scene-reactive decorations with the active itinerary period. Schedule artwork stays fixed to its own period: day headings retain daytime stickers and schedule notes use the matching Lucide period icon (including sunrise for predawn). Avoid restoring obsolete `taxua-2026-theme` behavior. Packing still uses `taxua-2026-packing`.

The continuous itinerary uses real anchors, with no hidden day panels. Desktop dates form a small rail in the outer margin; phone dates remain sticky under the topbar. Notes use accessible expanding buttons; secondary photographs use previous/next photo decks, while room photographs remain a visible collage. Essential warnings and all illustrative captions stay visible with their corresponding image.

Local GSAP / ScrollTrigger coordinates longer scenic dissolves, continuous reversible scroll reveals, smooth anchor travel and scrapbook interactions. Consecutive identical photographs hold steady; outgoing photographs remain opaque underneath incoming ones. A 0.55-second numeric scrub smooths scenery independently of native manual scrolling. Dissolves span up to 1.23 viewports, bounded by chapter spacing. Fast flings catch up directly with a single 850 ms dissolve; late decoding retains the outgoing image and uses a 600 ms catch-up. Anchor clicks travel for 0.65-1.1 seconds and dissolve directly to the destination, retaining an outgoing snapshot until its photograph decodes. User input interrupts travel immediately. Notes, decks, menu, labels, artwork and packing feedback animate briefly; interrupted gestures retarget rather than queue. Reduced motion and missing GSAP use a native-scroll fallback with discrete scenes, including the later-day predawn-to-dawn transition. Preference/breakpoint changes clean up motion and keep controls usable. Foreground reveals track stable layout positions over about 0.42 viewport of scrolling with a separate 0.18-second scrub. Photos enter from their layout side; text and whole tickets rise, with shorter vertical travel on phones. Reveals reverse on every visit and remain steady in the reading zone. Independent translate/rotate and CSS opacity factors keep note folding, photo gestures and artwork swaps separate. Keyboard focus exposes its component temporarily; blur restores the scroll state. Print shows all content. No pinning or manual scroll hijacking. Keep HTTP and direct-file use intact.

Place introductions live in `TRIP_DATA.placeGuides`, keyed by the existing 18 stop IDs, with original Vietnamese paragraphs and a reading-source link. Display headings/cues/trimmed notes use `storyTitle`, `storyCue` and `storyNote`; original activities, notes, descriptions, source rows, exact/null times and costs remain in their original fields for `itinerary.html`. The Mùa Trứ introduction appears once, at check-in. The three afternoon places have individual alternating photo/text layouts and anchors inside their shared event; do not invent individual visit times. Essential road warnings and illustrative captions remain visible. Research scope and identity caveats are documented in `data/sources/place-research.md`.

The story has about 49% more desktop and 47% more phone scroll distance at a 900px viewport. `JOURNEY_CHAPTERS` maps eight broader chapters onto the five existing photographs, independently of event phase. `sceneryChapterEnd` develops the final night into dawn within Khe Cải. Update both scenery owners through their shared `JourneyUI.sceneFor()` resolver. Preserve transparent containers; the longer introductions use a small radial contrast tint with no rectangular edge or backdrop blur. `scripts/verify_story.cjs` records content/pacing/fast-scroll review in `review/story/`.

The fund epilogue (`#fund`) follows the continuous itinerary and precedes crew. Its transparent composition uses an official Lucide piggy-bank, coin doodles, a circled 2.400.000 ₫ per-person amount and a pink MoMo invitation. Maintain text, amount and the exact destination in `TRIP_DATA.fund`; no local paid status, deadline or live balance is inferred. It shares the existing morning scene, native-scroll fallback and reversible reveal controller. `scripts/verify_fund.cjs` records the fund review in `review/fund/`. Regenerate `itinerary.html` after fund-content changes.

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
├── index.html      # page shell, empty static hero, inline scenery, section containers (#crewGrid, #daysList, ...)
├── data.js         # global TRIP_DATA — all trip content, edit here
├── assets.js       # generated classic-script image metadata
├── scene-config.js # story periods and photographic background choices
├── motion.js       # optional local GSAP / ScrollTrigger enhancement
├── main.js         # rendering, menu, packing, notes/photo decks, scenery fallback
├── style.css       # :root tokens + styles
├── STICKER-PROMPTS.md  # sticker list + generation prompts
├── figures/        # people/ places/ food/ decor/ (stickers), raw/ (source sticker sheets, not used by the page)
├── backend/        # reserved, empty
├── vendor/         # GSAP 3.15.0, ScrollTrigger and applicable license
├── review/         # screenshots and browser/performance evidence
└── data/           # source spreadsheets/notes and refreshed source records; not read at runtime
```

## Conventions

- Content changes go in `data.js` only. Rendering lives in `main.js`. This is the split from hue-2026.
- `data.js` must load before `main.js` (script tag order in `index.html`), since `main.js` reads the global `TRIP_DATA`.
- Logo source: `figures/decor/logo.png` (512px, nav + footer) and `favicon.png` (64px), cleaned from `figures/raw/Whimsical Gogo Mountain Sticker.png`. Flat cartoon style like hue-2026's logo, unlike the watercolor stickers, so it reads at favicon size.
- Stickers in `figures/decor/` use `<subject>_day.png` / `<subject>_night.png` and matching WebP copies. `mountain_sky` is the neutral name for sunrise by day and moonlit mountains by night. The original sheets remain in `figures/raw/`; the original day cutouts were renamed without changing their pixels. Logo and favicon remain shared across story periods.
- `data.js` uses the daytime PNG path. `stickerImage()` adds `data-sticker` and accepts an optional fixed phase, recorded as `data-sticker-phase`. `JourneyUI.setChapter()` swaps only artwork without a fixed phase, leaving schedule illustrations, open notes and selected photos intact. Static decorative images also carry `data-sticker`. The hero preloads B01 atmospheric photography at a viewport-appropriate size. Night artwork uses its supplied colors, without a grayscale/recolor filter. Below-the-fold images load lazily.
- `scripts/extract_night_stickers.py` is a one-off utility requiring Pillow, NumPy and SciPy. It extracts the 11 subjects from `Watercolor Adventure Sticker Collection Night.png`, retains the white sticker borders and removes adjacent fragments using the source alpha channel. Night PNGs use a 5px margin; original day PNGs stay intact. Both WebPs are normalized to a shared canvas per subject, with equal opaque bounding-box area and proportional scaling, so scene changes keep the same apparent size without stretching or clipping. It is not a runtime or build dependency.
- Crew currently has no photos: initials render without requesting missing files. Optional `members[i].image` can point to a real photo, such as `figures/people/1.png`.
- Existing fonts are self-hosted through `fonts.css`, with OFL licenses in `figures/fonts/`. Interface icons are generated from the pinned Lucide 1.23.0 bundle in `vendor/`, with its ISC license, into 22 inline SVG symbols. Run `node scripts/prepare_icons.cjs` to refresh that sprite; the full library is not loaded at runtime. Legacy Tabler assets remain unused in `figures/icons/`. No runtime CDN or npm dependency is needed.

Motion review: `node scripts/verify_motion.cjs` reuses the existing :8000 preview and sibling Playwright installation. It records desktop/phone demonstrations and behavioral evidence in `review/motion/`; no runtime dependency is added. `scripts/verify_journey.cjs` waits for transition completion before testing settled content. `node scripts/verify_reveals.cjs` verifies foreground opacity/travel at matching forward/reverse scroll positions and records slower photo, collage and long-note examples in `review/reveals/`.
