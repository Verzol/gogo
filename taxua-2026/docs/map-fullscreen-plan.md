# Fullscreen treasure-map plan

[Documentation index](README.md) · [Current atlas](maps.md) · [Treasure-map design](map-treasure-plan.md) · [Technical references](sources.md#fullscreen-map-research)

Approved and implemented 17 October 2026. This document retains the design rationale; [Current atlas](maps.md#fullscreen-exploration) describes the delivered behavior.

## Direction

Add an exploration mode to the existing atlas: the geographic map fills the viewport, with a few floating parchment controls. Keep the framed atlas as the reading-oriented view. A visible `Toàn màn hình` button switches between them without restarting the map or losing the selected day/place.

This preserves the friends' watercolor journal: Patrick Hand titles, Be Vietnam Pro labels, pale parchment, dark teal ink, ochre day selection and brick-red selected-place rings. Design variance 8, motion intensity 3, density 4. Preserve the existing painted artwork and use brief functional transitions only.

## Space in the original framed layout

Inspected the current code and opened the atlas at desktop and phone widths on 17 October:

| Viewport | Current geographic map | Space used elsewhere |
| --- | --- | --- |
| 1440 × 900 | 895 × 533px | Large title, date/utility rows, permanent 375px sidebar and outer frame |
| 390 × 844 | 346 × 316px | Header/toolbar, map caption, permanent lower details/list area and paper margins |

The phone dialog already fills the screen; the map inside it does not. A fullscreen toggle that only enlarges the existing dialog would leave the main problem intact.

## Desktop composition

Schematic only; the map continues behind every control and panel.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [Bản đồ trên mây]  [Cả chuyến | 22/10 | 23/10 | 24/10 | 25/10] [↙] [×] │
│                                                                      │
│ [Điểm ghé · 8]                                               [+]     │
│ ┌ when opened ─────┐                                         [−]     │
│ │ Find a trip stop │                                                  │
│ │ Illustrated list│                                         [compass]│
│ │ Times and names │                                                  │
│ └─────────────────┘             FULL MAP                              │
│                         Stickers, clusters and real labels             │
│                                                                      │
│ [Place sticker · name · time · Chi tiết · previous / next]             │
│ [scale]                                      [Leaflet / OSM attribution]│
└──────────────────────────────────────────────────────────────────────┘
```

The schematic's symbols are explanatory; implementation uses official Lucide icons and the existing compass art.

| Position | Control | Design and behavior |
| --- | --- | --- |
| Top left | Compact atlas title and `Điểm ghé` | Small handwritten title; location button toggles the index. No large cartouche taking a full row. |
| Top center | Five illustrated day choices | `Cả chuyến`, then 22–25/10 chronologically. Reuse bus, coffee, meadow and village cutouts; selected day keeps the ochre swipe. |
| Top right | Restore framed view; close map | Separate controls with clear accessible names. Restore keeps the atlas open; close returns to the journal. |
| Left, on demand | Location drawer | About 320–360px on roomy screens; single scrolling area with stickers, names and real visit times. Starts closed for an overview. |
| Right | Zoom and compass reset | 44px or larger targets. Compass retains `Xem trọn ngày`; it fits the active filter rather than requesting geolocation. |
| Bottom, after selection | Compact place note | Existing sticker or photo, place name, scheduled time, `Chi tiết`, and labelled previous/next visit controls. No permanent welcome panel. |
| Bottom corners | Scale and attribution | Always readable and outside panel footprints; never hide these under a dock or paper edge. |

Opening `Chi tiết` changes the location drawer into the existing full place note, with a clear `Về danh sách` action. The selected-place summary stays compact; do not stack a second full-sized panel over the map. Keep captions, warnings, source links and the journal link in the full note.

The drawer can include a small, accent-insensitive search of this trip's local place names. It filters the index only, without moving the camera or searching the wider world. This needs no geocoder, account or backend.

## Phone and short landscape

- The map fills the available browser viewport behind the controls, including safe-area insets. The ordinary website topbar remains outside the modal experience.
- Top: compact title plus restore/close actions. Immediately below: five small day choices. Keep all five discoverable; use two rows when narrow screens or enlarged text need them rather than shrinking targets or clipping dates horizontally.
- Lower left: `Điểm ghé` when nothing is selected; a short place-note peek after selection. Tapping opens the same bottom sheet for either the index or the full place note.
- The sheet has three explicit states: closed, compact peek, expanded. Expanded height is capped around 65–75dvh where space allows, with one scrolling content area. A visible collapse button always works; dragging the handle is optional enhancement.
- Previous/next remain available in the selected-place peek, so moving through visits does not require opening the full sheet.
- Zoom and compass sit at the right above the attribution strip. The peek/sheet reserves that space and cannot cover the controls or attribution. On very short landscape screens, use the desktop-style narrow side drawer.
- At 200% text or with the software keyboard visible, allow control rows to grow and the panel to scroll. Keep close/restore reachable; never rely on fixed text heights.

## Interaction details

1. Enter exploration mode from the existing atlas header. Preserve day, optional-stop setting, selected visit and camera, subject to the existing Vietnam bounds/minimum zoom.
2. A day click updates the pins/list and fits that day's locations. `22/10` keeps the confirmed Viettel pickup in Hà Nội; `Cả chuyến` retains the existing Tà Xùa overview instead of stretching to include the long transfer.
3. A pin or list selection shows the compact place note. Pan only when necessary to keep the selected pin in the unobstructed map area. Do not zoom again merely because a drawer opens or closes.
4. The location index and full note share one panel. Switching between them retains the active visit and restores focus sensibly. Pointer selection does not unexpectedly jump keyboard focus; keyboard selection exposes and focuses its detail heading as appropriate.
5. Previous/next browse the current filtered schedule entries. They do not imply a confirmed driving route or impose an itinerary order on the unordered afternoon trio.
6. Restore returns to the framed atlas with the same selection and camera. Close exits the map and returns focus to its original journal trigger.

Preserve sticker clustering, exact-overlap choices, optional-stop wording, unresolved-position messages, wheel/Ctrl+wheel zoom, keyboard/touch navigation and Vietnam limits. No automatic tour, GPS request, offline download or new routing service.

## Fullscreen behavior and browser support

The reliable baseline is a viewport-filling layout inside the existing modal. When supported, the user's fullscreen-button click can also request native browser fullscreen to hide browser chrome.

- The browser Fullscreen API cannot target a `<dialog>` element. Introduce an inner atlas shell containing the map **and all overlay controls**; request fullscreen on that shell, keeping the native dialog's modal/focus lifecycle.
- Request native fullscreen directly from the user gesture. If unsupported or rejected, keep the viewport-filling layout fully usable without an error detour.
- Listen to `fullscreenchange` and handle browser-owned Escape/back behavior. When the browser exits native fullscreen, restore the framed mode without accidentally closing the atlas too. Confirm this behavior in supported browsers rather than assuming modal and fullscreen Escape events arrive in a particular order.
- In viewport-only mode, Escape closes an open overlay first, then exits exploration mode, then closes the atlas on a subsequent press. The visible close button always closes the atlas completely.
- Exit native fullscreen on atlas close only when this atlas entered it. Keep focus and the original story scroll position intact.

## Artwork and visual restraint

No new image generation is required for the first version. Reuse the parchment, torn-paper sheet, ochre swipe, compass, existing place stickers and credited photographs. New expand/restore/list/search controls use the existing official Lucide preparation pipeline.

Apply the torn-paper treatment to compact control strips and the location sheet, with restrained edge depth. Keep the geographic tiles sharp and unchanged. No parchment wash, heavy corner ornaments, blur or large illustrated welcome still life across the map. Artwork has no pointer hit area of its own.

## Implementation boundaries

| Owner | Implementation |
| --- | --- |
| `trip-map.js` | Inner shell; mode/panel state; fullscreen lifecycle; local index filter; focus restoration; camera padding based on visible overlay bounds |
| `trip-map.css` | Viewport canvas; floating parchment controls; responsive drawer/sheet; safe areas; enlarged-text and reduced-motion states |
| `scripts/prepare_icons.cjs`, generated sprite in `index.html` | Add only missing official interface icons |
| `scripts/verify_map_fullscreen.cjs` | Mode transitions, preserved selection/camera, panel input behavior, focus, attribution and fallback assertions; the existing map helper retains framed/previews coverage |
| `docs/maps.md` | Document final behavior after implementation; retain this file as the approved plan |

Reuse the same Leaflet instance while switching modes. Call `invalidateSize({pan:false})` after actual canvas resizing; recalculate safe camera padding when overlays change. Overlay buttons/scrolling must not trigger map drag or zoom, while exposed map areas retain wheel/Ctrl+wheel and touch behavior. Do not attach input-blocking handlers to the entire map container.

Retain lazy local Leaflet preparation and request only tiles needed by the current viewport. A larger map necessarily needs more visible tiles, so this design cannot promise unchanged first-load network cost. Show the existing loading/retry status unobtrusively. If tiles or Leaflet fail, the location panel must remain available, including full notes and journal links.

## Delivery sequence and acceptance

1. Build the desktop exploration shell and mode switch, preserving the map instance and native dialog behavior.
2. Connect the existing days, index, selected details and camera handling to the floating controls.
3. Adapt the same controls to phone sheets, narrow screens, short landscape and enlarged text.
4. Add progressive native fullscreen and verify browser-driven exit behavior, then update the map guide.

Review at 1440px, 1024px, tablet, 390px, 320px, short landscape and 200% text. Check real day/location selection, map dragging/pinch/wheel, focus, Escape, resize/orientation, visible attribution, tile/library failure, reduced motion, print cleanup and repeated opening/closing. The canvas must fill the exploration viewport; only intentional controls/panels may cover it. Confirm a selected pin stays outside panel footprints after explicit selection/reset actions. Run the focused map helper and inspect live tiles separately. Native-fullscreen support needs browser-specific verification beyond Chromium emulation.

The implementation reuses existing artwork and preserves the framed atlas. Verification results are recorded in the [map guide](maps.md), separately from this design brief.
