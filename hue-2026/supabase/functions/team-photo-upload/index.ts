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
    const file = form.get("file");
    if (gameKey !== "anh-challenge-binh-minh") return json({ error: "Invalid game." }, 400);
    if (!sessionToken) return json({ error: "Bạn cần đăng nhập." }, 401);
    if (!(file instanceof File)) return json({ error: "Thiếu file ảnh." }, 400);
    if (!allowedTypes.has(file.type)) return json({ error: "Định dạng ảnh không được hỗ trợ." }, 400);
    if (file.size > 10 * 1024 * 1024) return json({ error: "Ảnh vượt quá 10 MB." }, 400);

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
    const assignment = (state.teams || []).find((team: Record<string, unknown>) =>
      String(team.gameKey || team.game_key || "") === gameKey && String(team.username || "") === username
    );
    const teamNumber = Number(assignment?.teamNumber ?? assignment?.team_number ?? 0);
    if (!teamNumber) return json({ error: "Bạn chưa được chia vào đội của game này." }, 403);

    const extension = allowedTypes.get(file.type);
    const safeUsername = username.normalize("NFKD").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 32) || "player";
    const objectPath = `${gameKey}/team-${teamNumber}/${Date.now()}-${crypto.randomUUID()}-${safeUsername}.${extension}`;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { error: uploadError } = await adminClient.storage
      .from("trip-game-photos")
      .upload(objectPath, file, { contentType: file.type, upsert: false });
    if (uploadError) return json({ error: uploadError.message }, 500);

    const { data: publicData } = adminClient.storage.from("trip-game-photos").getPublicUrl(objectPath);
    return json({ ok: true, teamNumber, path: objectPath, publicUrl: publicData.publicUrl });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected upload error." }, 500);
  }
});
