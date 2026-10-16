# Scroll, transitions and navigation

[Documentation index](README.md) · [Scenery](scenery.md) · [Verification](verification.md)

## Owners

- `motion.js`: optional `JourneyMotion` enhancement using local GSAP/ScrollTrigger 3.15.0.
- `main.js`: ordinary menu, notes, photo decks, packing and `JourneyUI` native scenery fallback. Content renders before GSAP.
- `style.css`: reveal variables, independent gesture styling, reduced-motion and print rules.
- `scenery.js`: decoded panel readiness, reversible terrain drift, independently measured physical opening descent and continuous offscreen-recycling cloud tracks. Cloud playback rates change without resetting their phase; pause/reduced-motion/visibility controls preserve their pose.
- `weather.js` / `weather.css`: optional hero previews, ambient loops and the decorative-motion pause control; see [Sky and weather](weather.md).

Mobile navigation compacts the brand after 24px of scrolling (or with enlarged root text). The date rail lives inside the itinerary, remains sticky only there, and becomes invisible/inert outside that reading region on every viewport. Its expandable stop index uses native anchors; four dates stay visible on phones and short landscape. Mobile menu destinations include fund, wheel and practical details. `main.js:initNav` measures the header/date/toggle height into `--nav-offset`; the absolutely positioned stop panel adds no second offset. Native scroll padding and enhanced anchor travel share the measurement. Event/cluster scroll margins do not add a second offset. Native day/wheel disclosures request a measurement refresh; no scrolling is pinned or intercepted for them.

## Scenic transitions

- Native manual scrolling stays native; no pinning or scroll hijacking. Consecutive identical worlds hold steady.
- Dissolves span up to 1.23 viewports, bounded by chapter spacing, with a separate 0.55 s numeric scrub. Outgoing panels stay opaque underneath incoming ones.
- Fast flings catch up directly to the landing scene with one 850 ms dissolve; late decode uses 600 ms catch-up. Never replay every skipped chapter.
- Hold the opening lighting until the lowest essential hero content clears the top reading lane. Both controllers use the measured copy/summary boundary. Cold/deep-link landings decode both panels required for a partial blend.
- Reduced motion/missing GSAP use discrete native-scroll scenes, including Khe Cải's within-event dawn. Breakpoint/preference changes revert old timelines and restore controls.

## Foreground reveals

- Every visit reversibly ties opacity/travel to physical scroll position with 0.18 s scrub. Text enters from 96% to 76% viewport height so reading copy settles early; photos and grouped transit tickets retain the 96% to 54% range. Small support staggers retain their measured delay.
- Desktop photos enter from their layout side; text rises, transit tickets move as groups. Phones use short vertical travel; collages/support rows use small stagger distances.
- Measure stable layout positions (`layoutTop`/`layoutLeft`), excluding animated transforms. Pausing must hold a partial state; reverse scrolling must retreat along the same path.
- Proxy progress owns `--reveal-opacity`, `--reveal-x`, `--reveal-y`, `--reveal-rotation`. Fold/deck/sticker gestures own separate properties so interactions cannot kill reveals.
- Keyboard focus exposes its component; blur restores scroll progress. Hero is readable immediately; print exposes all content.
- Add new elements to the appropriate reveal registration in `motion.js`, including any separate notes or inner photo frames. Keep SVG reveal targets inside measurable HTML wrappers.

## Navigation and small gestures

- Topbar shortcuts follow document order: itinerary → crew → member wheel (inside crew) → fund → packing → destinations → food → practical notes. Desktop shows the first seven; practical notes remain in the mobile menu. The fund pig has a gold stroke/fill, warm dark backing and a gold outline that stays readable in both navigation tones. The wheel uses the official Lucide dice icon, distinct from the crew icon. Mobile menus retain all eight named destinations and the same gold fund treatment.
- Real anchors preserve hashes, history, destination focus, reload and direct links. Desktop dates occupy the outer margin; phone dates stick below the topbar. Their stop list highlights reading location and persists nothing. See [Illustrated controls](ui-artwork.md).
- Enhanced travel takes 0.65–1.1 s and dissolves directly to the destination. Keep an outgoing snapshot until destination cutouts decode. Freeze ambient transforms and weather blend weights in that snapshot; precipitation stays outside it. Clear live forecast previews before travel.
- Wheel, touch, pointer/navigation keys interrupt travel immediately. Apply the topbar offset once; avoid combining duplicate padding and scroll-margin offsets.
- Notes, decks, menu, labels, artwork and packing feedback use brief cancellable animations. Rapid clicks retarget; stale fades cannot leave artwork dim or gestures queued.
- Refresh measurements after fonts, unfolded notes and photo changes settle. Keep menu Escape/focus behavior and reduced-motion controls intact.
- Clicking/tapping a main story photograph rotates its faces inside the existing outer reveal owner. There are no visible turn controls or hints; illustrative captions stay outside the clickable rotation. Native button keyboard behavior, reduced motion and decorative-motion pause remain supported. Deck navigation resets incoming photographs to their front. See [Photo backs](journal-objects.md).

## Current pacing

Spacing was shortened on 15 October after the user found the stretched version too long. At a 900px viewport, itinerary height changed from 24,259 to 20,234px desktop and 30,555 to 25,020px phone (about 17%/18% shorter).

Tune event/day padding, photo-event minimum heights, cluster gaps and `#khe-cai` in `style.css`; keep chapter grouping instead of adding empty space at every stop. Phone photo sections use natural content height. Measurements: [pacing.json](../review/illustrated/pacing.json).

Run `verify_motion.cjs` for scene/navigation gestures, `verify_reveals.cjs` for physical forward/reverse states, `verify_artwork.cjs` for period swaps and `verify_story.cjs` for pacing. Existing evidence is historical until rerun.
