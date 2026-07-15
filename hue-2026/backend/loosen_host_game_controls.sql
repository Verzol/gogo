-- Run after the latest Imposter music migrations.
-- Hosts can start a prepared music round regardless of ready count, while the
-- host state exposes exactly who has or has not granted playback permission.

create or replace function public.imposter_music_get_state(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_room public.imposter_music_room%rowtype;
  v_is_host boolean := false;
  v_track public.imposter_music_tracks%rowtype;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null then return jsonb_build_object('authenticated', false); end if;

  v_is_host := v_member.role = 'host';
  select * into v_room from public.imposter_music_room where singleton;
  if v_room.status = 'playing'
     and v_room.starts_at is not null
     and v_room.starts_at + make_interval(secs => v_room.play_duration_seconds) <= now() then
    update public.imposter_music_room
    set status = 'finished', starts_at = null, updated_at = now()
    where singleton and status = 'playing';
    update public.imposter_music_round_history
    set status = 'finished', finished_at = now(), finish_reason = 'automatic'
    where round = v_room.round and status = 'playing';
    select * into v_room from public.imposter_music_room where singleton;
  end if;

  if v_room.status in ('prepared', 'playing') then
    select * into v_track
    from public.imposter_music_tracks
    where id = case when exists (
      select 1 from public.imposter_music_assignments assignment
      where assignment.round = v_room.round
        and assignment.imposter_username = v_member.username
    ) then v_room.imposter_track_id else v_room.common_track_id end;
  end if;

  return jsonb_build_object(
    'authenticated', true,
    'serverNow', now(),
    'isHost', v_is_host,
    'viewer', jsonb_build_object('username', v_member.username, 'displayName', v_member.display_name),
    'room', jsonb_build_object('round', v_room.round, 'status', v_room.status, 'startsAt', v_room.starts_at, 'durationSeconds', v_room.play_duration_seconds),
    'myTrack', case when v_track.id is null then null else jsonb_build_object('id', v_track.id, 'youtubeUrl', v_track.youtube_url, 'startSeconds', v_track.start_seconds, 'durationSeconds', v_room.play_duration_seconds) end,
    'roundDurationSeconds', v_room.play_duration_seconds,
    'ready', exists(select 1 from public.imposter_music_ready ready where ready.username = v_member.username and ready.round = v_room.round),
    'readyCount', (select count(*) from public.imposter_music_ready ready where ready.round = v_room.round),
    'playerCount', (select count(*) from public.trip_members member where member.role <> 'host'),
    'readyPlayers', case when v_is_host then coalesce((
      select jsonb_agg(jsonb_build_object(
        'username', member.username,
        'displayName', member.display_name,
        'readyAt', ready.ready_at
      ) order by ready.ready_at, member.username)
      from public.imposter_music_ready ready
      join public.trip_members member on member.username = ready.username
      where ready.round = v_room.round
    ), '[]'::jsonb) else '[]'::jsonb end,
    'tracks', case when v_is_host then coalesce((select jsonb_agg(jsonb_build_object('id', track.id, 'youtubeUrl', track.youtube_url, 'label', track.label, 'startSeconds', track.start_seconds, 'durationSeconds', track.duration_seconds) order by track.created_at desc) from public.imposter_music_tracks track), '[]'::jsonb) else '[]'::jsonb end,
    'hostRound', case when v_is_host then jsonb_build_object('commonTrackId', v_room.common_track_id, 'imposterTrackId', v_room.imposter_track_id, 'imposterUsername', (select assignment.imposter_username from public.imposter_music_assignments assignment where assignment.round = v_room.round)) else null end,
    'history', case when v_is_host then coalesce((select jsonb_agg(jsonb_build_object('round', history.round, 'imposterUsername', history.imposter_username, 'commonTrack', history.common_track, 'imposterTrack', history.imposter_track, 'playDurationSeconds', history.play_duration_seconds, 'preparedBy', history.prepared_by, 'preparedAt', history.prepared_at, 'startsAt', history.starts_at, 'finishedAt', history.finished_at, 'finishedBy', history.finished_by, 'status', history.status, 'finishReason', history.finish_reason) order by history.round desc) from public.imposter_music_round_history history), '[]'::jsonb) else '[]'::jsonb end,
    'players', case when v_is_host then coalesce((select jsonb_agg(jsonb_build_object('username', member.username, 'displayName', member.display_name) order by member.created_at, member.username) from public.trip_members member where member.role <> 'host'), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

create or replace function public.imposter_music_start_round(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_round integer;
  v_starts_at timestamptz;
begin
  perform public.imposter_music_is_host(p_session_token);

  -- Ready status only reports browser playback permission; it never blocks host control.
  update public.imposter_music_room
  set status = 'playing', starts_at = now() + interval '5 seconds', updated_at = now()
  where singleton and status = 'prepared'
  returning round, starts_at into v_round, v_starts_at;
  if not found then raise exception 'Prepare a round before starting'; end if;

  update public.imposter_music_round_history
  set status = 'playing', starts_at = v_starts_at
  where round = v_round and status = 'prepared';
  return public.imposter_music_get_state(p_session_token);
end;
$$;

revoke all on function public.imposter_music_get_state(text), public.imposter_music_start_round(text) from public;
grant execute on function public.imposter_music_get_state(text), public.imposter_music_start_round(text) to anon;
