# Sổ mây — private crew diary design and implementation plan

[Documentation index](README.md) · [Group features](group.md) · [Identity](identity.md) · [Research sources](sources.md#private-crew-diary-research)

Status: **implemented on 17 October 2026**. This document retains the original
research/proposal below. Current behavior and operations are in [Diary](diary.md)
and [Backend](diary-backend.md); see the [implementation review](diary-review.md)
for current validation. The evidence section at the end describes the earlier
planning pass only. A Sunburst material study accompanies the plan. The later [approved book redesign](diary-redesign.md) supersedes the original typography, component-artwork and motion proposals below.

Implementation decisions after inspecting the existing `gogo` project:

- Reuse `gogo` with an isolated private schema, function and bucket instead of
  creating a dedicated project. Hue's resources/Auth settings stay unchanged.
- Server-generated random aliases and atomic slot reservations replace the
  proposed global signup hook. Unrelated Auth users never receive a diary map.
- A service-only gateway behind JWT/live-session checks replaces browser table
  writes. Private tables have no browser grants and restrictive deny policies.
- Bounded untrusted bytes are processed in memory, removing the need for a
  staging bucket. The private processed bucket is readable only through the
  authenticated no-store media endpoint.
- A dedicated CSS/Web Animations turn keeps one person per semantic spread;
  StPageFlip remains a researched candidate rather than a shipped dependency.
- The browser needs neither a Supabase SDK nor a flip library. ImageMagick WASM
  and Supabase dependencies are pinned in the server function's lockfile.

## 1. Agreed behavior and security boundary

- A new old-book diary belongs to the seven existing travelers. Each person has
  one spread: writing on the left and photographs on the right. Next/previous
  changes the person, with an opening animation and a physical page turn.
- Reading is private to the seven diary accounts. Each account edits only its
  own spread. Other members can read the saved-to-book version, not its drafts.
- The user explicitly chose **first-claim password setup without email,
  invitations, claim codes or identity verification**. Selecting an unclaimed
  name and setting its password creates that account. Later access requires
  its password or an already authenticated session.
- Consequently, the system cannot establish that the first claimant is the
  named traveler. Anyone who reaches an unclaimed account can claim it and
  then read the shared diary. The enforceable boundary is **the seven claimed
  accounts**, not verified real-world identities. Rate limits do not solve
  first-claim impersonation. This is an accepted product constraint, not a
  reason to add an invitation flow the user declined.
- After a claim, ownership, privacy and edits must be enforced by the backend
  even when someone changes JavaScript, uses DevTools, or calls APIs directly.
  A visitor can change their own local DOM; that must never change saved data.

## 2. Findings from the current repository

| Inspected surface | Consequence for this feature |
| --- | --- |
| `AGENTS.md`, `docs/README.md`, `docs/architecture.md` | Tà Xùa is a separate static site; Hue's chat backend and account assumptions do not apply. `backend/` is reserved and unused. |
| `index.html`, `main.js`, `data.js` | Current crew names are san, thảo, mi, linh, quanlele, gtm, trường. Visible order is mi → san → thảo → quanlele → gtm → trường → linh. Preserve that order for the diary. |
| `docs/identity.md`, `style.css`, `fonts.css` | Reuse Patrick Hand headings, Be Vietnam Pro prose, paper `#F3EAD4`, dark ink `#183B46`, local fonts, Lucide controls and watercolor cutouts. |
| `docs/group.md`, `docs/prompts/people.md` | Reuse the seven current scarf portraits. Colors must follow the current source, including mi's vivid fuchsia and linh's raspberry, rather than older palette notes. |
| `docs/journal-objects.md`, `main.js`, `style.css` | Photo backs already use local paper grain and independent turn transforms. They are useful visual precedents, not a secure diary implementation. |
| `docs/motion.md`, `motion.js`, `scene-config.js` | Preserve native scrolling, support-section scenery, independent transform owners and the existing motion controls. Refresh measurements after the book changes layout. |
| `demos/features/cloud-notebook.js` | The demo is local illustrative state. Its selectable author and browser persistence must not become the diary's authentication or database layer. |
| `docs/verification.md`, existing scripts | There is no npm build/test command. Use focused browser checks plus real backend authorization tests for this addition. |

Current browser inspection covered the existing crew area at 1440×1000 and
390×844. Both showed the seven intended people without document-wide
horizontal overflow. No console errors were returned during that inspection;
Leaflet preload warnings were recorded while the map remained unopened. This
was design reconnaissance, not an interaction regression suite or evidence
that the proposed diary works.

### Placement

Add a semantic subsection `#crewDiary` **inside `#crew`, after `#crewGrid` and
before `#tripGames`**. This gives the diary a natural introduction through the
portraits and retains itinerary → crew → fund → packing at the top level.
The fund pig remains symbolic and receives no account or diary spread.

The crew names can become native links to their corresponding diary selection
at `#crewDiary`. A logged-out visitor reaches the closed cover/login, never a
private excerpt. Keep the existing floating topbar compact. Initialize the
selection before existing enhanced anchor travel and request its normal layout
refresh; do not install another scrolling controller.

## 3. Art direction

Working title: **“Những ngày ở trên mây”**, with **“Tà Xùa · 22–25.10.2026”**
below it. The entire site is already called a journal; the new subsection is
the intimate shared book within that journey.

![Sunburst study of an indigo cloth cover, warm blank pages and taped photograph frames](research/diary_material_study.webp)

This is a generated material study, not a screenshot, a working component, or
an actual trip record. Its blank areas deliberately contain no fabricated
memories, people or trip photographs. Use the cover fabric, binding, paper and
tape as references. Keep the implemented paper a little quieter and lighter
than the study so long Vietnamese text remains easy to read.

### Cover and surrounding composition

- Deep indigo cloth `#344866`, jade spine `#365F64`, fine ochre stitching,
  softened corners and a small painted cloud/mountain mark.
- A narrow fabric closure, visible page edges and one restrained tea/fern
  accent provide the feeling of a handled travel notebook.
- The scenery stays visible around the book. Opaque paper belongs to the book
  object, not a full-width replacement for the watercolor world.
- Cover title, dates, private label and action remain live HTML. Suggested
  actions: **Mở sổ**, **Đóng sổ**; private label: **Chỉ hội mình đọc**.
- The cover may lift by a few pixels on desktop hover. Opening always follows
  an intentional click/tap; never make the cover open on scroll or hover.

### An open person's spread

| Left: “Vài dòng để nhớ” | Right: “Những tấm ảnh mang về” |
| --- | --- |
| Small existing scarf portrait, handwritten name and optional author-written title. | One larger landscape print and two smaller prints, with small, consistent tilts and washi tape. |
| Genuine prose, paragraph breaks, subtle paper grain, wide inner gutter and comfortable line height. | Real uploaded photographs, short captions and a quiet **Xem đủ … ảnh** link when there are more than three. |
| A small edit action near the outer margin. No toolbar floating over the prose. | A matching edit/photo action; it opens the same owner-protected spread editor. |
| Empty state: **Trang này đang chờ vài dòng của [tên].** | Empty state: blank taped prints and **Chưa có ảnh trong trang này.** |

Keep the same composition for everyone. Personality comes from the existing
portrait, small scarf-colored bookmark, their writing and actual photographs.
Do not generate fictional entries, handwriting textures masquerading as
content, or new portraits. Decorative marks stay outside the prose area.

Use Patrick Hand for names, section labels and a few annotations. Use Be
Vietnam Pro at approximately 17–18px with 1.7–1.85 line height for long prose;
handwriting throughout an entire essay would hurt readability. Maintain
strong contrast on the paper regardless of the surrounding scenery phase.

Seven slim named fabric bookmarks let readers jump to a person. Names and
active states must remain available without relying on scarf color. A quiet
footer reads, for example, **mi · 1/7**, with **Người trước / Người tiếp theo**.
Actual physical page numbers are secondary and do not replace the person count.

### Size, content length and phones

- Desktop starting point: an open book around 960–1040px wide, with each page
  roughly 460–500px wide and 600–680px high. These are prototype targets, not
  fixed viewport assumptions; preserve room for navigation and page controls.
- Leave approximately 36–48px around text and more space at the spine. No text,
  edit button or photograph may sit in the visual binding crease.
- Long writing must remain complete. The desktop text area may scroll with a
  visible subtle scrollbar and **Đọc trọn bài** opens a natural-flow reading
  sheet outside the flip renderer. Never shrink the font to make it fit.
- Below the width that supports two readable pages, display one paper surface
  with **Lời viết / Ảnh** controls for the current person. Next/previous still
  changes the person. Do not let a library's default portrait mode silently
  turn “next person” into “the other half of this person's spread”.
- Phone writing uses natural vertical height; avoid a small nested scrollbox.
  Keep 44px minimum touch controls, safe-area space, and captions at readable
  sizes. At 200% text scaling, use this layout even on a wider device.
- Editing uses a spacious paper sheet: side-by-side text/photo fields on
  desktop and a single-column full-height sheet on phones. Support the on-screen
  keyboard with dynamic viewport units and a reachable save action.

## 4. Opening, turning and interaction mechanics

Use **StPageFlip / `page-flip` 2.0.7** as the initial desktop enhancement
candidate. The official distribution supports HTML pages, hard covers, a
classic browser script, soft-page turns and programmatic navigation without
other runtime dependencies. Its current npm release was checked during this
research. Vendor a pinned browser bundle and MIT license locally if the
prototype passes; do not introduce React, a CDN or a site build step.

The upstream API alone is not an accessibility or Safari guarantee. Gate the
choice on the prototype below, with semantic HTML and a simple non-3D reader
available independently of the library.

### Motion specification

| Action | Intended motion |
| --- | --- |
| Open after authentication | 850–1100ms cover turn around the left hinge; the object gently shifts from closed-cover position to a centered open spread. |
| Next/previous person | Approximately 600–750ms soft-page curl, moving shadow and restrained paper flex. No camera spin or dramatic whole-book rotation. |
| Bookmark jump across several people | One direct transition to the chosen spread; never replay every skipped person. |
| Close | Approximately 600–850ms reversed cover motion, retaining the selected person for the current tab. Closing the book does not sign the reader out. |
| Reduced motion or the site's motion pause | Instant state changes or a short opacity dissolve, without cover rotation or page curling. |

Opening is shown on deliberate open, not every member change. There is no
auto-advance, mandatory sound, scrolling animation, or automatic slideshow.

### Keep whole people together

Represent the book as cover → fourteen interior faces → back cover. Explicitly
map each member to the engine indices for their left and right faces. Confirm
the cover/parity behavior in the real library: the settled spread must contain
the **same person's writing and photographs**, and one next action must reach
the next person. Cover offsets are implementation details, not account IDs.

On phones, the application owns member navigation and the writing/photo switch;
do not rely on the engine's automatic single-page sequence. In all modes,
preserve the selected member when resizing or rotating.

### Interaction and lifecycle rules

- Buttons/bookmarks are the primary controls. Arrow keys navigate only while
  focus is in the diary reader and outside inputs; never intercept text-editing
  or document-scrolling keys globally.
- Configure the engine to avoid whole-page click flipping. Selecting text,
  opening an image, pressing Edit and vertical phone scrolling must not turn a
  page. Optional dragging belongs to a small outer corner zone on desktop.
- Keep live editor forms outside turning/cloned page DOM. Each page's edit
  button opens that person's shared editor, initially focused on text or photos
  as appropriate. Pause turning until the editor is closed.
- Keep the controller small: `open`, `close`, `goToMember`, `setSide`, `render`
  and `dispose`; account/data state must not live inside engine page indices.
- While turning, settle one action at a time and retain at most the most recent
  requested destination. Rapid taps must not skip unpredictably or leave a
  half-folded page. Define recovery for resize, hidden tabs, pagehide, motion
  preference changes and closing during a turn.
- Inactive faces and visual clones are inert and excluded from the accessibility
  tree. Clones have no duplicate IDs. Announce the settled member once in a
  polite live region, without reading every animation frame.
- Keep book transforms separate from the existing outer scroll reveals. Reveal
  the book wrapper once per normal scroll behavior; do not animate every leaf
  with `motion.js`. Refresh existing measurements after layout settles.
- Provide a **Đọc dạng thường** mode with normal headings, prose and images.
  Missing flip script, unsupported 3D, enlarged text and keyboard use remain
  usable through this renderer after the same authentication checks.

## 5. Account and editing experience

1. A public visitor sees the closed cover. **Mở sổ** reveals a small paper login
   sheet with the seven existing portraits/names. No writings, private photo
   thumbnails, captions or drafts are downloaded before authentication.
2. For an unclaimed name, show **Đặt mật khẩu cho trang của [tên]**, password and
   confirmation fields, a show/hide control, and a clear first-claim explanation.
   Successful setup signs into that account and opens the book.
3. For a claimed name, request its password. Wrong-password errors are inline;
   preserve the selected name and never reveal stored password information.
4. A valid crew account reads everyone's saved-to-book spreads. Its own edit
   actions open directly while that authenticated session remains active.
   Editing another person's spread requires switching to that person's account
   with their password, not changing a selected-name variable.
5. Both page faces expose an edit button. For a different signed-in owner, the
   action explains which account is required before offering account switch.
   Cancel leaves the reader and any current draft intact.
6. The editor provides title, prose, photo upload/order/featured selection,
   captions and image descriptions. Start with plain text and paragraph breaks;
   arbitrary HTML, embedded scripts and externally embedded images are not needed.
7. Debounced autosave stores an **owner-only server draft**. Show separate states
   for saving, draft saved, unsynced edits and failure. **Lưu vào sổ** explicitly
   publishes the current text/photo snapshot for the other six accounts to read.
8. Versioned saves detect another-device edits. Offer a clear conflict response
   and preserve the unsaved text; do not overwrite the other save silently.
9. Logout clears private DOM, fetched content, transient image blobs and session
   storage. Account switching cancels stale reads/autosaves and prevents old
   responses from populating the newly selected account's editor.

Suggested initial limits: 100 characters for a title, 8,000 for prose, 160 per
caption/description, twelve photos per member and three featured prints on the
spread. These are product defaults to tune during the prototype; enforce the
same limits in the backend. Provide keyboard-operable reorder buttons as well
as any drag interaction.

Do not store private drafts or image bytes in `localStorage`, trip data files,
demo state or Git. Keep failed unsynced writing in memory and warn before
discarding it. First version has no fabricated “saved” success when offline.
There is no public “forgot password, reclaim this name” endpoint. Without an
email identity, password loss requires the organizer's trusted administrative
reset while preserving the account's existing ownership.

## 6. Backend recommendation and actual permission enforcement

Use a **dedicated Supabase project** for Auth, Postgres and private Storage, with
small Edge Functions for media processing. The frontend remains classic static
HTML/CSS/JavaScript on its current host. This is a deliberate new backend
requirement for the diary; the rest of the trip site continues to work without
it. Do not silently reuse Hue's project, tables, public buckets or policies.

### Passwords without collecting email addresses

Supabase Auth's password interface takes an email or phone identity rather than
a username. To keep the chosen name-and-password experience, map each immutable
member ID to a fixed **internal email-shaped login alias**, for example
`san@taxua-diary.invalid`. This is an implementation alias, not an email the
traveler supplies, verifies or receives messages at. Test the chosen alias
format against the actual Auth configuration before adopting it.

- Seed exactly seven member slots. Keep `member_id`, login alias, linked Auth
  UUID, active state and claim timestamp in a server-managed private schema.
- Enable only the password signup path needed for first claim, without email
  confirmation. Disable anonymous, phone, OAuth and other account-creation
  paths for this dedicated project.
- A **Before User Created hook** rejects every address except an exact seeded,
  still-unclaimed alias. Restrict to full canonical aliases, not merely a domain
  suffix. The ordinary Auth API must enforce this even if callers skip the UI.
- A tightly scoped database trigger on Auth user insertion validates the alias
  again and binds the new Auth UUID to its unclaimed member slot with a
  conditional update in the **same transaction**. Assert exactly one matched
  slot. A unique alias/UUID constraint and row locking decide concurrent claims;
  the losing transaction must not overwrite the winning account or password.
- Do not rely on the pre-signup hook's earlier availability check to resolve
  races. Auth creation and slot binding must commit together or roll back.
- Reject changes to these managed login aliases on the server. Ownership is
  bound permanently to the Auth UUID, never inferred anew from an editable
  display name, email field or `user_metadata` value.
- A narrowly scoped anonymous endpoint may return only the seven known IDs and
  claim booleans for the login sheet. It reveals no entries, Auth UUIDs, secrets,
  activity timestamps or photo metadata. Claims are decided again on the server.
- After all seven slots are claimed, the hook admits no more accounts. Account
  deletion or password reset must not automatically reopen a slot for claiming.

This uses Supabase's password hashing/session implementation rather than a
homemade password table or browser-side hash comparison. Passwords never appear
in `data.js`, config, generated artwork, logs or the public repository. The user
subsequently requested any non-empty password, superseding the proposed
passphrase minimum. The current [backend guide](diary-backend.md#claim-and-authentication)
documents server-side credential conversion for new accounts, preservation of
existing passwords and the provider's independent limits. Paste and password
managers remain supported.

Use Auth's server rate limits and server-verified CAPTCHA for signup/sign-in.
Browser delays and disabled buttons are only presentation. These controls
reduce automated abuse; they cannot establish the identity of a first claimant.

### Suggested data ownership

| Surface | Purpose and access |
| --- | --- |
| Private member registry | Seven stable IDs and trusted Auth UUID bindings. No browser writes. Active/revoked account state is checked on requests. |
| `diary_entries` | Current saved-to-book title, prose, revision and publication time per member. Active crew accounts read; only the mapped owner can publish changes. |
| `diary_drafts` | Latest unsaved-to-book snapshot, text and photo selections. Read/write only by its owner. Other crew queries cannot retrieve it. |
| `diary_photos` | UUID, member ID, processing/visibility state, private object paths, dimensions, order, caption and description. Reader access follows publication state and ownership. |
| Private upload reservations/jobs | Server-enforced photo slots, byte budgets, processing state and cleanup. A browser cannot mint arbitrary approved jobs or unlimited object paths. |
| Private revisions/audit | Server-authored revision records and limited change metadata. Owner/admin recovery; never passwords, bearer tokens or public exports. |

Use stable member IDs such as `san`, `thao`, `mi`, `linh`, `quanlele`, `gtm`,
`truong`; do not use roster position as ownership. Keep Vietnamese display names
and the separate visible crew order exactly as they are now.

### Authorization contract

Enable Row Level Security on every exposed table and grant only required
operations. Private tables are outside exposed schemas and have no browser
grants. A safe internal membership lookup derives the caller from the verified
Auth UUID, checks its active slot and returns only that caller's member ID.

| Caller | Published writing/photos | Other people's drafts | Change a spread | Change account ownership |
| --- | --- | --- | --- | --- |
| No session / invalid token | Denied | Denied | Denied | Denied |
| Authenticated but not mapped to an active diary slot | Denied | Denied | Denied | Denied |
| Active crew account | Allowed | Denied | Own only | Denied |
| Trusted organizer tools | Only the explicit recovery/maintenance operations | According to administrative need | Explicit repair only | Explicit administrative repair only |

For updates, check both the existing row and its resulting ownership with
`USING` and `WITH CHECK`; provide the corresponding SELECT policy. Protect
identity columns with grants/constraints as well: an owner cannot reassign a
row, photo or draft to somebody else. Do not treat `TO authenticated` alone as
crew authorization. Membership and author fields supplied by the caller are
not trusted evidence.

Publishing should be one transaction with an expected revision: validate the
owner, draft, processed photos and their member IDs; update the current entry
and photo visibility/order; record the revision; then return confirmed data.
Normal RPCs use invoker permissions/RLS. Necessary private claim/audit triggers
must have fixed search paths, explicit object names, minimal privileges and no
PUBLIC execute grant. Keep privileged functions out of exposed schemas; review
any exception explicitly rather than adding `SECURITY DEFINER` to fix an error.

The frontend gets only a public project URL and publishable key. Secret/admin
keys exist only in trusted function environments or organizer tools. RLS applies
to direct Data API calls, not just requests made by this page. Any media function
using admin credentials must verify the caller and derive/validate the job's
owner before doing work; an admin key bypasses RLS and is not an ownership check.

### Sessions, reset and rendering safety

- Use a diary-specific SDK storage key and per-tab session storage, with an
  in-memory fallback. Do not reuse Hue's login state or store passwords. Closing
  a tab clears that tab's stored session; it is not proof of server revocation.
- Logout/account disable/reset must revoke server sessions as appropriate.
  For immediate invalidation, check server session validity (`session_id`) in
  the protected membership path, as well as active membership. Test revoked
  tokens explicitly; signing out alone does not make an already issued access
  token disappear everywhere instantly.
- The organizer resets a forgotten password through trusted administrative
  tools, preserving the same member/Auth UUID binding and invalidating old
  sessions. Do not add public reset, account deletion or name-reclaim APIs.
- Use plain text nodes for prose, titles and captions, including data returned
  by the API. If a future rich-text requirement appears, select and test a
  strict sanitizer then. Do not feed member input into the existing HTML
  templates without escaping it.
- Scope network requests and headers to the diary backend. Serve live access
  over HTTPS, validate tokens server-side, add a practical CSP and avoid
  logging secrets. CORS is not the authorization boundary.
- Do not embed private entries in HTML, source JSON, public screenshots,
  metadata, search previews, shared caches or source-controlled review output.
  Authenticated members can still copy/screenshot content they are allowed to
  read; this feature is access control, not copy prevention.

## 7. Private photo pipeline

Use separate **private staging** and **private processed-image** buckets. A
public bucket would make its images accessible to anyone with their URLs,
regardless of an apparently protected diary interface.

1. Authenticate the owner and reserve an upload slot transactionally. Count
   pending uploads as well as completed photos so parallel requests cannot
   bypass the twelve-photo limit or storage budget.
2. Allocate a random photo UUID and exact permitted object path. Accept an
   upload only for that owner's live reservation. Browser callers cannot write
   arbitrary paths, overwrite another original, or write to the processed bucket.
3. The browser can orient/resize a camera image for a friendly preview and
   lower mobile bandwidth. Treat that as an optimization, not validation.
4. The trusted processor checks actual bytes, allowed decoded format, size,
   dimensions and frame count; decodes and re-encodes the image; strips EXIF/GPS;
   fixes orientation; and produces a thumbnail plus a reading-size image.
   Reject SVG, HTML, animated uploads, corrupt files and decompression bombs.
5. Mark the metadata ready only after valid derivatives exist. Draft uploads
   remain owner-only. Publishing explicitly makes the chosen processed photos
   readable to active crew accounts together with the entry.
6. Download through authenticated requests and short-lived in-memory blob URLs.
   Storage SELECT policies must check the linked photo's current visibility,
   not just whether the caller is a member. Keep unpublished photos private even
   if their paths are guessed. Avoid bearer signed-image URLs in the first
   version; possession of such a URL grants access until its expiry.
7. Clear fetched images/object URLs on logout and avoid persistent private
   caching. Verify actual cache headers and authenticated fetch behavior; use a
   protected media response with `Cache-Control: no-store` where necessary.
8. Photo removal first changes the draft. Publishing updates visibility; a
   trusted cleanup job removes unreferenced objects after a grace period.
   Failed uploads release reservations, and abandoned staging objects expire.
   Do not remove photos still referenced by a retained published version.

Starting processor limits: normalized JPEG/PNG/WebP, at most 5MB and a 2560px
long edge within a bounded pixel count. Let the browser resize larger phone
images before upload, while enforcing the limits again on the backend. The
small derivative should fit its book frame; load a larger image only for an
explicit photo view. HEIC conversion is a separate compatibility check: only
offer it if a tested decoder is available; otherwise explain the supported
formats before upload. Never show a successful upload for an unsupported file.

Supabase documents ImageMagick WASM for Edge image processing; native `sharp`
is not supported there. Hosted CPU/memory limits make this a required early
benchmark. Process one bounded photo per job and test actual phone images.
If that does not fit reliably, put the same validated job in a small dedicated
image worker; keep Auth, private buckets and the frontend contract unchanged.
Do not replace server validation with client-only compression to avoid the limit.

Track storage across live, staging and retained-history objects. Keep private
database exports and photo-object backups outside Git, with a retention rule
and a restore test. A database-only backup does not restore missing image bytes.

## 8. Artwork production

The planning study was generated through **9Router using
`cx/gpt-image-2.5-sunburst`**, with existing wheel/coffee artwork as style
references. The endpoint reported support for generation, editing and multiple
reference images. One actual 1536×1024 PNG was returned and visually inspected.
No member photos or private writings were sent to the generator.

- [Exact concept prompt](prompts/diary/01_material_study.md).
- [Untouched returned master](../figures/raw/diary/diary_material_study.png).
- [Request/reference/output provenance](../figures/raw/diary/generation.json).
- [Optimized design preview](research/diary_material_study.webp).

For implementation, generate component layers rather than using this whole
image as an inflexible book background:

| Asset | Preparation / use |
| --- | --- |
| Straight-on blank indigo cover | Isolated cover texture with consistent hinge and enough empty space for live title/date text. Separate from the opening transform. |
| Quiet paper skin | Low-contrast repeatable grain or matching left/right skins. Reuse the existing grain if it is good enough; render the gutter/shadows in CSS. |
| Page-edge/binding details | Small transparent layers; preserve enough padding for rotation and avoid baked-in conflicting shadows. |
| Tape and photo corners | A few reusable transparent cutouts; photo images and captions remain independent HTML. |
| One pressed-fern/cloud accent | Optional, outside reading areas. Existing coffee/cloud art can be reused instead of commissioning a sticker set. |
| Member bookmarks | CSS fabric strips plus the current portraits/names. Reference the current scarf palette; no need for seven additional generated people. |

Preserve new masters under `figures/raw/diary/`, optimize derivatives under
`figures/decor/painted/` with names such as `diary_cover.webp` and
`diary_tape.webp`, and record crops, hashes and references in
`data/sources/diary-artwork.json`. Put exact future prompts under
`docs/prompts/diary/`. Never overwrite supplied originals or hand-edit the
generated photo registry for these decorative assets.

Check alpha edges on jade, night and paper backgrounds, consistent shadow
direction, complete cover/spine bounds and grain behind Vietnamese diacritics.
The study's blank prints are placeholders only; runtime images come from the
person's own uploads. Do not send those uploads to 9Router as part of the site.

## 9. Frontend and documentation boundaries

Proposed file ownership, to create only during implementation:

| File / surface | Responsibility |
| --- | --- |
| `data.js` | Add seven stable member IDs and diary UI copy/config. Preserve itinerary content, member labels/images, wheel membership and `crewOrder`. |
| `index.html`, small `main.js` changes | Accessible `#crewDiary` shell, crew links, local styles and optional-script bootstrap. |
| `diary.js` | Reader/controller states, member/side selection, semantic rendering and small lifecycle hooks; no password decisions. |
| `diary.css` | Cover, paper, gutter, photograph layout, editor, phone/large-text/print/reduced-motion states. Scope selectors to avoid restyling the trip. |
| `diary-api.js`, public `diary-config.js` | Supabase session/client adapter, confirmed reads/writes and errors. Never secret keys or stored passwords. |
| `vendor/` | Pinned local flip engine and browser-compatible Supabase SDK, with licenses/checksums. Load on diary interaction; no CDN requirement for the trip. |
| `backend/supabase/` | CLI config, migrations, private helper/trigger functions, Auth hook configuration and media functions. Use CLI-created migration names. |
| `scripts/verify_diary.cjs`, backend tests | Reader interactions and real permission/claim/upload regression tests. |
| `docs/diary.md`, `docs/diary-backend.md` | Implemented behavior and operator setup/recovery/backup instructions. All prose docs remain under `docs/`. |

Keep the existing script dependency order intact. The diary bootstrap runs
after the existing rendering/controls have initialized, with an independent
optional adapter; it must not block trip content if network/config is missing.
Ensure local vendor loading and request cancellation are idempotent.

Use separate reader, session and write states instead of a single “unlocked”
boolean. Examples: closed/open/turning; logged-out/authenticating/active/expired;
clean/dirty/saving/conflict. These states control presentation; the server still
checks every operation.

| State | Reader/editor treatment |
| --- | --- |
| Backend not configured or `file://` | Static cover and a clear connection/setup explanation. Original trip and standalone itinerary remain usable. |
| Loading after valid login | Paper-shaped placeholders, stable book geometry and a cancel/retry route. |
| Empty saved spread | The named person's blank paper and empty prints; no invented trip memories. |
| Upload pending/processing/failed | Per-photo progress and retry/remove controls. Do not expose unfinished images to other readers. |
| Draft differs from the book | Owner-only “Bản nháp” status and explicit save-to-book action. |
| Revision conflict | Preserve the current unsaved writing and offer reload/review; never quietly overwrite. |
| Session expires or access is revoked | Hide protected content, stop mutations, and request login. Keep only unsynced owner text in memory for reauthentication; deliberate logout clears it. |
| Images/flip engine fail | Named image fallback or ordinary authenticated reading mode; entry text and navigation remain available. |

The original static site still supports direct-file viewing. Live private
diary access requires HTTPS or an appropriate local HTTP preview plus the
backend; do not open CORS to arbitrary `null` origins to make local files act
like authenticated production clients. No private diary content is added to
the generated public `itinerary.html`. Default site printing excludes private
diary content; do not accidentally print every fetched member entry.

## 10. Implementation sequence and review gates

### Phase A — resolve the difficult behavior in small prototypes

1. Build a local blank-book prototype with cover and all seven paired spreads.
   Prove cover offsets, next-person navigation, bookmark jumps, selectable text,
   button clicks, resizing, phone behavior and the non-3D renderer.
2. In an isolated development backend, prove the internal-alias password flow,
   exact seven-slot signup restriction and atomic simultaneous first claims.
   Verify that user-controlled metadata and Auth email changes cannot change
   ownership or reopen a claimed slot.
3. Process representative normalized camera photos with the bounded WASM path.
   Measure correctness, CPU/memory failures and phone upload behavior. Decide
   here whether a worker is required; do not discover this after the gallery UI
   is finished.

Exit: actual evidence for these three contracts. If the flip engine fails
critical interaction/compatibility checks, use the semantic reader with a
smaller dedicated CSS turn enhancement instead of forcing its default behavior.

### Phase B — protected data foundation

Create migrations, seed the seven IDs, configure Auth/hooks, private tables,
RLS/grants and private buckets. Implement versioned publication and bounded
upload reservations/processing. Run backend denial/race tests before wiring
real content into the book. Keep production and test accounts/data separate.

### Phase C — final book materials and reader

Generate only missing component art, preserve masters and provenance, implement
the inline cover/spreads/bookmarks, and connect authenticated published reads.
Match the inspected crew scene and current typography. Finish keyboard,
large-text, reduced-motion, missing-library and image-failure behavior at this
stage, rather than adding them after animation polish.

### Phase D — writing and photo editing

Add the owner-aware editor, private draft autosave, confirmed publication,
photo selection/reorder/captions, recovery/errors and account switch/logout.
Keep editor forms independent of page-turn DOM. Verify two-device edit
conflicts and failures between upload, processing and publication.

### Phase E — integrated verification and setup docs

Run the tests below, inspect the actual rendered result, and fix regressions.
Update the docs index, group/motion/identity/vendor/verification guides and
backend setup instructions to describe the implementation actually delivered.
Narrowly update contributor instructions to distinguish the static trip from
the new optional network diary. Regenerate the reading copy after member-data
changes as required and confirm it contains no private diary data.

Production needs a configured diary project, Auth hook, migrations, private
buckets, deployed processor, allowed web origins and public client config.
Do not send invitations: the chosen flow has none. Do not declare secure
persistence complete while only a local UI/mock exists or migrations remain
unapplied. The first-claim identity limitation must remain documented at release.

## 11. Verification required before calling the feature complete

### Backend checks with actual policies and direct API requests

- Unauthenticated REST/database/storage/function requests return no private
  writing, photos, captions, drafts or revision history. Test actual payloads,
  not only whether the screen hides something.
- Unknown aliases, extra signups and alternate Auth providers cannot create
  an eighth mapped account. An unrelated authenticated UUID still gets no data.
- Concurrent first claims produce exactly one bound account; neither a retry
  nor an account/email change overwrites ownership or the winning password.
- Account A can read account B's saved spread but cannot read its draft or
  unpublished images, publish as B, move photos to B, overwrite B's object path,
  change ownership columns or alter the member registry.
- Forged user metadata, changed JS variables, edited local storage and invalid
  JWTs do not change permissions. Direct SDK/REST writes obey the same rules.
- Verify denied UPDATE/DELETE attempts by inspecting affected-row counts and
  rereading the target. RLS may return zero rows without an HTTP error.
- Parallel uploads cannot bypass slot/byte quotas. Rejected types, mismatched
  bytes, oversized dimensions, invalid files and stale reservations never
  become readable published photos. Image output has no EXIF/GPS.
- Deleted/unpublished photos stop being served according to the chosen access
  policy. Session disable/reset/revocation blocks requests made with the old
  token. No public URL or long-lived signed URL bypasses membership.
- Version conflicts preserve both the existing published version and the
  caller's recoverable draft. Failed processing/publication never reports save
  success or exposes partial data.
- Review exposed schemas/grants/functions/views and run Supabase security
  advisors. Restore one entry and its image objects from the intended backups.

### Browser and visual checks

- Open/close, forward/back through all seven people, direct bookmark jumps,
  first/last boundaries and rapid repeated input. Every settled spread pairs
  the same person's left/right content; no symbolic-pig page appears.
- First claim, later login, wrong password, own edit, another owner's edit,
  account switching, password reset outcome, logout and session expiry.
- Actual upload from file input, pending/failed states, captions, featured
  selection, keyboard reorder, photo view and private draft/publication behavior
  across two browser contexts.
- Desktop 1440px, tablet around 820px, phones 390px/320px, short landscape,
  rotation and 200% text. Check long Vietnamese writing, diacritics, empty/full
  albums, keyboard reach and the phone on-screen keyboard.
- Reduced motion, site's pause control, hidden tabs, pagehide, missing GSAP,
  missing flip library, missing decorative images, denied session storage,
  backend unavailability and interrupted saves.
- Focus order and restoration, native buttons, announcements, inert hidden
  faces, no duplicate IDs, visible contrast, and image descriptions. Automated
  accessibility checks supplement manual keyboard/screen-reader review.
- No unexpected console errors, failed required images, horizontal overflow,
  text hidden in the gutter, layout jumps or vertical-scroll interception.
- Test Chromium and WebKit/Safari behavior for the turning surfaces; inspect a
  real phone if available. Report any untested browser/device explicitly.

Run the relevant existing wheel/games, fund, mobile UI, motion, controls,
scrollbar and journal-object checks when their shared surfaces change. Use the
documented scripts, local-link validation, `node --check` for changed classic
scripts and `git diff --check`; there is no invented npm test/build gate.
Mocked browser success does not establish RLS or Storage security.

## 12. Evidence from this planning pass

Completed: repository/doc/code review; primary-source research linked in the
[source register](sources.md#private-crew-diary-research); existing desktop/phone
crew inspection; live 9Router model/capability discovery; generation and visual
inspection of one Sunburst material study with recorded references/hashes.

Not implemented or tested here: diary UI, page-turn prototype, account
claiming, passwords, RLS, image processing, persistence or deployment. The phases
and verification cases above are the remaining implementation work.
