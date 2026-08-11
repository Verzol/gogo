import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../trip-api-client.js", import.meta.url), "utf8");
const config = { url: "https://example.supabase.co", anonKey: "publishable-key" };

const loadClient = ({ memberSession, guestSession, fetch }) => {
  const values = new Map();
  if (memberSession) values.set("hueAuthSession", JSON.stringify(memberSession));
  if (guestSession) values.set("hueGuestSession", JSON.stringify(guestSession));
  const sessionStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const window = {};
  vm.runInNewContext(source, { window, sessionStorage, fetch, FormData, JSON, String, Boolean, Promise });
  return { client: window.HUE_TRIP_API_CLIENT, values };
};

test("member chat sends with the member session without creating a guest", async () => {
  const calls = [];
  const { client } = loadClient({
    memberSession: { sessionToken: "member-token" },
    guestSession: { guestToken: "stale-guest-token", actorKey: "guest:stale" },
    fetch: async (_url, options) => {
      calls.push({ body: JSON.parse(options.body), headers: options.headers });
      return { ok: true, json: async () => ({ data: { id: "message-id" } }) };
    }
  });

  const result = await client.chatSend(config, { nickname: "san", body: "Xin chao" });

  assert.equal(result.error, null);
  assert.deepEqual(calls.map(call => call.body.action), ["chat.send"]);
  assert.equal(calls[0].headers["X-Trip-Session"], "member-token");
  assert.equal(calls[0].headers["X-Trip-Guest"], undefined);
});

test("guest setup failures are returned instead of rejecting chatSend", async () => {
  const calls = [];
  const { client } = loadClient({
    fetch: async (_url, options) => {
      calls.push(JSON.parse(options.body));
      return { ok: false, json: async () => ({ error: "Yêu cầu không thể hoàn tất." }) };
    }
  });

  const result = await client.chatSend(config, { nickname: "san", body: "Xin chao" });

  assert.equal(result.data, null);
  assert.equal(result.error.message, "Yêu cầu không thể hoàn tất.");
  assert.deepEqual(calls.map(call => call.action), ["guest.session"]);
});

test("guest chat stores the issued token before sending", async () => {
  const calls = [];
  const { client, values } = loadClient({
    fetch: async (_url, options) => {
      const body = JSON.parse(options.body);
      calls.push({ body, headers: options.headers });
      if (body.action === "guest.session") {
        return {
          ok: true,
          json: async () => ({ data: { guestToken: "guest-token", actorKey: "guest:actor", nickname: "Ban moi" } })
        };
      }
      return { ok: true, json: async () => ({ data: { id: "message-id" } }) };
    }
  });

  const result = await client.chatSend(config, { nickname: "Ban moi", body: "Xin chao" });

  assert.equal(result.error, null);
  assert.deepEqual(calls.map(call => call.body.action), ["guest.session", "chat.send"]);
  assert.equal(calls[1].headers["X-Trip-Guest"], "guest-token");
  assert.equal(JSON.parse(values.get("hueGuestSession")).actorKey, "guest:actor");
});
