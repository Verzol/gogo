# Phòng ý tưởng: 13 independent demos

[Documentation index](README.md) · [Open the gallery](../demos/index.html)

The existing `demos/` folder is ignored local preview material, not tracked production content. Its links work in a checkout that already contains those files.

These are interactive concept demonstrations for the Tà Xùa journal. They reuse its local fonts, official Lucide geometry, painted cutouts and documentary destination photographs. They do not change the production page, itinerary, member roster, weather, fund or personal packing checklist.

## Open and compare

With the existing repository-root server on port 8000, open **http://127.0.0.1:8000/taxua-2026/demos/**. Check and reuse that server before starting another one. If serving only `taxua-2026/`, use `/demos/` instead. The gallery and each separate HTML entry also support direct `file://` opening.

The gallery filters ideas by keepsakes, playing together, trip logistics and atmosphere. Each demo has instructions, its own reset, previous/next links and a link back to all 13. Vietnamese sample copy uses the existing seven-person roster. Initial contributions and future trip stories are clearly labeled examples, not actual member records.

| Demo | Try it | Demonstration boundary |
| --- | --- | --- |
| [Hộ chiếu săn mây](../demos/passport.html) | Switch person, select a stop, write a caption, stamp, download SVG | Explicit stamps only; no scroll-based visit tracking |
| [Cuộn phim 7 × 7](../demos/film.html) | Add sample photos or a local JPG/PNG/WebP, delete frames, reveal the 49-slot roll | Local upload, at most seven per person; the visual lock is not access control |
| [Trạm săn mây](../demos/cloud-notebook.html) | Filter sightings, add an observation | Illustrative forecast and starting reports; new reports use current Vietnam time |
| [Sổ tay bỏ túi](../demos/pocket-guide.html) | Change day, select a numbered stop, open its existing Maps search | All 24 events read directly from `data.js`; diagram is not a geographic map |
| [Gửi mình sau chuyến đi](../demos/postcard.html) | Write, seal, simulate the opening date, download the text | No actual email delivery or time lock |
| [Nghe Tà Xùa](../demos/soundscape.html) | Select a scene, play, adjust volume, mute, stop | Opt-in Web Audio synthesis, not field recordings; stops when page is hidden or left |
| [Bảy góc nhìn](../demos/perspectives.html) | Switch place/person, write or restore a perspective | Destination photo and seven sample quotes per scene; not member-submitted photographs |
| [Bingo đồng bọn](../demos/bingo.html) | Mark/unmark cooperative activities, complete a row | One shared-looking sheet, stored on this browser; no real shared state |
| [Heo đi cùng](../demos/pig.html) | Select and collect four souvenirs to read diary entries | Fictional companion story; no fund balance or payment status |
| [Chuyện bên lề](../demos/margin-notes.html) | Select any event, filter authors, write and remove your own notes | Real itinerary alongside sample/local annotations |
| [Ai mang đồ chung?](../demos/gear.html) | Assign an owner, mark packed, see readiness | Initial owners are examples; unassigning or changing owner clears readiness |
| [Một cuốn zine mang về](../demos/zine.html) | Name the book, turn pages, print/save PDF | Six designed sample pages; three landscape sheets, not an imposed foldable booklet |
| [Túi nhỏ không cần sóng](../demos/offline.html) | Save itinerary, simulate no signal, queue notes, download standalone HTML | Actual local save and self-contained reading file; network/sync are simulations |

## Local state and privacy

`demos/common.js` contains the catalog, shared layout helpers and storage wrapper. State keys are **`taxua-demos-v1:<demo-id>`**. Each reset affects only its own key. The demos never send contributions, photos or notes to a server and do not initialize Supabase or change existing production keys.

Film uploads are decoded, resized to a maximum 640-pixel edge without upscaling, and stored as JPEG data URLs. Input limit is 8 MB per original image. Browser storage limits still apply; failures are reported in the page status. Other content is small JSON. A browser that denies local storage can still run interactions for the current page visit. Direct-file storage persistence depends on browser policy.

The sound page creates audio only after an explicit play gesture. Playback state is not persisted. It disconnects/stops sources on pause, reset or page hiding and closes its audio context on page exit. It respects reduced motion for the animated listening rings.

The offline demo does **not** install a service worker or cache the website shell. Its downloaded `.html` is a standalone textual copy of all 24 events, notes, optional flags and exact/null times. It opens without fonts, images, JavaScript or network requests. Maps searches inside the copy still need a connection. Editing/syncing notes inside that downloaded reading copy is not implemented.

## Maintain

- `demos/index.html`, `gallery.js`: gallery shell, miniatures and filters.
- `demos/<id>.html`: separate entry points, all using classic scripts.
- `demos/common.js`: catalog, local state, shared helpers and navigation.
- `../controls.css` / `../controls.js`: the same themed fields, dropdown menus, sliders and checkboxes as production; select values/events remain native.
- `demos/demo.css`: isolated responsive layouts, reduced-motion and zine print rules.
- `demos/features/<id>.js`: each concept's rendering, sample content and behavior.
- `demos/icons.js`: serialized official Lucide 1.23.0 symbols from the existing pinned local bundle; do not hand-edit icon paths. Licensing remains in [vendor documentation](vendor.md).
- Existing image provenance stays in [Photo assets](assets.md) and source JSON; no generated production asset registry was changed.

All links and assets are relative. There are no runtime dependencies, builds, remote fonts or CDNs. External navigation only occurs when a user chooses the production journal or a Maps link.

## Verification

Run the focused browser checks from `taxua-2026/` while the repository-root preview is running:

```sh
node scripts/verify_demos.cjs
```

The script uses the existing sibling Hue Playwright installation, or `PLAYWRIGHT_PATH` if supplied. Evidence defaults to `/tmp/taxua-demo-review`; override with `TRIP_REVIEW_DIR`. It checks all 14 pages at desktop, phone and narrow phone widths, key interactions, independent state/reset, photo upload and download, standalone offline reading, keyboard use, reduced motion, zine print layout, direct-file opening and browser errors. These are concept checks; no live multi-user backend is exercised.

Reverified after shared-control integration on 16 October 2026: **254 checks passed**, including all 14 entries at 1440, 390 and 320 pixels, with no browser errors or missing resources. Reviewed desktop/phone screenshots and the rendered zine print output. The PDF contains three A4 landscape sheets. Current evidence is in `/tmp/taxua-demo-review/` (28 screenshots, report JSON, PDF and example downloads), rather than the historical production review folders.
