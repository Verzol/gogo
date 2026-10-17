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

The public trip also opens via `file://`, without a build, npm test suite or runtime package installation. Only the optional [private diary](diary.md) requires its configured Supabase backend and HTTP/HTTPS.

## Targeted browser checks

Run from `taxua-2026/`: `node scripts/<script below>`. Helpers default to the existing Playwright package in `../hue-2026/node_modules/playwright` and require Chromium installed for it. Override with an **absolute** `PLAYWRIGHT_PATH=/path/to/node_modules/playwright` if needed.

Most helpers expect the repository-root preview at `http://127.0.0.1:8000/taxua-2026/`. The illustrated, weather and journal-object helpers support `TRIP_PREVIEW_URL`; do not assume a global URL override. Journey/story/scenery/motion/reveals/countdown helpers accept `TRIP_REVIEW_DIR` as a complete output-directory override; weather uses `WEATHER_REVIEW_DIR`.

| Script | Use after changing | Evidence written under `review/` |
| --- | --- | --- |
| `verify_diary.cjs` | Paired spreads, password/claim UX, drafts, actual file-input normalization, publication, conflicts, recovery, expiry, 3D motion, responsive/text layout and fallbacks; mocked transport | `/tmp/taxua-diary-browser-review/`; optional `DIARY_WEBKIT=1` tests both engines |
| `verify_diary_motion.cjs` | Outgoing front/incoming reverse, screenshot-pixel orientation, incoming underlay, cover origin, dense opening/closing frames, escaped-paper and cover-face pixel regressions, atomic landing, backward scroll, phone motion, pause/logout | `/tmp/taxua-diary-motion-review/`; optional `DIARY_WEBKIT=1` |
| `verify_diary_navigation.cjs` | Visible sticker/cloth centering, bounds/fallbacks and proportional ribbon resolution at 2x density, empty paper, edge click/keyboard, scrubbable mouse drags, cancel/escape/logout, phone writing/photos, reduced/missing-motion fallbacks and Chromium touch swipe/vertical scroll | `/tmp/taxua-diary-navigation-review/`; optional `DIARY_WEBKIT=1` |
| `verify_diary_layout.cjs` | Maximum prose/title, twelve long captions, narrow/landscape/enlarged text, Vietnamese NFC/NFD, missing art/fonts/engine/CSS and mid-motion expiry | `/tmp/taxua-diary-layout-review/`; optional `DIARY_WEBKIT=1` |
| `verify_diary_backend.cjs` | Real server authentication, private reads, ownership, conflicts, private image processing/storage and quota enforcement; requires disposable accounts | `/tmp/taxua-diary-backend-review/`; read [fixture instructions](diary-backend.md#verification) first |
| `verify_weather.cjs` | Cloud opening, weather data/cache, previews, date eligibility and fallbacks | `sky-weather/` |
| `verify_mobile_ui.cjs` | Phone cloud phases, forecast readability/selection, itinerary-only dates, menu/anchors, day overview, wheel disclosure and 200% text scaling | `/tmp/taxua-mobile-ui-review/` by default; `TRIP_REVIEW_DIR` overrides |
| `verify_journey.cjs` | Schedule fidelity, photos, controls, responsive/fallback behavior | `browser-checks.json`, root screenshots/gallery |
| `verify_story.cjs` | 18 place guides, reading copy, chapter holds and pacing | `story/` |
| `verify_journal_objects.cjs` | Click/tap photo turns/decks, expanded-guide fidelity, removed bookmark UI, keyboard, print, enlarged text and direct-file use | `/tmp/taxua-photo-review/` by default; `TRIP_REVIEW_DIR` overrides |
| `verify_ui_artwork.cjs` | Preserved artwork hashes, trail index/history/focus, removed Maps signs, transparent stop menu, real photo previews, packing, enlarged text, fallbacks and print | `/tmp/taxua-ui-artwork-review/` by default; `TRIP_REVIEW_DIR` overrides |
| `verify_map.cjs` | Embedded atlas, geography uncertainty, day filtering, previews, focus/lifecycle, asset hashes, responsive text, missing library/tiles, file and print behavior | `/tmp/taxua-map-review/` by default; `TRIP_REVIEW_DIR` overrides; deliberately fails remote tiles, so inspect live tiles separately |
| `verify_map_fullscreen.cjs` | Full-viewport canvas, native/unsupported/rejected fullscreen, preserved map/selection, local search, shared panels, pointer/keyboard selection, Escape, controls/attribution geometry, rotation, enlarged text and unavailable-library fallback | `/tmp/taxua-fullscreen-review/checks/` by default; `TRIP_REVIEW_DIR` overrides; deliberately fails remote tiles |
| `verify_illustrated_scenery.cjs` | Layer decoding, worlds, phase correctness, framing and blends | `illustrated/` |
| `verify_motion.cjs` | Scene dissolves, anchor interruptions, gestures and cleanup | `motion/` |
| `verify_reveals.cjs` | Gradual forward/reverse states, collages, notes and focus | `reveals/` |
| `verify_artwork.cjs` | Fixed-period stickers/icons and rapid swaps | `reveals/artwork-checks.json` |
| `verify_countdown.cjs` | Arrival target, clock, timezones and reduced motion | `countdown/` |
| `verify_fund.cjs` | Section order, exact amount/link, focus and reveals | `fund/` |
| `verify_controls.cjs` | Direct object play, quick choices, optional editors, shared input/checkbox/slider styling, dropdown keyboard/pointer/modal behavior, responsive text and native fallbacks; includes existing ignored local demos | `/tmp/taxua-controls-review/` by default; `TRIP_REVIEW_DIR` overrides |
| `verify_scrollbar.cjs` | Painted handle drag/track/keyboard, native scroll sync, dynamic height, six worlds, date clearance, atlas/fullscreen suspension, breakpoint focus, coarse-pointer/narrow/short layouts, enlarged text, print/forced colors, missing images/script/CSS/APIs/GSAP, direct-file and interrupted anchors | `/tmp/taxua-scrollbar-review/` by default; `TRIP_REVIEW_DIR` overrides |
| `verify_games.cjs` | Six-game rules, eight-item limits (dice remain at three), grouped dice/bag histories and clearing, state, deck exhaustion, bag validation, short sticks, keyboard, exactly-once history on motion interruption, responsive/text layouts, file and missing-asset/library fallbacks | `/tmp/taxua-games-review/` by default; `TRIP_REVIEW_DIR` overrides |
| `verify_cards.cjs` | All 52 generated face mappings/decodes, accurate rank/suit/pip fallbacks, complete-deck contact sheet, keyboard, single-row responsive/text layouts, missing images and direct-file use | `/tmp/taxua-cards-review/` by default; `TRIP_REVIEW_DIR` overrides |
| `verify_game_randomness.cjs` | Unbiased sampler boundaries/retries, all member mappings, coin/dice/card rules, every short-stick position, continuous extraction frames, resize and interruption | `/tmp/taxua-game-randomness-review/` by default; `TRIP_REVIEW_DIR` overrides |
| `verify_wheel.cjs` | Member wheel, eligibility, no-repeat rounds, pointer/name/sticker agreement, result/banner portraits, celebration lifecycle, motion and missing-portrait fallbacks | `/tmp/taxua-wheel-review/` by default; `TRIP_REVIEW_DIR` overrides |

Helpers write screenshots/reports/videos into the worktree. Run sequentially when they share output folders; inspect generated diffs and retain only intended evidence. Fixed 24-event/18-guide counts, source rows, arrival target and section order are intentional fixtures; update only alongside an approved content change.

## Manual coverage

- Desktop 1440px, phone 390px, narrow 320px; include wide/short landscape when changing scenery/nav.
- No unexpected console errors, failed required images or horizontal overflow; captions and warnings stay readable.
- Scroll slowly down/up and pause halfway through a reveal. Test a fast fling, distant anchor click, interrupted travel and deep-link reload.
- Open/close notes, cycle photos rapidly, use phone menu/Escape, keyboard focus and packing persistence. Fund click checks must intercept the destination rather than submit a payment.
- Check reduced motion, missing GSAP, denied storage, direct-file viewing, print and the no-JavaScript reading copy when affected.

## Lightweight checks and reporting

Use `node --check <changed-script.js>` for edited JavaScript and `git diff --check` for whitespace. Content changes also require `node scripts/export_itinerary.cjs` and inspection of its diff.

The [16 October UI artwork review](ui-artwork.md#verified-import-and-implementation--16-october-2026) records the supplied-asset import and eight passing suites, with reports outside the checkout.

The [16 October map integration review](maps.md#verified-import-and-integration--16-october-2026) records the map and regression suites, artwork hashes and separate live-tile inspection.

The [treasure-atlas redesign review](maps.md#treasure-atlas-import-and-redesign--16-october-2026) records the six-image import, 354 map assertions, 135 journal UI checks and separate live-tile/responsive inspections. The map helper covers both map artwork manifests and graceful missing-decoration behavior.

For docs-only edits, validate local links/file references and scope; browser suites are unnecessary. Report exactly what ran. Existing galleries, accessibility/Lighthouse results and check counts are historical snapshots; their JSON timestamps define freshness. Recorded browser coverage uses Chromium emulation, not physical phones, Safari or Firefox.

The [shared-control and object-interaction review](controls.md#verified-integration--16-october-2026) records the themed inputs, progressive dropdowns and direct game-object refinements, with seven passing focused browser suites and screenshots outside the checkout.

The [17 October fullscreen review](maps.md#fullscreen-exploration--17-october-2026) records 264 exploration, 389 existing map and 96 shared-control checks, native API/fallback coverage, responsive/enlarged-text layouts and separate live-tile inspection.

The [17 October diary review](diary-review.md) records 109 Chromium/WebKit UI checks,
43 direct backend checks, live browser integration in both engines, automated
accessibility checks, eight existing regression suites and fixture cleanup.


The [diary redesign review](diary-review.md#book-redesign-verification) records
current frame/long-content and isolated live-flow evidence separately from the
first implementation's results. Both new browser helpers use local fixtures;
they never create real users or write to Supabase.
