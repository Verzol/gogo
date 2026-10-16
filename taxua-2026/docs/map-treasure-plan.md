# Bản đồ kho báu trên mây

[Documentation index](README.md) · [Current map](maps.md) · [Generation prompts](prompts/map_treasure/README.md)

Implemented 16 October 2026 after the six generated images were supplied. This document retains the design brief and implementation sequence. The running atlas and inline previews now use this direction; [Maps](maps.md#treasure-atlas-artwork-and-interface) records the import and current behavior.

## Design read

A treasure atlas for seven friends exploring Tà Xùa: the tactile paper, compass and pencilled discoveries of an adventure-game map, painted in the website's Vietnamese mountain-journal style. The treasure is the trip's places and shared memories.

Use the existing Patrick Hand display lettering, Be Vietnam Pro reading text, cream paper `#f3ead4`, dark teal ink `#183b46`, moss green and ochre `#e7b676`. A small brick-red pencil accent marks the current selection. Keep the watercolor grain and imperfect outlines. Design-taste direction: preserve the site identity, with visual variance 8, motion intensity 3 inside the atlas and density 4.

## Audit before the redesign

Before this redesign, `trip-map.js` and `trip-map.css` gave the atlas a straight cream dialog, a conventional header, filled rectangular date buttons and a ruled sidebar. The cabin, waterfall, bus and other landmark stickers already had the right character. They sat inside a UI whose geometry and controls felt more like a directory than the surrounding journal.

The redesign therefore starts with the container, hierarchy and navigation. Adding more landmark stickers alone would leave the main problem intact.

## The composition

### A map worth opening

Replace the cabin-and-waterfall invitation composition with a small rolled atlas, beside the existing live title and short invitation. The scroll is an illustration within a normal button; the readable title stays HTML. At rest it feels like an object left in the journal. Hover or focus lifts it a few pixels; opening uses a short opacity/scale transition with reduced-motion support.

The scroll belongs to the atlas entry only. The transparent date rail, rejected wooden Maps signs, folded guides and ribbon bookmarks do not return.

### One parchment atlas

Use a very quiet paper texture across the dialog, with the supplied `map_paper_frame` at its outer perimeter. Replace the rigid header and column dividers with space, light ink rules and a discreet crease-like line at the side index. The middle remains light enough for readable text. Paper texture sits beneath the interface, outside the geographic tile surface.

The live map occupies roughly 70% of the desktop body. The remaining 30% is a compact itinerary index and selected-place note. The irregular outer edge and a few intentional ink marks carry the antique feeling; large shadows, dark stains and ornaments over roads would make the map harder to use.

### A title and five illustrated date choices

Set “Bản đồ trên mây” inside a delicate blank cartouche, with the group/date line underneath. Keep the visible close button at the upper right, separate from the illustration.

Below the title, place five native buttons in one wrapping row: `Cả chuyến`, `23/10`, `24/10`, `25/10`, `Đêm đi · 22/10`. Each pairs a small existing object with live text: ridge for the overview, coffee for 23/10, meadow for 24/10, village for 25/10, bus for departure. The selected day has an ochre watercolor swipe and a dark ink underline, rather than a solid rectangular fill. A visible focus ring and `aria-pressed` remain.

The optional-stop toggle stays a labelled checkbox. It shares a small utility row with reset; both retain plain-language labels.

### A compass with a useful job

The illustrated compass sits alongside the map header, attached to a button labelled `Xem trọn ngày`. Clicking restores the selected day's bounds. It stays outside the draggable map canvas so it does not cover places or compete with Leaflet controls. It is an evocative icon for the reset action, with an explicit text label rather than an unexplained game mechanic.

Keep north at the top. If an `N` is needed it is added in HTML. The image does not rotate or imply geolocation, heading tracking or device permissions.

### The stop index becomes a pencilled itinerary

Use compact place stickers, real times and short names in an open list. A fine dotted vertical line links list entries with a known order. Draw an imperfect brick-red circle around the currently selected entry's number in code. Its matching map marker gets the same color accent and keeps its existing artwork. The ring means selection, never a completed visit.

Optional stops keep their visible wording and a distinct hollow symbol. The unordered afternoon trio stays grouped without a connector that implies a visit order. Khe Cải stays explicitly unresolved. List connections are visual itinerary cues, not driving routes.

The selected-place note uses the existing credited photo, short introduction, time, location note and reading link. Replace the full-width colored photo band with a smaller photograph resting on paper, keeping credits and illustrative captions visible. Previous/next controls remain labelled. On departure, show the existing bus illustration and confirmed Viettel pickup details.

The optional small field-kit still life replaces the current two-sticker welcome composition when no place is selected. It disappears on phones and never occupies space needed by the selected location.

## Phone layout

- Use a compact title, close button and date row above the map. Hide the decorative cartouche outline if it squeezes the heading; the title remains.
- Keep all five day choices visible at 390px with small artwork. At 320px use two short wrapping rows, rather than tiny controls or a horizontally hidden date.
- Preserve a useful map height around 40–45dvh in the compact state, adapting to short landscape screens. Put the full stop index and selected note below it.
- Retain the explicit compact/expanded details button and recalculate Leaflet size. Avoid a second nested scroll region inside the index.
- Keep zoom, attribution, close and the return-to-day action reachable. Interactive targets remain at least 44px, even when the decoration is smaller.
- Use the same paper texture at its natural scale and the existing frame; no separate phone background or stretched desktop artwork is necessary.

Implementation detail: the texture fills the shell behind a translucent cream tint, with its darker outer 5% cropped in the derivative. At large text sizes or very short portrait heights, the body uses one scroll area with a reserved map height; the header observes its available space instead of allowing the map to collide with the caption or details.

## Generate only the missing art

| Asset | Purpose | Priority |
| --- | --- | --- |
| Quiet parchment texture | Gives the atlas shell and notes material character without reducing text contrast | Core |
| Rolled atlas sticker | A recognizable entry object for the map | Core |
| Pocket compass | Illustrated reset control | Core |
| Blank title cartouche | Gives the desktop heading an old cartographic identity | Core |
| Ochre brush swipe | Reusable selected-day background | Core |
| Small explorer field kit | Welcome-state illustration on roomy layouts | Optional |

The [prompt index](prompts/map_treasure/README.md) maps every output to its intended filename and placement. Existing location stickers, bus, frame, photographs and scenery are reused. Close, zoom, arrows, checkboxes, route lines, selection circles and small functional icons remain crisp code/Lucide elements. Titles, dates and place names remain live text. The basemap remains geographic data, not generated scenery.

## Import and implementation order

1. Generate prompts 01–05; 06 is optional. Check their composition and alpha before integration. Keep supplied originals intact under `figures/raw/map_treasure/` and record their original filenames/hashes when importing. Store optimized derivatives under `figures/decor/painted/` using the listed basenames. Keep this set separate from the existing eleven-asset importer.
2. Apply the shell, title and date controls in `trip-map.css`/`trip-map.js`. Match desktop and 390px phone composition before adding the optional still life. CSS paper, text labels and Lucide controls provide usable missing-art fallbacks.
3. Restyle the stop index, selected state and photo note, preserving anchors and source details. Reuse the same modest parchment treatment for inline previews.
4. Add short entrance/selection feedback, with no automatic panning beyond the existing explicit map actions. Keep all decoration outside interactive geography or set it to ignore pointer input.
5. Verify real map interaction and inspect desktop, phone, 320px, short landscape and enlarged text. Run `verify_map.cjs`, checking wheel/Ctrl+wheel zoom, Vietnam limits, clustering, keyboard focus, resize, source links and map failure states. Inspect live tiles separately; the standard helper intentionally fails them.

The starting view remains Tà Xùa, `22/10` centers the confirmed Tập đoàn Viettel pickup, and the Vietnam navigation limit remains. Preserve one-map lifecycle, local Leaflet, native dialog focus, reduced motion, print cleanup, source/uncertainty disclosures and the 24-event/18-guide itinerary. No discovery locks or fabricated visited states are introduced.
