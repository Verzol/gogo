# Shared journal controls

[Documentation index](README.md) · [Identity](identity.md) · [Games](games.md) · [Verification](verification.md)

`controls.css` owns input, textarea, checkbox, radio, select, range, file-picker and disclosure styling. `controls.js` progressively enhances ordinary single-select dropdowns. Both load after the feature styles/scripts; retain existing script order. No library or build step is required.

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
