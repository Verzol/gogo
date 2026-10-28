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

Browser color regression checks: `node scripts/verify_browser_colors.cjs`
compares the public sections, game input, atlas and standalone itinerary;
`node scripts/verify_diary_dark_mode.cjs` compares login, reader, writing, photo
arrangement and crop controls. Both use light/dark preference and CDP automatic
darkening at 1440px and 390px, comparing actual screenshot pixels. They also
check that system high contrast remains available. Evidence defaults to
`/tmp/taxua-browser-colors/` and `/tmp/taxua-diary-dark-mode/`. Diary accounts and
transport are local fixtures; these checks make no live backend writes and do
not load extensions or test physical devices. The separate
`verify_darkreader.cjs` tests Dark Reader 4.9.133's actual dynamic-theme API;
see [its dependency and command](controls.md#browser-dark-mode).

The [complete 19 October browser run](browser-verification-2026-10-19.md)
passed **33 suites and 4,316 assertions in Chromium**, including the repaired
shared-controls and cursor suites. It also records 11 passing local Deno tests,
25 rolled-back SQL boundary checks, initial failures and successful reruns.
WebKit launch failed because Linux libraries are missing; the live mutation
harness requires a separate disposable backend and was not run against crew
accounts. The linked record lists every suite, evidence directory and limit.

Run from `taxua-2026/`: `node scripts/<script below>`. Helpers default to the existing Playwright package in `../hue-2026/node_modules/playwright` and require Chromium installed for it. Override with an **absolute** `PLAYWRIGHT_PATH=/path/to/node_modules/playwright` if needed.

Most helpers expect the repository-root preview at `http://127.0.0.1:8000/taxua-2026/`. The illustrated, weather and journal-object helpers support `TRIP_PREVIEW_URL`; do not assume a global URL override. Journey/story/scenery/motion/reveals/countdown helpers accept `TRIP_REVIEW_DIR` as a complete output-directory override; weather uses `WEATHER_REVIEW_DIR`.

| Script | Use after changing | Evidence location |
| --- | --- | --- |
| `verify_loading.cjs` | Stable background pixels during pointer movement, no movement requests/decodes, held-scene restoration, actual decoded-node reuse, bounded cache, responsive terrain requests | `/tmp/taxua-loading-review/`; `TRIP_REVIEW_DIR` overrides |
| `verify_location_scenes.cjs` | Six scenic previews, input/async races, weather ownership, motion controls, responsive portraits, enlarged text, local fonts, print/file and optional-resource fallbacks | `/tmp/taxua-location-review/`; `TRIP_REVIEW_DIR` overrides |
| `verify_playful.cjs` | Randomized coin paths/spins/timing and five pig reactions, independent feeding/drops, sun/cloud drags, moon/coffee reactions, keyboard/touch, cancellation, bounded effects, reduced motion/pause, print and optional-resource fallbacks | `/tmp/taxua-playful-review/`; `TRIP_REVIEW_DIR` overrides |
| `verify_diary.cjs` | Paired spreads, password/claim UX, drafts, actual file-input normalization, publication, conflicts, recovery, expiry, 3D motion, responsive/text layout and fallbacks; mocked transport | `/tmp/taxua-diary-browser-review/`; optional `DIARY_WEBKIT=1` tests both engines |
| `verify_diary_motion.cjs` | Outgoing front/incoming reverse, screenshot-pixel orientation, incoming underlay, cover origin, dense opening/closing frames, escaped-paper and cover-face pixel regressions, atomic landing, backward scroll, phone motion, pause/logout | `/tmp/taxua-diary-motion-review/`; optional `DIARY_WEBKIT=1` |
| `verify_diary_navigation.cjs` | Visible sticker/cloth centering, bounds/fallbacks and proportional ribbon resolution at 2x density, empty paper, edge click/keyboard, scrubbable mouse drags, cancel/escape/logout, phone writing/photos, reduced/missing-motion fallbacks and Chromium touch swipe/vertical scroll | `/tmp/taxua-diary-navigation-review/`; optional `DIARY_WEBKIT=1` |
| `verify_diary_page_editing.cjs` | Direct paper editing, picker/file drop, native ruled writing and publication, metadata notes, remove/undo, continuous mouse/touch drag and keyboard alternatives, invalid files and private surface cleanup | `/tmp/taxua-diary-page-editing/`; `DIARY_PAGE_REVIEW_DIR` overrides |
| `verify_diary_refinements.cjs` | Balanced eight-person login, bounded photo sizes, packing/reordering, crowded additions, interruptible save/upload/publish, backdrop and memory-only recovery | `/tmp/taxua-diary-refinements/`; `DIARY_REFINEMENT_REVIEW_DIR` overrides |
| `verify_diary_photos.cjs` | All photo counts 0–9 at 1440/820/390/320px, print bounds and tap targets, popup arrows/keyboard/focus/boundaries, own-page edit controls, tenth-upload rejection and session cleanup | `/tmp/taxua-diary-photos-review/`; `DIARY_PHOTOS_REVIEW_DIR` overrides; optional `DIARY_WEBKIT=1` |
| `verify_diary_photo_limit.sql` | Deployed count boundaries using temporary table/gateway copies in one database transaction; always rolls back and never uses crew credentials | SQL result; see [backend guide](diary-backend.md#photo-limit-boundary-check) |
| `verify_diary_layout.cjs` | Maximum prose/title, nine long captions, narrow/landscape/enlarged text, Vietnamese NFC/NFD, missing art/fonts/engine/CSS and mid-motion expiry | `/tmp/taxua-diary-layout-review/`; optional `DIARY_WEBKIT=1` |
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
| `verify_cursor.cjs` | Fifteen painted cursor states across eight palettes, 120 image decodes and measured hotspots, diary pencil/selection/typing, actual map/scrollbar/book/coin drags, zoom/text/disabled/busy cues, checkbox/search interaction, phone/coarse pointers, print/forced colors, missing art/styles/palettes, no-JavaScript and direct-file use; optional `CURSOR_WEBKIT=1` | `/tmp/taxua-cursor-review/`; `TRIP_REVIEW_DIR` overrides; hero previews contain temporary PNG overlays because screenshots omit OS cursors |
| `verify_games.cjs` | Six-game rules, eight-item limits (dice remain at three), grouped dice/bag histories and clearing, state, deck exhaustion, bag validation, short sticks, keyboard, exactly-once history on motion interruption, responsive/text layouts, file and missing-asset/library fallbacks | `/tmp/taxua-games-review/` by default; `TRIP_REVIEW_DIR` overrides |
| `verify_cards.cjs` | All 52 generated face mappings/decodes, accurate rank/suit/pip fallbacks, complete-deck contact sheet, keyboard, single-row responsive/text layouts, missing images and direct-file use | `/tmp/taxua-cards-review/` by default; `TRIP_REVIEW_DIR` overrides |
| `verify_dice.cjs` | Six painted cube faces, standard opposite pairs, all six visible outcomes, sampled 3D roll frames, continuous landings, held dice, reduced motion, keyboard and desktop/phone layouts | `/tmp/taxua-dice-review/` by default; `TRIP_REVIEW_DIR` overrides |
| `verify_game_randomness.cjs` | Unbiased sampler boundaries/retries, all member mappings, coin/dice/card rules, every short-stick position, continuous extraction frames, resize and interruption | `/tmp/taxua-game-randomness-review/` by default; `TRIP_REVIEW_DIR` overrides |
| `verify_wheel.cjs` | Member wheel, eligibility, no-repeat rounds, pointer/name/sticker agreement, result/banner portraits, celebration lifecycle, motion and missing-portrait fallbacks | `/tmp/taxua-wheel-review/` by default; `TRIP_REVIEW_DIR` overrides |

Helpers write screenshots/reports/videos into the worktree. Run sequentially when they share output folders; inspect generated diffs and retain only intended evidence. Fixed 24-event/18-guide counts, source rows, arrival target and section order are intentional fixtures; update only alongside an approved content change.

## Manual coverage

For the 20/10 bouquet/portrait details, run `node scripts/verify_womens_day.cjs`. Evidence defaults to `/tmp/taxua-womens-day-review/`; see [behavior and artwork](womens-day.md).

- Desktop 1440px, phone 390px, narrow 320px; include wide/short landscape when changing scenery/nav.
- No unexpected console errors, failed required images or horizontal overflow; captions and warnings stay readable.
- Scroll slowly down/up and pause halfway through a reveal. Test a fast fling, distant anchor click, interrupted travel and deep-link reload.
- Open/close notes, cycle photos rapidly, use phone menu/Escape, keyboard focus and packing persistence. Fund click checks must intercept the destination rather than submit a payment.
- Check reduced motion, missing GSAP, denied storage, direct-file viewing, print and the no-JavaScript reading copy when affected.

## Photo arrangement and framing verification, 19 October 2026

Fresh Chromium checks: **659** total: 151 photo-editor checks, 200 photo-reader
checks, 80 diary/session/draft checks, 82 navigation checks, 101 motion checks
and 45 layout/fallback checks. The editor checks cover all counts 0-9 at 1440,
390 and 320px, mouse dragging, phone taps, keyboard movement, crop boundaries,
provisional/canceled crops, exact reader/preview framing, publishing and recovery.
Fixtures use public sample photos; no live crew accounts, credentials or media.

Evidence is in `/tmp/taxua-diary-photo-editor/` and the existing suite-specific
`/tmp/taxua-diary-*-review/` folders. Four scoped axe audits of arrangement and
crop views on desktop/light and phone/dark found no violations; results are in
`/tmp/taxua-photo-axe.json`. The existing fixed paper theme is preserved in both
browser color schemes. Two Deno normalization tests and 18 rolled-back database
framing checks passed, as did the seven existing photo-limit checks. The deployed
gateway retains service-role-only execution and rejects a missing session.

WebKit was attempted but could not start because its Linux system libraries
are missing. No Safari/WebKit validation is claimed. Whole-page Lighthouse
reported performance **42**, accessibility **97**, LCP 10.6s, TBT 1170ms and CLS
0.006 (`/tmp/taxua-photo-lighthouse.json`). This public-page navigation audit does
not measure the authenticated editor; its flagged accessibility elements are
outside the diary. It does not establish the site's performance targets.

## Lightweight checks and reporting

The [full-drag release correction](diary-review.md#full-drag-release-18-october-2026)
records 82 navigation and 101 motion checks in `/tmp/taxua-diary-drag-endpoint/`.
The regression checks require immediate landing at full/overshot release in both
directions on desktop and phone writing/photo faces; eventual selection alone
would miss a replay. Cancellation and pulling back from 100% are also covered.


The [gentler paper regeneration](diary-design-refinement.md#gentler-paper-regeneration)
records 101 fresh Chromium motion checks and desktop/tablet/phone screenshots in
`/tmp/taxua-diary-soft/`. Its before/after spine probe temporarily pauses only
surrounding WAAPI animations so moving clouds cannot mimic escaped paper.


The [18 October diary visual refinement](diary-design-refinement.md) records
474 focused Chromium checks, 49 scoped design/accessibility checks, manual
paper-contrast measurements and separate whole-page Lighthouse limitations.
Its evidence is in `/tmp/taxua-diary-design/`; no crew accounts or media were used.

The [aged-paper follow-up](diary-design-refinement.md#aged-paper-follow-up)
records 195 fresh Chromium checks (101 motion, 45 layout/fallback, 49 design/axe),
manual texture-contrast sampling and preserved frame alpha/dimensions. Evidence
is in `/tmp/taxua-diary-aged/`; fixtures use public sample images and no live
accounts. Earlier refinement and single-cover results remain historical.

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


## Location explorer · 19 October 2026

The [earlier six-place opening implementation](research/location-scenes-previous-verification.md#browser-evidence--19-october-2026) passed **996 Chromium checks across eight relevant suites**: locations 90, weather 106, scenery 106, motion 85, playful objects 127, mobile 108, countdown 67 and journey 307. The final motion run passed in isolation after two fixed-delay samples failed during concurrent runs. The mobile checks now follow the approved sticker-first phone layout. The 32 generated masters and 29 derivatives passed provenance/hash/dimension checks; new cutouts have true alpha.

Evidence: `/tmp/taxua-location-review/` and `/tmp/taxua-location-regression/`. See the feature guide for initial failures, corrections, encoded/decoded budgets and scope limits. These are historical results for the previous photo-referenced art, separate from the earlier full-site 4,316-assertion snapshot. Current prompt-only artwork verification is recorded in the [owning feature guide](location-scenes.md#prompt-only-refresh--19-october-2026). No physical-device, Safari/Firefox or memory/FPS profiling is claimed.


The later **prompt-only artwork refresh** passed **92 location interaction checks** and **60 scene/viewport combinations**. The source audit verified 24 new prompt-only masters, 30 derivative hashes/dimensions, pixel-exact native backgrounds and the retained ridge export hashes. Local desktop Lighthouse: performance 56, accessibility 100, LCP 2.1s; see [current results and limits](location-scenes.md#prompt-only-refresh--19-october-2026). Evidence is under `/tmp/taxua-prompt-only-review/` and `/tmp/taxua-location-responsive/`; earlier counts above describe their own snapshots.

## Diary page editing · 28 October 2026

The [page-editing review](diary-page-editing-review.md) records 991 Chromium
assertions across eleven suites, six short-viewport checks, a 20-state scoped
accessibility audit, deployed size-metadata validation and historical public-page
Lighthouse limitations. Browser fixtures make no crew writes.
