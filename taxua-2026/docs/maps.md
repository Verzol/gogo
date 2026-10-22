# Bản đồ trên mây

[Documentation index](README.md) · [Design plan](map-plan.md) · [Artwork prompts](prompts/map_artwork/README.md) · [Sources](sources.md#embedded-map-research)

## Current behavior

The opening hero has a `Bản đồ` action beside the main invitation, using the existing painted treasure scroll and a handwritten dotted underline. Desktop includes a short `Những nơi mình ghé` subtitle; phones use a compact row so the map is visible immediately without pushing the forecast/countdown farther down. This is the single overview entry, moved from above the itinerary. Each existing day menu also has a map action; date clicks retain their original stop-list behavior and transparent background. Location-bearing events and the three afternoon place cards have a small `Chỗ này ở đâu?` action. No wooden Maps signs return.

The atlas combines an embedded Leaflet map with date filters, an optional-stop toggle and a stop list. Nearby pins group by screen distance into a compact illustrated marker with a count; selecting it zooms to its members. Exact overlaps at maximum zoom expose a keyboard-accessible place chooser. Selecting a list entry zooms enough to separate the selected point where possible, without changing its recorded coordinates. Selecting a list entry or mapped landmark shows the corresponding existing photograph, actual scheduled time/period, place introduction, warnings and a native link back to that part of the journal. Repeated homestay visits share one place identity and expose their individual schedule entries in a selector. The three afternoon stops remain explicitly unordered. Previous/next controls explore schedule entries without recording visits, autoplaying or scrolling the story.

Desktop uses a map beside a scrollable detail/list area. Phones use a map above details, with an explicit button to enlarge the detail area. The supplied paper frame stays at the map's outer edge; attribution remains inside the unobstructed map. Closing the native dialog releases the map and returns focus to its trigger. A day-menu trigger reopens its original menu before receiving focus. The reading link instead focuses the requested story article.

### Fullscreen exploration

`Toàn màn hình` in the atlas header opens an edge-to-edge geographic canvas. The same Leaflet instance keeps its day, optional-stop setting, selected visit and camera through expand/restore. Floating torn-paper controls reuse the existing artwork: compact title, five chronological day choices, a location index, zoom and compass reset. Restore returns to the framed atlas; the separate close button returns to the journal.

Fullscreen/restore and close use small torn-parchment controls in both layouts, with an ochre accent for fullscreen and a brick-red close mark. They have no inner rectangular or circular border. Existing textures, official Lucide icons, visible focus outlines and 44px targets are retained.

The index starts closed. `Điểm ghé` opens a scrolling side drawer on desktop/short landscape or a bottom sheet on phones. Local search ignores Vietnamese accents and `đ`; it filters only this trip's list and never moves the camera. Optional stops remain selectable in that panel. Pointer selection shows a compact place card with previous/next controls and `Chi tiết`; keyboard selection opens and focuses the full note. Index and full note share one panel, with explicit back/collapse controls. Enlarged text can wrap the days into multiple rows; the map still fills the screen behind them.

Explicit location selections always center the chosen point in the available map area, including nearby points and reselecting a visible location at the same zoom. Camera padding keeps its sticker and label clear of visible controls and panels. Opening a panel can pan the selected point into view without increasing zoom. Scroll/input inside the overlays stays separate from map wheel/drag input. Scale, attribution, zoom, compass, restore and close remain visible around the panels. Day changes fit the selected schedule; `22/10` retains the confirmed Hà Nội pickup while `Cả chuyến` keeps the mountain overview.

The inner `.atlas-shell` is the progressive native Fullscreen API target; browsers cannot fullscreen a `<dialog>` itself. All controls and custom visit menus remain inside that shell. Unsupported or rejected requests retain the viewport-filling layout. Native fullscreen exit restores the framed view and leaves the atlas open. In viewport mode, Escape collapses the panel, restores the framed view, then closes the atlas on successive presses. Close/print/page exit release only fullscreen owned by this atlas. Pending requests are checked against the current mode so an old request cannot reopen fullscreen after close/restore.

See the [approved design and implementation plan](map-fullscreen-plan.md). There is no additional artwork, geocoder, routing service, account or backend requirement. Larger viewports request more visible tiles; this mode does not remove provider/network latency or prefetch tiles.

Inline previews start closed and allow only one active map. Opening another preview replaces it; opening the atlas releases the preview. Wheel and Ctrl+wheel zoom are enabled while the pointer is over either map surface; scrolling outside it keeps normal page behavior. Dragging stops at the Vietnam navigation bounds, and the minimum zoom adapts to the map size so zooming out cannot escape that region. The same restriction applies to keyboard panning and expanded/resized detail layouts. The 22/10 departure tab selects 68 Mạc Thái Tông in Hà Nội and centers its address-matched pickup pin. The overall trip view keeps the Tà Xùa stops separate so the long transfer does not shrink them. Reduced motion and the existing pause preference disable animated camera changes. Missing Leaflet or failed tiles retain the local stop list, photos and reading links. Direct-file use shows a local explanatory fallback instead of requesting web tiles. Print hides map controls and closes open map surfaces.

The first tile request waits until the opening day/selection has its final camera, avoiding intermediate viewport requests. The [provider and first-load review](research/osm-provider-review.md) compares six detailed layers and records the request reduction, timings and limits of the measurements. OSM France remains the current provider.

The local Leaflet script is prepared at low fetch priority when a map entry comes within 320px of the viewport, or on hover, keyboard focus or pointer down. This downloads the script once without executing it; opening the map reuses that download at high priority. Browsers without IntersectionObserver still receive the interaction warmup. Data Saver and direct-file use skip speculative loading. No map tiles are prefetched. Pins, dates and notes remain usable independently of tile completion; browser HTTP caching handles repeat tile views.

The warmup passed **378 map assertions**, including approach/focus loading, one script download reused on opening, no early tiles, deferred execution and Data Saver/file-mode exclusions. In a controlled phone test with a 700ms delay on the script download, prepared opening showed pins/controls in **81ms**, versus **903ms** with preparation disabled. These timings exclude the earlier preparation and do not measure online basemap completion. Evidence: `/tmp/taxua-map-opening-review/`.

Separate live checks loaded all final tiles without uncaught browser errors, with desktop and phone rendering inspected. The phone overview finished in 0.94s and Khe Cải preview in 0.97s, but the desktop overview took 13.12s, including 10.62s before its first tile. This confirms that local preparation cannot eliminate provider-side or network delays. Live evidence: `/tmp/taxua-osm-expanded-review/site-opening-warmup.json` and matching screenshots.

## Treasure-atlas artwork and interface

The [treasure-atlas design](map-treasure-plan.md) is implemented. A rolled-map illustration opens a light parchment atlas, with a cartouche title, five illustrated date choices and an ochre painted selected state. The labelled compass restores the current day's view. Existing place stickers appear in the stop index, with a brick-red circled number for the selected visit and dotted index connections only between consecutive nonoptional, ordered entries on the same day. The afternoon trio has no invented connector or visit order. These are selection and itinerary cues, never completed-visit markers.

Selected photographs now rest inside a small paper frame, retaining image credits and illustrative captions. The supplied field kit appears only in the roomy welcome state. The phone layout omits this decoration, keeps the map above the notes and retains the explicit expand control. If large text leaves too little body space, the map and notes share one scrolling area with a reserved map height. This avoids overlapping dates and squeezed map content. The page's transparent date rail and secret photo backs are unchanged.

Decorative images have empty alt text; dates, title and action labels remain HTML. The compass has a Lucide fallback if its image fails; failed cutouts are hidden while their controls stay usable. The existing frame surrounds the map, while a separate torn-paper sheet forms the atlas perimeter. No decorative image covers map tiles or attribution, and the paper treatment affects the shell only. Reduced motion and the global pause preference suppress the brief entrance transition.

Six supplied PNG masters are preserved byte-for-byte in `figures/raw/map_treasure/`:

| Original upload | Canonical master |
| --- | --- |
| Warm Aged Parchment Texture.png | `map_treasure_parchment.png` |
| Watercolor Treasure Map Scroll.png | `map_treasure_scroll.png` |
| Vintage Watercolor Compass Pendant.png | `map_treasure_compass.png` |
| Watercolor Cloud Swirl Frame.png | `map_treasure_cartouche.png` |
| Golden Ochre Watercolor Brushstroke.png | `map_treasure_day_swipe.png` |
| Watercolor Hiking Journal Sticker Set.png | `map_treasure_field_kit.png` |

The separate [manifest](../data/sources/map-treasure-artwork.json) records source and derivative hashes, dimensions, measured trims and the processing steps. Transparent cutouts retain 8px padding after alpha cleanup; the opaque parchment derivative omits the darker outer 5% of the original. There is no upscaling or recoloring. Six WebPs total **287,806 bytes**. The [generation briefs](prompts/map_treasure/README.md) remain available.

Reproduce with Python and Pillow: `python3 scripts/prepare_map_treasure.py`. This importer preflights the complete batch, refuses to overwrite an existing original and produces the same manifest/derivatives on repeat. The existing location-art importer remains separate.

The later [torn parchment sheet](prompts/map_treasure/07_torn_parchment.md) was generated through 9Router for the outer menu. It has real transparent tears, fibrous edges and chipped corners around an empty pale center. A filled CSS nine-slice border keeps edge depth modest as the atlas resizes; the content sits inside reserved margins (22px desktop, 12px phone, 10px short landscape). It adds no overlay or pointer target over the controls or map. The inner parchment remains readable if the sheet fails to load. The PNG is retained under `figures/raw/map_treasure/`; its 1200px WebP is **160,620 bytes**, with a separate [provenance manifest](../data/sources/map-torn-paper-artwork.json). Reproduce with `python3 scripts/prepare_map_torn_paper.py` and Pillow.

The torn-sheet integration passed **357 map assertions**, including its source/derivative hashes and missing-art fallback scenarios. Separate visual inspection covered desktop, 390px phone, 320px narrow phone, short landscape and 200% phone text, without horizontal overflow or uncaught browser errors. Re-import produced identical hashes and retained the original generated bytes. Evidence: `/tmp/taxua-torn-atlas-review/`. These checks do not claim complete online tile loading or physical-device coverage.

## Geographic coverage and limits

The registry contains all **18 existing place guides plus the Hà Nội pickup**: **seventeen source-matched named points** (including the pickup), **one user-confirmed point** (Khe Cải), and **one approximate regional reference**. No entries currently lack coordinates.

- Thào Coffee and Cây Cô Đơn use named OpenStreetMap points.
- Mùa Trứ, Sống Lưng Khủng Long, Thác Chua Tỳ, Vị Nhà, Bếp Củi, Ameii Hill, A Phủ, Hồ Mắt Ngọc, Thảo nguyên Tà Xùa, Lán Cô Đơn, Mỏm Cá Heo, Đồi Mây, Cà phê Tháng 10 and Làng Văn Hóa use single named public place records matched to the itinerary. The research snapshot retains published names, addresses, coordinates and source links. Mùa Trứ also matches the official Facebook link in the existing homestay directory.
- Trung tâm Tà Xùa uses the existing sourced regional coordinate, explicitly an area reference rather than a particular restaurant or entrance. Its approximate marker appears only when selected.
- **68 Mạc Thái Tông**, the 22/10 gathering/departure point, uses the matching published address coordinates **21.0137554, 105.7936235** and Maps source link. The user corrected the address and gathering/boarding time on 22 October 2026: gathering is 21:00. The outbound departure time is omitted at the user’s request. Its bus sticker is illustrative; the source link is available without a venue photograph.
- **Khe Cải** uses the exact organizer-supplied coordinates **21.27347304583251, 104.42839746119542** and Maps source link. Its pin appears in the overall trip, 25/10 view and inline preview.

No precise location was inferred from a photo, a search camera center, an unnamed multi-result response or a nearby recommendation. Google public place records were consulted during research only; the embedded map uses Leaflet and OSM France, with no runtime Google dependency. Source links are available in the selected place's details.

`verified` in the registry means a named published point was matched or the trip organizer supplied exact coordinates; it is not an on-site verification of its entrance or access. No driving routes, journey durations, cloud guarantees or completed visits are claimed. Dashed sequence lines are supported only between consecutive, nonoptional, ordered entries that both have coordinates. They never bridge an unresolved stop or connect the unordered afternoon group. Approximate areas and unresolved stops do not participate in these connections; these lines are not a complete route.

The navigation rectangle is **8.0–23.5° N, 102.0–110.0° E**, covering Vietnam’s mainland, Phú Quốc and Côn Đảo. The initial view still fits the Tà Xùa itinerary, but visitors can explore across Vietnam. This is an approximate rectangular camera limit, so neighboring terrain and sea remain visible; it is not an administrative border mask. It replaces the former Tà Xùa and Sơn La limits in both map surfaces.

The stargazing block has alternative locations, and some breakfast/transport blocks lack a fixed venue. These do not receive invented place identities or map pins.

## Code and data owners

- `map-data.js`: reviewed geographic registry, initial camera region, Vietnam navigation bounds, provider configuration and source notes. It is independent of the authoritative schedule in `data.js`.
- `trip-map.js`: derives visits from the current schedule; owns framed/exploration modes, panels, search, camera padding, fullscreen lifecycle and previews; prepares local Leaflet near map entries and disposes closed maps.
- `trip-map.css`: map invitation, journal controls, framed/floating atlas layouts, responsive details and print styling.
- `index.html`: local CSS links and optional map scripts after the existing script chain. Existing script order is retained.
- `scripts/prepare_icons.cjs`: the official Lucide sprite (53 total), including expand/restore/list/collapse controls.
- `data/sources/map-locations.json`: geographic review and rejected-match observations. Keep its records aligned when editing the runtime registry.
- `vendor/leaflet/`: unmodified official Leaflet 1.9.4 distribution, BSD license and SHA-256 metadata.

There is no runtime geocoder, backend, new package installation, CDN library dependency or map storage. Map tiles are optional network content. The selected OSM France raster layer has a quiet paper-colored background and ordinary road/place labels. The provider was checked using actual rendered tiles: standard OSM requests were refused in this environment, CARTO returned API-key notices in image responses, and OpenTopoMap was substantially busier. OSM France attribution is always visible alongside OSM and Leaflet attribution. Do not bulk-download or prefetch tiles; review provider availability/terms if usage grows.

## Supplied artwork

Eleven original PNGs are preserved byte-for-byte in `figures/raw/map_artwork/`:

| Original upload | Canonical master |
| --- | --- |
| Watercolor Cabin Sticker Illustration.png | `map_home_base.png` |
| Watercolor Waterfall Sticker Cutout.png | `map_waterfall.png` |
| Watercolor Paper Frame on Transparency.png | `map_paper_frame.png` |
| Vietnamese Meal on a Woven Tray.png | `map_vi_nha.png` |
| Rustic Steaming Pot over Wood Fire.png | `map_bep_cui.png` |
| Watercolor Cottage Hill Sticker.png | `map_ameii_hill.png` |
| Watercolor Stilted Mountain Lodge Sticker.png | `map_a_phu.png` |
| Watercolor Hillside Path Sticker.png | `map_thao_nguyen.png` |
| Rustic Watercolor Shelter Sticker.png | `map_lan_co_don.png` |
| Watercolor Vietnamese Grilled Feast.png | `map_doi_may.png` |
| Rustic Mountain Village Market Sticker.png | `map_trung_tam.png` |

[Manifest](../data/sources/map-artwork.json) records original filenames, hashes, canvas dimensions, measured trims, output sizes and derivative hashes. The importer removes only very low-alpha dust, trims with padding and downsizes; no master replacement, upscaling or recoloring. Eleven WebP derivatives under `figures/decor/painted/` total **724,106 bytes**; the eight newly imported location stickers account for **537,608 bytes**. Existing café, tree, ridge, lake, rock and bus art is reused. The homestay/waterfall drawings are illustrative landmarks, not documentary reconstructions.

The [prompt index](prompts/map_artwork/README.md) now also includes eight standalone briefs for Vị Nhà, Bếp Củi, Ameii Hill, A Phủ, Thảo nguyên, Lán Cô Đơn, Đồi Mây and the town-center area. All eight generated images are now imported and assigned to their map records. Existing stickers are reused for the other locations. The town-center sticker remains an area reference and does not change geographic precision.

Reproduce with Python and Pillow:

```sh
python3 scripts/prepare_map_artwork.py
```

## Verification

Run `node scripts/verify_map.cjs` from `taxua-2026/`. Its default evidence directory is `/tmp/taxua-map-review`; `TRIP_REVIEW_DIR` overrides it. The helper deliberately fails external tile requests to test graceful fallback without repeatedly loading the public tile service. Live-tile rendering must be checked separately. See [Verification](verification.md) for related story, journal-object and mobile suites.

Run `node scripts/verify_map_fullscreen.cjs` for exploration behavior and native/viewport fullscreen. It defaults to `/tmp/taxua-fullscreen-review/checks`; the same URL, Playwright and review-directory overrides apply. Its external tiles deliberately fail too; native fullscreen checks use Chromium, with responsive checks using emulated viewport sizes.

The map helper checks nearby grouping and keyboard expansion, source-master hashes, downscaling, retained itinerary/guide counts, lazy loading, geographic uncertainty, day membership, unordered afternoon stops, optional filtering, repeated visits, manual stepping, focus, native return links, one-map lifecycle, failed tiles, missing library, file mode, print and responsive/enlarged text behavior. Browser screenshots are kept outside the checkout.

### Fullscreen exploration · 17 October 2026

**264 fullscreen assertions, 389 existing map assertions and 96 shared-control checks passed**, with no uncaught browser errors. Fullscreen coverage includes native API entry/exit and visit dropdowns, unsupported/rejected API fallback, a controlled late-request fixture, one retained map/camera/selection, local Vietnamese search, pointer/keyboard notes, stepped Escape, overlay scrolling, wheel/Ctrl+wheel, departure/optional filters, selected sticker clearance, unavailable Leaflet and print cleanup.

The fullscreen helper checked 1440×900, 1024×768, 820×1024, 390×844, 320×740 and 844×390, plus desktop/phone at 200% text and rotated layouts. Real tiles were inspected separately in desktop/phone overview and selected-place modes, including enlarged text. They retain provider/network latency; behavioral helpers deliberately fail those external requests.

Evidence is outside the checkout under `/tmp/taxua-fullscreen-review/`: `checks/`, `regression/`, `controls/` and live-tile screenshots/`visual.json`. These are Chromium and emulated viewport results; physical devices, Safari and Firefox were not tested. Native exit synchronization was exercised through the browser's Fullscreen API; browser-specific Escape/back behavior still depends on the browser.

The location-centering/button refinement subsequently passed **292 fullscreen and 389 map assertions**. Added checks reselect an already-visible point after manual panning, select a nearby point, and verify animated recentering as well as native fullscreen. Desktop/phone and 200% text screenshots were inspected for both framed and fullscreen button treatments. No uncaught browser errors were reported. Follow-up evidence: `/tmp/taxua-map-refinement-review/` (`fullscreen/`, `map/`, `visual/`).

### Verified import and integration · 16 October 2026

- **216 map assertions passed** at 1440×1000, 390×844, 320×740 and 844×390, plus 200% text, direct-file use, missing library and deliberately failed tiles. Includes keyboard group expansion, exact coordinate overlap choices, detail focus, and restoring the original day menu/focus.
- **56 story**, **50 photo interaction**, **135 UI artwork** and **108 mobile UI** checks passed, retaining source events/guides and the previously approved interactions.
- Live OSM France tiles were inspected separately on desktop and phone, both overview and selected homestay. No uncaught JavaScript errors were reported. The offline/failure helper does not claim online tile success.
- The artwork importer reproduced the same manifest and derivative hashes; every vendored Leaflet file matched its recorded checksum. JavaScript syntax, whitespace and 271 local Markdown paths were checked.

Evidence remains outside the checkout under `/tmp/taxua-map-review/`: `checks/`, `story/`, `photos/`, `ui/`, `mobile/`, plus online screenshots and `online.json`. These are Chromium emulation results, not physical-device, Safari or Firefox coverage. At that review, complete geographic coverage still required the exact Khe Cải viewpoint and Hà Nội pickup; the latter was subsequently supplied by the user.

### Wheel zoom, regional bounds and remaining sticker prompts · 16 October 2026

Wheel and Ctrl+wheel zoom now work in both the atlas and inline previews. Both map surfaces use the Sơn La province extent as a rectangular navigation limit, full drag resistance at its edges, and a minimum zoom recalculated after resizing. Departure selection no longer moves the camera to Hà Nội; its real pickup remains in the schedule list.

**270 map assertions passed**, including actual mouse-wheel/Ctrl+wheel input, unchanged page scroll/scale, extreme pan requests in both directions, native dragging, keyboard panning, phone detail expansion and the existing atlas/fallback/lifecycle coverage. Geographic boundary assertions allow two pixels for Leaflet's integer-pixel rounding. Separate live-tile desktop/phone inspections retained the existing composition and reported no uncaught JavaScript errors. Evidence: `/tmp/taxua-map-bounds-review/`.

At that review, eight self-contained generation prompts covered the places with null `art` fields. Each starts with “Generate”, needs no attached reference, specifies a transparent 1024×1024 canvas and shares the existing watercolor palette. Those outputs were subsequently supplied and imported; see the current artwork table above. Syntax/whitespace checks and 280 local documentation paths passed; runtime and source-snapshot geographic data agree.

### Additional supplied location stickers · 16 October 2026

All eight new location PNGs are now preserved under `figures/raw/map_artwork/`, optimized and assigned to the matching map records. Every place record has artwork; unresolved coordinates and the town area's approximate precision stay unchanged. Original upload hashes were compared before and after organization. The importer reproduced identical outputs, and source/runtime geographic records agree.

**294 map assertions passed** after import, including the eleven artwork hashes, wheel/Ctrl+wheel zoom, Sơn La bounds, responsive dialogs, previews and missing-map fallbacks. Separate desktop/phone live-tile checks showed the new meal and shelter markers correctly. Evidence is outside the checkout at `/tmp/taxua-new-stickers-review/`.

### Tà Xùa navigation limit · 16 October 2026

The navigation limit now uses the local Tà Xùa trip rectangle documented above. All 17 records with coordinates remain inside it, including Thác Chua Tỳ; runtime records and the source snapshot match. Both the atlas and inline previews retain wheel/Ctrl+wheel zoom and constrained panning.

**294 map assertions passed** with the tighter bounds across desktop, phone, narrow and landscape layouts. Separate live-tile desktop/phone overview and selected-homestay previews showed all stop groups within the overview and no uncaught JavaScript errors. JavaScript syntax and whitespace checks passed. Evidence: `/tmp/taxua-local-bounds-review/`.

### Vietnam navigation limit · 16 October 2026

The Vietnam rectangle now replaces the local Tà Xùa limit. The opening view still fits the trip stops. All **294 map assertions passed**, including wheel/Ctrl+wheel zoom, constrained panning and responsive behavior. Separate desktop/phone checks confirmed Hà Nội and Ho Chi Minh City can be reached, inspected live-tile overview/selected-homestay rendering, and reported no uncaught JavaScript errors. Runtime/source geographic records, JavaScript syntax and whitespace checks passed. Evidence: `/tmp/taxua-vietnam-bounds-review/`.

### Confirmed 22/10 Viettel pickup · 16 October 2026

The departure tab now selects and centers the organizer-supplied Tập đoàn Viettel pin. The inline preview uses the same coordinates, and location sources remain accessible even without a documentary photo. Pickup reminders and the generated reading copy reflect the confirmed venue; times remain 21:30 gathering/boarding and 22:00 departure. The country bounds and mountain overview are retained.

**314 map assertions passed**, including the departure pin, selected marker, source link, retained times and geographic limits across four viewports. Separate live-tile desktop/phone checks verified direct opening of the departure tab and its inline preview, with no uncaught JavaScript errors. Runtime/source records match; trip data differs only in the three departure text fields. Evidence: `/tmp/taxua-viettel-review/`.

The broader `verify_journey.cjs` run stopped at its existing optional-portrait assertion: it expects zero crew portrait images after replacing only the first member's image. A separate focused check confirmed that member falls back to `S` and the six other portraits remain. That suite is not recorded as passed. The no-JavaScript reading copy was checked separately and retains all 24 events.

### Treasure-atlas import and redesign · 16 October 2026

All six supplied atlas images were organized, inspected against dark/cream surfaces and imported. Source hashes agree after moving; repeating `prepare_map_treasure.py` produces identical manifest and derivative hashes. Source trip content and the geographic registry were not changed.

**354 map assertions passed**, including all seventeen map/atlas artwork hashes, illustrated date navigation, real compass reset, no fabricated afternoon list connections, wheel/Ctrl+wheel input, Vietnam bounds, confirmed Viettel pickup, focus restoration, missing decorations/library/tiles, print, direct-file use and 200% text. **135 journal UI checks passed**, preserving the transparent stop menu, packing, photo previews and removed-sign behavior. The UI helper's obsolete unconfirmed-pickup assertion was updated to the already confirmed Viettel venue and unchanged 21:30/22:00 times.

Live-tile overview, selected café and departure rendering were inspected separately at 1440×1000, 390×844, 320×740 and 844×390. Additional checks covered 820×1180, 200% text on desktop/phone, ordinary entrance motion and the global pause preference. There were no uncaught JavaScript errors. Evidence: `/tmp/taxua-treasure-review/` (`map/`, `ui/`, `visual/` and `extra.json`). These checks use Chromium emulation; they do not establish physical-device, Safari or Firefox coverage.
