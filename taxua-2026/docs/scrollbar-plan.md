# Sợi mây · scrollbar design plan

Status: implemented, 17 October 2026. The proposal below is retained as the design brief; current ownership and behavior are in [Shared controls](controls.md#sợi-mây--page-and-panel-scrollbars). The final user revision keeps a cloud-only handle, restores the solid progress line and dotted track, and adds eight palettes tied to the actual scenery world and reading period. It reuses existing paired cloud stickers without changing their masters. Runtime keeps a 60px minimum thumb target, a 44px edge lane, and disables the enhancement in windows at or below 520px tall. The ribbon proposal below is historical; the thread is restored. The original planning-pass evidence at the end describes that earlier inspection, before implementation.

[Documentation index](README.md) · [Identity](identity.md) · [Motion](motion.md) · [Shared controls](controls.md) · [Verification](verification.md)

## Direction

Turn the page scrollbar into a small handmade object: **Sợi mây**, a cloud sliding along a stitched thread at the outer edge of the journal. Cream pigment, jade shadows and restrained ochre stitching connect it to the existing painted clouds, woven accents and game objects.

The thread marks reading progress. The cloud is the draggable thumb, with a short vertical fabric body so its silhouette still reads as a scrollbar handle. Keep the painting simple enough to recognize at about 30px wide. Hover/focus strengthens the outline and thread; dragging feels direct. There is no autonomous bobbing, sparkle loop or trailing particle effect.

Use one edge control throughout the page. Existing itinerary dates and stop links retain their own purpose and behavior; the scrollbar adds no second chapter menu or navigation labels.

## Inspection findings

- `style.css` declares `color-scheme: dark` globally, while the hero is a bright cloud scene. The root scrollbar has no explicit styling. Chromium inspection with scrollbars visible confirmed `scrollbar-color: auto` and `scrollbar-width: auto`.
- The current page shows a conventional gray track/thumb against both the warm hero and blue night world. Inspection covered desktop 1440×900 and phone-width 390×844 screenshots.
- Scrollable surfaces already include `.photo-back`, `.trail-panel`, the compact navigation menu, `.card-hand`, atlas sidebar/flow/peek panels, and `.journal-select-menu`. Some use thin colored bars; styling is distributed across `style.css`, `games.css`, `trip-map.css` and `controls.css`.
- Desktop `.chapter-nav` sits near the right edge. In the inspected 1440px view it ends at x=1405, immediately before the native scrollbar gutter. A painted handle needs deliberate clearance.
- `JourneyUI.setSceneryTone()` already exposes `data-nav-tone` on the root. Use this existing bright/dark scenery contrast signal for the two artwork variants; no independent clock or theme switch.
- `motion.js` already handles scrollbar jumps, native manual scrolling, interrupted anchor travel and scene catch-up. The new control must let these paths continue to run.
- The working tree was clean at inspection. Port 8000 already served the repository and was reused.

## Appearance and responsive behavior

| Surface | Proposed treatment |
| --- | --- |
| Desktop, fine pointer and hover, at least 1100px wide | Painted cloud thumb on a fine vertical stitched thread, in a reserved edge lane |
| Bright opening | Warm ivory cloud, jade outline/shadow, muted ochre stitch; dark jade thread |
| Later darker worlds | Moonlit ivory/blue-gray cloud with warm thread; retain the generated painting's colors |
| Touch devices, tablets, narrower windows | Native page scrollbar with supported theme colors; ordinary touch scrolling and platform indicator behavior |
| Paper surfaces: photo backs and atlas | Quiet jade thumb over a warm paper track |
| Jade surfaces: trail/menu/select panels and card hands | Quiet cream/ochre thumb over a subdued jade or transparent track |
| Forced colors, no JavaScript, initialization failure | Native scrollbar remains available |
| Print and standalone `itinerary.html` | Hide the decorative component for print; keep the reading copy's existing independent presentation |

Initial desktop dimensions: 32px visual lane, at least 44px interaction width, 8px outer inset, and roughly 96px top / 24px bottom clearance. Thread is approximately 2px wide. Use a proportional thumb with a minimum 48px height; its central painted cloud keeps its aspect ratio rather than stretching with document length. A narrow CSS fabric stem can extend the thumb for shorter documents.

Reserve about 52px at the page edge for the enhanced state. Adjust the desktop date rail, its open stop panel, topbar right inset and any edge controls as needed after checking their actual bounds. Do not add padding to the document's entire reading column. Treat these numbers as starting dimensions to validate visually, including short landscape and enlarged text.

The thread stays quiet but visible. Hover, keyboard focus and dragging reveal its stronger stitch detail. A handwritten hint, “Kéo để lướt nhật ký”, may appear inward on hover/focus only, outside the date panel. No persistent percentage badge or extra section dots.

## Artwork plan · 9router-image

Live discovery confirmed **`cx/gpt-image-2.5-sunburst`** on 17 October. Its model information reports `text2img`, `edit`, `multiImage`, and parameters `size`, `quality`, `background`, `image_detail`, `output_format`. Generation subsequently completed using the [exact prompt](prompts/scrollbar/01_cloud_thumbs.md); request metadata and master hashes are in `figures/raw/scrollbar/generation.json`.

Generate one reference-guided sheet with exactly two separated cloud-thumb designs. Request high-quality transparent PNG using the supported size/options confirmed at generation time. Use the existing `cloud_hero_left.webp` and painted wheel/coffee details as style references, with reference hashes recorded. These are references for pigment, edges and palette; do not copy a large cloud bank into the narrow scrollbar.

Brief:

> Two separate tiny vertical cloud bookmarks, front view, on genuine transparent alpha with generous gutters. Each has the same compact silhouette: a soft asymmetric watercolor cloud gathered around a short narrow woven ribbon, one restrained gold stitch down its center. Left: warm ivory and pale peach highlights with jade-blue undersides, readable on a pale sunrise sky. Right: moonlit ivory and blue-gray pigment with a muted warm stitch, readable on indigo and jade skies. Match the supplied Tà Xùa watercolor assets: visible paper pigment, loose natural edges, simple forms readable at 30px wide. Equal apparent size. No text, faces, sun, rays, glow, scenery background, interface mockup, checkerboard, or baked drop shadow.

Review the sheet at full size and at actual display size over both the hero and night scenery. Reject muddy silhouettes, weak contrast, excessive miniature detail, opaque backgrounds or clipped edges. If the ribbon/cloud composition reads poorly, simplify the silhouette before adding code.

Planned files:

- Exact brief: `docs/prompts/scrollbar/01_cloud_thumbs.md`, with a short prompt index.
- Untouched master and request record: `figures/raw/scrollbar/cloud_thumbs.png` and `generation.json`.
- Two trimmed transparent runtime cutouts: `figures/decor/painted/scrollbar_cloud_day.webp` and `scrollbar_cloud_night.webp`.
- Provenance: `data/sources/scrollbar-artwork.json`, including model ID, prompt, reference hashes, request options, timestamps, original hash, measured crops and derivative dimensions.
- Preparation helper only if needed for reproducible extraction: `scripts/prepare_scrollbar_artwork.py`.

Use existing paper grain plus CSS geometry for the thread/stitches. Keep labels, focus ring, thumb geometry and interaction in code. Preserve masters, downsample without upscaling, and aim for less than 50KB combined runtime artwork after checking visual quality. Failed/missing artwork must leave a visible CSS thumb.

## Component behavior and integration

1. Add a small optional classic-script component, `scrollbar.js`, and scoped `scrollbar.css`, linked from `index.html`. Keep existing scripts in their established order; load this independent enhancement after the existing application scripts.
2. Apply native scrollbar colors first. Prefer standards-based `scrollbar-color`/`scrollbar-width`, with scoped WebKit pseudo-element fallback. Avoid competing rules: non-auto standard properties can override the WebKit styling. Reconcile existing feature declarations rather than relying on a universal selector.
3. Only enable the custom page control for the eligible desktop media query after its DOM, measurements and event handlers work. Hide only the root native scrollbar in that successful state. Nested scrollbars stay native. A failed image uses the CSS thumb; initialization failure restores the native root bar. Never leave an invisible or unusable sole scrollbar.
4. Keep the document as the scrolling element. Wheel, trackpad, touch, selection, normal keyboard scrolling, history and native anchors retain their browser paths. Do not intercept wheel/touch input, wrap the page in an artificial scroller, pin content or add a smoothing library.
5. Map thumb travel to `scrollY / max(1, scrollHeight - clientHeight)`. Measure visible track height and thumb travel, clamp both ends, and size the thumb from the viewport/document ratio. Hide the enhancement when there is no scroll range. Scroll events update the thumb through a single scheduled animation frame; there is no continuous idle loop.
6. Dragging uses pointer capture, preserving the initial grab offset. Only pointer gestures on the control perform direct document scrolling. Track clicks page toward the pointer rather than unexpectedly jumping the full story. Hold-to-repeat is optional and should be omitted unless it improves ordinary scrollbar use. Handle pointer cancel, lost capture, window blur and removal without leaving selection disabled.
7. A deliberate scrollbar gesture interrupts any running enhanced anchor travel. Inspect the existing pointer/key interruption hooks in `motion.js` before adding integration; reuse them where possible. Thumb position always follows the resulting document position, including interrupted travel and deep-link landing.
8. Expose one focusable `role="scrollbar"` control with a Vietnamese accessible name, `aria-controls` targeting a stable main-content ID, vertical orientation and min/max/current values. Use current percentage without making it a live region. Arrow keys move a small step; Page Up/Down move a viewport less the topbar allowance; Home/End reach the document boundaries. Prevent default only for keys handled while this control has focus. Show a clear focus outline around the full target.
9. Recompute bounds after viewport/visual-viewport changes, fonts/images settle, and disclosure/content height changes. Observe content size, coalesce reads/writes, and avoid feedback loops from the component's own updates. Test notes, the game drawer and font reflow specifically.
10. During atlas modal/fullscreen use, suspend and hide the page-edge control, preserve the underlying scroll position, and retain the atlas's own themed native bars. Resume after close. Dropdown popovers retain their own scrolling and top-layer behavior.
11. Follow existing root contrast state without altering scenery logic. Respect reduced motion and decorative-motion pause: scrolling feedback remains direct; optional hover transitions become instant. Forced colors restores native bars. Teardown on breakpoint/input changes removes listeners/observers, cancels pending updates and restores the root bar without moving the reading position.

## Implementation sequence

1. Generate and prepare the two small assets; review them at real size on existing screenshots. Record prompts/provenance.
2. Implement unified native scrollbar styling for page and nested surfaces. Check paper/jade contexts and horizontal card scrolling.
3. Add the desktop painted enhancement with guarded activation, responsive clearance and keyboard support. Validate native scroll/anchor behavior while integrating it.
4. Review the complete page in the six worlds, with the date index and atlas open, before tuning pigment, spacing and interaction feedback.
5. Update `docs/controls.md` with ownership/fallbacks, `docs/motion.md` with the integration contract, `docs/identity.md` with artwork provenance, and the documentation index. Record actual verification results after implementation.

## Acceptance and validation

- Inspect actual desktop screenshots at 1440px and a narrower eligible desktop; compare bright opening, night, bluehour, daylight, jade and afternoon. The handle reads as a small painted object, preserves contrast and does not cover the topbar, dates, stop panel or reading copy.
- Use a real pointer drag at top/middle/bottom, track clicks and keyboard controls. Confirm accurate position after notes expand, fonts load, game settings open, a distant anchor travels, and a drag interrupts that travel. Check thumb bounds at both document ends and no-scroll documents.
- Check 390px, 320px, short landscape, coarse-pointer/hybrid devices, and 200% text. No horizontal page overflow or additional touch blocker; native platform indicators remain available on phones.
- Exercise atlas modal/fullscreen opening/closing, atlas/sidebar/peek scroll, dropdown scrolling, photo-back scrolling, long trail menus and horizontal card hands. Page control must not scroll behind a modal.
- Check reduced motion, forced colors, missing images, unavailable enhancement, direct `file://` use, print and the standalone reading copy. Resize across the enhancement breakpoint without losing scroll position or focus into a removed control.
- Use focused interaction assertions for this new control, then relevant existing `verify_motion.cjs`, `verify_mobile_ui.cjs` and `verify_controls.cjs` coverage, with evidence directed outside the checkout. Run map checks if modal/fullscreen integration changes, and artwork checks if source preparation affects shared assets. Run syntax and whitespace checks for changed files.
- Chromium is available locally. Check Firefox/WebKit only if their browser binaries are available; report gaps explicitly. Native scrollbar appearance depends on browser/OS overlay settings, so separate computed-style checks from visual/interaction evidence.

## Evidence from this planning pass

Reviewed contributor instructions, documentation index, identity, scenery, motion, shared controls, UI artwork and verification guides; traced root/nested scrolling styles, scenery contrast state, layout owners and relevant verification helpers. Reused the live preview and captured fresh desktop/phone hero/story images under `/tmp/taxua-scrollbar-*`. The brief browser inspection reported no uncaught JavaScript errors. Weather requests were intentionally blocked for those screenshots; this was not a forecast or full regression test. Sunburst model discovery and capability lookup succeeded. No assets were generated, and no runtime implementation or regression suite was run.
