# Local preview and verification

[Documentation index](README.md) · [Recorded evidence](review.md)

## Preview

Check before starting a server:

```sh
curl -I http://127.0.0.1:8000/taxua-2026/
curl -I http://127.0.0.1:8000/
```

Reuse port 8000 if it is already serving this repo. Repository-root servers use `/taxua-2026/`; folder-root servers use `/`. If unused, run from the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

The website also opens via `file://`. There is no build, npm test suite, backend or runtime package installation.

## Targeted browser checks

Run from `taxua-2026/`: `node scripts/<script below>`. Helpers default to the existing Playwright package in `../hue-2026/node_modules/playwright` and require Chromium installed for it. Override with an **absolute** `PLAYWRIGHT_PATH=/path/to/node_modules/playwright` if needed.

Most helpers expect the repository-root preview at `http://127.0.0.1:8000/taxua-2026/`. The illustrated and weather helpers support `TRIP_PREVIEW_URL`; do not assume a global URL override. Journey/scenery/motion/reveals/countdown helpers accept `TRIP_REVIEW_DIR` as a complete output-directory override; weather uses `WEATHER_REVIEW_DIR`.

| Script | Use after changing | Evidence written under `review/` |
| --- | --- | --- |
| `verify_weather.cjs` | Cloud opening, weather data/cache, previews, date eligibility and fallbacks | `sky-weather/` |
| `verify_mobile_ui.cjs` | Phone cloud phases, forecast readability/selection, itinerary-only dates, menu/anchors, day overview, wheel disclosure and 200% text scaling | `/tmp/taxua-mobile-ui-review/` by default; `TRIP_REVIEW_DIR` overrides |
| `verify_journey.cjs` | Schedule fidelity, photos, controls, responsive/fallback behavior | `browser-checks.json`, root screenshots/gallery |
| `verify_story.cjs` | 18 place guides, reading copy, chapter holds and pacing | `story/` |
| `verify_illustrated_scenery.cjs` | Layer decoding, worlds, phase correctness, framing and blends | `illustrated/` |
| `verify_motion.cjs` | Scene dissolves, anchor interruptions, gestures and cleanup | `motion/` |
| `verify_reveals.cjs` | Gradual forward/reverse states, collages, notes and focus | `reveals/` |
| `verify_artwork.cjs` | Fixed-period stickers/icons and rapid swaps | `reveals/artwork-checks.json` |
| `verify_countdown.cjs` | Arrival target, clock, timezones and reduced motion | `countdown/` |
| `verify_fund.cjs` | Section order, exact amount/link, focus and reveals | `fund/` |
| `verify_wheel.cjs` | Member wheel, eligibility, no-repeat rounds, pointer/result agreement, celebration lifecycle, motion and fallbacks | `/tmp/taxua-wheel-review/` by default; `TRIP_REVIEW_DIR` overrides |

Helpers write screenshots/reports/videos into the worktree. Run sequentially when they share output folders; inspect generated diffs and retain only intended evidence. Fixed 24-event/18-guide counts, source rows, arrival target and section order are intentional fixtures; update only alongside an approved content change.

## Manual coverage

- Desktop 1440px, phone 390px, narrow 320px; include wide/short landscape when changing scenery/nav.
- No unexpected console errors, failed required images or horizontal overflow; captions and warnings stay readable.
- Scroll slowly down/up and pause halfway through a reveal. Test a fast fling, distant anchor click, interrupted travel and deep-link reload.
- Open/close notes, cycle photos rapidly, use phone menu/Escape, keyboard focus and packing persistence. Fund click checks must intercept the destination rather than submit a payment.
- Check reduced motion, missing GSAP, denied storage, direct-file viewing, print and the no-JavaScript reading copy when affected.

## Lightweight checks and reporting

Use `node --check <changed-script.js>` for edited JavaScript and `git diff --check` for whitespace. Content changes also require `node scripts/export_itinerary.cjs` and inspection of its diff.

For docs-only edits, validate local links/file references and scope; browser suites are unnecessary. Report exactly what ran. Existing galleries, accessibility/Lighthouse results and check counts are historical snapshots; their JSON timestamps define freshness. Recorded browser coverage uses Chromium emulation, not physical phones, Safari or Firefox.
