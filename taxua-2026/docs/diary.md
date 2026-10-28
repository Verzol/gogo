# Những ngày ở trên mây

[Documentation index](README.md) · [Backend and operations](diary-backend.md) · [Original design plan](diary-plan.md) · [Book redesign](diary-redesign.md) · [Implementation review](diary-review.md) · [Visual refinement](diary-design-refinement.md)

The optional private diary sits inside `#crew`, between the eight portraits and
the games. The public itinerary, scenery, games, fund and direct-file reading
copy retain their existing behavior. No private entry is exported into HTML.

## Reading and writing

- Select **Mở sổ** or a crew name. The first visitor selecting an unclaimed
  name sets its password. Later visits require that password. There is no
  email, invitation, identity verification or claim code, as requested.
- Passwords can be any non-empty value, including one character. There is no
  password length or character rule, and spaces are preserved. First setup
  still asks for the same password twice to catch typing errors. The eight
  name choices form two balanced rows of four.
- Whoever claims an unclaimed name first owns that account and can read the
  shared diary. The site cannot establish their real-world identity. After
  claiming, server permissions protect that account's page.
- Desktop shows one person's writing and photographs together. Paper-edge
  buttons, bookmarks and left/right arrow keys always change the whole person.
  The order follows `crewOrder`: mi, san, thảo, quanlele, gtm, trường, tamle, linh.
- Cloth bookmarks carry the existing crew portrait stickers. Names remain in
  accessible labels and hover titles; a contained name appears if its image
  fails. On narrow screens the row scrolls and keeps the selected person visible.
  Ribbons retain their native fabric proportions and crop into the book rather
  than stretching to each tab's height. Native-resolution derivatives and
  larger, unfiltered portraits keep the stitching and faces clear.
  Ribbon crops exclude disconnected fragments from neighboring atlas cells.
  Symmetric padding centers portraits vertically in both selected and idle tabs.
  Hover gently brightens the ribbon without moving its attachment to the book;
  keyboard focus keeps its visible outline.
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
- Your own writing/photo edit buttons reuse your active session and open the
  private draft directly after the server verifies access. Closing and reopening
  the editor or book does not ask for your password again. Writing and photo
  edit buttons appear only on the signed-in owner's pages. Other crew pages
  stay read-only; log out and sign in under another name to change accounts.
  Expired sessions refresh automatically when possible; if the server rejects
  the session, editing asks you to sign in again.
- Login remembers this browser across tabs, reloads and browser restarts by
  default, without a client-imposed expiry. The book initially selects the
  remembered person's page. Existing tab-only sessions migrate automatically.
  A new browser/device still needs the person's password; browser data removal,
  provider revocation or **Đăng xuất** requires login again. Browsers that deny
  persistent storage fall back to tab storage, then memory. The login explains
  remembering this device and recommends logout on shared computers.
  Access/refresh tokens rotate silently when needed. Supported browsers use a
  cross-tab Web Lock to avoid simultaneous rotation; token updates for the same
  person leave an open editor intact. Switching person clears old private UI
  in every tab. Temporary network errors retain the remembered credentials.
- A draft saves privately after about a second of inactivity and when closing
  the editor. **Lưu vào sổ** explicitly publishes writing and the complete
  photo list together. Other crew accounts see the published version only.
- A revision mismatch preserves the local writing. The editor offers copying,
  loading the newer draft, or holding the local writing in this tab. Failed
  saves do not report success. Unsynced recovery is memory-only: reloading or
  closing the tab loses it. A deliberate logout clears it.
- Closing the book retains the reading session. **Đăng xuất** immediately
  clears this browser's tokens and private DOM/image URLs across its open tabs,
  then revokes that server session. A disconnected logout still forgets the
  browser and explicitly reports that server revocation could not be confirmed.
  Other devices' sessions remain independent. Passwords, writing and photos
  are never put in persistent login storage.

## Photographs

Each person has at most nine stored photos/reservations and a 30 MiB budget.
JPEG, PNG, WebP and HEIC/HEIF inputs up to 20 MiB are supported. SVG, GIF
and other formats are rejected with an explanation. The browser orients and resizes
inputs into JPEGs with a 1600px longest edge, at most 2 MiB each. The server
independently checks bytes/dimensions, decodes JPEG, strips metadata and writes
a fresh reading image plus a 640px thumbnail. Browser compression alone never
grants upload permission.

HEIC/HEIF works from both the picker and file drop, including uppercase extensions,
missing MIME types and recognizable HEIF headers mislabeled as JPEG. Native
browser decoding is attempted first. If needed, a local libheif decoder loads
on demand inside a worker, keeping the editor responsive. For collections or
sequences, the primary still image becomes one diary photograph. HEIF image
transforms are applied by the decoder; converted JPEGs retain no original EXIF.
The existing 50-megapixel source boundary is checked before allocating decoded
RGBA pixels in the worker. The worker transfers a resized bitmap, or pixel data
on older browsers, into the same JPEG normalization/upload pipeline. No HEIC
original or photo bytes go to a third-party conversion service.

The UI reports **Đang đọc ảnh HEIC…** during fallback conversion. Corrupt files,
unavailable decoder assets and a 60-second conversion timeout have recoverable
Vietnamese messages. Closing the editor or ending the session aborts conversion
and terminates its worker before reserving an upload. Failed/cancelled conversion
cannot alter an existing photo or draft. HEIC originals, Live Photo video and
additional frames are not stored. See [decoder versions/licenses](vendor.md#optional-heic-decoder).

Every photo in the published version appears directly on the book page, up to nine.
The grid adapts to its count: one large print; two stacked prints; a large print
above two for three; two columns for four to six; and three-column arrangements
with centered incomplete final rows for seven/eight, or a full 3-by-3 grid for nine. Empty
pages retain three quiet frames. All layouts keep the paper's stable dimensions.
Each photo has a caption and a screen-reader description. Click a print to open
its full image and complete caption in a private popup. Previous/next arrows
and the left/right arrow keys move within that person's photos; controls stop
at the first and last photo. Touch users can swipe horizontally at the fitted
size. Mouse wheel/trackpad scroll enlarges the entire photograph and its frame,
including beyond the viewport. The frame has no width/height cap or maximum zoom
setting; the outer transparent viewer clips only at the screen boundary. Dragging
pans a photograph that exceeds its fitted reading area, with bounded movement so
it cannot be lost offscreen. Axes that still fit stay centered. Two-finger pinch
and double-tap work inside the photo; double-click toggles magnification on desktop.
Panning and pinching never switch photos. The transparent bottom controls and
`+` / `-` / `0` keys zoom or reset to the minimum 1× fitted view. Changing photos
resets the view; browser-level zoom outside the photo is retained. Escape, the
close icon or a deliberate backdrop tap returns to the book.

The viewer uses a transparent full-viewport dialog. At the fitted size, portraits
remain narrow, landscapes wide, and small photos retain their original resolution.
There is no owner/title header or parchment mat. Transparent 44px Lucide arrows
stay at fixed viewport edges, with a fixed top-right close control, shadowed
strokes and visible keyboard focus. Photo shape, zoom and panning never move them.
The complete caption and compact `4 / 6` counter remain fixed above the bottom
zoom controls, with transparent backgrounds and shadowed cream text. Their position,
width, font size and wrapping remain exactly unchanged during zoom or panning.
Long captions can scroll within that fixed region. The owner and full position
remain in the dialog's accessible name. Resize and browser-chrome changes refit
the initial image geometry while preserving magnification; native browser zoom
is preserved.
The popup immediately reuses its already loaded thumbnail, then upgrades to the
full-resolution image after decoding, without blanking the preview. Full images
and in-flight requests share the existing session-only memory cache. Once the
selected full image is ready, only its two immediate neighbors prefetch; data-saving
and 2G connections skip that speculation. Closing or changing photos cancels any
scheduled prefetch. Private blobs remain outside persistent browser storage and
are revoked on session loss or account switching.

Slow/error states keep close/navigation usable. If a full image fails, the
thumbnail remains visible with a retry action; retry keeps keyboard focus within
the dialog. Late responses cannot replace a newly selected image. The popup
keeps keyboard focus in the dialog and clears
its private image on close or session loss. There is no separate
“Xem đủ … ảnh” album button.

The editor has **Lời viết / Ảnh mang về** tabs and uses the actual painted
leaves as the editing surface. There is no separate photo inspector or row of
forms. Existing generated paper, frames and Vietnamese handwriting remain.
The photo leaf uses the reader's geometry, so the finished layout stays familiar.

On the writing leaf, the optional title and prose are borderless, labeled native
text fields on the paper. Prose uses the same Mali font, wrapping rules, ink and
ruled-line spacing as the reader. Plain text, Vietnamese input, selection, paste
and the existing 100/8,000-character limits remain; pasted HTML cannot execute.
Long prose scrolls inside the page. Enlarged text gives the editing leaf more
height instead of clipping its controls.

Choose **Thêm ảnh**, tap the empty paper's plus, or drop JPEG/PNG/WebP/HEIC files
onto the photo leaf. Both upload paths use the existing normalization, size,
ownership and nine-photo checks. Progress and failures stay visible; upload and
publish operations lock photo actions until complete. At the stored-photo limit,
the add action explains how to free space through the unused-photo drawer.

Select a photo to reveal its compact, labeled tool strip. No corner grip icons
cover the photographs. On desktop, drag the image directly. On touch, tap to
select, then drag that selected image; unselected photos retain native vertical
scrolling. The frame follows the pointer continuously, highlights its destination
and animates into place on release. The displaced photo travels to the other
slot. Dropping outside, Escape or pointer cancellation returns it. **Đổi chỗ**
plus a destination tap and Alt + an arrow key provide alternatives. The toolbar
hides while choosing a swap destination so every frame stays reachable. Captions,
descriptions, size and framing travel with the photo.

**Cỡ ảnh** offers **Tự động / Nhỏ / Vừa / Lớn**. Sizes snap to safe rectangles
inside a six-column, at-most-eight-row composition; controls disable sizes that
cannot fit the remaining photographs. A small occupancy search preserves valid
compositions when a large photo moves later in the order. If adding/restoring a
photo exceeds capacity, recent custom frames step down in size with an explanation,
keeping every photo visible. An impossible imported composition displays balanced
defaults. The size note also provides previous/next placement buttons. Presets,
reordering and accepted crops use the same non-destructive draft metadata;
there are no arbitrary pixel offsets or freeform corner handles. The reader,
editor and turning leaves share the same packing geometry. Eight photos default
to rows of three, three and two, with no full-width strip.

Write a caption directly below its photo. **Ghi chú** opens a small note on the
paper for the complete caption and screen-reader description. Both caption
surfaces stay synchronized. **Cất ảnh** removes a photo from the draft, with
**Hoàn tác** restoring its position, caption, description and crop. The collapsed
**Ảnh đã cất** drawer supports reattaching or explicitly deleting unused uploads.
Removing a photo stays private until **Lưu vào sổ** publishes the draft.

**Căn ảnh** lifts and enlarges the selected frame on the same leaf, preserving
its aperture proportions while fading the surrounding photographs. Drag the
image or use arrow keys; adjust **Thu phóng** from 1× to 3×. Movement is clamped
so no empty edge appears. **Đặt lại** centers the photo at 1×; **Xong** accepts
the provisional crop, while **Hủy** or Escape restores the previous crop without
closing the editor. The frame then returns to its original slot. Save, publish,
closing the editor or switching to writing accepts the current crop first.
The lifted frame reserves room for the real, unscaled zoom controls below it,
accounting for paper scale, footer and available dialog height. Controls never
clamp back over the photo when the dialog scrolls. Entering framing brings the
photo and controls into view together. If needed, only the editing leaf extends
temporarily; leaving framing restores its previous dimensions and scroll
position. Reset, cancel and done use equal-sized
touch targets and the same label typography; done carries the forest-ink fill.
Resizing cancels provisional framing and rebuilds the leaf for the new viewport.
The original processed photo is preserved; the full-photo viewer stays uncropped.
Reduced motion and the site's motion pause skip settling/lifting animations;
the object still tracks direct pointer movement.
Caption and size panels replace one another on the first click and expose
their current expanded state. The reader's writing/photo selector wraps at
enlarged text sizes, leaving refresh, close and logout reachable. Enlarged-text
editing puts the normal photo tools and notes below the page, wraps its header,
and gives publication its own footer row to prevent clipped controls.

Completed swaps and accepted crops use the normal draft autosave. Pan/zoom
movements stay local until accepted. Failed saves and revision conflicts retain
photo arrangement/sizes/crops alongside writing in the tab's memory-only recovery.
X, **Đóng**, a deliberate backdrop click or Escape can leave immediately,
including during a failed save, conflict, upload or publication. Escape first
cancels a crop, contextual note or swap. Dirty closes keep a memory-only recovery
snapshot, then try saving in the background using the latest completed revision.
Reopening waits for that background attempt and offers recovery when necessary.
An upload finishing after close remains in the unused-photo library. Publication
continues with truthful success/failure feedback; close controls stay enabled.
An inside-to-outside drag is not treated as a backdrop dismissal. The X stays
reachable while scrolling, and the footer follows the content without covering
error/recovery actions. A deliberate logout clears all private preview and crop
surfaces.

Removing a photo from the draft changes the
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

On fine pointers with hover, only the open book's paper and page-turn edges use a small watercolor wooden-pencil cursor: ochre wood, an indigo band and no cloud decoration. The graphite tip is the clicking point. The closed cover, section heading, surrounding space, bookmarks, toolbar and separate dialogs use the regular themed cursors. Text selection, caret placement and typing keep their native behavior; page dragging switches to the themed closed hand and busy/disabled actions use distinct themed symbols. Touch, print and forced colors keep native cues. Artwork, generation provenance and fallbacks are documented in [Cursor preparation](prompts/cursor/README.md#diary-pencil) and [Shared controls](controls.md#painted-cloud-cursors).

The closed view contains one centered indigo book, with its title and **Mở sổ**
action on the cover. Loading and error messages use a small transparent status
line over the scenery. Opening replaces the cover with a compact title, icon tools and portrait
bookmarks directly attached to the paper. The writing/photo selector sits above
the bookmarks on single-leaf layouts, so no control row separates cloth and book.

Tamle has an eighth portrait bookmark: an aubergine tint of the existing painted cloth, with gold stitching, native dimensions and alpha retained. Ribbon colors are keyed by immutable member ID so adding someone does not recolor another member. The offline material helper and manifest record this additional derivative.

The original nine Sunburst masters and 29 transparent layers remain preserved:
cloth covers, binding/page edges, seven original portrait ribbons, photo frames,
attachments and keepsakes. The current leaves use three freshly regenerated
Sunburst masters: separate left/right paper and an inner-cover lining. This
lighter oatmeal parchment has fine fibers, gently rubbed edges and very small
corner creases. The earlier heavy tears, peeling edges, foxing and stains were
removed after feedback. Existing warmed print borders retain their exact alpha
and photo-opening coordinates. Dark forest ink and helpers preserve readability.
Empty writing keeps quiet ruled paper without copy. Material colors remain
consistent across scenery periods and browser color schemes.

Browser automatic darkening is explicitly disabled for the site's artwork and
parchment via `color-scheme: only light`, including dialog fields. System
high-contrast colors remain available. See [Browser dark mode](controls.md#browser-dark-mode)
for the whole-site behavior and rendered-pixel regression checks.

The [current paper manifest](../data/sources/diary-soft-paper.json) records source,
request and output hashes, dimensions and processing. [Exact prompts and rebuild
instructions](prompts/diary/soft_aged/README.md) accompany the three masters and
requests in `figures/raw/diary/soft_aged/`. Three new paper WebPs total 292,278
bytes. The preceding [aged materials](../data/sources/diary-aged.json),
[original material manifest](../data/sources/diary-materials.json) and
[quiet refinement](../data/sources/diary-refinement.json) remain reproducible.
For a full rebuild, run `python3 scripts/prepare_diary_artwork.py`,
`python3 scripts/prepare_diary_refinement.py`,
`python3 scripts/prepare_diary_aged.py`, then
`python3 scripts/prepare_diary_soft_paper.py`. These helpers are offline and
require Pillow and NumPy. No private photographs, writing or member portraits
were supplied to generation.

Turning leaves copy these same generated materials onto both frozen faces.
The opening cover uses the new inner lining until writing settles on its
reverse. Preloading uses current textures, with matching parchment fallback
colors if artwork is unavailable. Existing 3D geometry, backface handling and
semantic landing remain unchanged.

Writing and captions use self-hosted Mali 400/500. Names, titles and the cover
use Dancing Script 400–700; controls retain Be Vietnam Pro. The WOFF2 subsets
include Vietnamese letters and decomposed combining marks, with shaping tables
preserved. Their original SIL OFL licenses are in `figures/fonts/`.

`diary-motion.js` decorates the semantic reader without a third-party flip
library. Opening measures the actual closed cover and final paper, translates
and scales the same object, and rotates its hinged front/inside cover. Closing
reverses that geometry. Stage height is reserved during measurement so browser scroll anchoring cannot shift
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
editing leaves remain in a separate native dialog. Rapid taps cannot queue extra turns.
Per-face shading and a separate cast shadow preserve the 3D geometry.
Dragging scrubs the same animation clock; release settles the remaining motion
or reverses to the original page, without another content replacement.
A drag held at 100% commits immediately on release, without replaying the turn.
While held, it can still be pulled back or cancelled before any owner change.

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

The book shows every photo with a short caption. The full-image
popup keeps unabridged captions in a fixed transparent region, including at 320px
and enlarged text.
Enlarged-text reading uses a natural-height photo grid rather than squeezing
the photographs or captions.

## Code ownership

| File | Responsibility |
| --- | --- |
| `data.js` | Stable ASCII member IDs, existing names, portraits and order |
| `index.html` | Inline cover/reader shell, optional scripts/styles |
| `diary-photo-tools.js` / `diary-photo-tools.css` | Shared crop geometry, paper editing surfaces, continuous drag/settle gestures, in-place crop, contextual notes and remove/undo |
| `diary.js` / `diary.css` | Semantic reader, native dialogs, editor, recovery and base presentation |
| `diary-motion.js` / `diary-motion.css` | Decorative cover/curved leaf geometry, material skins, handwriting and responsive polish |
| `diary-materials.css` | Generated frame/image opening coordinates |
| `scripts/prepare_diary_refinement.py` | Quiet paper and lighter frame/tape derivatives; separate provenance manifest |
| `scripts/prepare_diary_artwork.py` | Offline master-to-WebP preparation and material manifest |
| `diary-api.js` | Request cancellation, cross-tab refresh, remembered browser session and private image URLs |
| `diary-config.js` | Public function endpoint only; no keys/passwords |
| `backend/supabase/` | Migrations, pinned Edge code and local CLI configuration |
| `scripts/verify_diary.cjs` | Deterministic browser interactions/visual checks with a mocked transport |
| `scripts/verify_diary_motion.cjs` | Paused opening/turn/closing frames, front/reverse ownership and painted-pixel photo orientation |
| `scripts/verify_diary_navigation.cjs` | Sticker bounds/fallbacks, edge clicks, controlled/cancelled drags, phone swipes and native vertical touch scrolling |
| `scripts/verify_diary_page_editing.cjs` | On-page picker/file drop, ruled writing, metadata notes, remove/undo, keyboard and continuous mouse/touch movement |
| `scripts/verify_diary_photo_editor.cjs` | All 0-9 editor layouts, swaps, pan/zoom/cancellation, publishing, recovery and private DOM cleanup |
| `scripts/verify_diary_crop_ui.cjs` | Crop control separation, matching buttons, touch/scroll bounds, restored paper dimensions, panel switching and enlarged text |
| `scripts/verify_diary_heic.cjs` | Real synthetic HEIC/HEIF uploads, MIME/header detection, primary image, color/orientation, resizing, EXIF removal, errors, cancellation and mixed batches |
| `scripts/verify_diary_refinements.cjs` | Balanced login, constrained sizes, packing/reordering, crowded additions, background close/save, recovery, backdrop, uploads and detached publication |
| `scripts/verify_diary_framing.ts` / `.sql` | Edge metadata normalization and rolled-back gateway validation fixtures |
| `scripts/verify_diary_photos.cjs` | Every count 0–9, responsive print bounds/targets, popup navigation, owner-only edit controls and the tenth-upload boundary |
| `scripts/verify_diary_viewer.cjs` | Six photo shapes, uncapped expanding frames, fixed transparent captions/controls, wheel/live pan/pinch/double-tap/keyboard zoom, immediate cached previews, neighbor prefetch/data saving, retry/focus, resize, delayed media and session cleanup |
| `scripts/verify_diary_photo_limit.sql` | Deployed gateway/constraints cloned into temporary tables; nine accepted and ten rejected, then rollback |
| `scripts/verify_diary_layout.cjs` | Long writing/captions, enlarged text, Vietnamese shaping, missing assets and mid-motion expiry |
| `scripts/verify_diary_backend.cjs` | Direct requests against real disposable accounts/policies |

The new scripts run after the existing static-trip scripts. They are classic
scripts with no frontend npm dependency or CDN. `file://` retains the cover
and a connection explanation; private access needs HTTP/HTTPS and the backend.
No Supabase SDK is downloaded into the browser.

## Verification

[HEIC upload results and limits](diary-heic-review.md) cover the local decoder
and file pipeline.

[28 October page-editing results and limits](diary-page-editing-review.md) record
the direct-manipulation implementation, browser checks and accessibility audit.

Run from `taxua-2026/`, reusing the existing preview server:

```sh
node scripts/verify_diary.cjs
node scripts/verify_diary_photos.cjs
node scripts/verify_diary_photo_editor.cjs
node scripts/verify_diary_page_editing.cjs
DIARY_WEBKIT=1 node scripts/verify_diary.cjs
DIARY_WEBKIT=1 node scripts/verify_diary_motion.cjs
DIARY_WEBKIT=1 node scripts/verify_diary_navigation.cjs
DIARY_WEBKIT=1 node scripts/verify_diary_layout.cjs
```

The WebKit commands require an installed Playwright WebKit browser and its
Linux libraries. `PLAYWRIGHT_PATH`, `TRIP_PREVIEW_URL` and optional
`DIARY_WEBKIT_EXECUTABLE` override the test dependencies/preview.
`TRIP_REVIEW_DIR` sets the interaction evidence folder; `DIARY_MOTION_REVIEW_DIR`,
`DIARY_NAVIGATION_REVIEW_DIR`, `DIARY_PHOTOS_REVIEW_DIR` and
`DIARY_LAYOUT_REVIEW_DIR` set the other helpers'
evidence folders.
See [backend verification](diary-backend.md#verification) before running tests
that modify accounts. Browser fixtures alone do not prove server permissions.
