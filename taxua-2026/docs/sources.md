# Sources and refresh map

[Documentation index](README.md)

The schedule and asset catalog below were last imported on **14 October 2026**. These are recorded source links, not a claim of current remote access or freshness. Runtime reads local scripts/assets, not Drive or Sheets.

## Authority

1. Group schedule controls event order, exact/null times, logistics and costs.
2. Current `data.js` holds approved website copy, roster, fund and researched guides. Source snapshots preserve original schedule details.
3. `selected-place-photos.json` controls photo/stop selection and captions; asset catalog rows supply credits/URLs. Older visual suggestions do not override the illustrated design.
4. Local illustrated originals + `illustrated-scenery.json` control the current background assets; no remote catalog refresh should restore photographic wallpapers or an old logo.

## Schedule and asset catalog

| Source | Link / local snapshot |
| --- | --- |
| Group trip Sheet | [Lịch trình](https://docs.google.com/spreadsheets/d/1avQi4rDVT2_d2PAj-XphaUORJtsvHB64wNt44CQcOdA/edit#gid=20009742), `'Lịch trình'!A1:J33` → `data/sources/schedule.json`; also linked from `TRIP_DATA.itinerary.sourceUrl` |
| Asset catalog Sheet (a separate spreadsheet) | [Tà Xùa assets](https://docs.google.com/spreadsheets/d/1TtM-crH8NQdo6bFouU_nmMeLP3eXVJddLmEEUqPOiIw/edit) |
| Catalog tabs | `Read_Me`, `Place_Photos`, `Backgrounds`, `Components`, `Reuse_from_Repo`, `Coverage_Status`; recorded ranges are `A1:L40`; snapshots use the corresponding lowercase underscore JSON filenames in `data/sources/` |
| Photo mapping JSON | [Drive selection](https://drive.google.com/file/d/1-M9ktm7dn8q87DpisY7TwQb_otcuTDaK/view) → `data/sources/selected-place-photos.json` (18 stops, 23 asset entries, caption rules) |
| Research | [Place research](research/places.md) → original summaries/reading links in `TRIP_DATA.placeGuides` |

## Photos and original downloads

| Source | Purpose |
| --- | --- |
| [Originals Drive folder](https://drive.google.com/drive/folders/1Fxu_n9XWGaFhLoGu4nFI2z6NFHyvkPUR) | Supplied originals and the replacement ridge image |
| [Current P01](https://drive.google.com/file/d/1kxnfke4YFP-EtSBHVaS7MVHdcbnk5mjA/view) | User's `IMG_6884.JPG`, renamed `P01_Song_Lung_Khung_Long_Original.jpg`; replaces old Wikimedia ridge |
| [Original selection Doc](https://docs.google.com/document/d/1ru3RCORmf0gJ_PF4d62s3Xmb2T_2VYLJLcaCsnMu1Mk/edit) · [preview ZIP](https://drive.google.com/file/d/1v555HtFqO8zXDhiqCjS_pzJg_Y-rNOGx/view) | First selected views; guide headings identify images |
| [Additional selection Doc](https://docs.google.com/document/d/18Zi7eQZT7sIbkpjLfPK-e5zbwuy7xdC9X-KVEYbRBww/edit) · [preview ZIP](https://drive.google.com/file/d/1Jepy8szBagHgzZtTXMY16zvTJQP06-_F/view) | P12–P18 supplied originals, Đồi Mây views and three illustrative alternatives |
| [Visual review Slides](https://docs.google.com/presentation/d/13EgoPqkCti9bxaXInjtTQwbHYK6kOXDp8R10_nVdV1k/edit) | Recorded selection review, not a runtime dependency |

Per-photo original/stored-copy URLs, credits and rights are in `selected-place-photos.json`, `place_photos.json` and `asset-import.json`. Conversion and caption rules: [Photo assets](assets.md).

## Artwork and retained references

| Source | Current use |
| --- | --- |
| `figures/raw/illustrated_scenery/` | 14 user-generated originals; [manifest](../data/sources/illustrated-scenery.json), [prompts/sheet map](prompts/illustrated_scenery/README.md) |
| `figures/raw/gogo_mountain_sunrise.png` | Current user-supplied logo; [identity guide](identity.md) |
| `figures/raw/Watercolor Adventure Sticker Collection*.png` | Paired day/night sticker masters; [sticker prompt](prompts/stickers.md) |
| [Earlier scenery components folder](https://drive.google.com/drive/folders/1LrigDe4pmjtfFqaqsubRPSykKZEJqcR8) | C01–C10 SVG/CSS references retained locally, not the live painted stage |
| [Earlier background ZIP](https://drive.google.com/file/d/1blK4Ivd7jVLIRXXrsR37FEOz6HsEbcGD/view) | Archived B01–B05 photo backgrounds; some shared sources remain illustrative content photos |
| [Existing artwork pack](https://drive.google.com/file/d/19akcZUT-hx-Vg17mHIkQN-d0LrguMeg-/view) | Earlier stickers/logo snapshot; do not use its superseded logo |
| [Original repo snapshot](https://github.com/Verzol/gogo/tree/282015e6a4d6be6d5c9762a33fd1e4134c3e4990/taxua-2026) | Provenance for reused fonts/artwork; `reuse_from_repo.json` lists exact paths |
| [MoMo fund](https://quy.momo.vn/v2/YTavDjFUV4?cover=6749) | Exact contribution destination, maintained in `TRIP_DATA.fund.url` |

## Refresh workflow

1. For an external refresh, use the connected Drive/Sheets tools when available; report an access blocker instead of claiming a read. Local work can use the dated snapshots. Reading/importing does not authorize editing source Docs/Sheets or messaging people.
2. Read the named schedule range/catalog tabs and selected JSON. Compare changes before replacing local snapshots; preserve website-specific approved copy and current logo/scenery decisions.
3. Download original bytes from recorded originals/stored-copy URLs; previews can be resized. Match preview images by guide heading, not `imageN` order. Keep credentials and expiring download URLs out of the repo.
4. Update `data.js`/selection records, regenerate affected derivatives and `itinerary.html`, then run the relevant [checks](verification.md). Record the refresh date here.

## Sky and weather UI research: 15 October 2026

Research for the [sky opening and trip-day weather plan](sky-weather-plan.md), with an [artwork brief](prompts/sky_weather.md). The feature is now implemented; current behavior is described in [Sky and weather](weather.md). The smoke results below remain dated research evidence.

| Primary source | Finding used in the plan |
| --- | --- |
| [Open-Meteo Forecast API](https://open-meteo.com/en/docs) | Daily fields, WMO codes, up-to-16-day horizon, date/timezone handling, grid-cell coordinates and elevation downscaling. Daily weather code represents the most severe condition that day. |
| [Open-Meteo terms](https://open-meteo.com/en/terms) and [pricing](https://open-meteo.com/en/pricing) | The free endpoint is for non-commercial use, with attribution and request limits. Cache requests and treat weather as optional. |
| [Open-Meteo project and attribution guidance](https://github.com/open-meteo/open-meteo#terms--privacy) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Place a visible provider credit/link alongside the weather display, with accessible data-license attribution. |
| [Tà Xùa on Apple Maps](https://maps.apple.com/place?auid=5952950460681155788) | Regional location reference: 21.27516 N, 104.43396 E, Bắc Yên, Sơn La. This is not an exact homestay or summit pin. |
| [web.dev animation performance guide](https://web.dev/articles/animations-guide) | Prefer transform/opacity; inspect rendering/paint work and use layer promotion sparingly. |
| [GSAP matchMedia documentation](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/) | Revert/clean up animations and listeners on breakpoint/preference changes; compatible with the current optional motion architecture. |
| [MDN reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) and [W3C pause/stop/hide guidance](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) | Provide static/minimal alternatives and a usable way to pause decorative motion that continues while reading. |

Live browser smoke checks on this date requested `2026-10-23` through `2026-10-25` with `timezone=Asia/Ho_Chi_Minh`, Celsius, km/h and the plan's daily variables. The HTTP-origin request returned status 200, all three dates and no null values in the requested daily arrays. Returned model cell: 21.335676 N, 104.40367 E; elevation 1,538m; UTC offset 25,200 seconds. A direct-file-origin request for the daily code and temperature range also returned 200 for all three dates. These checks establish current access and response shape, not forecast accuracy or a guarantee of future availability. Forecast values were not copied into trip content.

The composition storyboard in `docs/research/sky_weather_storyboard.webp` reuses local painted scenery for planning. It is not newly generated artwork, a screenshot of a completed redesign or a live forecast.

## Illustrated Maps signs

The [Google Maps URLs guide](https://developers.google.com/maps/documentation/urls/guide#search-action) defines the search action researched for the earlier signs (now removed): `https://www.google.com/maps/search/?api=1&query=...`. Queries come from the twelve existing schedule fields. A search result does not verify an exact pickup point, business identity or route. User-supplied artwork provenance is recorded separately in `data/sources/ui-artwork.json`.

## Embedded map research

Reviewed 16 October 2026 for the [map design](map-plan.md) and its [implemented atlas](maps.md). The geographic registry records the separate venue-pin review and remaining unresolved locations.

| Source | Design implication |
| --- | --- |
| [Leaflet downloads](https://leafletjs.com/download.html) | Lists 1.9.4 as stable and 2.0.0-alpha.1 as prerelease at review time; host the chosen release locally. |
| [Leaflet reference](https://leafletjs.com/reference.html) and [custom controls](https://leafletjs.com/examples/extending/extending-3-controls.html) | Markers, groups, polylines, bounds, resize handling and custom controls support the proposed explorer without a framework. |
| [Leaflet accessible maps](https://leafletjs.com/examples/accessibility/) | Preserve keyboard defaults, uniquely label markers including custom div icons, and provide an accessible focused exploration surface. |
| [OSMF tile usage policy](https://operations.osmfoundation.org/policies/tiles/) | Show attribution, preserve normal web identification/referrer and caching, and do not offer bulk download or offline prefetch using the standard public tile service. |
| [OSMF Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) | Public geocoding has limited capacity, caching/identification requirements, a maximum of one request per second and no client autocomplete. The proposed site instead searches a local reviewed place registry; it does not need this API. |

OpenStreetMap data, a tile provider and Leaflet are separate layers. Tile coverage, terms and styling must be checked when choosing a provider. No source above verifies the trip's exact venue positions, travel times or mountain-road access.

Implemented map records and coverage limits are in [Maps](maps.md). The [geographic review](../data/sources/map-locations.json) records the selected points and unresolved identities; [artwork provenance](../data/sources/map-artwork.json) records the eleven supplied PNG masters and optimized derivatives.

| Integration source | Use |
| --- | --- |
| [Leaflet 1.9.4 official npm archive](https://registry.npmjs.org/leaflet/-/leaflet-1.9.4.tgz) | Locally hosted distribution; package hash, individual file hashes and BSD license are retained under `vendor/leaflet/`. |
| [OSM France tile service](https://tile.openstreetmap.fr/) and [service documentation](https://wiki.openstreetmap.org/wiki/FR:Servers/layers.openstreetmap.fr) | Selected `osmfr` raster layer; live-rendered road labels and pale background checked during integration. Keep provider/OSM attribution and use interactive viewport requests only. |
| [Photon](https://photon.komoot.io/) | One-time OSM-based place discovery; no runtime API dependency. Similar-name results were rejected where identities did not match. |
| [Thào Coffee OSM point](https://www.openstreetmap.org/node/13724983101) and [Cây Cô Đơn OSM point](https://www.openstreetmap.org/node/13724978102) | Named community-map points; source matches do not verify entrances, current access or safe routes. |

## Member scarf sticker research

Reviewed 16 October 2026 for the [portrait direction and generation prompt](prompts/people.md). The proposed stickers are contemporary travel adaptations; they do not claim to document an authentic ceremonial costume.

| Reference | Use and access limits |
| --- | --- |
| Local `hue-2026/figures/people/2.png` and `3.png` | Visually inspected: recognizable photographic faces, illustrated conical hats and white die-cut borders. Use the finish as a reference, not the other person's identity. |
| [Sơn La: H’Mông headscarves and their cultural story](https://thongtindoingoai.sonla.gov.vn/en/content-1243-chiec-khan-doi-dau-va-cau-chuyen-van-hoa-cua-nguoi-mong-o-son-la.html) | Search excerpts describe H’Mông headscarves in Tà Xùa and textile techniques. The full page timed out, so detailed wrapping instructions are not attributed to it. |
| [People's Army newspaper: H’Mông headscarves in Sơn La](https://www.qdnd.vn/van-hoa/doi-song/chiec-khan-doi-dau-va-cau-chuyen-van-hoa-cua-nguoi-mong-o-son-la-967097) | The article page did not open through the search tool. Its first market photograph was fetched and visually inspected: soft plaid head wraps, visible hair, folded fabric and short fringes. Reference only; no image copied into runtime assets. |
| [Lai Châu tourism: Ấn Tượng Từ Chiếc Khăn Piêu](https://dulich.laichau.gov.vn/vi/blog/details/an-tuong-tu-chiec-khan-pieu-239) | Full page read. Describes khăn piêu as part of Thái women's dress with embroidered ends and several wrapping styles. Supports distinguishing it from the H’Mông-inspired travel-sticker direction. |

Named public place records were also matched during the pin review: the [location snapshot](../data/sources/map-locations.json) retains the query, published venue name/address, exact point and source URL for each accepted match. Only single named records were accepted; result-camera centers and unnamed candidate lists were rejected. These research-time Google records create no runtime Google mapping dependency.

The earlier Sơn La navigation rectangle used the province extent from [OpenStreetMap relation 1903291](https://www.openstreetmap.org/relation/1903291), discovered through the [named Photon result](https://photon.komoot.io/api/?q=Son%20La&limit=5&lang=en). After an intermediate local Tà Xùa limit, the current map uses an approximate Vietnam navigation rectangle (8.0–23.5° N, 102.0–110.0° E), covering the mainland, Phú Quốc and Côn Đảo. Its limits and rationale are retained in `data/sources/map-locations.json`; this is a camera limit rather than a sourced administrative polygon mask.

The eight additional map cutouts and seven member portraits were supplied as generated PNGs. Original names, byte hashes, preparation and runtime mappings are retained in [map artwork provenance](../data/sources/map-artwork.json) and [portrait provenance](../data/sources/people-artwork.json); the imports add no new geographic claims.
