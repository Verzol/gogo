# Mobile UI implementation — 16 October 2026

[Documentation index](README.md) · [Audit and plan](mobile-ui-plan.md) · [Visual gallery](../review/mobile-ui/index.html)

The mobile opening now uses a separate cloud composition: three lanes and five animated sprites, with softer near/distant artwork around the reading area. New copies continue arriving, individual loops reset offscreen, and disabled lanes lose their animations/clones. Wind still changes cloud speed and precipitation, with a 2.4× mobile ceiling. Lateral descent stays inside the offscreen recycling margin. Desktop keeps its original cloud composition and five primary navigation icons.

At 390 × 844, the hero is approximately **971px** tall, down from 1,187px in the audit. Weather starts around **y421**, and the countdown around **y738**, previously y909. All three daily forecasts fit the first screen. Supporting weather text is 12–13px at the default root size. A single status/action row replaces the separate empty footer, retaining room for wind, reset, retry and saved-data status. Cold and snow remain separate conditions; snow probability uses a snow label. Accessible daily summaries include precipitation probability.

The mobile brand compacts when scrolling, the menu has labeled links to fund/wheel/practical details, and itinerary dates disappear and become inert outside the itinerary. Short landscape uses a day chooser. Measured navigation height drives one shared anchor offset. Titles and temperatures reflow with enlarged text; the menu remains reachable at 200% root font size. Menu/photo controls and small utility links have larger targets. The photo deck's decorative outline was brought inward after it caused a 1px narrow-phone overflow.

A four-day overview links to all 24 existing events, using the canonical times/periods. The full journal and 18 place guides remain available. Body text is larger on phones. Wheel settings precede the smaller dial in a native disclosure; its selected count stays visible while collapsed, and the result follows the dial. The decorative winner banner is used only when the normal name is outside the usable viewport or still faded during its reveal. Probability, no-repeat, reset, pointer alignment and celebration cleanup keep their existing behavior.

No trip source data, supplied originals, generated photo manifest or standalone itinerary was changed. No new runtime image generation, package or service was needed. Unrelated worktree changes were left alone.

## Verification and evidence

The [gallery](../review/mobile-ui/index.html) contains phone, narrow/enlarged-text, landscape and desktop screenshots, sampled cloud phases and a short weather recording. Weather in these artifacts is **demonstration data, not the live forecast**. Raw audit evidence remains separate under [the original audit](../review/mobile-ui-audit/report.json).

The focused mobile helper covers 320, 360, 390 and 430px widths, short landscape and 1440px desktop; 200% text scaling; forecast selection and pause; itinerary-only dates; menu/anchor behavior; day overview; wheel disclosure; direct-file/missing-GSAP anchors; and phone → desktop → phone cloud-pool cleanup. The weather helper seeks through fifteen minutes of actual cloud animation phases with separate mobile/desktop density bounds. A targeted descent check additionally confirms mobile recycling stays offscreen while horizontal parallax is active.

The owning weather, motion, scenery, reveals, journey, countdown and wheel helpers provide the broader regression coverage. Current results are retained in [checks.json](../review/mobile-ui/checks.json); full temporary screenshots/recordings are under `/tmp/taxua-mobile-implementation/`. See [verification](verification.md) for commands and overrides.

All **1,250 browser assertions across eight suites passed**: mobile 108, weather 106, wheel 99, motion 83, scenery 106, reveals 379, countdown 67 and full journey 302. The full journey run reported no unexpected JavaScript errors, console errors or failed deliveries. Separate settled-menu captures confirmed all eight labels reach full opacity on phones, short landscape and at 200% text size.

The journey helper records browser-canceled requests separately from delivery failures. Responsive cloud copies and reloads can cancel in-flight image requests; each canceled URL is fetched again and must return a successful, nonempty response. Full-page sweeps still check for broken rendered images, console errors and other failed requests.

JavaScript syntax, local documentation/gallery links, whitespace and unchanged trip data/manifest/reading-copy files are also checked. Coverage uses Chromium emulation. Physical phones, Safari/Firefox, frame-rate, battery and formal contrast measurements were not run.
