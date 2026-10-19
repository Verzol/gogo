# Previous location-art verification

Historical evidence for the earlier photo-referenced paintings, before the prompt-only regeneration. These results do not verify the current art.

## Artwork sizes and coverage · 19 October 2026

**32 Sunburst PNG masters** are preserved: 12 desktop/portrait compositions, two alternate ridge directions, three desktop refinements, six stickers, six foregrounds and three shared/effect plates. There are **29 verified WebP derivatives** including two water-flow masks extracted offline from their own paintings. All 12 base paintings are lossless WebP at their native dimensions; together they occupy **26,438,104 bytes (25.2 MiB)**. All derivatives together occupy **27,349,920 bytes (26.1 MiB)**. The browser loads only the selected scene's assets, not this full collection, on initial page load.

| Selected scene | Desktop incremental art | Phone incremental art |
| --- | ---: | ---: |
| Ridge | 2.00 MiB | 2.06 MiB |
| Tree/reservoir | 2.54 MiB | 2.37 MiB |
| Dolphin rocks | 2.04 MiB | 2.01 MiB |
| Meadow | 2.40 MiB | 2.28 MiB |
| Waterfall | 2.35 MiB | 2.51 MiB |
| Café | 2.03 MiB | 2.20 MiB |

These totals include the chosen painting, foreground and scene-specific effect images, excluding the shared existing cloud ribbon and the initial stickers. A selected location transfers about 2.0–2.5 MiB of artwork. Arithmetic pixel storage for one composition ranges from about 7.1–14.3 MiB on desktop or 7.1–11.8 MiB on phones, excluding shared mist and browser overhead. These are width × height × 4 estimates, not measured process memory, frame rate or physical-device performance.


## Browser evidence · 19 October 2026

The focused controller suite passed **90 checks**, including measured advancement of the painted ambient layers and independent waterfall flow, actual hover/focus/tap input, held selection, stale decoding, two-slot bounds, weather ownership, pause/hidden/reduced-motion, existing diary dialog cleanup, anchors, menus, breakpoints, 320/390/768/900/1440/2560px layouts, 200% text, retry, missing GSAP/controller, direct-file use and print. CDP verified actual Vietnamese glyphs in local **Patrick Hand** and **Be Vietnam Pro**. There were no uncaught browser errors in this run.

Asset audit verified **32 master metadata/prompt/reference hashes and dimensions**, actual alpha on generated cutouts, **29 derivative hashes/dimensions**, and pixel-exact output for all **12 lossless landscape/portrait paintings**. The refreshed browser run passed 90 location checks. Reports, 17 screenshots and budget/asset records are under `/tmp/taxua-location-review/`.

Regression results: weather **106**, illustrated scenery **106**, playful objects **127**, mobile UI **108**, countdown **67**, full journey **307** checks passed. The mobile helper now asserts the approved sticker-first phone order instead of the older forecast-first-screen layout. It waits for completed drizzle opacity rather than assuming a loaded frame after a fixed delay.

During integration, checks caught and corrected an initial-artwork catchup canceling phone selection, the first night handoff starting too late, covered scenery tracking not recovering, portrait cup cropping, a reading-scrim overflow, and unintended stacking of normal 320px weather cards. An earlier focused run also began before all sticker derivatives were ready. Two fixed-delay motion samples failed during concurrent regression runs; the final isolated rerun passed all **85** motion checks. Ambient-layer checks now wait for observed animation-time advancement with a bounded timeout. Prior passing snapshots are not used to disguise those failures.

This is local Chromium emulation with deterministic forecast fixtures. There were no live private-diary or payment writes. Physical-device performance, memory/FPS/battery profiling, Safari and Firefox were not tested.


**Final result: eight browser suites, 996 passing Chromium checks.** The last motion rerun completed in isolation with all 85 checks passing; the location suite passed all 90 after final asset-name normalization. Generated image hashes and documentation paths were rechecked after packaging. Earlier fixed-delay sampling failures remain documented above.
