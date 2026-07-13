import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/heic", "heic"],
  ["image/heif", "heif"]
]);

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" }
});

const photoPathTeam = (gameKey: string, objectPath: string) => {
  const match = new RegExp(`^${gameKey}/team-([1-3])/[-a-zA-Z0-9_.]+$`).exec(objectPath);
  return match ? Number(match[1]) : 0;
};

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Missing Supabase function environment variables." }, 500);
    }

    const form = await request.formData();
    const sessionToken = String(form.get("sessionToken") || "");
    const gameKey = String(form.get("gameKey") || "");
    const action = String(form.get("action") || "upload");
    const objectPath = String(form.get("objectPath") || "");
    const slot = Number(form.get("slot") || 0);
    const file = form.get("file");
    if (gameKey !== "anh-challenge-binh-minh") return json({ error: "Invalid game." }, 400);
    if (!sessionToken) return json({ error: "Bạn cần đăng nhập." }, 401);
    if (!["upload", "replace", "delete"].includes(action)) return json({ error: "Thao tác ảnh không hợp lệ." }, 400);
    if (action !== "delete" && ![1, 2].includes(slot)) return json({ error: "Vị trí ảnh không hợp lệ." }, 400);
    if (action !== "delete" && !(file instanceof File)) return json({ error: "Thiếu file ảnh." }, 400);
    if (file instanceof File && !allowedTypes.has(file.type)) return json({ error: "Định dạng ảnh không được hỗ trợ." }, 400);
    if (file instanceof File && file.size > 10 * 1024 * 1024) return json({ error: "Ảnh vượt quá 10 MB." }, 400);

    const publicClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: state, error: stateError } = await publicClient.rpc("trip_games_get_state", {
      p_session_token: sessionToken
    });
    if (stateError || !state?.authenticated || !state?.viewer?.username) {
      return json({ error: "Phiên đăng nhập không hợp lệ." }, 401);
    }

    const username = String(state.viewer.username);
    const viewerRole = String(state.viewer.role || "");
    const assignment = (state.teams || []).find((team: Record<string, unknown>) =>
      String(team.gameKey || team.game_key || "") === gameKey && String(team.username || "") === username
    );
    const assignedTeam = Number(assignment?.teamNumber ?? assignment?.team_number ?? 0);
    const targetTeam = action === "upload" ? assignedTeam : photoPathTeam(gameKey, objectPath);
    if (!targetTeam) return json({ error: "Đường dẫn ảnh không hợp lệ." }, 400);
    if (viewerRole !== "host" && assignedTeam !== targetTeam) {
      return json({ error: "Bạn chỉ có thể quản lý ảnh của đội mình." }, 403);
    }

    const { data: photoState, error: photoStateError } = await publicClient.rpc("photo_challenge_get_state", {
      p_session_token: sessionToken
    });
    if (photoStateError || photoState?.voteStatus !== "draft") {
      return json({ error: "Album đã khóa khi vote bắt đầu. Hãy reset vote trước khi chỉnh ảnh." }, 409);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const notifyAlbumChanged = async () => {
      const { error } = await publicClient.rpc("photo_challenge_mark_album_changed", {
        p_session_token: sessionToken
      });
      if (error) console.warn("Could not publish Photo Challenge album update:", error.message);
    };

    if (action === "replace") {
      const folder = `${gameKey}/team-${targetTeam}`;
      const objectName = objectPath.slice(folder.length + 1);
      const { data: existingPhotos, error: listError } = await adminClient.storage
        .from("trip-game-photos")
        .list(folder, { limit: 100 });
      if (listError) return json({ error: listError.message }, 500);
      if (!(existingPhotos || []).some(item => item.name === objectName)) {
        return json({ error: "Ảnh cần thay không còn tồn tại." }, 404);
      }
      if (objectName.startsWith("slot-") && !objectName.startsWith(`slot-${slot}-`)) {
        return json({ error: "Vị trí ảnh không khớp." }, 400);
      }
    }

    if (action === "delete") {
      const { error: removeError } = await adminClient.storage.from("trip-game-photos").remove([objectPath]);
      if (removeError) return json({ error: removeError.message }, 500);
      await notifyAlbumChanged();
      return json({ ok: true, action, path: objectPath, teamNumber: targetTeam });
    }

    if (action === "upload") {
      const { data: existingPhotos, error: listError } = await adminClient.storage
        .from("trip-game-photos")
        .list(`${gameKey}/team-${targetTeam}`, { limit: 3 });
      if (listError) return json({ error: listError.message }, 500);
      const photoCount = (existingPhotos || []).filter(item => item.name && item.name !== ".emptyFolderPlaceholder").length;
      if (photoCount >= 2) return json({ error: "Mỗi đội chỉ được nộp tối đa 2 ảnh. Hãy thay hoặc xóa ảnh cũ." }, 409);
      if ((existingPhotos || []).some(item => item.name.startsWith(`slot-${slot}-`))) {
        return json({ error: "Vị trí này đã có ảnh. Hãy dùng nút sửa để thay ảnh." }, 409);
      }
    }

    const imageFile = file as File;
    const extension = allowedTypes.get(imageFile.type);
    const safeUsername = username.normalize("NFKD").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 32) || "player";
    const newObjectPath = `${gameKey}/team-${targetTeam}/slot-${slot}-${Date.now()}-${crypto.randomUUID()}-${safeUsername}.${extension}`;
    const { error: uploadError } = await adminClient.storage
      .from("trip-game-photos")
      .upload(newObjectPath, imageFile, { contentType: imageFile.type, upsert: false });
    if (uploadError) return json({ error: uploadError.message }, 500);

    if (action === "replace") {
      const { error: removeError } = await adminClient.storage.from("trip-game-photos").remove([objectPath]);
      if (removeError) {
        await adminClient.storage.from("trip-game-photos").remove([newObjectPath]);
        return json({ error: removeError.message }, 500);
      }
    }

    await notifyAlbumChanged();
    const { data: publicData } = adminClient.storage.from("trip-game-photos").getPublicUrl(newObjectPath);
    return json({ ok: true, action, teamNumber: targetTeam, path: newObjectPath, publicUrl: publicData.publicUrl });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected upload error." }, 500);
  }
});
