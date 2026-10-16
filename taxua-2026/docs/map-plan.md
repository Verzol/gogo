# Bản đồ trên mây: embedded map design plan

[Documentation index](README.md) · [Travel story](story.md) · [Journal controls](ui-artwork.md) · [Research sources](sources.md#embedded-map-research)

Proposed 16 October 2026. This document retains the original design direction. The atlas, local previews and manual day explorer are now implemented; [Maps](maps.md) records the actual behavior, supplied-art import and incomplete geographic coverage. The remaining pin audit and later optional refinements are not implied complete by this plan.

## Direction

Make the map another way to read the trip: understand where the stops are, see what belongs to each day, and return directly to the corresponding story. Keep the existing watercolor worlds visible around a contained map surface.

Preserve the current Patrick Hand headings, Be Vietnam Pro labels, warm accent (`#ffda9d`), paper (`#f3ead4`) and dark teal ink (`#183b46`). Use playful artwork for a few recognizable landmarks and quiet numbered markers elsewhere. Roads, place labels and selected-place details need crisp contrast. Keep the existing transparent day menu and photo-flip interaction.

Design-taste mode: preserve. Existing dials remain 8/6/4; map camera movement is deliberately quieter than decorative story motion because spatial orientation matters.

## Current code and content

The current page has 24 schedule blocks, 18 place guides and twelve `mapQuery` occurrences. Repeated homestay queries are not separate places. `stopId` already connects many blocks to guides and photographs; the afternoon cluster has three nested `places` records.

There are no individual place coordinates in `data.js`. Its weather coordinate is a regional reference, not a homestay or landmark pin. Text search phrases cannot establish exact entrances, pickup points or safe routes. See the existing [identity caveats](research/places.md#identity-and-uncertainty-checks).

The removed Maps signs stay removed. In the sibling Huế implementation, the inspected location controls use external Google Maps links; this proposal needs a new embedded map rather than copying that flow.

## Three connected map experiences

### 1. Overall atlas: Bản đồ trên mây

Add a compact entry at the beginning of the itinerary, alongside its existing overview. Add a small map action inside each day menu, opening that day. Keep date clicks opening the current stop list and preserve all native story anchors. Avoid adding another permanent floating toolbar.

The atlas opens as a large contained dialog over a lightly dimmed, unblurred journal background. On a wide screen, about two-thirds of the working area is map, one-third is the day list or selected-place detail. A small handwritten title and date filters sit above them. Paper edging belongs outside the map; it must not crop labels, controls or attribution.

Current interaction update: wheel/Ctrl+wheel zoom is enabled on both map surfaces, and all map views use a Vietnam navigation rectangle; the initial camera still fits the Tà Xùa itinerary. The separate departure view keeps its Hà Nội pickup in the list while retaining a Tà Xùa map. This updates the original transfer-view and wheel-interaction direction.

Default extent: the Tà Xùa stops. Provide `Cả chuyến`, `23/10`, `24/10`, `25/10` and a separate `Đêm đi · 22/10` transfer view. The long Hà Nội transfer should not compress all mountain stops into a tiny cluster. The transfer tab keeps the Hà Nội pickup in its list while the map remains in Tà Xùa; any connection without road geometry is explicitly schematic.

The nearby overview shows unique locations, small category symbols and labels only where space allows. Selecting a day reveals that day's visit numbers and sequence. Other days become quiet context. Selecting a marker or list entry updates the same detail area, with:

- Place name and a credited existing photo, preserving illustrative-image captions.
- The real scheduled time or period, and optional status where applicable.
- A short existing guide excerpt and the relevant practical/safety note.
- `Đọc đoạn này` to close the atlas and follow the corresponding native story anchor.

Do not cover the map with eighteen open photo popups. Nearby markers share a compact group at overview zoom; selecting the group zooms to its members. Exact coordinate overlaps use one place marker and a visit selector.

### 2. Local previews: Chỗ này ở đâu?

Add a small pin action beside the location text of mappable story stops. A tap expands a compact map beneath that stop, with the selected location, a home-base reference and relevant nearby stops. Another action, `Xem trong cả chuyến`, opens the atlas focused on that place and day.

Keep previews closed by default, with at most one expanded preview. Reuse map data and logic; do not create a live map for every event. Repeated homestay events point to one place record. The afternoon cluster exposes three separate place choices.

Wheel and Ctrl+wheel zoom work inside inline maps; scrolling outside them keeps normal page behavior. Keep explicit zoom controls and keyboard/touch exploration available. Reserve map dimensions before loading. Closing the preview restores the compact story spacing.

If a pin is unresolved, offer the place note in the atlas list without pretending it has an exact map location. A small `Vị trí đang xác nhận` state is preferable to a guessed point.

### 3. Day explorer: Đi từng chặng

Within the atlas, `Trước` and `Tiếp` step through the selected day's visits. The matching marker gains a warm outline, the detail photo changes, and the camera makes a short, bounded movement only if needed. A visible step count describes itinerary position, never a completed visit.

Start this on explicit selection. Do not autoplay, scroll the underlying page, or take the camera back after someone pans manually. `Xem trọn ngày` restores the day's bounds. Reduced motion and the existing pause preference use immediate camera changes with no decorative animation.

The three afternoon photo stops belong to one group labelled `Buổi chiều · chưa chốt thứ tự`; switching among them explores alternatives within that group without implying an agreed driving order. Unknown times remain unknown.

## Signature details worth adding

| Detail | Design | Practical benefit |
| --- | --- | --- |
| Home base | One small illustrated house at Mùa Trứ; selecting it lists all scheduled arrivals, breakfasts and room changes | Makes repeated returns and the shape of each day easy to understand |
| Optional detours | Hollow markers and an explicit `Có thể ghé` label; a local toggle includes/excludes them from the exploratory view | Separates the core schedule from possibilities without changing the source itinerary |
| Photo windows | One selected photo in the detail area; optional temporary thumbnail on desktop hover, with equivalent tap/focus behavior | Connects a recognizable view to its real position without creating a wall of photographs |
| Nearby context | From a selected stop, show nearby scheduled places once coordinates are verified | Helps spot possible groupings; distances must say `đường chim bay` unless backed by route geometry |
| Landmark identity | Reuse ridge, tree and rock stickers at overview zoom; swap to compact symbols/visit numbers when needed | Gives this trip a recognizable map while preventing marker collisions |

Prioritize home base and optional detours in the first release. Add nearby distances only after the pin audit. Do not use cloud cover as a claim about current weather, hide usable geography behind decorative fog, or mark scheduled places as visited.

## Desktop and phone composition

Desktop starting layout:

```text
Bản đồ trên mây                            Đóng
Cả chuyến  23/10  24/10  25/10       Đêm đi
+--------------------------------+-------------------+
|                                | Day stop list     |
|          Live map              | OR selected place |
|     landmarks + sequence       | photo, time, note |
|                                | Đọc đoạn này      |
| zoom / scale     attribution   | Trước      Tiếp   |
+--------------------------------+-------------------+
```

On phones the open atlas becomes a full-height dialog with a compact header/date strip, map above, and a detail sheet below. Provide two explicit detail states, compact and expanded, with a button; swiping is optional. The map remains tall enough to orient the selected point when details are compact. Expanding details can replace more of the map rather than squeezing both into unusable panels. Close and attribution remain reachable, including in landscape and at 200% text.

The day menu itself keeps its current translucency. Selected-place reading surfaces use paper and dark ink for legibility over detailed map tiles. No backdrop blur. Controls have generous hit areas, clear focus, and labels that do not depend on hover or color alone.

## Geographic truth before decoration

Build a reviewed place registry keyed by the existing `stopId`. Proposed location fields: `lat`, `lng`, `precision` (`entrance`, `point`, `area`), `status` (`verified`, `approximate`, `unresolved`), `sourceUrls`, `verifiedAt` and `note`. Leave unresolved coordinates null. An area should use a sourced boundary or clearly labelled regional view, not a fabricated precise entrance.

Keep event-to-place membership separate from place identity. A single place may have several visits on different dates. Non-place events such as breakfast without a venue, room-cloud watching and homeward travel do not automatically receive new pins. The optional stargazing block offers `quanh homestay hoặc Khe Cải`; show that uncertainty instead of choosing one location silently.

Priority checks: exact Hà Nội pickup, Mùa Trứ entrance, the Háng Đồng sightseeing ridge rather than the Trạm Tấu summit, Thào Coffee versus similarly named cafés, Cây Cô Đơn versus Lán Cô Đơn, Hồ Mắt Ngọc and business entrances. Existing photo captions and narrative source references do not by themselves prove coordinates.

Use dashed, explicitly labelled `Thứ tự ghé · không phải đường đi` connections for known sequence without verified road geometry. Do not connect across an unresolved intermediate stop as if nothing were missing. Optional alternatives and the unordered afternoon group do not get an invented route.

Road-following lines, travel durations and elevation profiles are a later phase requiring a routing/elevation source and review for the actual travel mode. A plausible mountain-road line is not evidence of safe or accessible travel. The first release is a trip explorer, not turn-by-turn navigation.

## Technical approach

Use locally hosted **Leaflet 1.9.4**, the stable release listed on the official download page when researched. OpenStreetMap provides geographic data; a tile service supplies the visual basemap; Leaflet supplies interaction. These are separate choices. Confirm the stable version again at implementation.

Keep classic scripts and the current no-build architecture. Proposed owners are `map-data.js` for reviewed geographic records, `trip-map.js` for the optional controller and `trip-map.css` for the contained UI. Load registry before controller; keep the existing script ordering intact. Store coordinate provenance under `data/sources/`; use `data.js` for any actual schedule changes.

Initialize the atlas on first open. Create inline previews on demand and dispose them when closed; release the preview before opening the atlas. At most one map surface is actively visible. Recalculate map size after dialog/preview transitions and use padded bounds that account for the detail panel.

Use standard Leaflet markers/`DivIcon`, groups, polylines and bounds. Preserve keyboard operation and descriptive marker names. The day/place list is an equally capable way to select locations. Modal Escape closes, focus stays in the open dialog and returns to its trigger; `Đọc đoạn này` instead moves to the requested story. All event links remain usable with missing Leaflet or missing tiles.

Choose the tile provider after comparing Tà Xùa coverage, Vietnamese labels, road legibility, terrain visibility, terms and cost at actual phone/desktop zooms. Standard OSM raster tiles are a sensible functional prototype. Raster labels and colors are baked in: do not promise a custom watercolor basemap through CSS filters. A more subdued production style needs a suitable provider or a later vector-map decision.

Self-hosting Leaflet does not make online tiles available offline. The core journal and a local stop list must keep working without network and under `file://`. Treat live mapping as an optional HTTP/HTTPS enhancement; direct-file use falls back to local content rather than depending on public tile requests without a normal web referrer.

Keep OSM/provider attribution visible, respect caching and provider request rules, and avoid prefetch/download features on the standard OSM tile service. Mountain offline support would require a provider explicitly permitting it or separately prepared licensed map material. Do not build runtime geocoding: local search over the reviewed eighteen-place registry is sufficient. No backend is needed for this scope.

## Artwork brief

First reuse the existing ridge, lone tree, dolphin rock, mountain and painted café stickers. New generated assets are a small mountain homestay and waterfall, plus an optional narrow paper edge. The [map artwork prompts](prompts/map_artwork/README.md) provide self-contained generation briefs with no image attachments needed. Landmarks should be isolated watercolor cutouts on transparency, readable at a small size and without text baked into the image. Place names and numbers remain accessible HTML.

Use an honest generic lodging symbol unless a supplied reference supports a recognizable depiction of Mùa Trứ. Generated art must not invent roads, venue positions, terrain contours or a purportedly accurate map. It is decoration around verified geography.

## Delivery order

1. **Pin audit and separate demo:** review the geographic registry, then compare the basemap and atlas composition on desktop/phone using a few verified locations. A design demo must label unresolved places and schematic connections honestly.
2. **First usable atlas:** overview, day filters, linked stop list, single selected-photo detail, home base, optional markers, focus handling and network fallback.
3. **Story integration:** local previews, day-menu entry, native return-to-story navigation and manual day explorer. Keep existing date behavior, transparent menu and secret photo backs.
4. **Optional refinement:** collision-aware landmark artwork, reviewed nearby distances, shareable map selection. Consider road routes, elevation or offline material only when their sources are available.

## Acceptance checks for implementation

- Preserve 24 events, 18 guides, source rows, exact/null times, flags, safety notes, captions and existing story anchors.
- Audit every displayed point and its precision/source; keep unresolved records in the list without fake markers. Deduplicate homestay visits and retain three distinct afternoon places.
- Verify day membership, optional toggles, marker/list synchronization, step controls, no inferred afternoon order and no false road-route claims.
- Inspect desktop, 390px/320px phones, short landscape and 200% text; selected points must stay outside the detail panel, attribution and close controls.
- Exercise keyboard-only selection, Escape/focus restoration, reduced motion, pause, manual pan and return-to-day bounds.
- Test failed/slow tiles, missing Leaflet, no network, direct-file reading, print and existing map-free itinerary behavior.
- Check that tiles load only for the map being explored, no page-scroll capture, no persistent hidden preview maps, no new browser errors or overflow.

No implementation tests are claimed for this document. Current-page inspection and official documentation research informed the proposal; actual pins, tile-provider quality and map interactions remain to be verified during implementation.
