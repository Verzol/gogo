> **Implementation authorized on 19 October 2026.** The user subsequently requested the full plan and unlimited Sunburst generation. The original plan below is retained as the design brief; its earlier approval gates and estimates describe that planning stage. Current behavior, actual assets and verification are in [Location scenes](location-scenes.md) and the [artwork gallery](location-scenes-gallery.md).

> **Artwork source policy updated later on 19 October:** all five locations other than Sống Lưng, including related stickers and effects, now use text-only generation with no image references. Sống Lưng retains its approved art. This supersedes the reference-photo directions in the historical plan below.

# Tà Xùa location scenes: opening-page design plan

[Documentation index](README.md) · [Scenery](scenery.md) · [Motion](motion.md) · [Sky/weather](weather.md) · [Location research](research/places.md)

**Original planning status (superseded): plan only, 19 October 2026. No replacement UI or location images had been generated at that point.** The postcard studio, cloud-reveal workspace and accompanying lake/tree reactions from the preceding implementation have been removed. Their saved concept images and artwork provenance remain historical references, not approved visual direction.

## Design direction

Turn the opening into an illustrated window onto actual Tà Xùa locations. A small collection of painted location stickers lets visitors temporarily leave the cloud opening and enter a distinctly composed landscape. The experience should be compelling as a still image first; animation then reveals distance, atmosphere and material.

Reading this as an immersive Vietnamese travel journal for friends, with cinematic, detailed watercolor landscapes and tactile landmark cutouts. Native HTML/CSS/classic JS remain the foundation. Design dials: **variance 8, motion 7, density 3**. Use fewer controls, stronger art direction and meaningful depth. Preserve the gogo logo, Patrick Hand/Be Vietnam Pro fonts, warm peach accents and existing journal voice.

The user’s new direction explicitly authorizes planning location-specific opening backgrounds. Earlier generic-background constraints are superseded only to this extent: propose original, layered, painterly location scenes. Documentary photos stay in the existing stories. The six scroll-driven worlds remain the journal’s foundation outside the opening.

## What a visitor sees

1. First load keeps the existing cloud world, trip identity, forecast, countdown and primary story/map actions.
2. A rail of six custom painted landmark stickers sits below the main hero copy. Each is a small sculpted cutout with an ink caption, not a photo card. Slight individual angles give the rail personality; labels and hit regions stay still.
3. Hovering a sticker raises its artwork slightly, then the clouds thin and the location emerges behind the hero. The landmark has a clear silhouette; near details and distant atmosphere move at different depths. The hero text stays anchored and readable.
4. The active location name and a short line sit beside the rail, with a separate native link to its existing story. A compact “Tranh minh họa địa điểm” label distinguishes artwork from live weather or documentary photography.
5. Leaving the exploration area restores clouds unless the visitor explicitly holds a location. Switching directly to another sticker transitions between scenes without returning through clouds.
6. Scrolling into the itinerary hands control back to the existing story scenes. There is no pinned section, extra modal, camera fly-through or automatic location carousel.

The sticker rail, short active caption and story link form one hoverable exploration region. Moving the pointer from a sticker to that link must not make it disappear. Background objects are decorative in the first release; they do not introduce a second collection of hidden buttons.

## Six scenes with distinct identities

| Location / existing story target | Still-image composition | Separate motion and foreground detail |
| --- | --- | --- |
| **Sống Lưng Khủng Long** / `#dinosaur-ridge` | A narrow earth ridge leads from the lower foreground toward Háng Đồng, cutting through immense overlapping valleys. Cool jade shadow, a warm early sun and translucent clouds below the ridge. Preserve the recognizable narrow trail and ridge shape. | A low cloud ribbon slowly passes behind the ridge; a small foreground grass tuft bends once as the scene settles. Terrain stays rigid. Three depth planes produce restrained pointer parallax. |
| **Cây Cô Đơn** / `#place-cay_co_don` | The recognizable lone tree frames the right edge above the turquoise Suối Sập reservoir and folded valley walls. Warm ochre earth, deep foliage and a luminous ribbon of water. Keep this composition distinct from Hồ Mắt Ngọc. | A separately painted outer foliage cluster moves very slightly; a lake reflection overlay slowly shifts below it. The trunk remains anchored. No rubbery rotation of the entire tree. |
| **Mỏm Cá Heo** / `#place-mom_ca_heo` | The two characteristic projecting rock forms create a powerful silhouette against a peach/coral dusk and successive indigo ridges. Recompose the camera toward a text-safe left lane while retaining the rock profile. | A thin veil of valley haze crosses behind the immovable rock; one small pair of distant birds can traverse once on entry. No people standing on a risky ledge or glowing rock edges. |
| **Thảo nguyên Tà Xùa** / `#meadow` | A broad open meadow, curved grassy horizon and distant steep mountains under a big, luminous sky. Moss and olive foreground with cool blue distance; restrained afternoon sunlight. | Two narrow foreground grass patches sway out of phase; a broad, low-contrast cloud-shadow wash drifts across the meadow. It should feel open and windy rather than crowded with particles. |
| **Thác Chua Tỳ** / `#waterfall` | The selected waterfall descends over dark rock, framed by wet foliage and a small foreground stream. Emerald shade, pale water and a controlled shaft of sky light. Match the supplied waterfall geometry rather than inventing an oversized fantasy cascade. | The painted waterfall has a separately masked flow strip and a fine spray layer at the base. Slow foreground fern movement creates depth. Avoid a stock rain texture or a giant animated white gradient. |
| **Thào Coffee** / `#thao-coffee` | An intimate view framed by the café’s evidenced timber/roof details, with a warm cup in the lower foreground and mountains opening beyond. Ground architectural details in P08/P08b and additional verified references; do not invent a signature terrace. | Steam curls independently from the cup; a small foliage edge moves near the roof. Warm foreground contrasts with cool mist beyond. Architectural lines and painted lettering remain fixed. |

These six offer distinct silhouettes, palettes and types of motion. Khe Cải is the next candidate, followed by Ameii Hill, after this set is visually convincing. Khe Cải needs its own verified visual references and composition; it must not be another generic cloud ridge. The existing four-item destinations section is not silently expanded or repurposed by this opening-only feature.

## Hero layout and responsive direction

**Desktop:** retain title/copy at upper left and forecast/countdown at upper right; give the lower hero to the main landmark and the sticker rail. Design each scene with calm upper-left and upper-right reading zones, with the focal landmark around the lower/right two thirds. Text contrast comes primarily from authored light placement and scene-specific ink tokens, supplemented only by a localized subtle scrim if needed. Do not hide a detailed image behind a broad white wash. Treat bright and dark scenes deliberately rather than switching the entire website theme.

The current hero already fills most of 1440 × 900 and the 390px hero extends beyond one viewport. The rail needs a real grid row, not absolute positioning on top of copy, weather or the clock. Existing map/story actions remain separate. A taller hero at small heights is preferable to clipping content.

**Phone:** place the sticker rail after the primary story/map actions and before the forecast/clock. Six compact targets use a visible three-by-two arrangement rather than a hidden horizontal drawer. Use a dedicated portrait composition for every landscape, with the landmark in the lower/right region and a calm reading area behind the content. Natural document scrolling continues. Selected scenery stays while tapping between stickers, and clears on leaving the hero. Do not crop a desktop image until its landmark disappears. No device-orientation permission, hover emulation or full-screen takeover.

**Wide/short/enlarged text:** allow the rail and weather to reflow; keep text and controls at their usable sizes. Verify 320/390/768/1440/2560px widths, short landscape and 200% text. Preserve the existing decorative-motion control in every mode.

## Input and transitions

- Fine pointer: about **160ms intent delay** prevents accidental scene loads; leaving the whole exploration region allows about **120ms grace** before restoring the default. Movement between adjacent stickers cancels restoration. These are starting values for tuning, not measured results.
- Keyboard: Tab focuses native buttons and previews the same scenes. Enter/Space holds or releases a selection. Escape clears a held/transient scene without requiring focus to move. Focus outlines stay on the stationary hit region.
- Touch: one tap selects and holds the scene; another location switches it. An explicit “Về biển mây” control clears it. The separate story link navigates directly, avoiding a two-tap link trap. Controls remain at least 44 × 44 CSS pixels.
- Visual preview and explicit selection are separate states. `aria-pressed` describes held selection, not every mouse hover. Do not narrate every decorative animation; announce a deliberate location selection briefly.
- Entry: decoded incoming landscape dissolves over the current visible composition in approximately **650–850ms**. Its own foreground settles by **8–14px**, then the ambient layers continue. Avoid zooming the whole screen or using opaque clouds as a wipe across reading text.
- Fine-pointer parallax: start with maximum displacements near **3px far / 6px middle / 10px foreground**. No page tilt. Pointer leave eases depth back to neutral. Touch has ambient movement but no pointer chase.
- Reduced motion or existing pause: allow immediate static selection, with no parallax, sway, particles, camera travel or animated crossfade. Hidden tabs and offscreen scenes pause. Print and missing enhancement scripts retain ordinary trip content.

Hover behavior must remain dismissible and stable while a visitor moves to related controls. The background is not a place for essential content that is only available on hover. See the new [research references](sources.md#location-scene-planning-references).

## Art production: approve the scene before building its mechanics

Use **9Router `cx/gpt-image-2.5-sunburst`**, with current-site screenshots as style references and existing real location photographs as geometry references. No new images are generated in this planning step.

1. **Pilot with the ridge.** Prepare desktop/phone composition briefs, then generate three deliberately different art candidates. Review their actual appearance in a static hero composition with real title, forecast, clock and sticker rail. Choose based on atmosphere, location recognition, text contrast and phone framing, not image detail alone.
2. **Prove motion from matching layers.** For the approved ridge, derive/edit a clean background plate with the occluded area painted in, landmark/midground layer, foreground layer and mist overlay. Shared camera, lighting, horizon and overlapping edges are mandatory. A screenshot plus random independently generated stickers is not a coherent scene.
3. **Review one moving ridge prototype.** Only after a later implementation request. Validate transition, interruption, reading contrast, reduced motion and actual phone performance before extending to the other five scenes.
4. **Complete the coherent collection.** Produce one desktop and one portrait master per location, three or four matched compositing layers per composition, and one dedicated transparent sticker per location. Generate replacements until landmarks and style are consistent. Some locations need an additional small effect plate: foliage, reflection, water/spray or steam.

Expected deliverables are **12 composition masters**, **roughly 36–48 scene layers**, **six sticker masters**, plus a few scene-specific effect plates. These are planning estimates; share real existing clouds where appropriate rather than generating assets merely to reach a count. Preserve every returned master, prompt, reference hash, actual native dimensions, intended focal point and derivative mapping.

Asset quality gates:

- Recognizable reference geometry, especially dolphin-rock profile, reservoir setting and narrow Háng Đồng ridge. Do not substitute the Trạm Tấu summit trek or combine separate lakes.
- Detailed, atmospheric watercolor/gouache with coherent depth and restrained paper texture. No cartoon clip-art, generic green triangles, invented monuments, baked-in UI, text or logos.
- Main light, horizon, scale and camera match across all layers; separated elements expose no empty holes, doubled landmarks, alpha halos or rectangular edges while moving.
- Portrait scenes are composed from their masters with deliberate edits or new generation, not arbitrary center crops. Check actual generated dimensions; never upscale a 1536px return and claim it is native 4K.
- Review full compositions and small sticker silhouettes at actual display sizes. Inspect every PNG for true alpha rather than a checkerboard painted into the image.
- Label generated locations as illustrations. Keep original-photo credits and provenance; generated art must not be presented as a forecast or a documentary image.

Proposed paths after later approval: `figures/raw/location_scenes/<place>/`, `figures/scenery/locations/`, `figures/decor/painted/location_stickers/`, `docs/prompts/location_scenes/`, and `data/sources/location-scenes.json`. None of these replacement assets exist yet.

## Ownership, state and lifecycle

The current owners were inspected before writing this plan:

- `scenery.js:initOpening` creates `#openingWorld` inside `#sceneLayers`; `updateOpening` derives physical hero-exit geometry from copy/summary. A new rail must be part of those measured essentials, so scene handoff never cuts through its controls.
- `main.js:renderSupportingContent` currently owns four destination anchors near the end of the page. The proposed hero chooser is a separate rendering surface with explicit stable location IDs and story targets; it should reuse source artwork/data where appropriate rather than mutate the itinerary.
- `motion.js:sceneSnapshot` clones `#sceneLayers` for anchor/fling continuity. Location preview layers need a clear reset-before-snapshot contract so no active location leaks into story navigation or duplicates controls/effects.
- `weather.js` already has hover/focus/held date previews and clears them on `journey:opening-exit`. A location preview cannot independently overwrite those same weather properties.
- `playful.js` exposes separate sun/cloud controls over the hidden scenery. While a location scene replaces the opening sky, suppress the underlying opening sun/cloud targets so invisible objects cannot be clicked.

Proposed implementation: an optional classic `location-scenes.js` / `location-scenes.css`, plus a small static manifest, owns chooser state, decoding, two compositing slots and scene-local motion. `scenery.js` exposes a narrow opening-preview boundary. The new module must never write story-panel opacity, `data-scenery-world`, itinerary dates, weather forecasts or scroll position.

Define one active **visual preview owner** for the opening. Selecting a location clears the date-preview hold through a small `weather.js` API; choosing a forecast date clears the location preview. Forecast numbers remain visible and authoritative. The scene’s authored sunrise/dusk is illustrative, not the forecast for a selected date. Merely leaving a location does not silently reapply a stale date preview. No preview makes an additional forecast request.

Priority: visible dialog/navigation → hero exit → most recently chosen location or weather preview → default clouds. Escape, menu/dialog opening, following any anchor, `journey:opening-exit`, pagehide and loss of relevant focus clear location state. Pause/visibility/preference changes stop effects. Resize swaps composition while retaining the chosen location, using decoded assets and no image flash. Keep the controller usable without GSAP; the base trip remains usable without the optional module.

For rapid A→B→C pointer movement, use a request generation ID: stale loads may enter the resource cache but may never become visible. Retarget transitions from the currently visible composition, not from an empty panel. At most two full scene compositions are live in the DOM, with a bounded cache and no accumulated timers/particles.

## Loading and performance targets

- Keep original clouds as the initial render. No six-scene image preload in the document head and no live image-generation service in the browser.
- Small sticker derivatives load independently. Start scene decoding after genuine hover/focus intent or explicit selection. During the first decode, keep the current world intact and show a quiet selected-button loading cue; a failure leaves a readable cloud scene and retry path.
- Downsample derivatives by measured display needs; use separate portrait variants and WebP with real transparency. A still composite fallback can be lighter than loading every motion layer on constrained devices.
- Initial planning budgets: stickers together around **150KiB or less**; a selected scene around **1MiB desktop / 500KiB phone** encoded. These are targets to validate, not current measurements or reasons to accept poor art.
- Encoded size is not decoded memory. Budget active layers explicitly from width × height × 4 bytes, unload obsolete layer references, and measure memory/frame time on a phone before expanding the collection. A smooth static composition is preferable to a stuttering multi-layer one.
- Animate transform/opacity on bounded layers; no full-screen animated blur, displacement filters, large particle canvas or WebGL dependency. Schedule pointer work once per frame only while relevant. No continuous work while hidden/offscreen.

## Proposed sequence and future checks

This document completes the **plan-only** request. No scene generation or replacement code should proceed until the user asks to continue. Recommended next deliverable is the **three ridge art candidates and matching phone directions**, followed by one carefully reviewed moving prototype.

Future verification should cover: desktop hover/focus and phone selection; rapid switching and late decode; outgoing visual continuity; missing assets/storage/GSAP; no hover-triggered weather requests; pause/reduced motion; modal/menu/anchor cleanup; decoded-cache bounds; phone text/landmark composition; direct-file loading; and print. Relevant existing suites are weather, illustrated scenery, motion, mobile UI, playful objects and journey. Inspect actual rendered Vietnamese fonts and screenshots as separate gates from functional checks.

Current rollback verification is recorded separately below; it is not evidence for this proposed feature.


## Rollback verification · 19 October 2026

The removed feature’s changes to `index.html`, `playful.js`, `playful.css`, `scripts/verify_playful.cjs`, `docs/playful.md` and `docs/verification.md` were restored byte for byte to their pre-feature Git versions after inspecting their diffs. The optional `keepsakes.js`, `keepsakes.css` and `verify_keepsakes.cjs` files were deleted. Prior generated masters, prompts, derivatives and requested concept PNGs remain preserved, unused by runtime. Their implementation guide is explicitly archived.

The existing playful-object suite passed **127 Chromium checks**. A separate 1440px/390px smoke inspection found zero removed feature controls, zero requests for their scripts/styles, two original scenery hotspots, no horizontal overflow and no uncaught browser errors. Screenshots are under `/tmp/taxua-removal-review/`; suite evidence is under `/tmp/taxua-playful-review/`. The preview server was restarted after it became unavailable; checks were rerun successfully. Documentation links and whitespace checks passed. This was focused rollback validation, not a full-site or cross-browser suite. No proposed location scene was generated, implemented or tested.
