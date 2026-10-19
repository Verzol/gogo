# Painted objects to play with

[Documentation index](README.md) · [Scenery](scenery.md) · [Motion](motion.md) · [Fund](group.md)

## Objects and gestures

- **Pig:** tap/click the pig or its loose coin, or use Enter/Space. Each coin chooses a new launch spot, a high arc, side swoop, spiral or flutter, plus its own spin direction, turns and flight time. All paths turn edge-on and enter the same painted slot. The pig randomly hops, wiggles, squishes, nods or shimmies, with hearts or stars. Consecutive toss/reaction styles avoid immediate repeats. Dragging the loose coin near the slot starts a shorter varied drop from the actual release point; a missed drop returns the coin. The small handwritten hint introduces this discovery. The coin is pretend play, with no balance, contribution status, storage or payment request. The actual MoMo link and 2.400.000 ₫ contribution keep their existing meaning.
- **Sun:** tap for a squash/rebound and three little painted stars; drag a short distance and release to return it home. A separate opening sun reuses the supplied disc/rays above the opening sky. Other suns follow their current world. Afternoon remains a disc without a ray ring.
- **Moon:** tap for a gentle rock and a short sequence of stars. It retains its original shape and colors; on phones it sits below the sticky date controls.
- **Cloud:** one visible painted cloud has a small, aligned interactive region. Tap for two wisps or tug horizontally. Holding/focusing it pauses only that cloud's existing one-way track, retaining its phase; release/blur resumes it. Cloud artwork, weather wind and opening descent keep their separate owners.
- **Coffee:** the existing desktop opening sticker is now a native button. Tap or use Enter/Space for a tilt and independent curling steam. Its existing compact-screen hiding remains.

These are brief decorative discoveries. The lake/tree extension is deferred. The random-game collection and private diary have no new behavior.

## Ownership and input

`playful.js` is an optional classic script after `weather.js`; `playful.css` follows the existing styles. `main.js:renderFund` owns the pig/coin markup. `scenery.js` adds the opening sun and exposes `holdCloud()`. `motion.js:sceneSnapshot` dispatches `journey:play-reset` before freezing a composition.

The painted scenery stays hidden from assistive technology. A separate `#playSurface` contains at most two native buttons: the visible sun/moon and one visible cloud. Their names are Vietnamese live text. Controls only become available for decoded, visible artwork in the dominant world, including physical scroll dissolves; changing that world cancels a held gesture. The controller tests foreground controls and reading text before exposing a hit region; menu/dialog/navigation overlays suppress them. The cloud has a small dashed hover outline and handwritten hover/focus hint. Sun and moon have no hover outline or hint text; all buttons retain their keyboard focus outlines and accessible names. Text, anchors, forecasts, photo turns, diary and map keep their existing input paths.

Pointer capture belongs to the activated object. Sun/cloud drags are bounded; touch targets use `touch-action:pan-y` so vertical gestures remain native scrolling. Only the loose coin uses local two-dimensional touch capture. Every drag has a click/tap/keyboard alternative. Escape, pointer cancellation, lost capture, page scrolling, resizing, scene changes, navigation snapshots, hidden tabs and pagehide release active gestures. Each pig/coin activation launches an independent coin immediately, so repeated feeding overlaps without restarting earlier flights. The loose coin stays available during feeding; each landing removes only its own flying coin. Pause, reduced motion and reset cancel all active flights together.

The loose coin relocates among six spots around the pig after feeding, with a fresh face angle and a short appearance transition; it stays still while held. Tosses sample curved paths with randomized lift, spin and 840–1240ms timing. Dragged drops use 450–620ms. Flying coins stay in front of the pig during their approach, then move below the aligned front mask at the slot. Pig reactions retarget the current inner pose, so rapid landings do not reset the outer reveal or cancel other coins. This decorative randomness uses `Math.random()` independently of the chance-game sampler.

`#playEffects` is separate from `#sceneLayers`, so navigation snapshots never duplicate interactive controls or particles. A maximum of twelve ephemeral particles share that layer. Individual scale/rotation and `--play-x`/`--play-y` are independent of outer scroll reveals and the cloud track's `translate`. Only a moving/visible page schedules hotspot tracking; reduced motion, user pause and hidden tabs stop that timer. No extra animation framework, runtime image service, backend, sound or storage is needed.

The existing decorative-motion pause and reduced-motion preference cancel active effects and use a brief static heart/star response. Print hides the toy controls and scenery while keeping the fund text/action. Missing optional pig art restores the existing Lucide pig; denied storage, missing GSAP and direct-file use retain the public journal.

## Artwork

Both masters were generated using the explicitly requested **9Router `cx/gpt-image-2.5-sunburst`**. The pig edits the preserved original, retaining its scarf, expression and watercolor style, with a clear slot and no baked-in coin. The separate coin is a minted gold design with a raised numeral 1, embossed mountain/cloud detail, double rim and reeded metal edge. Its restrained watercolor texture matches the pig; the engraving is all gold.

- [Exact pig prompt](prompts/playful/01_pig.md) · [Exact coin prompt](prompts/playful/02_coin.md)
- [Preserved returned PNG](../figures/raw/playful/pig_body.png) and [request/provenance record](../figures/raw/playful/generation.json)
- [Preserved coin PNG](../figures/raw/playful/coin_gold.png) and [coin request/provenance](../figures/raw/playful/coin_generation.json)
- [Measured derivative manifest](../data/sources/playful-artwork.json)
- Runtime: `figures/decor/painted/playful/pig_body.webp` and `pig_front.webp`, both 512 × 512, plus a 128px `toy_coin.webp` derivative of the dedicated gold coin. The front is a precisely aligned alpha mask from the same painting below the measured slot line. It is requested after the lazy pig image loads. The loose coin and every flying coin share the new design; it turns edge-on and passes behind the painted slot front during feeding.

Run `python3 -B scripts/prepare_playful_artwork.py`. The helper verifies both Sunburst model records, master/reference hashes and the coin prompt hash before regenerating the three WebPs and manifest. It trims transparent margins and downsamples without upscaling or recoloring. The original fund PNG/WebP and game coin remain preserved. Cloud wisps, sun, moon, stars and coffee reuse existing local artwork.

## Verification

Run `node scripts/verify_playful.cjs` with the existing repository-root preview at port 8000. `TRIP_REVIEW_DIR` overrides `/tmp/taxua-playful-review`. Checks use actual clicks, keyboard activation, captured drags/drops and Chromium touch input, with mocked forecasts. Screenshots/reports stay outside the checkout. Relevant regressions are fund, scenery, weather, motion and mobile UI; see [Verification](verification.md).

Initial implementation verified on **17 October 2026**: **646 Chromium checks passed** across the following helpers, with no uncaught browser errors in their reports.

| Helper | Checks | Evidence |
| --- | ---: | --- |
| `verify_playful.cjs` | 88 | `/tmp/taxua-playful-review/checks.json` |
| `verify_fund.cjs` | 155 | `/tmp/taxua-playful-regression/fund-final/checks.json` |
| `verify_illustrated_scenery.cjs` | 106 | `/tmp/taxua-playful-regression/scenery-final/checks.json` |
| `verify_motion.cjs` | 83 | `/tmp/taxua-playful-regression/motion/checks.json` |
| `verify_weather.cjs` | 106 | `/tmp/taxua-playful-regression/weather-final/checks.json` |
| `verify_mobile_ui.cjs` | 108 | `/tmp/taxua-playful-regression/mobile/report.json` |

Reviewed the final 1440px desktop, 390px phone and 320px narrow-phone screenshots, including the pig's coin flight, opening sun, moon below the date rail, cloud wisps and coffee steam. Forecast changes also hide/restore the sun's hit region immediately on paused and reduced-motion pages, without an ongoing timer. The preparation helper reproduced the manifest and all three runtime WebPs byte for byte; the derivatives total 166,750 bytes. JavaScript/Python syntax, whitespace and 93 local documentation links passed verification. The fund helper intercepts MoMo locally, and weather checks use fixture forecasts. Touch coverage uses Chromium input emulation; physical devices, Safari and Firefox were not checked for this change.

The repeated-feeding follow-up on **17 October 2026** passed **103 playful-object checks**, with zero uncaught browser errors. Evidence: `/tmp/taxua-playful-multicoin-review/checks.json`. The suite verifies overlapping real clicks, repeated keyboard/touch activation, uninterrupted earlier flights, independent landings, a sixteen-click burst, complete cleanup and cancellation. Desktop and phone screenshots show multiple coins entering the pig together.

The minted-coin follow-up on **17 October 2026** passed **103 playful-object checks**, with zero uncaught browser errors. Evidence: `/tmp/taxua-goldcoin-review/checks.json`. Reviewed the generated master, optimized coin and desktop/phone feeding screenshots. The new 128px coin is 9,428 bytes; the three current runtime derivatives total 166,096 bytes. Both pig derivatives remain byte-identical. The updated preparation helper reproduces all derivatives and the manifest byte for byte; source/output hashes, transparency, dimensions, Python syntax, whitespace and 96 local documentation links passed verification.

The randomized-feeding follow-up on **17 October 2026** passed **127 playful-object checks**, with zero uncaught browser errors. Evidence: `/tmp/taxua-varied-feeding-review/checks.json`. On desktop, 390px phone and 320px narrow phone, deterministic random fixtures cover all four toss styles, both spin directions, distinct timings, shared slot entry, all five actual reaction poses, independent landings and no consecutive reaction repeats. The existing real pointer/keyboard/touch, dragging, interruption, pause/reduced-motion, print and optional-resource checks also pass. Reviewed all three burst screenshots and the five reaction poses under `/tmp/taxua-varied-feeding-review/reactions/`; no new artwork was needed.


## Location explorer integration

While `data-location-scene` is set, original opening scenery hotspots are hidden and their tracking loop stops. The location explorer owns its own scene effects. Existing fund play and story objects remain independent. See [Location scenes](location-scenes.md).
