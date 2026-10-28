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

The diary's current gently aged paper uses three regenerated
`cx/gpt-image-2.5-sunburst` masters through 9Router: left/right leaves and an
inner-cover lining. [Exact prompts and requests](prompts/diary/soft_aged/README.md),
[source/derivative hashes](../data/sources/diary-soft-paper.json) and the offline
helper preserve reproducibility. Warmed print borders still derive from the
[preceding aged materials](../data/sources/diary-aged.json). The heavier
[aged study](prompts/diary/aged/README.md),
[earlier quiet-paper study](prompts/diary/refinement/paper.md) and
[its manifest](../data/sources/diary-refinement.json) remain preserved.
No crew media was supplied to generation.

| Source | Current use |
| --- | --- |
| `figures/raw/illustrated_scenery/` | 14 user-generated originals; [manifest](../data/sources/illustrated-scenery.json), [prompts/sheet map](prompts/illustrated_scenery/README.md) |
| `figures/raw/gogo_mountain_sunrise.png` | Current user-supplied logo; [identity guide](identity.md) |
| `figures/raw/Watercolor Adventure Sticker Collection*.png` | Paired day/night sticker masters; [sticker prompt](prompts/stickers.md) |
| [Earlier scenery components folder](https://drive.google.com/drive/folders/1LrigDe4pmjtfFqaqsubRPSykKZEJqcR8) | C01–C10 SVG/CSS references retained locally, not the live painted stage |
| [Earlier background ZIP](https://drive.google.com/file/d/1blK4Ivd7jVLIRXXrsR37FEOz6HsEbcGD/view) | Archived B01–B05 photo backgrounds; some shared sources remain illustrative content photos |
| [Existing artwork pack](https://drive.google.com/file/d/19akcZUT-hx-Vg17mHIkQN-d0LrguMeg-/view) | Earlier stickers/logo snapshot; do not use its superseded logo |
| [Original repo snapshot](https://github.com/Verzol/gogo/tree/282015e6a4d6be6d5c9762a33fd1e4134c3e4990/taxua-2026) | Provenance for reused fonts/artwork; `reuse_from_repo.json` lists exact paths |
| [Official Mali Bold source](https://github.com/google/fonts/blob/fbdd512151630cf7f45b291cc2c5f3df8b23b720/ofl/mali/Mali-Bold.ttf) | Navigation wordmark: self-hosted `figures/fonts/mali_normal_700.woff2`, subset with fontTools to U+0020–017F, U+0300–036F, U+1E00–1EFF, U+2000–206F, U+20AB/20AC/2122/2190–2193/2212/FEFF/FFFD, retaining all layout features. SIL OFL: `figures/fonts/OFL_mali.txt`. Mali 500 was already local. |
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

Reviewed 16 October 2026 for the [map design](map-plan.md) and its [implemented atlas](maps.md). The geographic registry records the separate venue-pin review and organizer-confirmed coordinates.

| Source | Design implication |
| --- | --- |
| [Leaflet downloads](https://leafletjs.com/download.html) | Lists 1.9.4 as stable and 2.0.0-alpha.1 as prerelease at review time; host the chosen release locally. |
| [Leaflet reference](https://leafletjs.com/reference.html) and [custom controls](https://leafletjs.com/examples/extending/extending-3-controls.html) | Markers, groups, polylines, bounds, resize handling and custom controls support the proposed explorer without a framework. |
| [Leaflet accessible maps](https://leafletjs.com/examples/accessibility/) | Preserve keyboard defaults, uniquely label markers including custom div icons, and provide an accessible focused exploration surface. |
| [OSMF tile usage policy](https://operations.osmfoundation.org/policies/tiles/) | Show attribution, preserve normal web identification/referrer and caching, and do not offer bulk download or offline prefetch using the standard public tile service. |
| [OSMF Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) | Public geocoding has limited capacity, caching/identification requirements, a maximum of one request per second and no client autocomplete. The proposed site instead searches a local reviewed place registry; it does not need this API. |

OpenStreetMap data, a tile provider and Leaflet are separate layers. Tile coverage, terms and styling must be checked when choosing a provider. No source above verifies the trip's exact venue positions, travel times or mountain-road access.

### Fullscreen map research

Reviewed 17 October 2026 for the [fullscreen atlas](map-fullscreen-plan.md); implemented behavior is documented in the [map guide](maps.md#fullscreen-exploration).

| Source | Design implication |
| --- | --- |
| [MDN: Element.requestFullscreen](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen) | Native fullscreen requires a direct user gesture, cannot target a dialog element, and reports success/failure asynchronously. Use a supported inner container, synchronize browser exit events, and retain a viewport-filling fallback. |

### Tile provider comparison

Reviewed 16 October 2026; [measurements and findings](research/osm-provider-review.md). Timing evidence comes from local browser measurements, not the provider claims below.

| Source | Use in review |
| --- | --- |
| [OSM raster provider registry](https://wiki.openstreetmap.org/wiki/Raster_tile_providers) | Discover Standard, Germany, HOT and OpenTopoMap endpoints. Styles and hosting are distinct; verify current endpoints with the operator. |
| [German style and usage conditions](https://www.openstreetmap.de/germanstyle/) | Official endpoint, style differences, limited bandwidth and restrictions on third-party/commercial use. The linked detailed FOSSGIS policy showed an anti-bot page in this environment. |
| [OSM France basemaps](https://www.openstreetmap.fr/fonds-de-carte/) | Confirms FR, HOT and cycling layers, attribution obligations and best-effort service without an availability guarantee. |
| [CyclOSM project](https://www.cyclosm.org/) | Current `tile-cyclosm.openstreetmap.fr` endpoint and cycling/terrain focus. |
| [OpenTopoMap project](https://opentopomap.org/) | Topographic layer; actual contour and hill-shading rendering checked separately. |
| [Geoapify map tiles documentation](https://apidocs.geoapify.com/docs/maps/) | `osm-carto` raster endpoint, Leaflet integration, own project API key and required attribution; a candidate for a later authenticated speed comparison. |
| [MapTiler Leaflet documentation](https://docs.maptiler.com/leaflet/) | Account/API-key alternative compatible with raster Leaflet maps; not included in the measured results. |
| [MDN script preloading](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload) | Prepare the local Leaflet download without executing it; use the same URL and script request mode so opening can reuse the download. |
| [MDN preconnect](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preconnect) | Connection preparation is separate from resource prefetch. A small local comparison did not demonstrate a convincing benefit, so no provider preconnect was added. |

The organizer supplied [Tập đoàn Viettel](https://maps.app.goo.gl/BbCVS9ZQuAuS2LZE9) as the gathering/departure point on 16 October 2026, with exact coordinates **21.0253150367579, 105.7854235877089**. This was the previous pickup, superseded by the 22 October correction below; the original schedule snapshot is preserved.

On **22 October 2026**, the organizer changed the pickup to **68 Mạc Thái Tông, Hà Nội**, gathering at **21:00**. The outbound departure time is omitted at the user’s request. The [matching public address record](https://www.google.com/maps?cid=14141617352243748642) names “68 P. Mạc Thái Tông, Yên Hòa, Hà Nội” and supplies **21.0137554, 105.7936235**. Runtime copy and map records use this correction; the original Sheet snapshot remains historical.

The organizer supplied [Khe Cải](https://maps.app.goo.gl/TtAiAhR4eie9UuGS7) on 16 October 2026, with exact coordinates **21.27347304583251, 104.42839746119542**. This resolves its former missing pin in the overall map, 25/10 view and inline preview.

Implemented map records and coverage limits are in [Maps](maps.md). The [geographic review](../data/sources/map-locations.json) records the selected points and unresolved identities; [artwork provenance](../data/sources/map-artwork.json) records the eleven supplied PNG masters and optimized derivatives.

The later [treasure-atlas artwork manifest](../data/sources/map-treasure-artwork.json) separately records six user-generated UI assets, their original filenames, source hashes and optimized derivatives. These decorate the interface and do not establish geography or venue identity. The real map provider and geographic registry are unchanged.

The [torn-paper artwork manifest](../data/sources/map-torn-paper-artwork.json) records the additional blank sheet generated through 9Router for the atlas perimeter, including its prompt, model, original and derivative hashes. It is decorative paper, not geographic evidence.

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

## Private crew diary research

Reviewed 17 October 2026 for the [diary plan](diary-plan.md), implementation
and [book redesign](diary-redesign.md). The user chose private reading through seven accounts and first-claim
password setup without email, invitations, claim codes or identity checks.
Backend access control cannot establish the real-world identity of that first
claimant; the plan records this boundary explicitly.

| Primary source | Use in the plan |
| --- | --- |
| [StPageFlip documentation](https://nodlik.github.io/StPageFlip/) and [official repository](https://github.com/Nodlik/StPageFlip) | HTML pages, hard/soft page types, browser bundle and programmatic turning support a static-site prototype. They do not establish the accessibility or browser compatibility of the proposed reader. |
| [Published page-flip package metadata](https://registry.npmjs.org/page-flip/latest) and [upstream settings source](https://github.com/Nodlik/StPageFlip/blob/master/src/Settings.ts) | Verified version 2.0.7, MIT license, browser entry and no dependencies; settings include mouse/click forwarding, corner and portrait controls. Treat page pairing and touch behavior as prototype requirements. |
| [Supabase password-based Auth](https://supabase.com/docs/guides/auth/passwords) and [password security](https://supabase.com/docs/guides/auth/password-security) | Use managed password storage and verification. The proposed internal alias adapts the email-shaped credential interface to the chosen name/password UI; it is a project design, not a native username feature. |
| [Auth general configuration](https://supabase.com/docs/guides/auth/general-configuration), [Before User Created hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook), and [user-data triggers](https://supabase.com/docs/guides/auth/managing-user-data) | Server-side signup restrictions and Auth-insertion triggers support seven predetermined slots. Atomic claiming, exact aliases and immutable ownership still require implementation and tests. |
| [Auth users](https://supabase.com/docs/guides/auth/users) | User-editable metadata must not decide access permissions. The earlier invitation option is documented here but was declined by the user. |
| [Auth sessions](https://supabase.com/docs/guides/auth/sessions) | Remembered browser login, rotating refresh tokens, default unbounded session lifetime and refresh reuse behavior. Own-page editing reuses the session; server rejection, logout or cleared browser storage requires authentication again. Reviewed 2026-10-28; shared project Auth settings remain unchanged. |
| [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | Verify grants, membership/ownership predicates, UPDATE visibility/checks and safe privileged helpers. A role named authenticated alone does not identify one of this crew's accounts. |
| [Storage bucket access models](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Storage policies](https://supabase.com/docs/guides/storage/security/access-control), and [authenticated downloads](https://supabase.com/docs/guides/storage/serving/downloads) | Private buckets and database-backed object visibility protect photos. Public objects and transferable signed URLs do not enforce the intended private-reading boundary in the same way. |
| [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits) and [CAPTCHA protection](https://supabase.com/docs/guides/auth/auth-captcha) | Apply abuse controls at the real authentication endpoints; UI delays are insufficient. Neither mechanism verifies who first claims a name. |
| [Image manipulation example](https://supabase.com/docs/guides/functions/examples/image-manipulation) and [Edge Function limits](https://supabase.com/docs/guides/functions/limits) | WASM image processing is supported; native sharp is not. Current CPU/memory limits require bounded input and an early benchmark before committing to this processing location. |
| [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) and [file-upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) | Check permissions on every request and validate actual uploaded content/size rather than trusting UI fields, filenames or declared MIME alone. |
| [W3C guidance on interaction animation](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions) and [carousel accessibility tutorial](https://www.w3.org/WAI/tutorials/carousels/) | Provide reduced-motion behavior, named controls and keyboard navigation without automatic page advancement. A flip library does not provide these guarantees by itself. |
| [Supabase changelog](https://supabase.com/changelog.md) and [upcoming TLS cipher change](https://supabase.com/changelog/cbc-tls-ciphers-deprecated) | Scanned current changes during research; use modern HTTPS clients. Recheck relevant Auth/Storage/database changes when implementing rather than freezing platform assumptions from this plan. |
| [Admin user creation](https://supabase.com/docs/reference/javascript/auth-admin-createuser) and [Auth migration/custom UUID guidance](https://supabase.com/docs/guides/platform/migrating-to-supabase/auth0) | Implementation uses server-created, confirmed users with random UUID aliases and a separate atomic seven-slot registry; no global Auth hook or real email is needed. |
| [Admin user lookup](https://supabase.com/docs/reference/javascript/auth-admin-getuserbyid) and [admin user update](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid) | Server-controlled credential-format metadata preserves existing passwords while new diary accounts accept any non-empty input through a fixed-length credential. This conversion is specific to the diary; the shared Auth policy is unchanged. |
| [ImageMagick WASM](https://github.com/dlemstra/magick-wasm) and [pinned package](https://registry.npmjs.org/@imagemagick/magick-wasm/0.0.44) | Apache-2.0 server dependency; verified initialization, JPEG settings, resource limits, strip/orient/resize/write against current types/docs, and benchmarked actual hosted processing. The WASM bytes are pinned by SHA-256. |

The implemented [cover prompt](prompts/diary/02_cover.md) and
[asset manifest](../data/sources/diary-artwork.json) record the second Sunburst
generation, its study reference, untouched master and runtime WebP. The cover
contains no private data; all title/date/action text remains HTML.

The [Sunburst material-study request and hashes](../figures/raw/diary/generation.json)
and [exact prompt](prompts/diary/01_material_study.md) record the single generated
planning image. The existing painted wheel and coffee sticker were its style
references. The [preview](research/diary_material_study.webp) shows blank paper
and photo prints; it is neither a functioning interface nor a trip photograph.


### Diary book redesign sources

- [MDN: transform-style](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style) and [backface-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/backface-visibility): keep grouping opacity/filter effects off 3D ancestors and render front/reverse strips with separate per-face shading.
- [MDN: Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) and [scroll anchoring](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll_anchoring): one seekable geometry clock, explicit lifecycle settlement, and stable stage measurements.
- [Google Fonts Mali source](https://github.com/google/fonts/tree/main/ofl/mali) and [Dancing Script source](https://github.com/google/fonts/tree/main/ofl/dancingscript): local WOFF2 subsets with Latin, extended Latin, Vietnamese, combining marks and punctuation; GSUB/GPOS shaping tables retained. Original OFL licenses are kept with the fonts. Runtime font hashes and preparation metadata are in [the font manifest](../data/sources/diary-fonts.json).
- [Supabase testing overview](https://supabase.com/docs/guides/local-development/testing/overview): independent QA identifiers/resources and cleanup of only the test data; browser fixtures alone do not establish server authorization.
- [Revision 2 artwork prompts](prompts/diary/revision_2/README.md) and [29-layer manifest](../data/sources/diary-materials.json): nine `cx/gpt-image-2.5-sunburst` generations, referenced to the earlier decorative cover; preserved originals, crops, alpha processing and derivative hashes. No private media was sent to generation.
- Supabase [database functions](https://supabase.com/docs/guides/database/functions): reviewed for the nine-photo gateway migration on 18 October 2026.

## Browser color handling

- [MDN color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme): `only light` prevents automatic darkening while preserving independently configured system forced colors.
- [Dark Reader 4.9.133](https://www.npmjs.com/package/darkreader/v/4.9.133): verified from the published `darkreader.js` dynamic-theme implementation, which recognizes `meta[name="darkreader-lock"]`. The pinned package is a temporary verification dependency, not a website runtime asset. The [controls guide](controls.md#browser-dark-mode) records the browser test command and limits.


## Playful UI concept references

The [three concept mockups](ui-concepts.md) preserve the earlier proposal's research rationale. These are design references, not evidence of implemented accessibility conformance.

- [NN/g: Microinteractions](https://www.nngroup.com/articles/microinteractions/) — brief, contextual feedback attached to an action.
- [Google Creative Lab: Paper Planes](https://experiments.withgoogle.com/paper-planes) — familiar paper actions and a personal keepsake metaphor.
- [W3C: Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) — provide a single-pointer alternative to dragging, alongside keyboard access.
- [W3C: Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) — allow nonessential interaction animation to be disabled.


## Location scene planning references

Reviewed 19 October 2026 for the [location-scene plan](location-scenes-plan.md). The existing [place research](research/places.md) and preserved photo catalog supply the geographic reference points; this planning turn did not reverify venue architecture or acquire new photography.

- [W3C: Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html): keep revealed information dismissible, hoverable and persistent while being used.
- [W3C: Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html): support motion preferences and disabling nonessential effects, including parallax.
- [MDN: Lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading): defer noncritical resources and load them as needed, rather than making every location part of the opening transfer.

The later [prompt-only artwork refresh](location-scenes.md#preserved-artwork-and-reproducibility) replaces all selected non-ridge paintings, foregrounds, stickers and effects. Its [24 generation jobs](prompts/location_scenes/text_only_jobs.json) have empty reference lists; no photo or generated image was submitted. Earlier reference-based masters remain archived. Sống Lưng retains its original approved artwork and provenance.

## HEIC upload decoder

Reviewed 28 October 2026 for local diary photo conversion. Runtime assets and
corresponding source archives are vendored locally; these links are provenance
and build references, not services that receive uploaded images.

- [heic-to 1.6.7 pinned source](https://github.com/hoppergee/heic-to/tree/78345a3fcdb4a1d70d513fce2646aeff0127f7ba): CSP decoder distribution and build instructions.
- [Exact npm release](https://registry.npmjs.org/heic-to/-/heic-to-1.6.7.tgz): `src/lib/libheif-without-unsafe-eval.js` supplies the generated decoder; original/adapted hashes are in `vendor/heif/version.json`.
- [libheif 1.23.7](https://github.com/strukturag/libheif/tree/v1.23.7): decoder API, primary-image selection, image transformations, source and Emscripten build script.
- [libde265 1.0.16](https://github.com/strukturag/libde265/tree/v1.0.16): bundled HEVC decoder source and license.
