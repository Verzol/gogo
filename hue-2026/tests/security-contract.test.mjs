import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("browser has no direct Supabase data, RPC, or Storage client", async () => {
  const [page, script, adapter] = await Promise.all([
    read("index.html"), read("script.js"), read("trip-api-client.js")
  ]);
  assert.doesNotMatch(page, /supabase-js@|unpkg\.com|fonts\.googleapis/);
  assert.doesNotMatch(script, /window\.supabase|client\.from\(|client\.storage\./);
  assert.match(adapter, /functions\/v1\/trip-api/);
  assert.match(adapter, /X-Trip-Session/);
  assert.match(adapter, /X-Trip-Guest/);
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

test("Edge API is pinned, allowlisted, and does not accept browser object paths for upload", async () => {
  const source = await read("supabase/functions/trip-api/index.ts");
  assert.match(source, /npm:@supabase\/supabase-js@2\.110\.8/);
  assert.match(source, /const mapGameAction/);
  assert.match(source, /photos\.upload/);
  assert.match(source, /crypto\.randomUUID\(\)/);
  assert.match(source, /createSignedUrl\(path, 300\)/);
  assert.doesNotMatch(source, /rpc\(action,/);
});
