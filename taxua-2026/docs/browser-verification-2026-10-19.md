# Browser verification · 19 October 2026

[Verification guide](verification.md) · [Shared controls](controls.md#browser-dark-mode)

Fresh complete browser run: **33 suites, 4,316 assertions passed in Chromium**.
This includes all browser verification scripts currently in `scripts/`, including
local demos, the photo editor, native dark preference, Chromium automatic
recoloring and the newly added Dark Reader engine test. Initial failures and
rerun evidence remain recorded rather than being counted as extra passing checks.

## Scope and evidence

HTTP preview: `http://127.0.0.1:8000/taxua-2026/`, plus the suites' direct-file,
print, reduced-motion, forced-color, missing-library/artwork and enlarged-text
cases. Responsive cases include desktop, tablet, phone, narrow and landscape
where each suite defines them. Screenshots were reviewed for the corrected
diary and Dark Reader rendering. These are browser emulations, not physical
phone tests. Map tile/weather mocks used by individual helpers do not establish
live provider availability. No production crew accounts or photos were used.

Logs, screenshots and JSON results: `/tmp/taxua-full-verification-20261019/`.
`summary.json` retains the first browser pass; `verify_cursor-rerun/checks.json`
records the corrected cursor suite. `final-summary.json` consolidates the final
results below, counting each suite once.

## Repairs and resulting behavior

- Shared controls now activate the die's actual button; the old image selector
  matched six painted faces. The card typography check covers every fallback
  corner and the existing compact two-digit ten. The separate card suite still
  checks all 52 generated faces, suit/rank mappings, fallbacks and bounds.
- The cursor suite checks the current diary status element instead of a removed
  margin note. Its complete 78 checks pass after this selector repair.
- The artwork helper now respects `TRIP_REVIEW_DIR`, so a full run can preserve
  existing tracked review artifacts.
- Native browser auto-darkening is disabled with `color-scheme: only light`.
  Shared fields inherit it. Dark Reader's dynamic engine independently removed
  the parchment texture, so both HTML entry points also declare its supported
  `darkreader-lock` opt-out. Neither change disables system forced colors.
- Dark Reader 4.9.133 was downloaded as a pinned temporary test dependency and
  never shipped with the site. Its real dynamic-theme API passes 53 checks,
  including negative controls proving recoloring starts without the lock and
  is removed when the lock returns. Its browser toolbar, alternate extension
  engines and other extensions are outside this coverage.

## Browser results

| Script | Assertions | Result |
| --- | ---: | --- |
| `verify_artwork.cjs` | 34 | Passed |
| `verify_browser_colors.cjs` | 57 | Passed |
| `verify_cards.cjs` | 76 | Passed |
| `verify_controls.cjs` | 96 | Passed |
| `verify_countdown.cjs` | 67 | Passed |
| `verify_cursor.cjs` | 78 | Passed |
| `verify_darkreader.cjs` | 53 | Passed |
| `verify_demos.cjs` | 254 | Passed |
| `verify_diary.cjs` | 80 | Passed |
| `verify_diary_dark_mode.cjs` | 31 | Passed |
| `verify_diary_layout.cjs` | 45 | Passed |
| `verify_diary_motion.cjs` | 101 | Passed |
| `verify_diary_navigation.cjs` | 82 | Passed |
| `verify_diary_photo_editor.cjs` | 151 | Passed |
| `verify_diary_photos.cjs` | 200 | Passed |
| `verify_dice.cjs` | 34 | Passed |
| `verify_fund.cjs` | 155 | Passed |
| `verify_game_randomness.cjs` | 105 | Passed |
| `verify_games.cjs` | 221 | Passed |
| `verify_illustrated_scenery.cjs` | 106 | Passed |
| `verify_journal_objects.cjs` | 53 | Passed |
| `verify_journey.cjs` | 306 | Passed |
| `verify_map.cjs` | 389 | Passed |
| `verify_map_fullscreen.cjs` | 292 | Passed |
| `verify_mobile_ui.cjs` | 108 | Passed |
| `verify_motion.cjs` | 85 | Passed |
| `verify_playful.cjs` | 127 | Passed |
| `verify_reveals.cjs` | 379 | Passed |
| `verify_scrollbar.cjs` | 81 | Passed |
| `verify_story.cjs` | 56 | Passed |
| `verify_ui_artwork.cjs` | 135 | Passed |
| `verify_weather.cjs` | 106 | Passed |
| `verify_wheel.cjs` | 173 | Passed |
| **Total** | **4,316** | **33 suites passed** |

## Additional checks and limits

- Eleven Deno tests passed: nine real Edge-handler authentication tests over an
  isolated in-process Auth/RPC transport and two photo-framing normalization
  tests. These make no hosted account changes.
- Both deployed-gateway SQL boundary scripts passed: 18 framing checks and
  seven photo-limit checks. They copied tables/functions into temporary objects
  on gogo, used fixture identities there, and rolled back both transactions.
  They test validation/ownership boundaries, not real Auth session issuance.
- All 54 JavaScript/classic-script syntax checks and
  137 owning-document local file references passed at the time of the run.
  `git diff --check` passed.
- WebKit launch was attempted and failed because required Linux browser
  libraries are missing. No WebKit/Safari, Firefox or physical-device pass is
  claimed.
- `verify_diary_backend.cjs` was not run against production: its live mutation
  harness requires isolated disposable backend/accounts, which are not
  configured in this workspace. Its prerequisites and isolation rules remain in
  [the backend guide](diary-backend.md#verification). No real crew identity was
  claimed, reset or reused for testing.
