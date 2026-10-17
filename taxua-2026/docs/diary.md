# Những ngày ở trên mây

[Documentation index](README.md) · [Backend and operations](diary-backend.md) · [Original design plan](diary-plan.md) · [Book redesign](diary-redesign.md) · [Implementation review](diary-review.md)

The optional private diary sits inside `#crew`, between the seven portraits and
the games. The public itinerary, scenery, games, fund and direct-file reading
copy retain their existing behavior. No private entry is exported into HTML.

## Reading and writing

- Select **Mở sổ** or a crew name. The first visitor selecting an unclaimed
  name sets its password. Later visits require that password. There is no
  email, invitation, identity verification or claim code, as requested.
- Passwords can be any non-empty value, including one character. There is no
  password length or character rule, and spaces are preserved. First setup
  still asks for the same password twice to catch typing errors.
- Whoever claims an unclaimed name first owns that account and can read the
  shared diary. The site cannot establish their real-world identity. After
  claiming, server permissions protect that account's page.
- Desktop shows one person's writing and photographs together. Paper-edge
  buttons, bookmarks and left/right arrow keys always change the whole person.
  The order follows `crewOrder`: mi, san, thảo, quanlele, gtm, trường, linh.
- Cloth bookmarks carry the existing crew portrait stickers. Names remain in
  accessible labels and hover titles; a contained name appears if its image
  fails. On narrow screens the row scrolls and keeps the selected person visible.
  Ribbons retain their native fabric proportions and crop into the book rather
  than stretching to each tab's height. Native-resolution derivatives and
  larger, unfiltered portraits keep the stitching and faces clear.
  Ribbon crops exclude disconnected fragments from neighboring atlas cells.
  Symmetric padding centers portraits vertically in both selected and idle tabs.
- Tap either outer paper edge, or drag blank paper horizontally, to turn.
  The sheet follows the pointer and completes on release; a short drag returns
  to the original spread. Escape or pointer cancellation also returns it.
  Phone readers can swipe horizontally through writing while vertical gestures
  keep native scrolling. Mouse text selection, photo clicks and edit buttons
  keep their normal actions. Edges stop at the first/last person.
- At widths up to 850px, **Lời viết / Ảnh mang về** switches the visible face
  for the same person. Large default text also switches to this layout. The normal book
  keeps a stable paper size, with scrollable writing and **Đọc trọn bài** for
  complete natural-flow reading. Enlarged text uses a natural-height leaf.
  Neither mode shrinks the type to fit.
- Empty writing keeps quiet ruled paper and empty photo frames have no
  explanatory invitation text. Owner headings and edit controls stay available.
- The reader toolbar uses Lucide refresh, close-book and logout icons with
  Vietnamese accessible labels and hover titles. Refresh succeeds quietly;
  connection errors remain visible. The selected person's page is announced
  to screen readers. The bottom navigation, visible counter and reading-session
  name are removed.
- Every edit button asks for that page owner's password, even during an
  existing reading session. Successful authentication switches to that account.
  A password for another person cannot authorize edits to the selected page.
- A draft saves privately after about a second of inactivity and when closing
  the editor. **Lưu vào sổ** explicitly publishes writing and the complete
  photo list together. Other crew accounts see the published version only.
- A revision mismatch preserves the local writing. The editor offers copying,
  loading the newer draft, or holding the local writing in this tab. Failed
  saves do not report success. Unsynced recovery is memory-only: reloading or
  closing the tab loses it. A deliberate logout clears it.
- Closing the book retains the reading session. **Đăng xuất** clears the
  current tab's tokens, private DOM and image URLs, and revokes its server
  session. A disconnected logout clears this tab and explicitly reports that
  server revocation could not be confirmed.

## Photographs

Each person has at most twelve stored photos/reservations and a 30 MiB budget.
JPEG, PNG and WebP inputs up to 20 MiB are supported. HEIC, SVG, GIF and other
formats are rejected with an explanation. The browser orients and resizes
inputs into JPEGs with a 1600px longest edge, at most 2 MiB each. The server
independently checks bytes/dimensions, decodes JPEG, strips metadata and writes
a fresh reading image plus a 640px thumbnail. Browser compression alone never
grants upload permission.

The first three photos in the ordered draft appear on the book page. The
album keeps all twelve; each photo has a caption and a screen-reader description.
Keyboard buttons reorder images. Removing a photo from the draft changes the
published page only after **Lưu vào sổ**. An uploaded image omitted from the
draft appears in the unused-image list and can be attached again or explicitly
deleted after it is no longer published. Explicit deletion also removes the
image reference from retained revisions; this is stated in the backend guide.

Images are fetched with bearer authentication into in-memory object URLs.
There are no public or transferable signed-photo URLs. Unpublishing an image
removes other members' access immediately, including through previously known
media paths. People who are allowed to read can still save or screenshot what
they have already seen.

## Book materials and motion

Nine new Sunburst masters supply **29 transparent material layers**: front/back
covers, two inside covers, six paper skins, binding/page edges, seven fabric
bookmarks, three photo frames, four tape/corner layers and three small keepsakes.
The indigo linen, warm paper and worn print borders belong to the book object;
the existing watercolor world remains visible around it. Titles, names, actions
and captions remain live HTML.

The [material manifest](../data/sources/diary-materials.json) records every
master/derivative hash, crop, size and transparent photo opening. Exact prompts
and references live in [the artwork brief](prompts/diary/revision_2/README.md).
Preserved masters are in `figures/raw/diary/revision_2/`; runtime WebPs are in
`figures/decor/painted/diary/` (2,289,164 bytes combined). The reproducible
`python3 scripts/prepare_diary_artwork.py` helper requires Pillow and NumPy and
makes no network requests. Earlier study/cover generations remain archived.
No private photographs, writings or new member portraits were generated.

Writing and captions use self-hosted Mali 400/500. Names, titles and the cover
use Dancing Script 400–700; controls retain Be Vietnam Pro. The WOFF2 subsets
include Vietnamese letters and decomposed combining marks, with shaping tables
preserved. Their original SIL OFL licenses are in `figures/fonts/`.

`diary-motion.js` decorates the semantic reader without a third-party flip
library. Opening measures the actual closed cover and final paper, translates
and scales the same object, and rotates its hinged front/inside cover. The
nearby margin note fades while it opens. Closing reverses that geometry. Stage
height is reserved during measurement so browser scroll anchoring cannot shift
the starting position. The left paper travels on the cover's reverse face;
the stationary base stays to the right of the spine throughout. No flat left
endpaper expands ahead of the cover. The writing fades in on the hinged face
as it lands, and the semantic reader takes over after the motion completes.
The two prebuilt cover faces also receive explicit visibility at the edge-on
angle so WebKit cannot paint the reverse material over the front.

A turn uses 16 curved strips on desktop and ten in the single-leaf layout.
The front keeps the outgoing page, including its photos, captions, artwork and
writing scroll position. The reverse carries the destination's landing page;
its companion page is revealed underneath the lifting front. Each face has its
own content and orientation, so the old page is never repeated on the reverse
and the destination does not suddenly appear at the end. The destination is
prepared in a hidden, inert spread; its decoded image nodes become the reader
after landing. The semantic selection, active bookmark and page announcement commit
together only after landing.
Duplicate controls are inert/hidden from accessibility APIs and have no IDs;
forms remain in separate native dialogs. Rapid taps cannot queue extra turns.
Per-face shading and a separate cast shadow preserve the 3D geometry.
Dragging scrubs the same animation clock; release settles the remaining motion
or reverses to the original page, without another content replacement.

| Action | Desktop | Phone/single leaf |
| --- | --- | --- |
| Open | 1,360ms | 1,050ms |
| Turn | 1,080ms | 780ms |
| Close | 1,180ms | 900ms |

Artwork, fonts and target thumbnails have bounded preparation before motion.
Missing material falls back to a plain readable surface. Reduced motion, the
site's pause control, a missing motion script/style or unsupported Web Animations
uses immediate semantic navigation. Resize, pagehide and hidden tabs settle an
active action once; logout/session rejection cancels it and clears private
surfaces. There is no scroll interception, automatic advance or sound. The diary
and its dialogs are excluded from printing.

The book previews up to three photos with short captions. The full album keeps
unabridged captions in normal flow, including at 320px and enlarged text, so a
long caption cannot overlap the next frame.

## Code ownership

| File | Responsibility |
| --- | --- |
| `data.js` | Stable ASCII member IDs, existing names, portraits and order |
| `index.html` | Inline cover/reader shell, optional scripts/styles |
| `diary.js` / `diary.css` | Semantic reader, native dialogs, editor, recovery and base presentation |
| `diary-motion.js` / `diary-motion.css` | Decorative cover/curved leaf geometry, material skins, handwriting and responsive polish |
| `diary-materials.css` | Generated frame/image opening coordinates |
| `scripts/prepare_diary_artwork.py` | Offline master-to-WebP preparation and material manifest |
| `diary-api.js` | Request cancellation, refresh, tab session and private image URLs |
| `diary-config.js` | Public function endpoint only; no keys/passwords |
| `backend/supabase/` | Migrations, pinned Edge code and local CLI configuration |
| `scripts/verify_diary.cjs` | Deterministic browser interactions/visual checks with a mocked transport |
| `scripts/verify_diary_motion.cjs` | Paused opening/turn/closing frames, front/reverse ownership and painted-pixel photo orientation |
| `scripts/verify_diary_navigation.cjs` | Sticker bounds/fallbacks, edge clicks, controlled/cancelled drags, phone swipes and native vertical touch scrolling |
| `scripts/verify_diary_layout.cjs` | Long writing/albums, enlarged text, Vietnamese shaping, missing assets and mid-motion expiry |
| `scripts/verify_diary_backend.cjs` | Direct requests against real disposable accounts/policies |

The new scripts run after the existing static-trip scripts. They are classic
scripts with no frontend npm dependency or CDN. `file://` retains the cover
and a connection explanation; private access needs HTTP/HTTPS and the backend.
No Supabase SDK is downloaded into the browser.

## Verification

Run from `taxua-2026/`, reusing the existing preview server:

```sh
node scripts/verify_diary.cjs
DIARY_WEBKIT=1 node scripts/verify_diary.cjs
DIARY_WEBKIT=1 node scripts/verify_diary_motion.cjs
DIARY_WEBKIT=1 node scripts/verify_diary_navigation.cjs
DIARY_WEBKIT=1 node scripts/verify_diary_layout.cjs
```

The WebKit commands require an installed Playwright WebKit browser and its
Linux libraries. `PLAYWRIGHT_PATH`, `TRIP_PREVIEW_URL` and optional
`DIARY_WEBKIT_EXECUTABLE` override the test dependencies/preview.
`TRIP_REVIEW_DIR` sets the interaction evidence folder; `DIARY_MOTION_REVIEW_DIR`,
`DIARY_NAVIGATION_REVIEW_DIR` and `DIARY_LAYOUT_REVIEW_DIR` set the other helpers'
evidence folders.
See [backend verification](diary-backend.md#verification) before running tests
that modify accounts. Browser fixtures alone do not prove server permissions.
