import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("browser uses a local pinned Realtime client but keeps data writes and RPCs behind Edge", async () => {
  const [page, script, adapter] = await Promise.all([
    read("index.html"), read("script.js"), read("trip-api-client.js")
  ]);
  assert.match(page, /vendor\/supabase-2\.110\.8\.js/);
  assert.doesNotMatch(page, /unpkg\.com|fonts\.googleapis/);
  assert.doesNotMatch(script, /window\.supabase|client\.from\(|client\.storage\./);
  assert.match(adapter, /functions\/v1\/trip-api/);
  assert.match(adapter, /X-Trip-Session/);
  assert.match(adapter, /X-Trip-Guest/);
  assert.doesNotMatch(adapter, /\.from\(|\.storage\.|window\.supabase\.rpc/);
});

test("photo album link is unavailable until a member session is validated", async () => {
  const [page, script] = await Promise.all([read("index.html"), read("script.js")]);
  assert.match(page, /id="photoAlbumLink"[^>]*data-href="https:\/\/drive\.google\.com\/[^>]*hidden/);
  assert.doesNotMatch(page, /id="photoAlbumLink"[^>]*\shref=/);
  assert.match(script, /let authSessionValidated = false/);
  assert.match(script, /const loggedIn = Boolean\(authSessionValidated && authMember\?\.sessionToken && authMember\?\.displayName\)/);
  assert.match(script, /photoAlbumLink\.hidden = !loggedIn/);
  assert.match(script, /else photoAlbumLink\.removeAttribute\("href"\)/);
});

test("lockdown leaves no anon/authenticated grants in the new migrations", async () => {
  const migrations = await Promise.all([
    read("backend/01_emergency_revoke.sql"),
    read("backend/02_security_prepare.sql"),
    read("backend/03_security_lockdown.sql")
  ]);
  const joined = migrations.join("\n");
  assert.match(joined, /revoke execute on all functions in schema public from public, anon, authenticated/i);
  assert.match(joined, /delete from public\.trip_sessions/i);
  assert.doesNotMatch(joined, /grant\s+(all|execute).*\bto\s+(anon|authenticated)\b/i);
});

test("guest session helper qualifies table columns that collide with OUT fields", async () => {
  const source = await read("backend/02_security_prepare.sql");
  assert.match(source, /delete from private\.guest_sessions as guest_session\s+where guest_session\.expires_at/i);
  assert.match(source, /guest_session\.token_hash = extensions\.digest/i);
  assert.match(source, /guest_session\.expires_at > now\(\)/i);
});

test("Realtime restoration is read-only and explicit about its public-data trade-off", async () => {
  const source = await read("backend/05_restore_realtime_tradeoff.sql");
  assert.match(source, /grant select on table public/i);
  assert.match(source, /revoke insert, update, delete/i);
  assert.match(source, /alter publication supabase_realtime add table/i);
  assert.doesNotMatch(source, /grant\s+(all|insert|update|delete)\s+on table.*\bto\s+(anon|authenticated)\b/i);
});

test("Edge API is pinned, allowlisted, and does not accept browser object paths for upload", async () => {
  const source = await read("supabase/functions/trip-api/index.ts");
  assert.match(source, /npm:@supabase\/supabase-js@2\.110\.8/);
  assert.match(source, /const mapGameAction/);
  assert.match(source, /photos\.upload/);
  assert.match(source, /crypto\.randomUUID\(\)/);
  assert.match(source, /createSignedUrl\(path, 300\)/);
  assert.doesNotMatch(source, /rpc\(action,/);
});

test("reflection submissions are never silently truncated by the Edge API", async () => {
  const source = await read("supabase/functions/trip-api/index.ts");
  const saveAction = source.match(/if \(action === "reflections\.save"\) return rpc\(admin, "trip_reflections_save", \{([\s\S]*?)\n  \}\);/);
  assert.ok(saveAction, "reflection save action must exist");
  assert.match(saveAction[1], /p_body:\s*cleanText\(payload\.body\)/);
  assert.doesNotMatch(saveAction[1], /p_body:\s*cleanText\(payload\.body,\s*\d+\)/);
});

test("reflection reads and saves require a member session", async () => {
  const source = await read("supabase/functions/trip-api/index.ts");
  assert.match(source, /if \(action === "reflections\.get"\) return rpc\(admin, "trip_reflections_get", \{ p_session_token: requireSession\(request\) \}\)/);
  assert.match(source, /if \(action === "reflections\.save"\)[\s\S]*?p_session_token: requireSession\(request\)/);
});

test("reflection RPC hides entries from callers without a member session", async () => {
  const [securityPrepare, migration] = await Promise.all([
    read("backend/02_security_prepare.sql"),
    read("backend/make_reflections_member_only.sql")
  ]);
  for (const source of [securityPrepare, migration]) {
    assert.match(source, /if not found then\s+return jsonb_build_object\([\s\S]*?'reflections', '\[\]'::jsonb[\s\S]*?\);/);
    assert.doesNotMatch(source, /'authenticated', v_is_authenticated/);
  }
});

test("long reflection migration keeps only the non-empty-body check", async () => {
  const source = await read("backend/fix_reflection_long_submissions.sql");
  assert.match(source, /drop constraint if exists trip_reflections_body_len/);
  assert.match(source, /check \(char_length\(btrim\(body\)\) >= 1\)/);
  assert.match(source, /if char_length\(v_body\) < 1 then raise exception/);
  assert.doesNotMatch(source, /2000|between 1 and/);
});
