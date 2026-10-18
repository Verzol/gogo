# Diary implementation review · 17 October 2026

[Diary guide](diary.md) · [Backend and operations](diary-backend.md) · [Verification](verification.md)

## Full-drag release, 18 October 2026

Dragging a leaf to 100% and releasing replayed the whole turn: Web Animations
`play()` automatically rewinds a forward animation already at its boundary.
The release handler now commits an accepted endpoint directly. Partial turns
still play their remaining distance, and a fully held leaf can still be pulled
back or cancelled before release. The visual material and geometry are unchanged.

A new real-pointer assertion reproduced the replay before the fix. Verification
then passed **82 navigation checks** and **101 motion checks**, with no uncaught
browser errors. Complete and overshot drags are checked in both directions on
desktop and phone writing/photo faces, including synchronous landing, Escape,
and pulling a full drag back into rollback range. Existing partial drags, touch
swipes, native prose scrolling, pause/fallback and session cleanup remain covered.
Desktop and phone screenshots were inspected. Evidence is in
`/tmp/taxua-diary-drag-endpoint/`; fixtures made no live backend writes.

## Gentler paper regeneration, 18 October 2026

Regenerated three Sunburst paper masters with lighter oatmeal stock, fine grain,
soft rubbing and subtle corner creases. Heavy tears, foxing and stains are gone.
Existing warmed photo borders and book geometry remain. All 101 fresh motion
checks passed; desktop/tablet/phone reader, photo and editor screenshots were
inspected. The pixel-comparison helper now freezes independent scenery animation
for each screenshot pair. See [current materials and evidence](diary-design-refinement.md#gentler-paper-regeneration).

## Aged paper, 18 October 2026

Three new Sunburst masters replace the pale paper with warm tan leaves and a
darker opening-cover lining. Frayed edges, fine tears, foxing and creases stay
near the margins; three warmer print borders match the older stock. The same
materials travel with the two frozen turn faces. Ink/helper/action/error colors
were darkened to keep sampled content contrast above 4.5:1.

The material update passed 101 motion checks, 45 layout/fallback checks and
49 design/axe checks. Desktop/phone reader, editor and animation frames were
inspected. Six material hashes and exact print-frame alpha/dimensions were also
verified. See [the follow-up and evidence](diary-design-refinement.md#aged-paper-follow-up),
including one initial timing-sensitive pixel-comparison failure before a passing
isolated motion rerun. No live crew accounts or production writes were used.

## Single-cover correction, 18 October 2026

Removed the duplicated invitation beside the cover and centered the one book.
Loading/error status is small text over the scenery with no opaque panel.
Fresh browser-local verification passed 101 motion checks and 45 focused checks
at desktop, tablet and phone widths, with no uncaught browser errors. Desktop
and phone screenshots were inspected. See the
[correction evidence](diary-design-refinement.md#single-cover-correction).

## Visual refinement, 18 October 2026

The [design audit and pre-flight](diary-design-refinement.md) records the single
centered cover, quieter generated paper and print materials, compact reader toolbar,
attached ribbons and clearer stationery controls. Existing private behavior and
all nine-photo layouts remain. The five browser helpers passed 474 Chromium
checks; a separate light/dark preference, desktop/phone design audit passed
49 checks with no axe WCAG A/AA violations. Manual material contrast checks and
whole-page Lighthouse limitations are recorded separately. The new paper
[prompt](prompts/diary/refinement/paper.md) and
[provenance manifest](../data/sources/diary-refinement.json) preserve reproducibility.

## All-photo pages and owner edit controls · 18 October 2026

Every published photo now appears directly on its person's photo leaf. Count-aware
arrangements cover 0–9 photos: larger prints for small collections, two-column
rows for four to six, and three-column arrangements for seven to nine. Empty
pages keep three quiet frames. Paper dimensions, illustrated frames, opening
geometry, page-turn content and bookmark attachment are retained.

Click any print for a full-image popup with the complete caption, previous/next
Lucide-style arrows and a photo counter. Left/right arrow keys navigate within
the same owner; the first/last controls stop at the collection boundaries. Focus
stays in the native dialog and private image nodes clear on close or session loss.
The separate album and “Xem đủ … ảnh” button are removed. Writing/photo edit
buttons exist only on the signed-in owner's pages; injected foreign edit controls
are ignored and server draft ownership checks remain in place.

The browser upload/reattach paths, serialized database reservation/draft paths,
and entry/draft constraints now enforce nine photos. The gogo migration
`20261018014337_taxua_diary_nine_photos.sql` was applied and its local filename
matches hosted migration history. The live gateway body matched the repository
before changing only its two photo-count comparisons. Its invoker mode, private
session/member checks, row locks and denied browser grants were verified after.
No uploaded photos or nonempty entries existed before the cap change, so no
crew content needed removal. The Edge Function requires no redeployment.

| Current verification | Result |
| --- | --- |
| Reader/editor/upload/publication/recovery | 80 Chromium checks passed |
| Every photo count 0–9 at 1440/820/390/320px, bounds, 44px targets, popup arrows/keyboard/focus, owner-only controls and tenth-file rejection | 200 Chromium checks passed |
| Long writing/full captions, enlarged text, Vietnamese shaping and resource/session failures | 45 Chromium checks passed |
| Bookmark and navigation/gesture regressions | 48 Chromium checks passed |
| Opening/closing/page-turn geometry and painted-image orientation | 101 Chromium checks passed |
| Deployed gateway/constraints copied into temporary tables, then rolled back | Seven boundaries passed: nine reservations/draft/publication accepted; tenth reservation/draft/entry/draft-constraint writes rejected |

All five browser helpers reported zero uncaught errors and used mocked transport,
without crew credentials or live uploads. Desktop/phone photo pages and the
phone popup were visually inspected. Browser coverage for this change is Chromium;
WebKit is unavailable in this environment. The SQL fixture replaces identity only
inside its temporary gateway copy, so these seven checks do not claim a new
Auth/session security audit. The advisor returned no new diary-specific finding;
its existing [shared Auth leaked-password setting](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
and unrelated public-table notices remain unchanged.

Evidence: `/tmp/taxua-diary-nine/`. Earlier sections below describe historical
layouts and checks, including the former twelve-photo album.

## Own-page session reuse · 18 October 2026

The edit buttons previously opened the password sheet unconditionally. Own-page
writing and photo edits now request the private draft with the active session.
The server-returned owner must match the selected page before the editor opens.
Duplicate opens are guarded, and a late response cannot open the editor after
the reader closes or moves to somebody else. Another owner's page still asks
for their password. A rejected session clears private content and returns to
the requested owner's login; successful automatic refresh needs no password.
No backend policies, accounts or password formats changed.

**81 Chromium reader/editor checks passed**, including both own-page buttons,
restored tab sessions, automatic refresh, incorrect/correct account switching,
revocation and returning to the editor, plus rejection of forged local ownership
labels. The suite also checked publication, uploads, recovery and responsive
reading, with zero uncaught browser errors. Desktop reading and phone editor
captures were inspected. WebKit could not launch because this environment lacks
its required system libraries; this run makes no WebKit verification claim.
Browser fixtures used no real crew credentials or live writes.

**48 Chromium navigation checks also passed**, including own-page editing after
dragging/selecting text, keyboard closure of the editor, bookmark layout and
phone gestures, with zero uncaught browser errors. Syntax and whitespace checks
passed for the changed scripts.

Evidence: `/tmp/taxua-diary-session-review/`.

## Non-empty passwords

Removed the form's ten-character minimum, 72-character maximum and UTF-8 byte
check. Both browser submission and the Edge handler reject only empty/non-string
passwords. Setup confirmation still catches mismatched typing. New accounts
use server-side, versioned fixed-length credentials before Supabase's bcrypt
verification; unmarked existing accounts keep their original passwords.
The shared project's Auth settings and diary ownership/session guards are unchanged.

Validation for this change:

- **141 browser checks passed** in Chromium and WebKit, with zero uncaught
  browser errors. New cases exercise empty setup, matching confirmation,
  one-character, Vietnamese, whitespace-only and long passwords, wrong-password
  rejection and subsequent login. The existing reader/editor suite also passed.
- **Nine Edge-handler tests passed**, using the real Supabase client against
  an in-process Auth/RPC fixture. They cover provider length limits, legacy
  compatibility, full-input matching, unknown-format rejection, claim protection
  and private reads. The function's Deno type check also passed.
- **30 hosted Auth checks passed** through a temporary secret-gated test
  function and five disposable Auth users with independent UUID aliases.
  Short/long/whitespace inputs and legacy-format credentials authenticated;
  incorrect passwords were denied. Every fixture was denied crew diary access.
  All test sessions were revoked, all five users were deleted, and a second
  cleanup confirmed none remained. The temporary function and its gate secret
  were removed. No crew account or diary content was used as a fixture.
- Deployed **`taxua-diary` version 5** to `gogo`. Post-deployment checks confirmed
  empty claim/login rejection, private anonymous-read denial, the seven-slot
  roster, the active version and removal of the temporary test function.

Evidence: `/tmp/taxua-diary-password-review/` contains browser, hosted-Auth,
cleanup and deployment reports. These local artifacts are not shipped assets.

## Centered portrait bookmarks

San's and Trường's ribbon canvases included disconnected fragments from
neighboring atlas cells. Their main cloth sat roughly 4–5 CSS pixels away
from the centered portrait at desktop size. Bookmark export now trims around
the connected central ribbon with a small antialias margin. Raw masters and
the other 22 material derivatives are unchanged.

Portraits use symmetric padding and vertical centering. Selected tabs no
longer apply a separate upward portrait translation; their taller cloth still
marks the current person. The navigation helper now compares the visible alpha
bounds of each portrait against the actual cloth, alongside normal bounds and
density checks.

**92 navigation checks passed** in Chromium and WebKit at 1440/820/390/320px
and 2x display density, with zero uncaught browser errors. Visible-art centering
was checked for all seven portraits in selected/idle rows; desktop and phone
captures were inspected. Asset hashes confirm only the seven ribbon derivatives
changed. Evidence: `/tmp/taxua-bookmark-centering-review/navigation/`.

## Opening containment and sharper bookmarks

The opening defect was a decorative flat endpaper expanding left of the spine
before the cover crossed it. At 35% open, a visible strip of paper already sat
outside the cover. The stationary base now occupies only the right half; the
left paper travels on the hinged reverse face and reveals its writing as it
lands. Closing reverses the same geometry. The cover stays present through
landing instead of disappearing during the last frames.

A new screenshot-pixel regression reproduced the original failure. It samples
the area left of the spine at multiple opening/closing fractions and compares
it against the background with the decorative flight hidden. Surrounding GSAP
scenery is frozen for those comparisons; the book retains its independent
WAAPI animation clock. This checks the painted defect that the earlier
semantic-reader visibility assertions missed.

Frame review also caught WebKit painting the inside-cover material over the
front despite CSS backface culling. Each prebuilt face now receives explicit
visibility at the edge-on hinge angle; its artwork/content never changes.
Clipping stays on the writing child. A separate painted-face check uses
diagnostic colors to verify the front before halfway and the inside after it;
the earlier culling behavior reproduced that regression at the first frame.

The cloth was also compressed from roughly 1:4 ribbons into almost square
tabs. Tabs now crop the long ribbon at its natural proportions, keeping the
stitching and weave stable when selected. Derivatives retain their native
201–232px widths, with larger 512px-source crew stickers and no soft portrait
shadow. Preserved generation masters are unchanged; no new generation or
private data was needed.

Verification for this revision used browser-local fixtures in Chromium and
WebKit, with no production account creation or database/storage writes:

| Helper | Result | Coverage |
| --- | --- | --- |
| Motion | **201 passed** | Nine opening fractions on desktop/phone, five closing fractions, 36 painted containment comparisons, front/inside cover pixels, original cover geometry, page-face/photo orientation, atomic landing and private-layer cleanup |
| Navigation | **82 passed** | Portrait bounds, natural ribbon proportions and source detail at 2x display density across 1440/820/390/320px, edge/keyboard/drag/touch input, image/style fallbacks and logout |
| Layout | **77 passed** | Long prose/titles, twelve long captions, narrow/landscape/enlarged text, Vietnamese shaping, missing art/fonts/engine/styles and expiry during motion |

All three reports contain zero uncaught browser errors. The 36 containment
comparisons had zero RGB difference at the sampled background pixels.
Real artwork frames and desktop/phone bookmark captures were also inspected.
All 29 material hashes/dimensions, JavaScript syntax, changed-file whitespace
and local documentation paths were checked. Evidence is in
`/tmp/taxua-diary-opening-fix/{motion,navigation,layout}/`; the initial failing
paper and cover-face regressions are retained in `regression-before/` and
`face-regression-before/` beside them.

## Reader toolbar cleanup

The reader uses three official Lucide icons: refresh, close book and logout.
They have 44px targets, Vietnamese accessible names, hover titles and visible
keyboard focus. Their geometry comes from the pinned Lucide bundle through
`prepare_icons.cjs`; the local sprite now has 56 symbols.

The bottom previous/next row, visible person counter and reading-session name
are removed. The current page has a clipped screen-reader announcement.
Successful refresh clears the status area; refresh failures remain visible.
An empty status area takes no layout space. Page edges, dragging/swiping,
portrait bookmarks and keyboard arrows handle navigation.

Fresh checks passed in Chromium and WebKit using browser-local fixtures:

- **74 navigation checks** and **109 reader/editor checks**, updated to use the
  paper-edge controls and accessible page announcement.
- **29 focused toolbar checks**: rendered icon geometry/names, 44px targets,
  1440/390/320px layouts, refreshed content, quiet success, visible/recoverable
  failure, keyboard refresh, close/reopen and logout cleanup.
- Zero uncaught browser errors. JavaScript syntax and whitespace checks passed.

Desktop and phone screenshots were inspected. Evidence is in
`/tmp/taxua-diary-toolbar-review/`, with the focused check report at
`toolbar-report.json` and the existing helper reports in `navigation/` and
`interactions/`. Earlier motion/layout results below are historical evidence
for their corresponding revisions.

## Sticker bookmarks and direct page navigation

The seven cloth bookmarks now use the crew's existing scarf portrait stickers.
Names remain in accessible labels and hover titles, with a contained text
fallback if an image fails. The selected tab stays visible in the narrow
scrolling row. Empty writing keeps ruled paper; empty photograph pages keep
the illustrated frames without the invitation paragraphs or empty-state copy.

Readers can click either outer paper edge or drag/swipe horizontally. The
curved sheet follows the pointer, then completes or returns on release.
Short drags, Escape and pointer cancellation restore the exact original
spread. Keyboard controls and the existing navigation remain available.
Photo/edit actions and mouse text selection keep their normal behavior.
The independently scrolling writing panel explicitly permits native vertical
touch scrolling while reserving horizontal touch for page turns. Moving
implicit touch capture from a child to the book does not cancel the drag.

Fresh browser-local results for this update:

| Check | Result | Scope |
| --- | --- | --- |
| Navigation helper | 74 passed | Chromium/WebKit; portrait bounds at 320/390/820/1440px, accessible names, empty paper, edge clicks/keyboard, controlled and cancelled drags, phone faces, missing images/styles/engine, reduced motion and logout cleanup; Chromium touch emulation also verifies edge/prose swipes and native vertical writing scroll |
| Motion helper | 149 passed | Both engines; continuous opening/closing, outgoing front/incoming reverse, painted-pixel photo orientation, scroll preservation, atomic landing, rapid input and private-layer cleanup |
| Reader/editor helper | 109 passed | Both engines; passwords/claims, private drafts, publication, uploads, responsive reading, failure/conflict recovery and session rejection |
| Layout/fallback helper | 77 passed | Both engines; maximum writing/title lengths, twelve long captions, 320px and enlarged text, Vietnamese shaping, missing artwork/fonts/engine/styles and mid-motion expiry |

All four reports contain zero uncaught browser errors. JavaScript syntax,
tracked/untracked whitespace checks and 31 local documentation paths passed.

Visual review covered the empty desktop spread, phone writing/photo pages,
all sticker rows and held page turns. The navigation helper brings paper into
view before measuring pointer coordinates after a native dialog or resize;
offscreen coordinates had caused the first WebKit phone test to miss the book.
Evidence lives in `/tmp/taxua-diary-navigation-review/`. Fixtures stay in the
browser: this update created no real accounts and made no backend writes.
Headless touch emulation does not establish physical-device behavior.

## Previous page-turn correction

The earlier redesigned leaf repeated the outgoing page on its reverse, then
replaced the spread at landing. The previous snapshot-ownership checks accepted
that behavior and did not catch the visual repetition reported by the user.

The current leaf keeps the outgoing page on its front and the destination's
landing page on its reverse. The destination's other page sits under the
lifting front. A hidden, inert destination spread prepares images before the
turn; its actual decoded image nodes become the semantic reader at landing.
The next spread is visible during motion, with distinct front/back content and
correctly oriented writing/photos, instead of an endpoint content replacement.
Owner/counter/bookmark selection still commits once at landing. Logout and
session rejection remove the staging spread and every decorative copy.

Fresh browser-local checks for this correction:

- **149 motion checks passed in Chromium/WebKit**: opening/closing, both turn
  directions, separate front/reverse owners, scroll preservation, incoming
  underlay, phone writing/photos, prepared-image node reuse, rapid input,
  motion pause and logout cleanup.
- **77 layout/fallback checks passed in both engines**: long writing/captions,
  enlarged text, missing enhancements and session expiry during opening/turn.
- **109 reader/editor interaction checks passed in both engines**: passwords,
  drafts, publication, uploads, responsive reading and session recovery.
- Screenshot pixels at 75/90/99 percent verify asymmetric left/right photo
  orientation and a distinct incoming-member color marker. DOM ownership
  checks alone cannot satisfy this regression. Frame review covered forward
  and backward turns, including phone leaves, in both engines.

One concurrent interaction run timed out after WebKit's enlarged-text step
while other browsers were capturing frames. The isolated rerun passed without
further code changes. Syntax and whitespace checks also passed.

Evidence is in `/tmp/taxua-diary-mirror-review/motion/`, `layout/` and
`interactions/`. Browser fixtures require no real users, credentials, private
trip content or backend writes. Headless engine checks do not establish
physical-device behavior.

## Earlier book redesign verification

The earlier redesign used 29 generated material layers, local Vietnamese
handwriting and continuous hinged opening/reverse closing. A curved leaf kept
its outgoing content on both faces; paired pages, owner, bookmark and counter
changed together after landing. The page-turn correction above supersedes that
front/reverse content behavior. See the [redesign specification](diary-redesign.md)
and [current behavior](diary.md) for the updated contract.

| Earlier check | Result | Scope |
| --- | --- | --- |
| Diary interaction helper | 109 passed | Chromium/WebKit; browser-local transport fixtures |
| Animation frame helper | 79 passed | Both engines; 0/25/50/75/99 percent, landing, forward/back, phone opening/turn, rapid input, pause and logout |
| Long-content/failure helper | 77 passed | Both engines; 8,000-character prose, 100-character title, twelve 160-character captions, 320/390/740/820/1440px, enlarged text, missing materials/fonts/engine/CSS and expiry during opening/turn |
| Isolated live backend helper | 43 passed | Actual Auth, database permissions, processed JPEGs, Storage, conflicts and quotas in a separate temporary namespace |
| Isolated live browser flow | 12 passed per engine | Real password authentication, opening, private drafts, two uploads per engine, reordered publication, mobile full image, password denial and revocation mid-turn |
| Isolated first-claim UI | 6 passed | Password setup, confirmation mismatch, correct animated page, field clearing and logout |
| Cleanup checks | 7 passed plus SQL audit | Deleted QA bearers/refresh tokens rejected; QA function removed; production diary function still version 4 |
| axe-core 4.11.1 | Zero violations | Closed, password, open reader and editor; WCAG A/AA rules |
| Existing controls / scrollbar | 96 / 81 passed | Shared inputs, menus and missing-ResizeObserver fallback |
| Existing games / wheel | 221 / 135 passed | Existing chance objects and member navigation |
| Existing journal / mobile | 50 / 108 passed | Story photos, phone layouts and enlarged text |
| Existing fund / motion | 155 / 83 passed | Section ordering, contributions, reveals, navigation and note unfolding |

All Vietnamese upper/lower-case letters and their decomposed combining marks
are present in the three new WOFF2 files. The browser suite also verified equal
NFC/NFD text shaping in Mali 400/500 and Dancing Script. Original font licenses
and runtime hashes are recorded in [the font manifest](../data/sources/diary-fonts.json).
All 29 derivatives have transparent bounds and recorded source/output hashes.
JavaScript syntax, Python compilation, `git diff --check`, 504 local documentation
paths and HTTP loading of all new material/font files passed.

Manual frame review found and fixed a scroll-anchoring jump when the closed
book sat near the viewport top, plus footer text bleeding through the reverse
face. Long captions now expand their album figure rather than overlapping the
next print. Normal-speed and quarter-speed desktop/phone recordings were
captured for Chromium and WebKit. Screenshots show outgoing captions legible
on the reverse and the complete paired spread after landing.

One shared-motion run under concurrent browser recording missed its 110ms
notebook sample; the isolated rerun passed all 83 checks. Frame capture uses
viewport screenshots during active motion: screenshotting a tall element can
resize the test viewport and correctly settle the animation it is observing.
WebKit's viewport resize is allowed to finish before a new test gesture.

Live tests used only a temporary QA schema, gateway, bucket and Edge function
in the existing `gogo` project. Four temporary Auth users and five processed
test photos were isolated from the real crew registry. Media was removed
through the authenticated API, the empty bucket through Storage, then the QA
users/sessions/resources were removed. The final SQL audit found zero QA users,
objects, buckets, triggers or policies, and no QA schema/gateway. The protected
credential file was deleted. Before/after checksums of the real members and
entries match exactly; real drafts/photos remain untouched. No test user,
password, bypass or private entry was added to the static frontend.

Earlier redesign evidence is outside the publish tree:

- `/tmp/taxua-diary-motion-review/` — frame report and both engines' screenshots.
- `/tmp/taxua-diary-layout-review/` — long-content, fallback and expiry report.
- `/tmp/taxua-diary-v2-reels/` — eight normal/quarter-speed videos and contact sheets.
- `/tmp/taxua-diary-v2-qa/` — live backend/UI, first-claim and cleanup reports; no credentials.
- `/tmp/taxua-diary-v2-accessibility/report.json` — current four-state axe results.
- `/tmp/taxua-diary-v2-regressions/` — shared-feature regression evidence.

The frontend remains a local, uncommitted change. The production diary schema,
bucket and deployed function were not changed by the redesign. Headless
Chromium/WebKit coverage does not establish physical iPhone or Firefox behavior.
Temporary evidence is not a durable backup. The original first-claim identity
limitation and shared Auth configuration still apply as documented below.

## First implementation evidence (before the book redesign)

The following records the initial implementation and its cleanup. Its earlier
material, typography and motion description is historical; the revision above
and the diary guide describe the current reader.

## Delivered behavior

The crew section now contains an indigo cloth book with a generated Sunburst
cover, warm textured paper, a shaded binding, seven cloth bookmarks and taped
photograph prints. A desktop spread always pairs one person's writing and
photos. Opening and page turns use a small 3D enhancement. Phone and enlarged
text layouts use a naturally scrolling page with writing/photo controls;
reduced motion and the existing pause control settle transitions immediately.

The editor supports private autosaved drafts, explicit whole-page publication,
up to twelve photographs, captions, descriptions, reordering and a full album.
Concurrent edits, connection failures and expired sessions preserve unsynced
writing in tab memory until it can be copied or recovered after authentication.
Reloading the tab cannot recover that memory-only writing.

Supabase's existing `gogo` project hosts the isolated diary schema, private
photo bucket and `taxua-diary` Edge Function. Four additive migrations are
recorded under `backend/supabase/migrations/`; deployed function version 4
matches the local function source. The static frontend
has not been committed, pushed or published by this implementation session.

## Verification results

| Check | Result | Scope |
| --- | --- | --- |
| Diary browser helper | 109 passed | Chromium and WebKit; deterministic mocked transport |
| Direct live backend helper | 43 passed | Real disposable Auth accounts, API requests and Storage |
| Live browser integration | 10 passed in each engine | Chromium and WebKit against the deployed backend |
| axe-core 4.11.1 | Zero violations in four states | Closed diary, password dialog, open diary and editor; WCAG A/AA rules |
| Existing wheel | 135 passed | Member IDs/order and wheel interactions |
| Existing games | 221 passed | Game controls and state |
| Existing fund | 155 passed | Section order, exact content and controls |
| Existing controls | 96 passed | Shared controls and native fallbacks |
| Existing scrollbar | 81 passed | Includes missing ResizeObserver fallback |
| Existing journal objects | 50 passed | Story photograph interactions |
| Existing mobile UI | 108 passed | Responsive trip behavior and enlarged text |
| Existing motion | 83 passed | Animation lifecycle and trip navigation |

Browser checks cover all seven paired spreads, keyboard navigation, 320/390/
740/820px widths, 200% text, actual file-input normalization, photo reordering,
escaped hostile text, private drafts/publication, failure recovery, conflicts,
expiry, 3D transforms, rapid input, printing, denied storage and missing artwork,
GSAP, Web Animations and ResizeObserver. WebKit ran with temporary Linux runtime
and TLS libraries outside the checkout; this is engine coverage, not a claim of
physical iPhone or installed Safari testing.

Backend checks cover anonymous and forged requests, direct database/Storage
bypass attempts, cross-account writing and media access, unpublished captions,
real image decoding/re-encoding, EXIF removal, revision conflicts, malformed
images, concurrent quota enforcement and immediate logout/refresh revocation.
Additional checks confirmed that forged user metadata cannot change ownership,
bound aliases cannot change, disabled accounts lose access, and concurrent
first claims produce one winner. The temporarily disabled fixture was restored.

The live browser passes additionally exercised real password authentication,
private autosave, two WebP-to-JPEG uploads, server processing, reordered
publication, thumbnails, full-photo mobile reading, another owner's password
requirement and clearing an already-open browser after server revocation.

The first scrollbar run exposed an unguarded ResizeObserver in the new diary;
the guarded fallback was added and all 81 scrollbar checks passed on rerun.
WebKit's ResizeObserver loop warning was resolved by deferring layout writes
through requestAnimationFrame. Fresh evidence is outside the checkout; existing
historical `review/fund/` and `review/motion/` artifacts were restored afterward.

## Evidence and limits

After the live passes, all disposable writing and eight test photographs were
removed through the authenticated API. A guarded transaction reset only the two
recorded fixture UUID mappings and removed their Auth accounts. Final queries
confirmed **seven unclaimed members, seven blank pages, zero drafts/history,
zero photo records/objects, and zero fixture users/sessions/refresh tokens**.
Public status confirmed all slots are available; anonymous reading and both
deleted fixtures' access/refresh tokens were rejected. The protected temporary
credential file was removed. No crew password has been preset.

JavaScript syntax checks, backend Deno type checking, TOML parsing,
`git diff --check`, 474 local Markdown link paths and all three artwork
provenance hashes passed. The security advisor returned no diary-specific
findings; it still reports eighteen existing Hue informational notices and the
shared Auth password-protection warning described below.

Local implementation evidence lives outside the publish tree:

- `/tmp/taxua-diary-browser-review/report.json` and engine-specific screenshots.
- `/tmp/taxua-diary-backend-review/report.json` and processed disposable JPEG.
- `/tmp/taxua-diary-implementation/accessibility.json` and live-browser evidence.
- `/tmp/taxua-diary-implementation/cleanup.json` records the final fixture checks.
- `/tmp/taxua-diary-regressions/` and the feature helpers' `/tmp/` output folders.

Temporary evidence is not a durable backup or a runtime dependency. No real
crew content was used in tests or sent to image generation. Automated checks
do not replace manual screen-reader or physical-device testing. Firefox and
physical devices were not tested.

First claim deliberately has no identity check: the first visitor selecting an
unclaimed name owns that account. Server permissions enforce its subsequent
ownership. The shared project's optional leaked-password protection remains
disabled; the setting and operator recovery/backup procedures are documented in
[operations](diary-backend.md). No automated backup service was installed.
