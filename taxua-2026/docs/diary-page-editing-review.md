# Diary page editing review · 28 October 2026

[Diary behavior](diary.md) · [Verification commands](verification.md) · [Backend](diary-backend.md)

The editor uses painted writing and photo leaves as its editing surfaces.
Uploads start on the paper or with a file drop. Photographs follow the pointer
continuously and settle into their destination. Touch selects an image before
dragging; other images retain native scrolling. The corner grip icons are gone.
Selected frames expose short, labeled controls for swapping, sizing, cropping,
notes and reversible removal. The login choices form two rows of four.

**Cỡ ảnh** provides automatic, small, medium and large rectangles. Sizes snap
inside a bounded six-column composition, with unavailable sizes disabled. A
small occupancy search keeps enlarged photographs valid after reordering. New
attachments gently reduce recent custom frames when necessary. Eight photos
use three, three and two centered prints; all 0–9 photographs stay visible.
The editor, reader and animated book faces share the same layout and crop rules.

Save, recovery and unused-photo actions now have one aligned column, shorter
labels and distinct primary/danger colors. Contextual tools stay clear of the
paper header and visible viewport. The footer follows content rather than
covering feedback. X stays reachable while scrolling. X, backdrop and Escape
can leave during failed/slow saves, conflicts, uploads and publication. Dirty
closes retain a memory-only snapshot and try saving in the background with the
latest revision. Ready uploads remain recoverable; publication completion is
reported truthfully. An inside-to-outside drag cannot accidentally dismiss.

## Browser validation

Eleven Chromium suites passed **991 assertions**:

| Suite | Passed |
| --- | ---: |
| `verify_diary.cjs` | 81 |
| `verify_diary_photos.cjs` | 200 |
| `verify_diary_photo_editor.cjs` | 157 |
| `verify_diary_page_editing.cjs` | 68 |
| `verify_diary_refinements.cjs` | 91 |
| `verify_diary_layout.cjs` | 45 |
| `verify_diary_motion.cjs` | 101 |
| `verify_diary_navigation.cjs` | 82 |
| `verify_diary_dark_mode.cjs` | 31 |
| `verify_browser_colors.cjs` | 57 |
| `verify_cursor.cjs` | 78 |

Coverage includes every count 0–9 at 1440/390/320px, continuous mouse and CDP
touch drag, crop cancellation, Vietnamese/plain-text writing, safe file inputs,
remove/undo, publishing, conflict recovery, session cleanup and browser darkening.
The new refinement suite adds packing permutations, resize animation, disabled
sizes, late-position enlarged photos, crowded attachments, saved/published/reopened
geometry and crop retention. Delayed-request fixtures exercise dirty closing
during an in-flight save, upload and successful/failed publication; X/backdrop/
Escape remain usable. The login has eight balanced choices without overflow.

A separate short-viewport check passed **six assertions** at 390×600 and
320×600: the size panel stays inside the dialog, X stays visible at the bottom,
and it exits. Desktop/phone login, default eight-photo pages, enlarged frames,
size controls and save-error screenshots were inspected.

Axe found **zero violations** in the requested WCAG 2 A/AA, 2.1 AA and 2.2 AA
rules across **20 states**: login, writing, nine photos, contextual notes, sizes,
cropping, undo/recovered images, save failure, enlarged writing and forced
colors, each at 1440 and 320px. Both size-panel/footer clearance checks passed.
Earlier checks caught controls hidden by the floating tools and sticky footer;
header-aware placement and the non-overlapping footer resolve those findings.
JavaScript syntax checks and `git diff --check` passed.

Browser tests use only tab-local fixture sessions and public sample images.
No real crew credentials or private media were used. Chromium touch emulation
is covered; physical devices, Firefox and assistive-technology sessions were
not tested. WebKit launch was attempted but blocked by missing host GTK,
GStreamer and related libraries; no WebKit pass is claimed.

## Backend validation

Migration `20261028034413_taxua_diary_photo_sizes.sql` and `taxua-diary` Edge
version **8** are deployed to gogo. Edge framing/password tests passed **12
cases**, the entrypoint type-check passed, and the temporary deployed-gateway
fixture passed **32 checks**. The migration rehearsal rolled back and compared
complete crew member/entry/draft hashes: no content changed. The SQL fixture
replaces identity only in its temporary copy, so it establishes metadata and
photo-ownership validation, not a live crew authentication flow.

Public status returns eight members; anonymous read/draft requests remain 401.
Existing authentication, private Storage, revision and nine-photo checks remain.
No crew accounts/media, shared Auth settings or Hue resources were mutated.
Security advisors added no diary finding; the existing shared Auth password
setting and unrelated public-table notices remain documented in the backend guide.

## Evidence and limits

- `/tmp/taxua-diary-refine/final/`: suite logs.
- `/tmp/taxua-diary-refinements/`: new interaction report and desktop/phone images.
- `/tmp/taxua-diary-refine/axe.json`: final scoped accessibility results.
- `/tmp/taxua-diary-refine/short-viewport.log`: small-height interaction results.
- `/tmp/taxua-diary-refine/deno-final.log`: Edge unit results.
- Existing `/tmp/taxua-diary-*`, `/tmp/taxua-browser-colors/` and
  `/tmp/taxua-cursor-review/` folders hold the other suite reports and screenshots.

The earlier whole-public-page Lighthouse audit measured performance **40**,
accessibility **97**, best practices **100**, LCP **10.5s**, CLS **0.01**. This
historical navigation audit was not rerun for these refinements and does not
measure the authenticated editor. It still documents substantial public-page
loading cost and accessibility findings outside this editor. Its evidence is
`/tmp/taxua-page-editor/lighthouse.json`.

No new runtime package, generated artwork, public test identity, private fixture
or deployment artifact was added to the static site.
