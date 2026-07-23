import assert from "node:assert/strict";
import test from "node:test";

const url = process.env.TRIP_API_URL;
const key = process.env.TRIP_API_PUBLISHABLE_KEY;
const origin = process.env.TRIP_API_ORIGIN;
const guest = process.env.TRIP_API_TEST_GUEST_TOKEN;
const otherGuest = process.env.TRIP_API_TEST_OTHER_GUEST_TOKEN;
const member = process.env.TRIP_API_TEST_MEMBER_TOKEN;
const nonHost = process.env.TRIP_API_TEST_NON_HOST_TOKEN;
const ownedChatMessageId = process.env.TRIP_API_TEST_OWNED_CHAT_MESSAGE_ID;

const configured = Boolean(url && key && origin && guest && member && nonHost);
const ownershipConfigured = Boolean(url && key && origin && guest && otherGuest && ownedChatMessageId);
const call = async (action, payload = {}, headers = {}) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { apikey: key, origin, "content-type": "application/json", ...headers },
    body: JSON.stringify({ action, payload })
  });
  return { status: response.status, body: await response.json() };
};

test("guest cannot access member-only game, reflection, or photos", { skip: !configured }, async () => {
  for (const action of ["games.state", "reflections.get", "photos.list"]) {
    const result = await call(action, {}, { "X-Trip-Guest": guest });
    assert.equal(result.status, 401, action);
  }
});

test("non-host cannot change game state", { skip: !configured }, async () => {
  const result = await call("photo.setVoteStatus", { status: "open", reset: false }, { "X-Trip-Session": nonHost });
  assert.equal(result.status, 400);
  assert.doesNotMatch(JSON.stringify(result.body), /password_hash|session_hash|author_token/i);
});

test("a different guest cannot delete, edit, or react as the message owner", { skip: !ownershipConfigured }, async () => {
  const ownerHeaders = { "X-Trip-Guest": guest };
  const otherHeaders = { "X-Trip-Guest": otherGuest };
  const ownerState = await call("chat.list", {}, ownerHeaders);
  assert.equal(ownerState.status, 200);
  const ownerActor = ownerState.body.data?.viewerActorKey;
  const ownedMessage = ownerState.body.data?.messages?.find(message => message.id === ownedChatMessageId);
  assert.equal(ownedMessage?.user_id, ownerActor, "test message must belong to the first disposable guest");

  const rejectedDelete = await call("chat.delete", { messageId: ownedChatMessageId }, otherHeaders);
  assert.ok(rejectedDelete.status >= 400, "another guest cannot delete the owner's message");
  const rejectedEdit = await call("chat.update", { messageId: ownedChatMessageId, body: "forged" }, otherHeaders);
  assert.equal(rejectedEdit.status, 404, "the API has no client-edit action");

  // Both actors may react to a message, but each reaction remains separately
  // owned. Use disposable actors/message and remove both reactions afterward.
  const emoji = "🧪";
  try {
    assert.equal((await call("chat.toggleReaction", { messageId: ownedChatMessageId, emoji }, ownerHeaders)).status, 200);
    assert.equal((await call("chat.toggleReaction", { messageId: ownedChatMessageId, emoji }, otherHeaders)).status, 200);
    const reactions = await call("chat.list", {}, ownerHeaders);
    assert.equal(reactions.status, 200);
    const reactionActors = reactions.body.data?.reactions
      ?.filter(reaction => reaction.message_id === ownedChatMessageId && reaction.emoji === emoji)
      .map(reaction => reaction.user_id) || [];
    const otherState = await call("chat.list", {}, otherHeaders);
    assert.equal(otherState.status, 200);
    assert.ok(reactionActors.includes(ownerActor));
    assert.ok(reactionActors.includes(otherState.body.data?.viewerActorKey));
  } finally {
    await call("chat.toggleReaction", { messageId: ownedChatMessageId, emoji }, ownerHeaders);
    await call("chat.toggleReaction", { messageId: ownedChatMessageId, emoji }, otherHeaders);
  }
});

test("old PostgREST RPC endpoints are rejected", { skip: !url || !key }, async () => {
  const legacyUrl = new URL(url);
  legacyUrl.pathname = "/rest/v1/rpc/trip_login";
  legacyUrl.search = "";
  const response = await fetch(legacyUrl, {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ p_username: "nobody", p_password: "invalid" })
  });
  assert.ok(!response.ok, "legacy direct RPC must not be callable with a publishable key");
});

test("sanitized API responses do not expose database secrets", { skip: !configured }, async () => {
  const result = await call("games.state", {}, { "X-Trip-Session": member });
  assert.equal(result.status, 200);
  assert.doesNotMatch(JSON.stringify(result.body), /password_hash|session_hash|author_token|actor_token/i);
});
