import { createClient } from "npm:@supabase/supabase-js@2.110.8";

type Json = Record<string, unknown>;

class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const photoGameKey = "anh-challenge-binh-minh";
const photoBucket = "trip-game-photos";
const maxPhotoBytes = 5 * 1024 * 1024;
const maxPhotoPixels = 40_000_000;
const validOrigins = () => new Set(
  (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
);

const originFor = (request: Request) => {
  const origin = request.headers.get("origin") || "";
  if (!origin || !validOrigins().has(origin)) throw new ApiError(403, "Origin không được phép.");
  return origin;
};

const headersFor = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "apikey, content-type, x-trip-session, x-trip-guest",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "Vary": "Origin"
});

const response = (origin: string, body: Json, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: headersFor(origin)
});

const cleanText = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const optionalText = (value: unknown, max: number) => {
  const text = cleanText(value, max);
  return text || null;
};
const integer = (value: unknown, fallback = 0) => Number.isSafeInteger(Number(value)) ? Number(value) : fallback;
const boolean = (value: unknown) => value === true;
const uuid = (value: unknown) => {
  const text = cleanText(value, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new ApiError(400, "Dữ liệu không hợp lệ.");
  }
  return text;
};
const objectPath = (value: unknown) => {
  const text = cleanText(value, 200);
  const match = new RegExp(`^${photoGameKey}/team-([1-3])/([a-z0-9-]+)\\.(jpg|png|webp)$`, "i").exec(text);
  if (!match) throw new ApiError(400, "Đường dẫn ảnh không hợp lệ.");
  return { path: text, teamNumber: Number(match[1]) };
};

const requestIp = (request: Request) => {
  // Cloudflare supplies this after the client request. If it is unavailable,
  // use the proxy-added final X-Forwarded-For hop rather than a spoofable
  // client-provided first value.
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) return cloudflareIp;
  const forwarded = request.headers.get("x-forwarded-for") || "";
  return forwarded.split(",").at(-1)?.trim() || "unknown";
};

const hmac = async (label: string, value: string) => {
  const secret = Deno.env.get("RATE_LIMIT_HMAC_SECRET");
  if (!secret) throw new ApiError(503, "Dịch vụ đăng nhập chưa sẵn sàng.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${label}:${value}`));
  return [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, "0")).join("");
};

const supabaseAdmin = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
  if (!url || !serviceKey) throw new ApiError(503, "Dịch vụ chưa được cấu hình.");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
};

const rpc = async (admin: ReturnType<typeof supabaseAdmin>, name: string, args: Json = {}) => {
  const { data, error } = await admin.rpc(name, args);
  if (error) throw new ApiError(400, "Yêu cầu không thể hoàn tất.");
  return data;
};

const sessionToken = (request: Request) => cleanText(request.headers.get("x-trip-session"), 256);
const guestToken = (request: Request) => cleanText(request.headers.get("x-trip-guest"), 256);

const requireSession = (request: Request) => {
  const token = sessionToken(request);
  if (!token) throw new ApiError(401, "Bạn cần đăng nhập.");
  return token;
};

const assertMember = async (admin: ReturnType<typeof supabaseAdmin>, token: string) => {
  const state = await rpc(admin, "trip_api_auth_session", { p_session_token: token }) as Json;
  if (!state.authenticated) throw new ApiError(401, "Phiên đăng nhập đã hết hạn.");
  return state;
};

const ensureGuest = async (
  admin: ReturnType<typeof supabaseAdmin>,
  request: Request,
  nickname?: unknown
) => {
  const token = guestToken(request);
  const result = await rpc(admin, "trip_api_guest_session", {
    p_guest_token: token || null,
    p_nickname: optionalText(nickname, 32)
  }) as Json;
  return result;
};

const stripSecrets = (value: unknown, allowToken = false): unknown => {
  if (Array.isArray(value)) return value.map(item => stripSecrets(item, allowToken));
  if (!value || typeof value !== "object") return value;
  const result: Json = {};
  for (const [key, item] of Object.entries(value as Json)) {
    const normalized = key.toLowerCase();
    const isIssuedBrowserToken = normalized === "sessiontoken" || normalized === "guesttoken";
    if (
      normalized.includes("password")
      || normalized.includes("hash")
      || normalized.includes("token")
    ) {
      if (!allowToken || !isIssuedBrowserToken) continue;
    }
    result[key] = stripSecrets(item, allowToken);
  }
  return result;
};

const mapGameAction = (action: string, payload: Json, token: string): { rpc: string; args: Json } => {
  const withSession = (rpcName: string, args: Json = {}) => ({ rpc: rpcName, args: { p_session_token: token, ...args } });
  switch (action) {
    case "games.publicState": return { rpc: "trip_games_get_public_state", args: {} };
    case "games.state": return withSession("trip_games_get_state");
    case "games.saveTeams": return withSession("trip_game_save_teams", {
      p_game_key: cleanText(payload.gameKey, 80),
      p_assignments: Array.isArray(payload.assignments) ? payload.assignments : []
    });
    case "games.saveResults": return withSession("trip_game_save_results", {
      p_game_key: cleanText(payload.gameKey, 80),
      p_results: Array.isArray(payload.results) ? payload.results : []
    });
    case "photo.state": return withSession("photo_challenge_get_state");
    case "photo.castVote": return withSession("photo_challenge_cast_vote", { p_team_number: integer(payload.teamNumber) });
    case "photo.setTeamCount": return withSession("photo_challenge_set_team_count", { p_team_count: integer(payload.teamCount) });
    case "photo.randomizeDraws": return withSession("photo_challenge_randomize_draws", { p_team_number: null });
    case "photo.setVoteStatus": return withSession("photo_challenge_set_vote_status", {
      p_status: cleanText(payload.status, 10), p_reset: boolean(payload.reset)
    });
    case "imposter.state": return withSession("imposter_music_get_state");
    case "imposter.setReady": return withSession("imposter_music_set_ready");
    case "imposter.startRound": return withSession("imposter_music_start_round");
    case "imposter.openRound": return withSession("imposter_music_open_round");
    case "imposter.finishRound": return withSession("imposter_music_finish_round");
    case "imposter.randomizeRound": return withSession("imposter_music_randomize_round");
    case "imposter.saveDraft": return withSession("imposter_music_save_draft", {
      p_common_track_id: uuid(payload.commonTrackId), p_imposter_track_id: uuid(payload.imposterTrackId),
      p_imposter_username: cleanText(payload.imposterUsername, 32)
    });
    case "imposter.addTrack": return withSession("imposter_music_add_track", {
      p_youtube_url: cleanText(payload.youtubeUrl, 300), p_label: cleanText(payload.label, 100),
      p_start_seconds: integer(payload.startSeconds), p_duration_seconds: integer(payload.durationSeconds, 20)
    });
    case "imposter.updateTrack": return withSession("imposter_music_update_track", {
      p_track_id: uuid(payload.trackId), p_youtube_url: cleanText(payload.youtubeUrl, 300),
      p_label: cleanText(payload.label, 100), p_start_seconds: integer(payload.startSeconds),
      p_duration_seconds: integer(payload.durationSeconds, 20)
    });
    case "imposter.deleteTrack": return withSession("imposter_music_delete_track", { p_track_id: uuid(payload.trackId) });
    case "spy.state": return withSession("spy_game_get_state");
    case "spy.start": return withSession("spy_game_start_current", { p_players: Array.isArray(payload.players) ? payload.players : [] });
    case "spy.updateSession": return withSession("spy_game_update_session", {
      p_status: cleanText(payload.status, 20), p_round: integer(payload.round),
      p_tasks_done: boolean(payload.tasksDone), p_winner: optionalText(payload.winner, 20)
    });
    case "spy.updatePlayer": return withSession("spy_game_update_player", {
      p_username: cleanText(payload.username, 32), p_role: cleanText(payload.role, 20), p_alive: boolean(payload.alive)
    });
    case "spy.setVoting": return withSession("spy_game_set_voting", { p_round: integer(payload.round), p_open: boolean(payload.open) });
    case "spy.castVotes": return withSession("spy_game_cast_votes", {
      p_targets: Array.isArray(payload.targets) ? payload.targets.map(target => cleanText(target, 32)).filter(Boolean) : []
    });
    case "spy.upsertMission": return withSession("spy_game_upsert_mission", {
      p_id: payload.id ? uuid(payload.id) : null, p_title: cleanText(payload.title, 180), p_done: boolean(payload.done),
      p_order: integer(payload.order), p_include_done: payload.includeDone !== false
    });
    case "spy.deleteMission": return withSession("spy_game_delete_mission", { p_id: uuid(payload.id) });
    case "spy.setMissionVisibility": return withSession("spy_game_set_mission_visibility", {
      p_id: uuid(payload.id), p_visible: boolean(payload.visible)
    });
    default: throw new ApiError(404, "Action không được hỗ trợ.");
  }
};

type ImageInfo = { mime: string; extension: string; width: number; height: number };
const u16be = (bytes: Uint8Array, offset: number) => (bytes[offset] << 8) | bytes[offset + 1];
const u32be = (bytes: Uint8Array, offset: number) => (
  (bytes[offset] * 0x1000000) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3]
);
const u16le = (bytes: Uint8Array, offset: number) => bytes[offset] | (bytes[offset + 1] << 8);
const u32le = (bytes: Uint8Array, offset: number) => (
  bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)
);
const ascii = (bytes: Uint8Array, start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));

const inspectImage = (bytes: Uint8Array): ImageInfo => {
  if (bytes.length >= 24 && bytes.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index])) {
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const length = u32be(bytes, offset);
      const chunk = ascii(bytes, offset + 4, offset + 8);
      if (chunk === "eXIf") throw new ApiError(400, "Ảnh phải được xóa metadata EXIF trước khi upload.");
      if (length < 0 || offset + 12 + length > bytes.length || chunk === "IEND") break;
      offset += 12 + length;
    }
    const width = u32be(bytes, 16);
    const height = u32be(bytes, 20);
    return { mime: "image/png", extension: "png", width, height };
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const chunkName = ascii(bytes, offset, offset + 4);
      const length = u32le(bytes, offset + 4);
      if (chunkName === "EXIF") throw new ApiError(400, "Ảnh phải được xóa metadata EXIF trước khi upload.");
      if (length < 0 || offset + 8 + length > bytes.length) break;
      offset += 8 + length + (length % 2);
    }
    const chunk = ascii(bytes, 12, 16);
    let width = 0;
    let height = 0;
    if (chunk === "VP8X" && bytes.length >= 30) {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (chunk === "VP8 " && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      width = u16le(bytes, 26) & 0x3fff;
      height = u16le(bytes, 28) & 0x3fff;
    } else if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
      const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
      width = (bits & 0x3fff) + 1;
      height = ((bits >> 14) & 0x3fff) + 1;
    }
    return { mime: "image/webp", extension: "webp", width, height };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      while (bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      const length = u16be(bytes, offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (marker === 0xe1 && ascii(bytes, offset + 2, Math.min(offset + 6, bytes.length)) === "Exif") {
        throw new ApiError(400, "Ảnh phải được xóa metadata EXIF trước khi upload.");
      }
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { mime: "image/jpeg", extension: "jpg", width: u16be(bytes, offset + 5), height: u16be(bytes, offset + 3) };
      }
      offset += length;
    }
  }
  throw new ApiError(400, "Chỉ nhận ảnh JPEG, PNG hoặc WebP hợp lệ.");
};

const validateImage = async (file: File) => {
  if (file.size < 32 || file.size > maxPhotoBytes) throw new ApiError(400, "Ảnh phải nhỏ hơn hoặc bằng 5 MiB.");
  const info = inspectImage(new Uint8Array(await file.arrayBuffer()));
  if (file.type !== info.mime || !info.width || !info.height || info.width > 10000 || info.height > 10000 || info.width * info.height > maxPhotoPixels) {
    throw new ApiError(400, "Metadata ảnh không hợp lệ.");
  }
  return info;
};

const photoAuthorization = async (admin: ReturnType<typeof supabaseAdmin>, token: string) => {
  const [member, games, photo] = await Promise.all([
    assertMember(admin, token),
    rpc(admin, "trip_games_get_state", { p_session_token: token }) as Promise<Json>,
    rpc(admin, "photo_challenge_get_state", { p_session_token: token }) as Promise<Json>
  ]);
  const username = cleanText(member.username, 32);
  const isHost = member.role === "host";
  const ownTeam = Array.isArray(games.teams)
    ? Number((games.teams as Json[]).find(team => team.gameKey === photoGameKey && team.username === username)?.teamNumber || 0)
    : 0;
  return { username, isHost, ownTeam, photo };
};

const photoList = async (admin: ReturnType<typeof supabaseAdmin>, token: string) => {
  await assertMember(admin, token);
  const state = await rpc(admin, "photo_challenge_get_state", { p_session_token: token }) as Json;
  const teamCount = Math.min(Math.max(integer(state.teamCount, 3), 1), 3);
  const photos: Json[] = [];
  for (let teamNumber = 1; teamNumber <= teamCount; teamNumber += 1) {
    const folder = `${photoGameKey}/team-${teamNumber}`;
    const { data: files, error } = await admin.storage.from(photoBucket).list(folder, { limit: 20, sortBy: { column: "created_at", order: "asc" } });
    if (error) throw new ApiError(400, "Không đọc được album ảnh.");
    for (const file of files || []) {
      if (!file.name || file.name === ".emptyFolderPlaceholder") continue;
      const path = `${folder}/${file.name}`;
      const { data, error: signError } = await admin.storage.from(photoBucket).createSignedUrl(path, 300);
      if (signError || !data?.signedUrl) throw new ApiError(400, "Không tạo được link ảnh.");
      photos.push({ name: file.name, path, teamNumber, createdAt: file.created_at || "", url: data.signedUrl });
    }
  }
  return { photos, expiresInSeconds: 300 };
};

const notifyPhotoChanged = async (admin: ReturnType<typeof supabaseAdmin>, token: string) => {
  await rpc(admin, "photo_challenge_mark_album_changed", { p_session_token: token });
};

const photoUpload = async (admin: ReturnType<typeof supabaseAdmin>, request: Request, form: FormData) => {
  const token = requireSession(request);
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Thiếu ảnh.");
  const info = await validateImage(file);
  const slot = integer(form.get("slot"));
  if (![1, 2].includes(slot)) throw new ApiError(400, "Vị trí ảnh không hợp lệ.");
  const operation = cleanText(form.get("operation"), 10) || "upload";
  if (operation !== "upload" && operation !== "replace") throw new ApiError(400, "Thao tác ảnh không hợp lệ.");
  const authorization = await photoAuthorization(admin, token);
  if (!authorization.isHost && !authorization.ownTeam) throw new ApiError(403, "Bạn không thuộc đội ảnh.");
  if (authorization.photo.voteStatus !== "draft") throw new ApiError(409, "Album đã khóa khi vote bắt đầu.");
  const old = operation === "replace" ? objectPath(form.get("path")) : null;
  const targetTeam = old?.teamNumber || authorization.ownTeam;
  if (!targetTeam || (!authorization.isHost && targetTeam !== authorization.ownTeam)) throw new ApiError(403, "Bạn chỉ quản lý ảnh đội mình.");
  if (old && !old.path.includes(`/slot-${slot}-`)) throw new ApiError(400, "Vị trí ảnh không khớp.");

  const folder = `${photoGameKey}/team-${targetTeam}`;
  const { data: existing, error: listError } = await admin.storage.from(photoBucket).list(folder, { limit: 20 });
  if (listError) throw new ApiError(400, "Không đọc được album ảnh.");
  const existingPhotos = (existing || []).filter(item => item.name && item.name !== ".emptyFolderPlaceholder");
  if (operation === "upload" && (existingPhotos.length >= 2 || existingPhotos.some(item => item.name.startsWith(`slot-${slot}-`)))) {
    throw new ApiError(409, "Vị trí ảnh này đã được dùng.");
  }
  if (old && !existingPhotos.some(item => `${folder}/${item.name}` === old.path)) throw new ApiError(404, "Ảnh cần thay không còn tồn tại.");

  const path = `${folder}/slot-${slot}-${crypto.randomUUID()}.${info.extension}`;
  const { error: uploadError } = await admin.storage.from(photoBucket).upload(path, file, {
    contentType: info.mime,
    cacheControl: "300",
    upsert: false
  });
  if (uploadError) throw new ApiError(400, "Không lưu được ảnh.");
  if (old) {
    const { error: removeError } = await admin.storage.from(photoBucket).remove([old.path]);
    if (removeError) {
      await admin.storage.from(photoBucket).remove([path]);
      throw new ApiError(400, "Không thay được ảnh cũ.");
    }
  }
  await notifyPhotoChanged(admin, token);
  return { ok: true, path, teamNumber: targetTeam };
};

const photoDelete = async (admin: ReturnType<typeof supabaseAdmin>, request: Request, payload: Json) => {
  const token = requireSession(request);
  const target = objectPath(payload.path);
  const authorization = await photoAuthorization(admin, token);
  if (!authorization.isHost && target.teamNumber !== authorization.ownTeam) throw new ApiError(403, "Bạn chỉ quản lý ảnh đội mình.");
  if (authorization.photo.voteStatus !== "draft") throw new ApiError(409, "Album đã khóa khi vote bắt đầu.");
  const { error } = await admin.storage.from(photoBucket).remove([target.path]);
  if (error) throw new ApiError(400, "Không xóa được ảnh.");
  await notifyPhotoChanged(admin, token);
  return { ok: true };
};

const handleJson = async (admin: ReturnType<typeof supabaseAdmin>, request: Request, action: string, payload: Json) => {
  if (action === "auth.members") return rpc(admin, "trip_list_members");
  if (action === "auth.session") return rpc(admin, "trip_api_auth_session", { p_session_token: requireSession(request) });
  if (action === "auth.logout") return rpc(admin, "trip_api_auth_logout", { p_session_token: requireSession(request) });
  if (action === "auth.changePassword") return rpc(admin, "trip_api_auth_change_password", {
    p_session_token: requireSession(request), p_current_password: String(payload.currentPassword || ""), p_new_password: String(payload.newPassword || "")
  });
  if (action === "guest.session") return ensureGuest(admin, request, payload.nickname);

  if (action === "auth.login") {
    const username = cleanText(payload.username, 32);
    const password = String(payload.password || "");
    const ip = requestIp(request);
    const [accountKey, ipKey] = await Promise.all([hmac("ip-account", `${ip}:${username.toLowerCase()}`), hmac("ip", ip)]);
    const result = await rpc(admin, "trip_api_auth_login", {
      p_username: username,
      p_password: password,
      p_account_key_hash: accountKey,
      p_ip_key_hash: ipKey
    }) as Json;
    if (!result.authenticated) {
      if (result.throttled) throw new ApiError(429, "Bạn thử lại sau ít phút nhé.");
      throw new ApiError(401, "Đăng nhập không thành công.");
    }
    return result;
  }

  if (action === "chat.list") return rpc(admin, "trip_api_chat_list", {
    p_session_token: sessionToken(request) || null, p_guest_token: guestToken(request) || null
  });
  if (action === "chat.send") {
    let guest = null;
    if (!sessionToken(request)) guest = await ensureGuest(admin, request, payload.nickname);
    return rpc(admin, "trip_api_chat_send", {
      p_session_token: sessionToken(request) || null,
      p_guest_token: (guest?.guestToken || guestToken(request)) || null,
      p_nickname: optionalText(payload.nickname, 32),
      p_body: cleanText(payload.body, 500),
      p_reply_to_id: payload.replyToId ? uuid(payload.replyToId) : null
    });
  }
  if (action === "chat.delete") return rpc(admin, "trip_api_chat_delete", {
    p_session_token: sessionToken(request) || null, p_guest_token: guestToken(request) || null, p_message_id: uuid(payload.messageId)
  });
  if (action === "chat.toggleReaction") return rpc(admin, "trip_api_chat_toggle_reaction", {
    p_session_token: sessionToken(request) || null, p_guest_token: guestToken(request) || null,
    p_message_id: uuid(payload.messageId), p_emoji: cleanText(payload.emoji, 16)
  });

  if (action === "confession.list") return rpc(admin, "trip_confession_list");
  if (action === "confession.submit") {
    const guest = await ensureGuest(admin, request);
    const actorId = String(guest.actorKey || "").replace(/^guest:/, "");
    return rpc(admin, "trip_confession_submit", { p_author_token: uuid(actorId), p_body: cleanText(payload.body, 800) });
  }
  if (action === "confession.toggleReaction") return rpc(admin, "trip_confession_toggle_reaction", {
    p_session_token: requireSession(request), p_confession_id: integer(payload.confessionId), p_emoji: cleanText(payload.emoji, 16)
  });
  if (action === "reflections.get") return rpc(admin, "trip_reflections_get", { p_session_token: requireSession(request) });
  if (action === "reflections.save") return rpc(admin, "trip_reflections_save", {
    p_session_token: requireSession(request), p_body: cleanText(payload.body, 2000)
  });
  if (action === "photos.list") return photoList(admin, requireSession(request));
  if (action === "photos.delete") return photoDelete(admin, request, payload);

  const mapped = mapGameAction(action, payload, action === "games.publicState" ? "" : requireSession(request));
  return rpc(admin, mapped.rpc, mapped.args);
};

Deno.serve(async request => {
  let origin = "";
  try {
    origin = originFor(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headersFor(origin) });
    if (request.method !== "POST") throw new ApiError(405, "Method không được hỗ trợ.");
    const admin = supabaseAdmin();
    const contentType = request.headers.get("content-type") || "";
    if (contentType.startsWith("multipart/form-data")) {
      const form = await request.formData();
      if (cleanText(form.get("action"), 40) !== "photos.upload") throw new ApiError(404, "Action không được hỗ trợ.");
      const data = await photoUpload(admin, request, form);
      return response(origin, { data: stripSecrets(data) as Json });
    }
    const body = await request.json().catch(() => null) as Json | null;
    const action = cleanText(body?.action, 80);
    const payload = body?.payload && typeof body.payload === "object" && !Array.isArray(body.payload) ? body.payload as Json : {};
    if (!action) throw new ApiError(400, "Thiếu action.");
    const data = await handleJson(admin, request, action, payload);
    const tokenAction = action === "auth.login" || action === "auth.changePassword" || action === "guest.session";
    return response(origin, { data: stripSecrets(data, tokenAction) as Json });
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError(500, "Có lỗi xảy ra. Hãy thử lại.");
    // Never log payloads: they can contain a password or opaque session token.
    if (!origin) {
      return new Response(JSON.stringify({ error: apiError.message }), {
        status: apiError.status,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Vary": "Origin" }
      });
    }
    return response(origin, { error: apiError.message }, apiError.status);
  }
});
