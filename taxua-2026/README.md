# Tà Xùa x gogo: nhật ký săn mây

A complete Vietnamese, scroll-driven journal for the 22-25 October 2026 trip. The connected schedule and asset catalog were refreshed on 14 October 2026. The 24 schedule events stay in chronological order, with photos covering 18 unique stops. The three illustrative alternatives retain their captions immediately below their photos.

## Preview

Open `index.html` directly, or use the running preview at **http://localhost:8000**. If port 8000 is already in use, reuse the existing server. Otherwise, from this directory:

```sh
python3 -m http.server 8000
```

No installation, backend, build command, runtime npm, Google login, or network connection is required for the website. Render Static Site settings remain: root `taxua-2026`, empty build command, publish directory `.`. Publishing is separate from this implementation.

## Maintain

- `data.js`: members, packing, food, practical costs, the fund invitation and every schedule event. Keep `sourceRow`, `time: null`, `optional`, and source uncertainty intact. `phase` is an editorial lighting cue, never a visit time or device-clock reading.
- `assets.js`: generated classic-script photo metadata, dimensions, crop preferences, credits, flags and captions. It is deliberately compact; edit source records and rerun the preparation helper rather than hand-editing this generated file.
- `main.js`: ordinary rendering, day anchors, responsive menu, unfolding notes, photo decks, real packing checkboxes and the motion-independent scenery fallback.
- `scene-config.js`: scheduled scene labels and photographic background choices. The three travel days each return to predawn; all five backgrounds use their full natural color, with no permanent cloud/ridge overlays.
- `motion.js`: local GSAP 3.15.0 / ScrollTrigger enhancement. A smoothed scene controller holds repeated photographs and joins different scenery with longer dissolves. Continuous reversible scroll reveals, interruptible smooth anchor travel, unfolding notes, photo decks and phone-menu gestures share one motion owner. No scroll hijacking or pinning. Breakpoint/reduced-motion contexts revert old timelines; refresh remeasures after fonts, unfolded notes, and photo changes settle.
- `style.css`: transparent scrapbook layouts, handwritten time stamps, icon navigation and explicit phone fallbacks.
- `countdown.css`: the transparent handwritten arrival clock and its phone/print layouts, kept small and separate from the main stylesheet.
- `itinerary.html`: complete no-JavaScript reading copy. Regenerate it after content changes with `node scripts/export_itinerary.cjs`. This is an optional maintenance command, never a build requirement.

Navigation uses an inline sprite of official Lucide 1.23.0 icons, matching Hue's icon family. The pinned bundle is retained only as an asset-preparation source; visitors download the 22 used symbols instead of the full library. Regenerate them with `node scripts/prepare_icons.cjs` when the icon list changes. There is no reading-theme switch or saved/system theme behavior. Text and navigation contrast follow the scenery, while stickers use the appropriate day/night artwork. The desktop day selector is a slim route rail in the outer margin; phone date links sit below the top controls and remain sticky while scrolling.

Notes unfold through accessible buttons; photo decks provide previous/next buttons and announce the current view. All exact times, uncertainty, warnings and illustrative captions remain. Packing uses `taxua-2026-packing`; unavailable, invalid, or denied storage does not stop the controls. Missing optional portraits fall back to initials.

The opening countdown reads the `arrival` event directly: currently 03:00 on 23 October 2026 in Vietnam (UTC+07:00), rather than the night-before departure. Its copy is in `TRIP_DATA.countdown`. It recomputes from the device clock every second, refreshes after returning to the page, respects reduced motion, and stops at zero with a scheduled-arrival message. The timer does not announce every tick to screen readers. Run `node scripts/verify_countdown.cjs` for its focused browser checks and desktop/phone screenshots in `review/countdown/`.

Classic scripts defer in their existing dependency order so the opening scenery and headline can paint promptly. The clock reserves space during loading to keep the hero steady.

## Sources and review

- [Asset sources, credits, licenses and conversion notes](ASSETS.md)
- [Design workflow, decisions and full acceptance review](IMPLEMENTATION.md)
- [Draft PR description / review artifact](REVIEW.md)
- [Representative browser screenshots](review/index.html)
- [Desktop/phone transition recordings and motion checks](review/motion/index.html)
- [Forward/reverse component recordings and reveal checks](review/reveals/index.html)
- [Fund epilogue screenshots and recordings](review/fund/index.html)
- `review/browser-checks.json`: reproducible behavioral evidence.
- [Researched places, pacing screenshots and checks](review/story/index.html)
- [Place research sources and identity notes](data/sources/place-research.md)
- `review/story/performance.json`: post-story desktop/mobile Lighthouse measurements and their limits.
- `review/performance.json`: preceding arrival-countdown performance baseline.

Optional verification uses an existing Playwright installation; it adds no runtime dependency:

```sh
PLAYWRIGHT_PATH=/path/to/node_modules/playwright node scripts/verify_journey.cjs
PLAYWRIGHT_PATH=/path/to/node_modules/playwright node scripts/verify_motion.cjs
PLAYWRIGHT_PATH=/path/to/node_modules/playwright node scripts/verify_reveals.cjs
PLAYWRIGHT_PATH=/path/to/node_modules/playwright node scripts/verify_artwork.cjs
PLAYWRIGHT_PATH=/path/to/node_modules/playwright node scripts/verify_fund.cjs
PLAYWRIGHT_PATH=/path/to/node_modules/playwright node scripts/verify_story.cjs
```

The default path points to the existing Playwright installation in `../hue-2026/node_modules`. The static server must be running on port 8000. The journey script visits every schedule event, checks interactions and fallbacks, and captures review screenshots. The motion script measures gradual/reversible scene blends, navigation interruptions, rapid interaction reversals, image decoding, preference cleanup and reversible supporting-section reveals, and records desktop/phone demonstrations. The reveal script samples physical scroll positions in both directions, paused partial states, stable reading zones, collages, long notes, gesture independence, focus, reload/deep-link initialization, print and reduced motion. It records slower forward/reverse demonstrations in `review/reveals/`.

The focused artwork regression verifies rapid day/night retargeting, independent scroll progress and failed-decode recovery in `review/reveals/artwork-checks.json`.

The fund epilogue follows the journey home, before crew. `TRIP_DATA.fund` holds its text, 2,400,000 VND contribution per person and the exact MoMo URL. The fund script checks responsive layouts, reversible reveals, keyboard/link behavior, reduced motion, missing GSAP, direct-file use and the no-JavaScript reading copy. Link clicks are intercepted locally; no contribution is submitted.

Place introductions live in `TRIP_DATA.placeGuides`. The interactive story uses concise `storyTitle`, `storyCue` and `storyNote` copy, while original source schedule fields remain available in the linked reading copy. Run `node scripts/export_itinerary.cjs` after changing content. Broad `sceneryChapter` keys hold backgrounds across related stops; event phases still control labels and artwork.
