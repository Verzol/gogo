# Loading and pointer-movement audit · 19 October 2026

[Documentation index](README.md) · [Location scenes](location-scenes.md) · [Scenery](scenery.md) · [Verification](verification.md)

## Findings and changes

The reported blur/sharpen cycle did not correspond to new image requests during ordinary pointer movement. Browser instrumentation showed the same scene node and no image `decode()` calls, while the full painting's transform continuously changed through fractional pixel positions. The main painting now stays stationary with no transform; mist and foreground objects retain their small parallax movements. Lossless scene assets and supplied source images are unchanged.

A separate short sticker hover could rebuild the held scene after returning to it. Location previews now cache the actual decoded compositions, rather than cloning decoded resources and decoding the clones again. Two recent compositions use least-recently-used eviction. Repeated requests for an already pending scene share its work; cancelling a pending hover preserves the visible held composition. Re-entering during the return-to-clouds fade also restores the same painting and caption without another fade-in. Failed artwork can still be retried, and obsolete requests cannot override newer intent.

The story loader also used temporary `Image` elements before decoding its displayed elements. This unnecessarily decoded twice and could download a wide terrain fallback even when a phone's `<picture>` selected portrait art. It now decodes the actual displayed elements directly. Quiet worlds no longer instantiate their permanently hidden legacy mid/near bands. For a cold phone night world, the omitted files total **284,972 bytes**: wide terrain 96,792 bytes, hidden middle ridge 108,612 bytes, hidden near ridge 79,568 bytes. This is a source-payload saving for that case, not a whole-page speed percentage.

A startup CPU sample also showed repeated currency formatter construction during content rendering. The shared money helper now reuses one `Intl.NumberFormat` instance.

## Evidence

The focused loading helper instruments actual pointer movement, image `decode()` calls, network requests and scene DOM mutations. During its 20 pointer positions it records **zero scenic-image requests, zero explicit decodes, zero scene replacements**, and a constant `none` main-painting transform. It also exercises delayed hover cancellation, decoded-node reuse, dismissal/re-entry, cache eviction and phone portrait selection.

Run `TRIP_REVIEW_DIR=/tmp/taxua-loading-review node scripts/verify_loading.cjs` from the site directory. Reports and desktop/phone screenshots are written outside the repository. The broader run uses `/tmp/taxua-loading-checks/` with feature-specific subdirectories.

These are Chromium browser checks and viewport emulations. They do not establish physical-device frame rate, GPU memory use, battery life or Safari/Firefox behavior. The first visit to a location still downloads its native high-quality lossless scene after intent; all six large paintings are not preloaded. No whole-site Lighthouse improvement is inferred from variable local startup timings.

## Broader browser verification

| Helper | Passed checks |
| --- | ---: |
| Location interactions, weather ownership, motion/failure/local-file fallbacks | 95 |
| Illustrated story scenery | 106 |
| Navigation and motion | 85 |
| Weather | 106 |
| Mobile UI | 108 |
| Full trip, content, photographs, controls and resource checks | 304 |
| Painted-object interactions | 127 |

All **60 scene/viewport combinations** also passed, spanning 320px phones, portrait tablets, landscape phones, desktop and extreme ultrawide layouts. Desktop tree, phone coffee and desktop waterfall rendering were inspected. The completed browser checks reported no uncaught errors. JavaScript syntax checks passed for all 21 top-level/helper files checked; documentation links and `git diff --check` also passed. The quick dismissal/re-entry correction was followed by another focused loading run, recorded below.

Final focused result: **18 loading checks passed**, including rapid dismissal/re-entry. The movement sample recorded 0 scenic requests, 0 explicit decodes and 0 scene DOM mutations. Together with the suites above, this is **949 checks plus 60 scene/viewport combinations**.
