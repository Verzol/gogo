# Hue 2026 security rollout

These files harden the existing custom username/password system. They do not
rename users, reset passwords, or copy password hashes into a new identity
system. The rollout invalidates browser sessions once during phase 3; every
member signs in again with the same password.

## Preconditions

1. Use the Supabase Dashboard SQL editor as the project owner. Do not run the
   historical `backend/*.sql` files again.
2. Take a new encrypted, data-containing backup outside the repository. The
   checked-in/exported `backup/schema.sql` has no `COPY` data and cannot restore
   members, password hashes, or sessions.

   ```bash
   umask 077
   supabase db dump --linked --data-only --use-copy --file ../hue-2026-data.sql
   gpg --symmetric --cipher-algo AES256 --output ../hue-2026-data.sql.gpg ../hue-2026-data.sql
   ```

   Verify that the encrypted archive can be opened, store it outside the repo,
   then remove the plaintext using the team's approved secure-storage process.
3. In the Dashboard SQL editor, check this query. It must return zero rows:

   ```sql
   select username
   from public.trip_members
   where password_hash is null or btrim(password_hash) = '';
   ```

   If it returns a row, stop. Provision a bcrypt cost-12 hash through an
   owner-only session; never use `trip_set_initial_password` from a browser.
4. Decide the exact production origin, for example
   `https://hue-2026.onrender.com`. A placeholder or wildcard is not safe.

## Ordered cutover

1. Review and run [`01_emergency_revoke.sql`](01_emergency_revoke.sql). It has
   a hash preflight and closes all browser database/function access immediately.
2. Review and run [`02_security_prepare.sql`](02_security_prepare.sql). It
   creates the private guest/rate-limit/audit data, 12-hour member sessions,
   24-hour guest sessions, safe chat actor ownership, and service-only APIs.
3. In Supabase Edge Function secrets, set:

   - `ALLOWED_ORIGINS` to a comma-separated exact list, e.g.
     `https://hue-2026.onrender.com,http://localhost:8000`
   - `RATE_LIMIT_HMAC_SECRET` to a new random 32-byte-or-longer secret.

   Supabase supplies `SUPABASE_URL` and a service/secret key to deployed Edge
   Functions. Do not add either service key to `supabase-config.js`, Render, or
   any browser environment.
4. Deploy the Edge API before the frontend. It uses custom opaque tokens, so
   JWT gateway verification must be disabled for this function only:

   ```bash
   cd hue-2026
   supabase functions deploy trip-api --no-verify-jwt
   supabase functions deploy team-photo-upload --no-verify-jwt
   ```

   `team-photo-upload` now returns `410`; it is retained only to make an old
   deployment harmless. All active browser traffic uses `trip-api`.
5. Deploy the static frontend. It uses `sessionStorage` for a member session,
   creates a hashed 24-hour guest identity through the Edge API, and does not
   load Supabase, fonts, or Lucide from a CDN.
6. Review and run [`03_security_lockdown.sql`](03_security_lockdown.sql). This
   makes `trip-game-photos` private, removes public RLS/realtime access, grants
   only an explicit function allowlist to `service_role`, and deletes old
   sessions once.
7. If phase 1--3 were applied before this runbook's guest-session correction,
   run [`04_fix_guest_session.sql`](04_fix_guest_session.sql). It fixes only
   the private guest-token helper and is safe after lockdown.
8. **Opt-in trade-off:** run [`05_restore_realtime_tradeoff.sql`](05_restore_realtime_tradeoff.sql)
   only when the owner accepts public browser read/subscriptions for chat and
   the listed live game tables. It restores instant updates but does not
   restore browser writes or legacy RPC execution.
9. **Optional:** configure the Render Dashboard's **Custom Headers** for path
   `/*` if a Render owner later grants access. Render Static Sites only support
   these headers through its Dashboard; there is no repository file or
   Supabase migration that can apply them. Skipping this step does not affect
   the Edge API, login, RLS, Storage privacy, or the static site's operation.

   | Header | Value |
   | --- | --- |
   | `Content-Security-Policy` | `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://www.youtube.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://oikouihzuxxbsgygwmwj.supabase.co; font-src 'self'; connect-src 'self' https://oikouihzuxxbsgygwmwj.supabase.co https://api.open-meteo.com https://www.youtube.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com; media-src 'self' https://oikouihzuxxbsgygwmwj.supabase.co` |
   | `X-Content-Type-Options` | `nosniff` |
   | `Referrer-Policy` | `strict-origin-when-cross-origin` |
   | `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |
   | `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
   | `X-Frame-Options` | `DENY` |

   Replace the Supabase project URL if the project changes. Retain
   `'unsafe-inline'` in `style-src` until the existing HTML `style` attributes
   are moved into CSS; do not add it to `script-src`.

## Required verification

Run these after phase 3, and retain the result with the release record:

```bash
cd hue-2026
npm ci
npm run audit
npm run check:js
npm run test:security
supabase db advisors --linked --type security
```

The advisor must report no callable `SECURITY DEFINER` function for `anon` or
`authenticated`, no permissive RLS writes, no public/listable
`trip-game-photos` bucket, and no mutable function `search_path` warning.

For the live negative tests, use disposable test actors only:

```bash
TRIP_API_URL=https://PROJECT.supabase.co/functions/v1/trip-api \
TRIP_API_PUBLISHABLE_KEY=sb_publishable_... \
TRIP_API_ORIGIN=https://hue-2026.onrender.com \
TRIP_API_TEST_GUEST_TOKEN=... \
TRIP_API_TEST_OTHER_GUEST_TOKEN=... \
TRIP_API_TEST_OWNED_CHAT_MESSAGE_ID=... \
TRIP_API_TEST_MEMBER_TOKEN=... \
TRIP_API_TEST_NON_HOST_TOKEN=... \
npm run test:security
```

`TRIP_API_TEST_OWNED_CHAT_MESSAGE_ID` phải là một tin nhắn chưa xóa, thuộc về
`TRIP_API_TEST_GUEST_TOKEN`; hai guest token phải là hai actor disposable khác
nhau. Test sẽ tạm tạo rồi gỡ reaction `🧪` của cả hai actor, đồng thời xác nhận
actor thứ hai không thể xóa tin của actor thứ nhất.

Also manually verify login with an old password (including a weak legacy bcrypt
hash), generic login errors, 5 failures per 15 minutes by IP+account, 30 per
hour by IP, logout, 12-hour expiry, password-change session revocation, guest
chat ownership, confession reactions, member-only reflections/game/photos,
expired photo links, and desktop/mobile UI. If the optional headers are later
configured, also verify that the CSP has no browser errors. Watch the private audit/rate-limit
tables for seven days after release; never export their raw session/token data.

## Rollback boundaries

Schema rollback is not a credential rollback. Restore data only from the new
encrypted backup and only through an owner-approved incident process. If phase
3 must be delayed, keep phase 1 protections in place and serve a maintenance
page rather than restoring public RPC/table grants.
