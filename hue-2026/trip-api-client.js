// Browser client for the service-only Supabase Edge API. It intentionally
// exposes a small RPC-compatible surface so the page never gets table/RPC
// credentials or sends member/guest tokens in a URL or JSON payload.
(() => {
  const memberSessionKey = "hueAuthSession";
  const guestSessionKey = "hueGuestSession";

  const read = (key, storage = sessionStorage) => {
    try { return JSON.parse(storage.getItem(key) || "null"); } catch { return null; }
  };
  const write = (key, value, storage = sessionStorage) => storage.setItem(key, JSON.stringify(value));
  const error = message => ({ message: message || "Không thể kết nối dịch vụ." });
  const configReady = config => Boolean(config?.url && config?.anonKey);
  const memberToken = () => String(read(memberSessionKey)?.sessionToken || "");
  const guest = () => read(guestSessionKey);

  const endpoint = config => `${String(config.url).replace(/\/$/, "")}/functions/v1/trip-api`;
  const request = async (config, action, payload = {}, options = {}) => {
    if (!configReady(config)) return { data: null, error: error("Chưa cấu hình dịch vụ.") };
    const headers = { apikey: config.anonKey };
    const session = memberToken();
    const guestToken = String(guest()?.guestToken || "");
    if (session) headers["X-Trip-Session"] = session;
    if (guestToken) headers["X-Trip-Guest"] = guestToken;
    let body;
    if (options.formData) {
      body = options.formData;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify({ action, payload });
    }
    try {
      const response = await fetch(endpoint(config), { method: "POST", headers, body, credentials: "omit" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return { data: null, error: error(result.error) };
      return { data: result.data, error: null };
    } catch {
      return { data: null, error: error("Không thể kết nối dịch vụ.") };
    }
  };

  const rememberGuest = result => {
    if (result?.guestToken && result?.actorKey) write(guestSessionKey, result);
    return result;
  };

  const ensureGuest = async (config, nickname = "") => {
    const saved = guest();
    if (saved?.guestToken && !nickname) return saved;
    const { data, error: requestError } = await request(config, "guest.session", { nickname });
    if (requestError) throw requestError;
    return rememberGuest(data);
  };

  const rpcAction = (name, args = {}) => {
    const map = {
      trip_login: ["auth.login", { username: args.p_username, password: args.p_password }],
      trip_validate_session: ["auth.session", {}],
      trip_logout: ["auth.logout", {}],
      trip_change_password: ["auth.changePassword", { currentPassword: args.p_current_password, newPassword: args.p_new_password }],
      trip_list_members: ["auth.members", {}],
      trip_confession_list: ["confession.list", {}],
      trip_confession_submit: ["confession.submit", { body: args.p_body }],
      trip_confession_toggle_reaction: ["confession.toggleReaction", { confessionId: args.p_confession_id, emoji: args.p_emoji }],
      trip_reflections_get: ["reflections.get", {}],
      trip_reflections_save: ["reflections.save", { body: args.p_body }],
      trip_games_get_public_state: ["games.publicState", {}],
      trip_games_get_state: ["games.state", {}],
      trip_game_save_teams: ["games.saveTeams", { gameKey: args.p_game_key, assignments: args.p_assignments }],
      trip_game_save_results: ["games.saveResults", { gameKey: args.p_game_key, results: args.p_results }],
      photo_challenge_get_state: ["photo.state", {}],
      photo_challenge_cast_vote: ["photo.castVote", { teamNumber: args.p_team_number }],
      photo_challenge_set_team_count: ["photo.setTeamCount", { teamCount: args.p_team_count }],
      photo_challenge_randomize_draws: ["photo.randomizeDraws", {}],
      photo_challenge_set_vote_status: ["photo.setVoteStatus", { status: args.p_status, reset: args.p_reset }],
      imposter_music_get_state: ["imposter.state", {}],
      imposter_music_set_ready: ["imposter.setReady", {}],
      imposter_music_start_round: ["imposter.startRound", {}],
      imposter_music_open_round: ["imposter.openRound", {}],
      imposter_music_finish_round: ["imposter.finishRound", {}],
      imposter_music_randomize_round: ["imposter.randomizeRound", {}],
      imposter_music_save_draft: ["imposter.saveDraft", {
        commonTrackId: args.p_common_track_id, imposterTrackId: args.p_imposter_track_id, imposterUsername: args.p_imposter_username
      }],
      imposter_music_add_track: ["imposter.addTrack", {
        youtubeUrl: args.p_youtube_url, label: args.p_label, startSeconds: args.p_start_seconds, durationSeconds: args.p_duration_seconds
      }],
      imposter_music_update_track: ["imposter.updateTrack", {
        trackId: args.p_track_id, youtubeUrl: args.p_youtube_url, label: args.p_label, startSeconds: args.p_start_seconds, durationSeconds: args.p_duration_seconds
      }],
      imposter_music_delete_track: ["imposter.deleteTrack", { trackId: args.p_track_id }],
      spy_game_get_state: ["spy.state", {}],
      spy_game_start_current: ["spy.start", { players: args.p_players }],
      spy_game_update_session: ["spy.updateSession", {
        status: args.p_status, round: args.p_round, tasksDone: args.p_tasks_done, winner: args.p_winner
      }],
      spy_game_update_player: ["spy.updatePlayer", { username: args.p_username, role: args.p_role, alive: args.p_alive }],
      spy_game_set_voting: ["spy.setVoting", { round: args.p_round, open: args.p_open }],
      spy_game_cast_votes: ["spy.castVotes", { targets: args.p_targets }],
      spy_game_upsert_mission: ["spy.upsertMission", {
        id: args.p_id, title: args.p_title, done: args.p_done, order: args.p_order, includeDone: args.p_include_done
      }],
      spy_game_delete_mission: ["spy.deleteMission", { id: args.p_id }],
      spy_game_set_mission_visibility: ["spy.setMissionVisibility", { id: args.p_id, visible: args.p_visible }]
    };
    return map[name] || null;
  };

  const createClient = config => ({
    async rpc(name, args = {}) {
      const mapped = rpcAction(name, args);
      if (!mapped) return { data: null, error: error("RPC không được phép.") };
      const [action, payload] = mapped;
      const result = await request(config, action, payload);
      if (!result.error && action === "auth.session" && result.data?.authenticated) {
        result.data.sessionToken = memberToken();
      }
      return result;
    },
    // Realtime table subscriptions were removed with the public table grants.
    // Existing sections use polling/API refresh, and this no-op preserves their
    // lifecycle cleanup without recreating a database channel.
    channel() {
      return { on() { return this; }, subscribe() { return this; }, unsubscribe() { return Promise.resolve(); } };
    }
  });

  const api = {
    createClient,
    memberSessionKey,
    guestSessionKey,
    getGuest: guest,
    async ensureGuest(config, nickname) { return ensureGuest(config, nickname); },
    async chatList(config) {
      await ensureGuest(config);
      return request(config, "chat.list");
    },
    async chatSend(config, payload) {
      await ensureGuest(config, payload.nickname || "");
      return request(config, "chat.send", payload);
    },
    async chatDelete(config, messageId) {
      await ensureGuest(config);
      return request(config, "chat.delete", { messageId });
    },
    async chatToggleReaction(config, messageId, emoji) {
      await ensureGuest(config);
      return request(config, "chat.toggleReaction", { messageId, emoji });
    },
    async listPhotos(config) { return request(config, "photos.list"); },
    async deletePhoto(config, path) { return request(config, "photos.delete", { path }); },
    async uploadPhoto(config, operation, details) {
      const form = new FormData();
      form.append("action", "photos.upload");
      form.append("operation", operation);
      form.append("slot", String(details.slot || 0));
      if (details.path) form.append("path", details.path);
      form.append("file", details.file);
      return request(config, "photos.upload", {}, { formData: form });
    }
  };

  window.HUE_TRIP_API_CLIENT = api;
})();
