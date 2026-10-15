# Scroll, transitions and navigation

[Documentation index](README.md) · [Scenery](scenery.md) · [Verification](verification.md)

## Owners

- `motion.js`: optional `JourneyMotion` enhancement using local GSAP/ScrollTrigger 3.15.0.
- `main.js`: ordinary menu, notes, photo decks, packing and `JourneyUI` native scenery fallback. Content renders before GSAP.
- `style.css`: reveal variables, independent gesture styling, reduced-motion and print rules.
- `scenery.js`: decoded panel readiness and reversible terrain drift.

## Scenic transitions

- Native manual scrolling stays native; no pinning or scroll hijacking. Consecutive identical worlds hold steady.
- Dissolves span up to 1.23 viewports, bounded by chapter spacing, with a separate 0.55 s numeric scrub. Outgoing panels stay opaque underneath incoming ones.
- Fast flings catch up directly to the landing scene with one 850 ms dissolve; late decode uses 600 ms catch-up. Never replay every skipped chapter.
- Hold the opening until the dark hero text clears the reading zone. Cold/deep-link landings decode both panels required for a partial blend.
- Reduced motion/missing GSAP use discrete native-scroll scenes, including Khe Cải's within-event dawn. Breakpoint/preference changes revert old timelines and restore controls.

## Foreground reveals

- Every visit reversibly ties opacity/travel to physical scroll position: approximately 0.42 viewport entry distance and 0.18 s scrub; fully visible through the reading zone.
- Desktop photos enter from their layout side; text rises, transit tickets move as groups. Phones use short vertical travel; collages/support rows use small stagger distances.
- Measure stable layout positions (`layoutTop`/`layoutLeft`), excluding animated transforms. Pausing must hold a partial state; reverse scrolling must retreat along the same path.
- Proxy progress owns `--reveal-opacity`, `--reveal-x`, `--reveal-y`, `--reveal-rotation`. Fold/deck/sticker gestures own separate properties so interactions cannot kill reveals.
- Keyboard focus exposes its component; blur restores scroll progress. Hero is readable immediately; print exposes all content.
- Add new elements to the appropriate reveal registration in `motion.js`, including any separate notes or inner photo frames. Keep SVG reveal targets inside measurable HTML wrappers.

## Navigation and small gestures

- Real anchors preserve hashes, history, destination focus, reload and direct links. Desktop date rail is outside the story; phone dates stick below the topbar.
- Enhanced travel takes 0.65–1.1 s and dissolves directly to the destination. Keep an outgoing snapshot until destination cutouts decode.
- Wheel, touch, pointer/navigation keys interrupt travel immediately. Apply the topbar offset once; avoid combining duplicate padding and scroll-margin offsets.
- Notes, decks, menu, labels, artwork and packing feedback use brief cancellable animations. Rapid clicks retarget; stale fades cannot leave artwork dim or gestures queued.
- Refresh measurements after fonts, unfolded notes and photo changes settle. Keep menu Escape/focus behavior and reduced-motion controls intact.

## Current pacing

Spacing was shortened on 15 October after the user found the stretched version too long. At a 900px viewport, itinerary height changed from 24,259 to 20,234px desktop and 30,555 to 25,020px phone (about 17%/18% shorter).

Tune event/day padding, photo-event minimum heights, cluster gaps and `#khe-cai` in `style.css`; keep chapter grouping instead of adding empty space at every stop. Phone photo sections use natural content height. Measurements: [pacing.json](../review/illustrated/pacing.json).

Run `verify_motion.cjs` for scene/navigation gestures, `verify_reveals.cjs` for physical forward/reverse states, `verify_artwork.cjs` for period swaps and `verify_story.cjs` for pacing. Existing evidence is historical until rerun.
