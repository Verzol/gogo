# Implementation and acceptance review

## Current illustrated design

The website is now an open watercolor mountain journal. The user's 14 generated images are organized into canonical source files and alpha cutouts, with source hashes/crops in `data/sources/illustrated-scenery.json`. The existing static HTML/CSS/classic-script stack, gogo logo, Patrick Hand and Be Vietnam Pro remain. The `redesign-existing-projects` skill guided the audit while the user's illustrated-background direction supplied the visual brief.

Four complete scenes serve as reference compositions. Six live worlds use self-designed scalable skies, sparse deterministic SVG stars, independently placed painted ridges, local clouds and small landscape accents. The opening has a lowered mountain horizon so the headline and arrival clock stay on clear sky. Short landscape screens gently fade terrain out of the left reading lane. Daylight is rich teal; blue hour retains faint stars, night uses cool painted terrain, and afternoon has a warm rose/copper sky. Band heights are capped on wide screens and the phone terrain uses a broader cropped stage.

Scenery retains the established slow dissolves, reversible content reveals, interruptible navigation and fast-scroll catch-up. A shared phase-aware resolver brightens night chapters into blue hour and then daylight before breakfast. Panels wait for their component images to decode; a failed optional piece leaves the scalable sky instead of blocking travel. Small mountain drift follows scroll position reversibly; reduced motion disables it. The bus ticket, coffee accent and packing backpack use the new stickers. Photo content, source times, all 18 researched introductions, seven-member roster, eighth-member fund and arrival countdown remain intact.

Illustrated redesign validation (14 October): 106 illustrated-scenery checks, 301 full-journey checks, 83 motion checks, 379 reversible-reveal checks, 67 countdown checks, 155 fund checks, 34 artwork checks and 56 story/content checks passed. Ordinary HTTP journeys have no console errors or failed resources; direct-file viewing was also checked with no console errors. All 14 original hashes/native dimensions and all 34 derivative dimensions/alpha channels were verified. No commit or deployment was performed.

Current browser evidence is recorded by `scripts/verify_illustrated_scenery.cjs` in `review/illustrated/`. Existing journey, reveal, countdown, fund and artwork helpers provide regression coverage. The earlier photographic implementation and its historical metrics below remain for provenance.

## Shorter scrolling, 15 October

Reduced event/day spacing, photo-section minimum heights, clustered-stop gaps and the extended Khe Cải section. Phone photo sections now use natural content height. No text, photos, warnings or schedule entries were removed; the opening and existing motion timings remain intact.

At a 900px viewport, itinerary height changed from 24,259 to 20,234px on desktop (16.6% shorter) and 30,555 to 25,020px on phones (18.1% shorter). The whole page is 14.4% and 14.9% shorter respectively. Measurements are in `review/illustrated/pacing.json`. The shorter layout passed 56 story checks, 83 motion checks and 12 representative forward/reverse reveal checks at desktop, phone and 320px widths; the focused compact review found no overflow or browser errors.

## Earlier photographic redesign acceptance

| Requested change | Implemented behavior and evidence |
| --- | --- |
| Remove the ugly persistent bottom shape | The artificial ridge, foreground clouds, mist, wash, stars, glow, grain and decorative route overlays are no longer rendered. Full-viewport photo coverage is checked at phone, tablet, desktop, landscape and 2560px widths. |
| Make cards transparent | Event bodies, photo frames, crew, section headings, food, packing and footer containers have transparent backgrounds. Narrow reading areas have a feathered tint of at most 24 percent, without backdrop blur. Notes and image captions retain small local contrast areas. Browser checks inspect container transparency and absence of blur. |
| Show clear, full-color backgrounds | The five local photographs render unfiltered at full opacity between longer chapter crossfades. Portrait screens choose sufficient image resolution for cover cropping, and loaded backgrounds upgrade when resizing to a wider viewport. |
| Remove Sáng/Tối/Tự động | Controls, theme initialization, system preference listeners and storage behavior are removed. Old saved theme values have no effect. Navigation contrast and day/night stickers follow the current photograph/story period. |
| Open the layout and navigation | The topbar has no enclosing panel. The logo and five named Lucide icon links float separately; labels appear on hover/focus and in the phone menu. Desktop dates form a slim rail in the outer margin; phone dates sit below the top controls, with anchor offsets reserving reading space. |
| Make the site playful | Handwritten headings, exact-time stamps with period icons, bus tickets, offset snapshots, a room collage, doodle annotations, crew name tags and a packing completion stamp replace uniform large cards. Text-only stops occupy a full reading column instead of inheriting an empty photo column. |
| Replace conventional dropdowns | Notebook tabs unfold useful source notes through accessible buttons. Secondary photographs use an overlapping deck with previous/next controls and an announced view count. Essential warnings and corresponding illustrative-image captions remain visible. |
| Preserve the trip and useful behavior | All 24 source events, confirmed/null times, optional activities, costs, 18 selected stops and 23 photographs remain. Canonical schedule fields and generated asset metadata are preserved; display copy and researched place introductions are maintained separately in data.js. Packing persistence, direct anchors, reduced motion, missing-animation fallback and direct-file use remain supported. |

The initial hero, waterfall/Vị Nhà and night compositions were reviewed on desktop and phone before the full-page review. Further inspection corrected an overflowing tilted frame, under-resolution phone backgrounds, an early crossfade, overly prominent contrast gradients and empty photo columns on text-only stops.

## Place stories and slower scenery chapters

All 18 unique stops now have original Vietnamese introductions with small source links. Landscape copy uses tourism and news reporting; venue copy uses local guides, directories and firsthand accounts where owner documentation is unavailable. No undocumented venue histories or cloud guarantees are inferred. `data/sources/place-research.md` records source links and identity caveats. The interactive schedule shows a place heading, short activity cue and useful logistics; original schedule details remain in data.js and the linked no-JavaScript reading copy. Irrelevant Mộc Châu fireworks copy is absent from the interactive story, while live music remains explicitly unconfirmed.

The travel story measures 24,233px on desktop and 30,588px on phone at 900px height, up 49.0% and 47.2% from the preceding 16,264px/20,773px measurements. The three shared-afternoon stops now have separate alternating photo/text moments, with genuine anchors but no invented times. Transparent surfaces, full-color photography and reversible foreground reveals remain. Longer text uses soft radial local contrast instead of a rectangular reading tint.

Eight photographic scenery changes replace the preceding sixteen, including the within-Khe-Cải dawn. Related stops hold the same scene for several screenfuls; period labels and sticker colors remain tied to each event. Both enhanced and native/reduced-motion controllers use the same chapter resolver. Fast manual jumps dissolve directly to the landing scene rather than replaying intermediate scenery; failed-image tests verify subsequent scrolling still works.

The focused story review passed 56 checks in `review/story/checks.json`, including place coverage, spacing, held chapter groups, skipped scenes during fast flings, failed manual decoding and all 24 events in the reading copy. Screenshots at desktop and phone reading positions are in `review/story/index.html`. Axe found no violations in 36 new place-reading/navigation contexts; automation cannot fully evaluate contrast over photography.

## Source fidelity

The existing 14 October source snapshots remain in `data/sources/`. Source-row order and every confirmed time are checked against `schedule.json`; selected images and illustrative captions are checked against `selected-place-photos.json`.

03:00 arrival remains separate from 14:00 check-in. P16/P17/P18 retain the exterior, Best view 2 and Best view 4 labels. The day-two 12:00 room-change reminder remains. Optional activities and unknown times remain explicit, and the dinner/stargazing conflict stays visible. The combined Làng Văn Hóa Café retains both nearby labels. F01/F02/F03 retain their exact illustrative captions.

Khe Cải starts at the source's 04:30 and develops from predawn into dawn near the end of its chapter. This editorial scene transition does not invent another visit time. Photographic scenery remains an atmospheric interpretation, not a weather forecast or a claim about the pictured location.

## Static architecture and icons

`scene-config.js` supplies period/background choices. `main.js` renders content and ordinary controls; its native-scroll fallback works with reduced motion and without GSAP. `motion.js` owns scenic dissolves, continuous reversible scroll reveals and smooth anchor navigation while preserving native manual scrolling. Its opacity/transform enhancements revert when reduced motion is enabled; content remains usable without GSAP.

The interface uses 22 official Lucide 1.23.0 symbols, serialized unchanged from Hue's pinned bundle by `scripts/prepare_icons.cjs`. The full 402 KiB library remains an asset-preparation source and is not loaded by the website. Same-document symbols work under HTTP and file://. Licenses, source checksum and regeneration instructions are in `vendor/README.md`.

The website still has no build step, framework, backend, runtime npm requirement or CDN. The optional asset/verification helpers are maintenance tools. The complete local no-JavaScript itinerary remains available.

## Motion refinement

The 14 October motion pass gives the landscape more time: consecutive identical scenes hold steady, while different photographs dissolve over up to 1.23 viewports of scrolling, shortened only when chronological scene spacing requires it. A 0.55-second numeric scrub eases scene updates independently of native scrolling. An opaque outgoing photograph sits beneath the incoming image throughout each dissolve, preventing a brightness dip. The Khe Cải predawn/dawn cue remains tied to the same source event.

Real anchor clicks ease over 650-1,100 ms with one destination dissolve rather than flashing through intermediate scenes. A temporary snapshot preserves the outgoing composite, including its crop, while the destination photograph decodes. Wheel, touch, pointer and navigation-key input cancel travel. Hash/history, direct links, destination focus, browser restoration and the keyboard skip link remain supported. Enhanced navigation applies the topbar offset once instead of adding scroll-padding and event scroll-margin.

Foreground components reveal continuously over roughly 42 percent of viewport scroll distance, with a 180 ms scrub for small input steps. Photos enter from their layout side, rising slightly and settling into their existing scrapbook tilt; headings/text rise, while transit tickets move as whole groups. Collages and supporting rows have small scroll-distance offsets. Phones use shorter vertical travel. Opacity and travel reverse at the same physical positions on every visit, hold when scrolling pauses, and stay fully visible in the reading zone. The opening hero is readable immediately. All itinerary types, day headings, crew, packing, destinations, food, practical notes and footer are covered. Stable layout coordinates ignore animated transforms; refresh updates travel limits to reserve room for tilted frames at every width. Footer endpoints are limited to the reachable page bottom.

Scroll timelines animate independent proxy state and individual CSS translate/rotate, preserving authored transforms. Folding notes and swapping artwork use separate opacity factors; photo gestures act on inner slides. Notes reveal at a canonical position independent of their own changing margin/height. Keyboard focus temporarily exposes its component, with blur returning to reversible scroll progress. Deep links and restored positions initialize directly to their current progress. Reduced motion and missing GSAP show all content; print removes reveal opacity and travel.

Notes unfold/collapse in 320 ms; photo decks dissolve/slide in 300-360 ms while smoothly adjusting their height. The phone menu opens in 250 ms with staggered icons and closes in 180 ms, becoming inert immediately. Chapter labels, scene artwork, active dates and packing feedback receive short transitions. Repeated interactions cancel or retarget their existing motion; transient deck/navigation layers are removed afterward. Incoming artwork and scenery decode before replacement. A delayed image during manual scrolling receives a 600 ms catch-up dissolve, and a failed destination image leaves the outgoing landscape visible. Fast manual travel snaps the scenery controller to the landing position beneath an 850 ms frozen-composite dissolve, skipping crossed chapters. Consecutive fast flings reuse opaque snapshots; delayed decoding does not create duplicate active layers, and failed manual decoding clears the temporary veil. Reduced-motion preference and breakpoint changes dispose animations and retain current useful control state.

## Verified review

The story-refinement `node scripts/verify_journey.cjs` run passed **301 behavioral browser checks**, with zero unexpected JavaScript errors, ordinary-run console errors, failed resources or broken required images. Its source-coverage, interaction, responsive and fallback results are recorded in `review/browser-checks.json`.

The check visits all 24 events and supporting sections at 1440×900, 2560×1080, 390×844 and 320×780. It also checks 1024px/tablet and 844×390 landscape resizing, enlarged phone text, precise source times, uncertainty, all selected photo coverage, captions, note opening/closing, forward/back photo decks, packing persistence, keyboard skip/navigation, menu Escape/focus, chapter reversibility, reduced motion, missing GSAP, denied storage, optional missing portraits, HTTP and direct-file use, and the no-JavaScript reading copy.

All itinerary compositions and supporting sections were visually inspected on desktop and phone. The current gallery contains 79 captured screenshots, including wide/narrow views, room frames, all three illustrative alternatives, the final dawn, packing, food, practical notes, menu and footer. Temporary additional snapshots were reviewed for transit tickets, day headings and text-only stops.

Axe 4.14.0 found **zero WCAG A/AA/2.1-AA violations in 71 fully revealed reading-state/navigation contexts**, including the footer and the open phone menu. The exact contexts and incomplete automated checks are retained in `review/accessibility.json`. Photograph-background contrast still requires visual judgment; an automated scan cannot fully assess it. This is not a claim of complete accessibility certification.

The motion-specific `node scripts/verify_motion.cjs` run passed **83 checks** with zero uncaught browser errors. The checks measure multi-step scenery dissolves and opaque coverage, reversibility, held shared backgrounds, destination-only navigation blends, focus/history, wheel/key interruption, rapid retargeting, note unfolding/reversals, photo transitions/repeated clicks, packing feedback, phone-menu reversals, reversible supporting-section reveals, reduced-motion cleanup, delayed navigation/manual scenery decoding and failed-image retention. Recordings and results are available in `review/motion/index.html` and `review/motion/checks.json`. Desktop and phone frame sequences were visually inspected for scenery, navigation, notes and photo decks. Supplemental checks covered deep-link loading, mid-page reload, Escape interruption, early packing interaction and reduced-motion packing.

The story-refinement `node scripts/verify_reveals.cjs` run passed **379 checks** with zero uncaught browser errors. It samples tickets, photos, text, all three room frames, separate cluster photos/text, artwork, crew, packing, destinations, food, facts and footer at matching forward/reverse positions on desktop and phone. It verifies gradual opacity/travel, held partial progress, the reading plateau, overflow, collage stagger, long-note folding/reversal, photo-click independence, keyboard focus/blur, direct links, reload, print and reduced-motion menu behavior. Slower physical-scroll recordings of a photo/text pair, the full collage and the longest note were visually inspected in both directions; results and recordings are in `review/reveals/`.

The preceding artwork baseline `node scripts/verify_artwork.cjs` regression passed **7 checks**, including rapid day/night retargeting, restored gesture opacity, surviving scroll reversal and failed artwork decoding on both viewport sizes. Artwork gestures own cancellable proxy state, so a stale fade cannot leave a sticker dim or kill a scroll reveal.

Post-reveal JavaScript syntax checks, `git diff --check` and source/asset-metadata/unrelated-note hash comparisons passed. The fund addition regenerated the Lucide sprite with one new official piggy-bank symbol. The sprite remains independent of runtime packages. There is no configured npm test suite or build step. Testing used Chromium emulation; physical devices, Safari and Firefox were not tested.

## Fund epilogue

The new `#fund` section sits immediately after the journey home and before crew. Copy, the 2.400.000 ₫ contribution per person and the exact MoMo destination live in `TRIP_DATA.fund`. A transparent two-column composition combines a piggy-bank doodle, two coin circles, a hand-circled amount, a curved arrow and a pink invitation. Phones stack copy, the pig/amount and the action. Hover or keyboard focus gently tilts the pig, using an inner transform independent of the outer scroll reveal. There is no persistent bobbing, payment-status toggle or invented balance.

Both scenery controllers recognize the epilogue as morning; the following crew section holds the same photograph. Every foreground component follows reversible scroll progress. The curved SVG arrow lives inside an HTML wrapper so its layout position can be measured correctly. The no-JavaScript reading copy also includes the amount and MoMo link. At the fund-addition checkpoint, existing trip content was byte-for-byte equivalent when the new `fund` object was excluded; generated photo metadata and the unrelated note are unchanged. Screenshots and physical forward/reverse recordings are in `review/fund/`. The dedicated fund verification passed **155 checks** across six viewport sizes, including every foreground component's gradual reveal, pause, reading plateau and reversal; exact amount/link; local new-tab click interception; keyboard focus; enlarged text; reduced motion; missing GSAP; HTTP/direct-file use; print; and the no-JavaScript reading copy. Corrected desktop and phone frame sequences were visually inspected.

## Post-story performance check

Sequential local Lighthouse simulations after the place/pacing pass measured desktop performance 100, mobile performance 92, and accessibility/best practices 100 in both. LCP was 0.6 s desktop and 2.9 s simulated mobile; both reported zero CLS. These measurements ran while behavioral checks may also have been active; physical devices, field INP and production cache/compression were not measured. Full reports and settings are in `review/story/performance.json` and its two Lighthouse reports. No runtime library or additional imagery was added.

## Preceding countdown performance baseline

The preceding sequential Lighthouse 13.5.0 run after the arrival countdown addition on the local Python preview measured **desktop performance 100, mobile performance 95**, with accessibility and best practices 100 in both. Desktop LCP was **0.6 s** and mobile LCP **2.9 s**; initial-session delivery was **888 KiB / 892 KiB**, respectively. Both runs recorded zero cumulative layout shift. Configuration and complete reports are retained in `review/performance.json` and the two `lighthouse-*.json` files.

The full Lucide library is not requested in either report. Earlier measurements varied; these are the recorded countdown baseline results, rather than a guarantee of production or physical-device performance. The local server has no production compression/cache headers, and field INP was not measured.

Asset credits and source-rights notes remain in ASSETS.md. No production publishing, remote PR, merge or repository commit was performed. The unrelated `note.txt` remains untouched.
