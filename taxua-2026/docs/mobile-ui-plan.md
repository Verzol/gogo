# Mobile UI audit and improvement plan

[Documentation index](README.md) · [Sky and weather](weather.md) · [Motion](motion.md) · [Group features](group.md)

Review date: **16 October 2026**. Findings below describe the original baseline. The implementation is recorded in the [mobile UI review](mobile-ui-review.md), with current screenshots and verification results. Trip content is unchanged.

## Recommended direction

Keep the watercolor sky, noticeable continuous cloud movement and descent into mountains. Give phones their own composition: fewer, smaller cloud groups around the edges, a quiet area for reading, compact weather and navigation that leaves more of the screen available for content. Reuse the current artwork and fonts.

Fix the opening, navigation and enlarged-text clipping first. Then improve access to the journal and the wheel's controls. The supporting sections generally fit phones already; they need targeted readability and touch improvements.

## What was inspected

Chromium touch emulation at **320 × 740, 390 × 844, 430 × 932 and 844 × 390 landscape**. At 390px, reviewed all 24 itinerary events and every supporting section: crew, wheel, fund, packing, destinations, food, practical details and footer. Narrow, wide and landscape checks sampled the opening and supporting sections. Also checked selected sections with a 20px root font and the narrow opening with a 32px root font, approximating 125% and 200% text scaling. These are layout probes, not browser or OS text-zoom certification.

Evidence: [opening](../review/mobile-ui-audit/opening.webp), [navigation, wheel and text scaling](../review/mobile-ui-audit/navigation-wheel.webp), [reading and supporting sections](../review/mobile-ui-audit/reading-support.webp), [measurements and interaction results](../review/mobile-ui-audit/report.json).

The weather API was intercepted with deterministic trip-day data. This audit does not verify the live forecast. No uncaught page errors, failed required responses, broken loaded images or page-level horizontal overflow were recorded. Weather tap selection, menu open/close and anchor navigation, notes, photo stepping, packing toggling, wheel selection/spin/result and no-repeat toggling worked. This was not an exhaustive rerun of the existing regression suites.

No physical-device, Safari/Firefox, contrast-ratio, frame-rate or battery assessment was performed. Some screenshot content near viewport edges is intentionally mid-reveal; centered warnings and costs reached opacity 1. Do not treat every faded edge as a resting-state contrast defect.

## Findings and priorities

| Priority | Finding | Evidence / consequence |
| --- | --- | --- |
| P0 | Mobile cloud composition is too dense | Far and passing layers are 180% and 200% of viewport width. Five active opening lanes each have three phase-offset copies; roughly 10–15 sprites can be visible together. Repeated large shapes cross the date, heading, CTA and weather. |
| P0 | Fixed navigation collides with scrolled content | Full brand wording stays visible throughout the tall opening. Scrolled CTA text crosses it. Later, the logo and sticky date rail overlay reading content; the date rail remains visible through unrelated support sections. |
| P0 | Enlarged text can hide content and navigation | At 320px with a 32px root font, the unwrapped hero line and brand clip, and the menu moves outside the viewport. Page overflow still reports zero, so that check alone misses the failure. |
| P1 | Hero is long and weather is small | At 390px the hero is 1,187px tall; weather begins at y520 and the countdown at y909. At 320px the countdown begins at y940. Weather condition/probability/wind text is about 10.6–11.2px; probability wraps awkwardly at 320px. |
| P1 | The long journal lacks quick access to some useful sections | The 390px page is about 34,390px tall, with 24,962px of itinerary. The five-link menu has no direct fund, wheel or practical-details destination. This is a navigation problem; the journal's source content should remain intact. |
| P1 | Wheel settings and result are separated from the action | Wheel occupies about 1,127px at 390px. Participant choices follow the dial/result. The temporary winner banner duplicates the normal result while persistent navigation still consumes space. |
| P2 | Small targets and secondary type need refinement | Menu is 42px square; photo arrows are 38px square before rotation. Source-group and back-to-top links have short line-height targets. Story paragraphs are about 14.2px on phones. |
| P2 | Landscape needs a dedicated arrangement | At 844 × 390 the header is 80px high, a vertical date rail uses the right edge, and the wheel stage is about 375px tall. Existing desktop/tablet rules leave little usable reading height. |

## 1. Recompose mobile clouds

**Owners:** `weather.css`; `scenery.js` (`moveCloud`, `initCloudFlow`, resize/visibility synchronization); `scripts/verify_weather.cjs`.

- Start with three mobile lanes: a small high/edge group, one near side group and a subdued distant layer. Retire the extra broad passing bank on phones, or introduce it only during the descent if visual review warrants it. Begin with approximately 2–4 distinct visible groups; tune by screenshots rather than counting transparent image rectangles alone.
- Reduce mobile artwork widths and opaque overlap. Keep the title, CTA and weather reading areas mostly open sky throughout the animation, not only at page load. Prefer placement, scale and alpha; if necessary, feather a mask on cloud artwork only. Do not add a broad white surface or blur over the scene.
- Give each lane a mobile-specific bounded copy count and phase spacing, calculated from its width and travel time. Incoming groups should overlap the outgoing rhythm without filling every lane across the full screen. Keep recycling fully outside the viewport; avoid visible resets, growing DOM pools or periodic full-scene restarts.
- Disable and cancel unused lane tracks, including their clones. CSS hiding alone should not leave unnecessary animations active. On breakpoint/orientation changes, rebuild only affected tracks, retain the visible phase where possible, and keep snapshot copies frozen correctly.
- Keep motion clearly noticeable. Calibrate speed against viewport width, then apply the existing wind response with a gentler mobile ceiling if needed. Calm and windy days must remain visibly different; daily wind/gust values must still affect cloud speed and precipitation slant. Do not return to nearly stationary clouds.
- Overcast should change atmosphere without adding another solid wall of clouds. Preserve distinct drizzle, rain severity, snow, fog and cold treatments. Cold temperatures alone must not create snow.

The current weather helper requires at least six visible clouds and broad far/passing coverage across the viewport. That criterion encouraged excessive mobile density. Replace it with mobile composition checks: bounded active lanes/copies, steady arrivals, offscreen-only recycling, visible motion and clear reading regions at sampled phases. Retain the existing desktop composition unless separate desktop evidence warrants a change. Document expected cloud bounds before adjusting assertions.

## 2. Simplify the mobile opening and weather

**Owners:** `weather.css`, `style.css`, `index.html`; `weather.js` only for layout/state markup; `countdown.css` if needed.

- Keep this reading order: trip date → `7 +1` / title → short introduction and CTA → three trip-day forecasts → compact countdown. Retain the mystery copy with quieter visual emphasis.
- Reduce cumulative top padding, gaps and decorative spacing. Aim for all three forecasts to be visible in the first 390 × 844 screen, with the countdown immediately after them. At 320px or enlarged text, allow natural vertical growth; fitting everything into a fixed screen must never require smaller text or clipping.
- Keep the three days visible together. Use roughly 12–13px minimum supporting weather text, legible handwritten dates/temperatures and a shorter precipitation label such as `Mưa 60%`. Keep condition names intact and allow balanced wrapping for long labels.
- Keep the pause/play icon beside the forecast heading, with its accessible name, 44px target and reduced-motion state. Preserve touch selection, keyboard focus, held selection, reset and retry.
- Replace the unconditional footer/context blank space with a compact stable status/action row. Test default, selected, loading, cached and error states together so the countdown does not jump when a day is tapped. Reserve enough room for the actual controls rather than several empty rows.
- Keep the removed timestamps, provider line and hover instructions out of the panel. Sources remain in the existing documentation.
- Remove unnecessary `white-space: nowrap` constraints from enlarged mobile title/brand layouts. Use fluid wrapping and `min-width: 0` where appropriate. Keep the menu reachable even when brand text grows; do not hide overflow to conceal the problem.
- Recheck measured opening bounds after spacing changes. The mountains must rise and the night transition begin relative to actual content clearance, preserving native scrolling and the current reversible handoff.

## 3. Give navigation a smaller, useful mobile footprint

**Owners:** `index.html`, `style.css`, `main.js:initNav`; `motion.js` anchor travel and `scenery.js` opening measurements where affected.

- Keep the full brand at the top; switch to a compact logo/menu arrangement after leaving the initial title area, rather than waiting to exit the entire hero. Keep the menu independent of the brand's intrinsic width.
- Show the date rail only while reading the itinerary. Scope it to that region or synchronize its visibility with itinerary boundaries. Preserve all four dates and active-day indication. Never leave hidden date links in keyboard focus order.
- Consolidate the logo/menu and itinerary date controls into one deliberate mobile navigation area. Give individual controls enough contrast against moving scenery, without a large blurred or opaque header. Avoid using a full-width backdrop to cover the scenery.
- Use one shared header offset for native anchors, scroll padding and enhanced travel. Verify headings do not land behind the nav and offsets are not added twice. Avoid layout jumps when the date rail enters/leaves.
- Expand the mobile menu with clearly labeled links to **Quỹ nhóm**, **Vòng quay** and **Lưu ý**, alongside existing destinations. Prefer a short readable text list/grid over an increasingly crowded collection of unlabeled icons. Make a long menu scroll within the visible viewport and preserve Escape/selection close behavior and focus.
- In short landscape, use compact navigation and a collapsed day chooser rather than a permanent four-date column. Account for safe-area insets and browser toolbar height.

## 4. Improve journal reading and access

**Owners:** `main.js:renderDays`, `style.css`, relevant reveal registration in `motion.js`.

- Add a compact itinerary overview near its start: four day links, each with a concise date/summary and an optional expansion of existing event times/titles linking to exact events. Derive it from `TRIP_DATA.days`; do not create a second schedule source. Reuse native anchors and exact/null-time semantics.
- Preserve the complete journal underneath: all 24 events, 18 guides, warnings, illustrative captions, optional flags and notes. Keep the standalone reading copy accessible.
- Bring mobile body text toward 15–16px, with comfortable line spacing; use at least 12–13px for secondary text. Keep captions and warnings visible. Inspect day/night and bright terrain states before deciding whether local text backings need adjustment; opacity-1 samples were readable and do not justify a blanket surface redesign.
- Increase photo arrows/menu/short text links to comfortable targets of at least 44 × 44px through padding or hit-area design. Maintain spacing between targets and ensure expanded hit areas do not overlap. This is a comfort goal, not a claim that every smaller existing control violates WCAG.
- Trim repeated event padding selectively after increasing body type. Preserve photographic aspect ratios, documentary captions, varied story rhythm and reversible reveals. Do not replace the journal with a uniform stack of cards or collapse it by default.

## 5. Bring wheel controls together; polish support sections

**Owners:** `main.js:initCloudWheel`, `style.css`, `motion.js` wheel reveal registration; `scripts/verify_wheel.cjs` when implementing.

- Mobile order: wheel heading → compact selected-participant summary/settings → dial/spin → immediate result. Keep participant and no-repeat settings in an accessible expandable panel; opening it must not put settings behind the fixed nav.
- Place the persistent result beside/below the spin action within the same visible cluster on typical phones. Reassess the temporary banner once this works; any retained banner must avoid navigation and important controls. Maintain a single result announcement.
- Cap dial size using available width and short-screen height. Allow natural scrolling rather than shrinking participant names until unreadable. Put settings and result alongside a smaller dial in landscape if space permits; otherwise stack them cleanly.
- Preserve eligibility, equal probabilities, no-repeat rounds, reset, pointer agreement, celebration cleanup and pause/reduced-motion behavior. Restructuring markup may require updating the `.wheel-stage` / `.wheel-notes` reveal targets; keep rotor transforms independent.
- Keep crew, fund, packing, destinations and food structures. Refine small supporting text, tap padding and landscape spacing only where needed. Preserve packing persistence, destination anchors, the exact fund amount/MoMo URL and all seven members.

## Assets and components

**No new image generation is needed for the first implementation.** Reuse the transparent opening clouds, existing mobile WebP derivatives, rain/snow vector tiles, logo, Lucide sprite, wheel components and watercolor worlds. Do not alter supplied raw originals or generated `assets.js` for a layout fix.

If a cloud still reads as an oversized block after scale/position changes, first try an alpha-preserving crop/derivative from the supplied master, record provenance and never upscale. Regenerate artwork only if that targeted attempt cannot produce the needed edge shape.

New UI pieces are small vanilla components: a mobile cloud profile, compact header state, itinerary-scoped date control, derived day overview and wheel settings disclosure. No framework, animation library or backend is required.

## Implementation order and acceptance

1. **Opening pass:** mobile cloud profile, weather type/spacing, text reflow and hero measurements. Review stills and short recordings before touching the rest of the page.
2. **Navigation pass:** compact brand, itinerary-only date control, useful menu destinations, unified anchor offsets and landscape behavior.
3. **Reading/control pass:** day overview, targeted typography/touch improvements and wheel rearrangement. Keep changes separable for review.
4. **Regression and visual pass:** update affected acceptance checks and owning feature guides. Keep historical evidence; write a new review folder. No trip-content edits or reading-copy regeneration should be necessary unless implementation changes its source content.

| Area | Required acceptance before calling the implementation complete |
| --- | --- |
| Sizes | 320, 360, 390 and 430px phones; short landscape around 844 × 390; 1440px desktop. Review all sections at 390px and critical controls at every size. |
| Text | 125% and 200% text scaling: no clipped title, missing menu, obscured focused controls or forced horizontal reading. Check element bounds/local clipping as well as page overflow. |
| Cloud continuity | Review sampled phases at 0/15/30/60/120 seconds and seek through 15 minutes. No empty-sky wait, visible teleport, unbounded copy growth or recurring wall of clouds. Inspect artwork alpha coverage and recordings; image bounding boxes alone cannot establish readability. |
| Weather | Clear, cloudy, fog, cold-without-snow, drizzle, light/heavy rain, snow and storm; calm/strong wind; loading/error/retry, cached/offline and unavailable dates. Check long Vietnamese labels at 320px. |
| Motion | Pause/play retains positions and pauses incoming copies/particles; reduced motion has a composed static sky; hidden tabs and inactive scenes stop work; orientation changes retain sensible poses. Inspect the sky-to-ground transition and frozen anchor snapshots. |
| Navigation | Menu tap/Escape/selection/focus; date rail only in itinerary; day and support anchors, back-to-top, deep-link reload, reverse scroll and interrupted travel. Header cannot cover the destination heading. |
| Content/controls | All 24 events/18 guides remain; notes, photo arrows/rapid cycling, captions, packing persistence, destination links, wheel participants/no-repeat/reset/result and intercepted fund destination. |
| Fallbacks | Reduced motion, missing GSAP, denied storage, direct-file preview, print and standalone reading copy remain usable. No new required network dependency. |
| Regressions | Run affected weather, motion, scenery, reveals, journey, countdown and wheel helpers as warranted by the final diff. Update the old cloud-density expectations deliberately; preserve data/pause/continuity assertions. |

Use [verification guidance](verification.md) for commands and output overrides. Finish with current screenshots/recordings and a truthful list of checks run. A real iPhone/Safari and Android browser check remains a separate device-validation step if those devices are available; Chromium emulation cannot establish those results.
