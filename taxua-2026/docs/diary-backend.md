# Diary backend and operations

[Diary behavior](diary.md) · [Original plan](diary-plan.md) · [Implementation review](diary-review.md) · [Sources](sources.md#private-crew-diary-research)

## Deployed boundary

The diary uses the existing [gogo project](https://supabase.com/dashboard/project/oikouihzuxxbsgygwmwj)
(`oikouihzuxxbsgygwmwj`, Tokyo). It creates no paid project/branch and does not
change Hue's tables, functions, bucket, Auth signup settings or global hooks.
Only the diary frontend calls the new `taxua-diary` function.

| Resource | Access |
| --- | --- |
| `taxua_diary.members` | Exactly eight seeded slots; private UUID/alias/claim registry |
| `taxua_diary.entries` | Published title, prose, ordered photo metadata, monotonic revision |
| `taxua_diary.drafts` | Separate owner-only draft and revision |
| `taxua_diary.photos` | Owner, upload state, expiry, dimensions, reserved/actual bytes |
| `taxua_diary.history` | Up to ten previous published snapshots per owner |
| `taxua_diary.rate_limits` | Bounded counters; salted IP digests, no raw IP/password storage |
| `public.taxua_diary_gateway` | Only `service_role` can execute; no browser grants |
| `taxua-diary-photos` | Private processed JPEGs/thumbnails; no browser Storage policy |

The private schema is not exposed through PostgREST. All six tables have RLS,
explicit restrictive deny policies for `anon`/`authenticated`, and no browser
grants. The private bucket has an additional restrictive guard, so a future
broad Hue Storage policy cannot accidentally expose it.

The gateway is `SECURITY INVOKER`. The Edge Function first verifies the bearer
with Supabase Auth, then passes that verified UUID and signed session ID. A
narrow private definer helper verifies the UUID is a bound, enabled member,
the Auth user is not banned, and the session still exists and has not expired.
Every protected gateway operation repeats that check. Selected names, request
ownership fields, `user_metadata`, local storage and client state do not grant
permissions. The only other definer helper prevents alias changes on bound
diary accounts. Both helpers have fixed empty search paths and no client grants.

The function has `verify_jwt=false` because status, first claim, login and
refresh must work before a bearer exists. Protected routes explicitly validate
Auth and the live session in the function body. This setting is not anonymous
permission to read or write diary data.

## Adding tamle, 22 October 2026

Migration `20261022151112_taxua_diary_add_tamle.sql` expands the member-ID
constraint, moves linh to display position 8, and inserts tamle at position 7
with an empty published entry. Existing IDs, account bindings, passwords,
drafts and published content are preserved. Drafts are created lazily by the
existing gateway. Tamle uses the existing first-claim password flow; no account
was claimed or password chosen during this update.

The migration was applied to gogo, followed by `taxua-diary` Edge version 7
with tamle added to the allowed IDs. The function keeps its previous JWT,
imports and authentication settings. Apply the migration, deploy the matching
function, then publish the static frontend when reproducing this update.
Public `/status` returns all eight names; a blank-password request for tamle
reaches `INVALID_PASSWORD`, while an unknown member remains `INVALID_MEMBER`.
Anonymous private reads remain denied. A rolled-back migration rehearsal
compared every existing account binding and complete entry value before and
after; all were preserved. Live crew accounts were not used for mutation tests.

## Claim and authentication

1. Public status returns only eight names and whether each is claimed/busy.
2. Claim locks the selected slot and issues a five-minute nonce plus a random
   candidate UUID/alias. A concurrent claimant cannot acquire that reservation.
3. The server creates a confirmed Supabase Auth user with a derived credential
   and a random `UUID@taxua-diary.invalid` alias, then atomically binds that UUID
   to the reserved slot. Passwords are hashed by Supabase Auth. Neither aliases
   nor passwords are stored in public content.
4. A failed reservation cannot overwrite a bound owner. A foreign-key guard
   prevents an uncertain claim response from deleting an already-bound user.
5. Login resolves the name to its private alias and uses Supabase Auth password
   authentication. No invitation or recovery email is sent.

Random server-generated aliases avoid predictable-alias squatting without
installing a global Before User Created hook in a shared project. Unrelated
Auth signups, if allowed by the project's other applications, have no diary
mapping and no diary access. Only the eight slots can acquire a diary mapping.
**First claim does not verify a person's identity**, by explicit user choice.

Any non-empty password is accepted, including a single character or spaces.
The browser and function impose no password length or character rules; the
general 64 KiB JSON request limit still bounds authentication requests.
For new accounts, the server hashes the JSON tuple
`["taxua-diary-password-v1", private_alias, exact_password]` with SHA-256 and
prefixes its hexadecimal digest with `Aa1!`. Supabase Auth hashes and verifies
that 68-byte ASCII credential using bcrypt. This avoids the provider's separate
minimum/character rules and 72-byte bcrypt limit without altering the shared
project's Auth configuration. The full input is significant: no trimming,
Unicode normalization or truncation. The conversion does not strengthen a
guessable password; existing account/IP rate limits still apply.

New accounts have the server-controlled `app_metadata.diary_password_format`
marker `sha256-v1`. Login reads it through the admin API using the UUID in the
private alias. Unmarked existing accounts continue using their original raw
password through Supabase Auth; they are not reset or migrated. Unknown formats
fail closed, and a marked account never falls back to raw authentication.
Neither the converted credential nor format selection comes from the browser.
The marker selects only credential encoding, never permissions or ownership.
Account attempts are limited to twelve per fifteen minutes; source-IP digests
have a broader limit.
Uploads are limited separately. Rate counters older than a day are discarded.
The frontend keeps refresh/access tokens in tab session storage (memory-only
when denied), stores no passwords or diary drafts persistently, and clears
private blobs/DOM on logout or rejected sessions.

The hosted advisor reports that Supabase's optional leaked-password protection
is disabled in the shared project's Auth settings. This implementation does not
change that project-wide setting or claim that breached passwords are checked.
An operator can review [the provider's password-protection setting](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Photo arrangement and framing

Photo array order and bounded size metadata assign the snapped frames. An optional `crop` object contains
`x` and `y` (normalized image-center coordinates, 0-1) and `zoom` (cover-relative,
1-3). Missing crop metadata uses the centered 1× default; existing records need
no backfill. Rendering clamps the focal point to the aperture, preserving its
intended center when an arrangement or screen size changes.

The Edge Function keeps only `id`, `caption`, `alt`, optional size and validated crop fields.
It rejects null, incomplete, nonnumeric, nonfinite, extra-key or out-of-range
crop objects. The gateway independently validates crop types/ranges and still
checks every photo belongs to the active owner and is ready. Selected names,
client state and crop metadata grant no permissions. Published/draft JSON and
history retain the same metadata; images are never rewritten for framing.

Migration `20261019051953_taxua_diary_photo_framing.sql` was applied to gogo on
19 October 2026, followed by `taxua-diary` Edge version 6 with `framing.ts`.
The migration only extends gateway input validation; no crew data, bucket policy,
shared Auth configuration or Hue resources changed. Deployment order is the
gateway migration, then Edge code, then the static frontend. Old clients remain
compatible but cannot retain framing if they save photos without that field.

Run `npx --yes --package=deno deno test --no-config scripts/verify_diary_framing.ts`
for normalization, and execute `scripts/verify_diary_framing.sql` in one connection
for 32 framing/size/publication/foreign-photo checks. The SQL script clones only
schema into temporary tables, uses a fixture identity in a temporary gateway,
and rolls everything back; it creates no crew or Auth accounts. It verifies
metadata validation and photo ownership, not the full Auth session flow.

### Bounded sizes · 28 October 2026

Optional `size` accepts only `small`, `medium` or `large`; absence means the
count-dependent automatic size. Edge normalization and the gateway independently
reject null, non-string and unknown values. It is display metadata only: photo
ownership, readiness, member/session checks, revision checks and the nine-photo
cap still apply. Existing records need no rewrite. JSONB drafts, published entries
and retained history preserve size together with caption, description and crop.

Migration `20261028034413_taxua_diary_photo_sizes.sql` was applied to gogo,
followed by `taxua-diary` Edge **version 8**, retaining `verify_jwt=false` and
its existing in-function authentication. The migration patches only the deployed
gateway's metadata validation behind an exact-source guard. A transactional
rehearsal ran temporary gateway fixtures and compared full member/entry/draft
hashes before rollback: crew data was unchanged. After deployment, the temporary
gateway passed all 32 checks, public status returned eight members, and anonymous
read/draft requests remained 401. No crew or Auth accounts, media, bucket policies,
shared Auth settings or Hue resources were modified.

The Edge framing/password suites pass 12 tests, and the entrypoint type-checks.
Security advisors reported no new diary finding; the previously documented shared
Auth leaked-password setting and unrelated public-table advisories remain. These
fixtures verify metadata/ownership and isolated handler behavior, not a live
crew login or media mutation flow.

## Upload lifecycle and consistency

Untrusted image bytes stream through the authenticated Edge request; they are
not persisted to a staging bucket. This replaces the plan's separate staging
bucket with a smaller exposure surface. The endpoint bounds the request to
2 MiB, parses JPEG dimensions before decoding, forces the decoder to JPEG,
and rejects input larger than 1600×1600 or 2.56 megapixels. Browser input may
be JPEG/PNG/WebP; it is normalized first. Forged MIME headers do not bypass the
byte checks.

`@imagemagick/magick-wasm@0.0.44` performs actual decoding, orientation,
profile/comment removal, JPEG re-encoding and thumbnail generation. Its pinned
WASM binary is fetched lazily by the Edge Function from jsDelivr and checked
against a committed SHA-256 before execution. It is not loaded by the website.
The decoder has width/height, memory, disk, list and profile limits. This
external binary is an upload-availability dependency; failure keeps the draft
unchanged and allows retry. No uploaded content is sent to that CDN.

Reservations lock the owner, count pending/processing/ready/deleting objects,
and reserve the maximum 4 MiB derivative allowance against a 30 MiB budget.
Only nine photo records may exist for one owner. The nine-photo limit is checked
in the serialized reservation and draft-save gateway paths, plus `CHECK`
constraints on both published entries and drafts. The migration
`20261018014337_taxua_diary_nine_photos.sql` was applied to gogo on 18 October
2026; no truncation or deletion was needed (all published/draft lists were empty).
The Edge Function delegates these checks to the gateway, so it needs no new
deployment for this cap. Actual byte accounting
replaces the reservation after processing. A ticket changes atomically from
pending to processing, preventing concurrent requests from processing/removing
one another's output. Metadata becomes ready only after both objects exist.

Publishing copies a complete, validated draft under a member lock. Captions
and descriptions live inside that version, so editing an existing photo's
caption cannot leak a draft change to other readers. Draft revisions reject
concurrent overwrites; publication also checks the current published revision.

Media is streamed through the authenticated function with `Cache-Control:
no-store, private` and `nosniff`. The gateway checks current visibility for
each request. Authenticated direct Storage requests and public URLs are denied.

Removing an unused image first marks it deleting; it cannot be attached or
served again. The database record remains counted until Storage confirms
deletion. Interrupted deletions retry when the owner next opens the editor.
Pending tickets expire after ten minutes; unreferenced ready images become
eligible for cleanup after a day. Cleanup atomically marks candidates before
deleting objects, avoiding a race with a newly attached draft. There is no
scheduled worker: cleanup runs on the owner's next draft open. Explicit deletion
also scrubs that image's reference from retained history; current published or
draft images cannot be explicitly deleted.

## Maintenance and redeployment

The public [configuration](../diary-config.js) contains only the function URL.
Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` into the Edge environment. Never put the service
key in this static site's files, a browser console, Git, a screenshot or a log.

Migrations were created with the Supabase CLI and applied to `gogo`. Retain
their order: foundation, gateway record-name fix, retention/deny guards, upload
lifecycle. Do not edit applied migration history. Create follow-up migrations
with `supabase migration new` from `backend/` and use a migration-capable tool
to apply them. The generated local CLI configuration is for local development;
do not push its Auth configuration into this shared hosted project.

To type-check and deploy from `backend/`, with a current CLI and Deno installed:

```sh
deno check --config supabase/functions/taxua-diary/deno.json supabase/functions/taxua-diary/index.ts
supabase functions deploy --help
supabase functions deploy taxua-diary --project-ref oikouihzuxxbsgygwmwj --no-verify-jwt
```

Inspect the CLI help for flags on the installed version. Include `deno.json`
and `deno.lock` when deploying through MCP. Dependencies are pinned. The browser
requires no npm install, build, environment variables or external library CDN.

By default, CORS permits HTTPS origins plus localhost/127.0.0.1 HTTP previews,
without cookies. `null`/direct-file origins are denied. Bearer authentication
and member/session checks enforce access; CORS is not an identity check. An
operator may set `DIARY_ALLOWED_ORIGINS` to an exact comma-separated list after
the production host is known. Do not rely on that list to protect unclaimed names.

## Lost passwords, disable and recovery

There is no email recovery because the aliases have no inbox. The organizer
must establish the requester's identity outside the site. Never reopen a
claimed slot or delete its Auth user to reset a password; that would risk
transferring ownership and breaking references.

In the trusted SQL editor, disable the affected member and revoke its sessions:

```sql
begin;
update taxua_diary.members set disabled=true where id='san';
delete from auth.sessions where user_id=(select user_id from taxua_diary.members where id='san');
commit;
```

Use the real member ID. Then, in a trusted server-side operator script using
Supabase's admin API, call `auth.admin.updateUserById(the_existing_uuid,
{password: credential})`. For an account with the `sha256-v1` marker, compute
`credential` with the committed function helper
`passwordForAuth(new_password, existing_user.email, existing_user.app_metadata.diary_password_format)`
from `supabase/functions/taxua-diary/passwords.ts`. Keep its existing marker.
For an unmarked account, the helper preserves the original raw format, which
still has the provider's password requirements during an admin reset. To reset
such an account to any non-empty password, set both the converted credential
and the `sha256-v1` app-metadata marker in the same admin update, merging the
other existing app metadata. Never change the UUID or alias.
Supply the new password through a protected local
input/file, not SQL, a URL, shell history or source control. Revoke sessions
again before setting `disabled=false`. The same UUID, published page and
photos remain. Confirm the old bearer is rejected and the new password can
log in. Do not send a recovery email to the internal alias.

An interrupted first claim may leave an unbound Auth user. Compare its UUID
with `members.user_id` and live claim reservations before deleting it through
the admin API; never remove a bound user or an active reservation's candidate.
Expired unbound reservations can be reclaimed normally.

## Backups

Keep private backups outside the static publish directory and Git. Export the
six private tables and download every live/history photo object with a trusted
service-role client. Record each object's path/hash with the matching row
snapshot. A database backup alone does not contain photo bytes. Keep encrypted
dated copies with a deliberate retention period (for example, daily for seven
days and weekly for four weeks). The repository does not install an automatic
backup service or promise a provider backup retention tier.

Restore objects to the private bucket first, verify hashes and metadata, then
restore the matching published/draft rows in a transaction. Preserve existing
member UUID mappings and never restore old Auth sessions. Use a disposable
entry and image to rehearse this before relying on a backup. Local implementation
verification retains disposable image bytes outside Git; no real crew content
was backed up or copied into documentation.

## Verification

Run the Edge authentication handler with an isolated in-process Auth/RPC
transport fixture (no hosted credentials or writes):

```sh
deno test --allow-env --config backend/supabase/functions/taxua-diary/deno.json scripts/verify_diary_passwords.ts
```

It covers first claim and repeated login with one-character, Vietnamese,
whitespace-only and long inputs, exact matching, empty/non-string rejection,
legacy accounts, unknown formats, claim protection and unauthenticated reads.
The browser suite also exercises short/long password setup, incorrect login,
confirmation matching and subsequent login in both browsers. These fixtures
do not establish hosted provider behavior; record isolated live checks separately.

Run live-write checks only against an isolated local stack/test project, or a
separate temporary schema/gateway/bucket/function. Never claim, reset or reuse
real crew accounts as test fixtures. The helper does not create or reset
accounts automatically. Its `san`/`mi` names refer to slots in the isolated test
backend, not permission to modify those names in the real diary.

For the book redesign review, copies of the four migrations and function used
unique `taxua_diary_qa_r2` / `taxua-diary-qa-r2` prefixes outside the repository.
The copied direct-request helper used those same rewritten schema, gateway and
bucket names. Browser tests replaced `diary-config.js` only inside their test
contexts. No alternate endpoint or test bypass was added to the shipped files.
All temporary resources/users/media were removed; real member/entry checksums
were compared before and after. See [cleanup evidence](diary-review.md#book-redesign-verification).

When preparing another same-project fixture, rewrite every resource reference
in the temporary migrations, function **and direct-request helper**, including
internal alias domains, Auth trigger names and the restrictive Storage guard.
Keep permissions/authentication unchanged. Use a new unique prefix, verify it
is unused, and retain the exact QA UUID mapping for guarded cleanup. A dedicated
test project/local stack can retain the original resource names. Do not change
the production frontend endpoint or project-wide Auth settings.

Store test sessions/passwords in a mode-0600 file outside the repository. Point
`DIARY_TEST_ENDPOINT` at that isolated function. Browser-only fixtures require
no live accounts and establish no server-permission guarantees.

```sh
DIARY_TEST_ENDPOINT=https://TEST_PROJECT.supabase.co/functions/v1/taxua-diary \
DIARY_TEST_STATE=/secure/tmp/accounts.json \
DIARY_TEST_IMAGE=/secure/tmp/fixture.jpg \
node scripts/verify_diary_backend.cjs
```

The account file contains `password`, `san` and `mi`; each account contains
`member_id`, `access_token`, `refresh_token`, `expires_at`. A JPEG fixture with
EXIF artist `diary-security-fixture` exercises metadata removal. Output defaults
to `/tmp/taxua-diary-backend-review`; it contains disposable images and check
names, never tokens/passwords. See [Diary verification](diary.md#verification)
for the UI suite. Run security advisors after schema changes; existing Hue
advisories must be distinguished from newly introduced diary issues.

## Photo-limit boundary check

`scripts/verify_diary_photo_limit.sql` runs in one database connection, creates
only temporary copies of the deployed tables/gateway, and rolls everything
back. It accepts nine reservations, a nine-photo draft and publication, then
rejects the tenth reservation, a ten-photo draft, and ten-photo entry/draft
constraint violations. It replaces the identity check only in its temporary
copy; it does not test Auth/session authorization. No crew row, Auth account,
Storage object or production function is changed by this check.
