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
