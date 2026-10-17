# Shared journal controls

[Documentation index](README.md) · [Identity](identity.md) · [Games](games.md) · [Verification](verification.md)

`controls.css` owns input, textarea, checkbox, radio, select, range, file-picker and disclosure styling. `controls.js` progressively enhances ordinary single-select dropdowns. Both load after the feature styles/scripts; retain existing script order. No library or build step is required.

## Sợi mây · page and panel scrollbars

`scrollbar.css` owns native page/panel scrollbar colors; `scrollbar.js` adds the optional desktop cloud handle. They load after existing feature styles/scripts. The document remains the native scroller, including wheel, touch, anchors and browser history. The component adds no smoothing or continuous animation loop.

At widths of at least 1100px and heights above 520px, with a fine primary pointer and hover, a single painted cloud follows a solid progress line and dotted track. The ribbon stays removed. The handle has a 44px-wide target and a proportional height of at least 60px. Dragging captures the pointer and preserves its grab offset; clicking the track moves one reading viewport. The focusable, named scrollbar supports Arrow Up/Down, Page Up/Down and Home/End and exposes its position through ARIA. The hover/focus hint stays inward of the itinerary date rail. Notes, font/image loading, game drawers and viewport changes refresh its measurements.

`JourneyUI.setSceneryTone()` exposes the dominant world as root `data-scenery-world`, shared by native and enhanced scenery paths. Together with the existing `data-scene` period, it chooses eight local cloud palettes: warm sky, indigo night, lavender predawn, golden dawn, mint morning, pale blue noon, peach afternoon and mauve evening. Dawn/morning and afternoon/evening retain distinct colors within their shared scenery worlds. The track and CSS cloud fallback follow the same palette. No new theme preference is stored. Desktop topbar/date controls leave a dedicated edge lane. Phones, coarse pointers, narrow/short windows and forced colors retain native bars. Photo backs, trail menus, compact navigation, card hands, atlas panels, select menus and textareas use quiet cream/jade native scrollbars. Paper contexts use jade thumbs. Browser/OS overlay settings still govern native bar visibility.

Enhancement activates only after its stylesheet, DOM and handlers are ready. Missing script, stylesheet or required browser APIs leave the native bar available; failed artwork leaves a small CSS cloud. Opening the atlas suspends the page control and retains atlas scrolling, including fullscreen. Closing restores the reading position. Breakpoint/forced-color/print teardown restores the native bar; keyboard focus moves to the main reading content when the focused handle disappears. Print hides the decorative control. Direct-file viewing, reduced motion and the existing decorative-motion pause work without external libraries.

The handle reuses the existing paired `cloud_1_day.png` / `cloud_1_night.png` watercolor stickers. Eight compact WebP derivatives replace the earlier ribbon/cloud assets; day/night preserve supplied pigment, and the six additional scrollbar-only palettes preserve alpha and watercolor texture while remapping pigment colors. The original Sunburst sheet and request records remain archived in `figures/raw/scrollbar/`; its exact prompts are in [Scrollbar artwork](prompts/scrollbar/README.md), and current source/crop hashes are in `data/sources/scrollbar-artwork.json`. Regenerate derivatives with `python3 scripts/prepare_scrollbar_artwork.py` without modifying the master. [Design plan](scrollbar-plan.md).

The current eight cloud variants total 54,440 runtime bytes. After restoring the track and adding scenery palettes, 81 focused scrollbar checks and 83 motion checks passed with no uncaught browser errors. Evidence: `/tmp/taxua-scrollbar-palette-review` and `/tmp/taxua-scrollbar-palette-motion`. Fresh desktop/phone and six-world screenshots were reviewed, including the palette contact sheet. All eight derivative hashes are distinct and match the manifest; source/archive hashes, syntax, links and whitespace checks passed. The broader suite counts below record the initial integration.

Run `node scripts/verify_scrollbar.cjs` for real drag/key/track interactions, dynamic measurements, scenery/rail clearance, atlas suspension, responsive/focus behavior, missing dependencies/artwork, print, forced colors, direct-file use and interrupted anchor travel. Evidence defaults to `/tmp/taxua-scrollbar-review/`.

Verified 17 October 2026 in Chromium: 70 scrollbar checks, 83 motion checks, 108 mobile UI checks, 96 shared-control checks and 292 atlas fullscreen checks passed, with no uncaught browser errors reported. Evidence is in `/tmp/taxua-scrollbar-review`, `/tmp/taxua-scrollbar-motion`, `/tmp/taxua-scrollbar-mobile`, `/tmp/taxua-scrollbar-controls` and `/tmp/taxua-scrollbar-map`. Desktop six-world and phone screenshots were reviewed, including 200% text. The generated master, two derivatives and three reference hashes match; documentation links, script syntax and whitespace checks passed. Firefox/WebKit binaries and physical-device testing were unavailable. Forecast/tile requests were deliberately blocked by the focused scrollbar checks; those checks do not verify live external services.

## Painted cloud cursors

`cursor.css`, loaded after the feature styles, adds a 32px watercolor arrow with a cloud base and a matching pointing hand with a cloud cuff. It uses native CSS image cursors with measured hotspots and `auto`/`pointer` fallbacks; there is no pointer-following DOM layer, tracking script, trail, animation or additional preference storage. The existing `data-scenery-world` and `data-scene` attributes select the same eight palettes as the scrollbar: warm sky, indigo night, lavender predawn, golden dawn, mint morning, pale-blue noon, peach afternoon and mauve evening.

Only fine primary pointers with hover, on screen and outside forced colors, receive the artwork. Touch/coarse devices, print, absent CSS and unsupported/failed images use native cursors. Relative local PNG URLs also work under `file://`. The feature styles replace their existing `cursor: pointer` values with `var(--cursor-pointer,pointer)` to retain their own selector precedence. Links, disclosures and interactive map markers share the hand. Native text editing, selection, resizing, map/book/scrollbar grab and grabbing, disabled controls and busy/wait states remain available. The global scrollbar drag override still takes priority. Vendor Leaflet files are unchanged.

Sixteen PNGs total 30,222 bytes; only the active cursor assets need to load. Their untouched Sunburst master, reference hashes, crop/palette records, preparation command and hotspot coordinates are documented in [Cursor artwork](prompts/cursor/README.md). The arrow hotspot is 3,2; the hand fingertip is 10,2. The supplied cloud masters remain unchanged.

Run `node scripts/verify_cursor.cjs` for effective browser cursor values, every asset's decoding, scenery palettes, real map and scrollbar drags, text input and checkbox interaction, disabled/wait states, touch/narrow layouts, print/forced colors, direct-file/no-JavaScript use and missing dependencies. Set `CURSOR_WEBKIT=1` to include WebKit when installed. Evidence defaults to `/tmp/taxua-cursor-review/`; `TRIP_REVIEW_DIR` overrides it. Browser screenshots omit OS cursors; hero artwork previews use temporary noninteractive PNG overlays. A physical-device review is still needed to assess OS scaling and cursor accessibility preferences.

Verified 17 October 2026: **40 cursor, 81 scrollbar and 96 shared-control checks passed in Chromium**, with no uncaught browser errors. Evidence: `/tmp/taxua-cursor-review`, `/tmp/taxua-cursor-scrollbar` and `/tmp/taxua-cursor-controls`. The palette contact sheet, desktop artwork preview, atlas and phone screenshots were reviewed. All 19 master/reference/derivative hashes match; sixteen transparent PNGs have distinct hashes and solid painted hotspots. WebKit launch was attempted but blocked by missing system libraries; it was not tested. Physical devices were not tested. Forecast and map-tile requests were deliberately blocked by the cursor helper; it makes no claim about live service availability.

## Materials and interaction

The default palette uses translucent jade fields, cream text and peach borders/checks. `.photo-back`, `.trip-atlas`, `.place-map-preview` and local demo pages inherit dark jade ink and cream surfaces. Packing stays in the scenery palette. The `--control-*` custom properties define ink, surface, border, accent, selection, check and popup colors; menus copy these properties from their originating select.

Native checkboxes/radios keep their labels, checked state, events and keyboard operation; CSS replaces only their appearance. Wheel participant pills keep their existing visual treatment. Focus outlines remain visible. Forced colors restores native checkboxes/radios. Range controls retain native arrow-key adjustment. Phone text fields use at least 16px text while respecting enlarged root text.

Games expose the illustrated coin, dice tray, deck, sticks and bag as buttons. Concise instructions appear once. Named Lucide controls use 46px targets and themed hover/focus tooltips. Reset, shuffle and refill sit beside titles; reveal sits below the objects, alongside reset for sticks. Card hands scroll on phones, keeping large indices, while ball numbers remain on one line and long labels use captions below larger tokens. Quick chips change common choices; only custom coin labels and bag setup need a drawer. See [Games](games.md) for rules and lifecycle details.

## Select menus

When the Popover API is available, each ordinary select gains a labeled combobox button and a themed listbox. The native select remains the value, FormData and event source; it is hidden only after enhancement. Menus use live text, selected/disabled states and `aria-activedescendant`. Native `input` and `change` events fire when a changed choice is committed.

- Click/tap opens the menu and selects an option.
- Arrow keys, Home and End move the active option; Enter or Space commits it.
- Typing matches option text, including Vietnamese text with accent normalization.
- Escape cancels the pending highlight; Tab releases focus; outside pointer closes.
- Disabled selects/fieldsets disable the trigger. Form reset refreshes its value. Dynamic selects and replacement controls are observed; focus returns to a replacement after selection rerenders its owner.

Menus inherit their owner's palette, stay within the viewport and follow the anchor while scrolling. In modal dialogs they belong to that dialog; native fullscreen takes precedence so atlas visit menus stay inside the fullscreen shell. The first Escape closes a menu without also closing the atlas. Resizing, page hiding and removal of the origin close it. Menus are hidden for print.

If JavaScript or Popover support is missing, the original select remains visible with a themed field and chevron; its option picker follows platform behavior. Multiple/listbox selects remain native. HTTP and direct-file use both work. There are no required selects in the current site; required-field validation would need explicit focus handling before introducing one.

## Scope and checks

Production controls cover games, wheel, packing and atlas. Existing ignored `demos/` previews also load the shared files, including their dropdowns, upload fields and sound slider; those previews remain local and are not published by this change.

Run `node scripts/verify_controls.cjs` from the site directory with the existing repository-root preview. The helper includes those local demo files. It uses real pointer/keyboard interactions for chips and comboboxes, plus modal focus, reduced motion, narrow/landscape layouts, 200% text, forced colors and progressive fallbacks. The game/map model suites may set retained hidden native selects directly; their UI behavior is covered separately here.

## Verified integration · 16 October 2026

Chromium passed 74 shared-control/object interaction checks, 156 game-rule checks, 389 atlas checks, 135 wheel checks, 108 mobile UI checks, 135 journal UI/artwork checks and 254 local demo checks. These helpers reported no uncaught browser errors. Desktop and phone screenshots were reviewed, including custom menus on jade and parchment, painted game objects and packing checkboxes. Responsive checks included 320px, short landscape and 200% text; forced colors, direct-file opening and missing enhancement fallbacks were exercised.

Evidence: `/tmp/taxua-controls-review`, `/tmp/taxua-games-review`, `/tmp/taxua-controls-map-review`, `/tmp/taxua-controls-wheel-review`, `/tmp/taxua-controls-mobile-review`, `/tmp/taxua-ui-artwork-review` and `/tmp/taxua-demo-review`. Eight edited scripts passed syntax checks; 28 game source/derivative hashes matched; the itinerary exporter left its output unchanged. Browser coverage uses Chromium emulation; physical phones, Safari and Firefox were not tested.

The later [game readability review](games.md#readability-and-action-placement--16-october-2026) records the reduced copy, larger values, icon placement and expanded 91-check control suite. Earlier counts above describe the initial integration.
