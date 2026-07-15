-- Run after loosen_host_game_controls.sql.
--
-- State flow:
--   idle/finished -> draft -> prepared (players may get ready) -> playing -> finished
-- A draft is host-only. It never exposes a track or role to players and is not
-- written to history. Randomizing or saving another draft stops any active
-- round, clears readiness, and persists the replacement immediately.

alter table public.imposter_music_room
  drop constraint if exists imposter_music_room_status_check;

alter table public.imposter_music_room
  add constraint imposter_music_room_status_check
  check (status in ('idle', 'draft', 'prepared', 'playing', 'finished'));

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
    delete from public.imposter_music_ready where round = v_room.round;
    select * into v_room from public.imposter_music_room where singleton;
  end if;

  -- Draft selections stay private to the host until the host opens the round.
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
    'ready', v_room.status in ('prepared', 'playing') and exists(select 1 from public.imposter_music_ready ready where ready.username = v_member.username and ready.round = v_room.round),
    'readyCount', case when v_room.status in ('prepared', 'playing') then (select count(*) from public.imposter_music_ready ready where ready.round = v_room.round) else 0 end,
    'playerCount', (select count(*) from public.trip_members member where member.role <> 'host'),
    'readyPlayers', case when v_is_host and v_room.status in ('prepared', 'playing') then coalesce((
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
    'hostRound', case when v_is_host and v_room.status in ('draft', 'prepared', 'playing') then jsonb_build_object('commonTrackId', v_room.common_track_id, 'imposterTrackId', v_room.imposter_track_id, 'imposterUsername', (select assignment.imposter_username from public.imposter_music_assignments assignment where assignment.round = v_room.round)) else null end,
    'history', case when v_is_host then coalesce((select jsonb_agg(jsonb_build_object('round', history.round, 'imposterUsername', history.imposter_username, 'commonTrack', history.common_track, 'imposterTrack', history.imposter_track, 'playDurationSeconds', history.play_duration_seconds, 'preparedBy', history.prepared_by, 'preparedAt', history.prepared_at, 'startsAt', history.starts_at, 'finishedAt', history.finished_at, 'finishedBy', history.finished_by, 'status', history.status, 'finishReason', history.finish_reason) order by history.round desc) from public.imposter_music_round_history history), '[]'::jsonb) else '[]'::jsonb end,
    'players', case when v_is_host then coalesce((select jsonb_agg(jsonb_build_object('username', member.username, 'displayName', member.display_name) order by member.created_at, member.username) from public.trip_members member where member.role <> 'host'), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

create or replace function public.imposter_music_save_draft(
  p_session_token text,
  p_common_track_id uuid,
  p_imposter_track_id uuid,
  p_imposter_username text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_room public.imposter_music_room%rowtype;
  v_next_round integer;
  v_duration integer;
begin
  select * into v_member from public.imposter_music_is_host(p_session_token);
  if p_common_track_id = p_imposter_track_id then raise exception 'Choose two different tracks'; end if;
  if not exists (select 1 from public.imposter_music_tracks where id = p_common_track_id)
     or not exists (select 1 from public.imposter_music_tracks where id = p_imposter_track_id) then
    raise exception 'Track not found';
  end if;
  if not exists (select 1 from public.trip_members where username = p_imposter_username and role <> 'host') then
    raise exception 'Imposter must be a player';
  end if;

  select * into v_room from public.imposter_music_room where singleton for update;
  if not found then raise exception 'Imposter music room is not initialized'; end if;
  if v_room.status = 'draft' then
    v_next_round := v_room.round;
  else
    if v_room.round >= 999 then raise exception 'Round limit reached'; end if;
    v_next_round := v_room.round + 1;
  end if;

  select least(common_track.duration_seconds, imposter_track.duration_seconds)
  into v_duration
  from public.imposter_music_tracks common_track
  join public.imposter_music_tracks imposter_track on imposter_track.id = p_imposter_track_id
  where common_track.id = p_common_track_id;

  -- A new draft deliberately stops the old round, but only an opened round is
  -- retained in history.
  if v_room.status in ('prepared', 'playing') then
    update public.imposter_music_round_history
    set status = 'finished', finished_at = now(), finished_by = v_member.username, finish_reason = 'manual'
    where round = v_room.round and status in ('prepared', 'playing');
  end if;
  delete from public.imposter_music_ready where round = v_room.round;

  update public.imposter_music_room
  set round = v_next_round,
      status = 'draft',
      common_track_id = p_common_track_id,
      imposter_track_id = p_imposter_track_id,
      play_duration_seconds = v_duration,
      starts_at = null,
      updated_at = now()
  where singleton;

  insert into public.imposter_music_assignments (round, imposter_username)
  values (v_next_round, p_imposter_username)
  on conflict (round) do update set imposter_username = excluded.imposter_username;

  return public.imposter_music_get_state(p_session_token);
end;
$$;

-- Keep older deployed clients safe: their old "prepare" call now creates a
-- private draft rather than revealing a role or creating history immediately.
create or replace function public.imposter_music_prepare_round(
  p_session_token text,
  p_common_track_id uuid,
  p_imposter_track_id uuid,
  p_imposter_username text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return public.imposter_music_save_draft(
    p_session_token,
    p_common_track_id,
    p_imposter_track_id,
    p_imposter_username
  );
end;
$$;

create or replace function public.imposter_music_randomize_round(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_common_track_id uuid;
  v_imposter_track_id uuid;
  v_imposter_username text;
begin
  perform public.imposter_music_is_host(p_session_token);
  select id into v_common_track_id from public.imposter_music_tracks order by random() limit 1;
  select id into v_imposter_track_id from public.imposter_music_tracks where id <> v_common_track_id order by random() limit 1;
  select username into v_imposter_username from public.trip_members where role <> 'host' order by random() limit 1;
  if v_common_track_id is null or v_imposter_track_id is null or v_imposter_username is null then
    raise exception 'Add at least two tracks and one player before randomizing';
  end if;
  return public.imposter_music_save_draft(
    p_session_token,
    v_common_track_id,
    v_imposter_track_id,
    v_imposter_username
  );
end;
$$;

create or replace function public.imposter_music_open_round(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_room public.imposter_music_room%rowtype;
  v_imposter_username text;
begin
  select * into v_member from public.imposter_music_is_host(p_session_token);
  select * into v_room from public.imposter_music_room where singleton and status = 'draft' for update;
  if not found then raise exception 'Save a draft before opening the round'; end if;
  select imposter_username into v_imposter_username
  from public.imposter_music_assignments where round = v_room.round;
  if v_room.common_track_id is null or v_room.imposter_track_id is null or v_imposter_username is null then
    raise exception 'Draft is incomplete';
  end if;
  if exists (select 1 from public.imposter_music_round_history where round = v_room.round) then
    raise exception 'This round is already in history';
  end if;

  insert into public.imposter_music_round_history (
    round, imposter_username, common_track, imposter_track, play_duration_seconds,
    prepared_by, prepared_at, status
  )
  select
    v_room.round,
    v_imposter_username,
    jsonb_build_object('id', common_track.id, 'youtubeUrl', common_track.youtube_url, 'label', common_track.label, 'startSeconds', common_track.start_seconds, 'durationSeconds', common_track.duration_seconds),
    jsonb_build_object('id', imposter_track.id, 'youtubeUrl', imposter_track.youtube_url, 'label', imposter_track.label, 'startSeconds', imposter_track.start_seconds, 'durationSeconds', imposter_track.duration_seconds),
    v_room.play_duration_seconds,
    v_member.username,
    now(),
    'prepared'
  from public.imposter_music_tracks common_track
  join public.imposter_music_tracks imposter_track on imposter_track.id = v_room.imposter_track_id
  where common_track.id = v_room.common_track_id;
  if not found then raise exception 'A selected track no longer exists'; end if;

  delete from public.imposter_music_ready where round = v_room.round;
  update public.imposter_music_room
  set status = 'prepared', starts_at = null, updated_at = now()
  where singleton and status = 'draft';
  return public.imposter_music_get_state(p_session_token);
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
  update public.imposter_music_room
  set status = 'playing', starts_at = now() + interval '5 seconds', updated_at = now()
  where singleton and status = 'prepared'
  returning round, starts_at into v_round, v_starts_at;
  if not found then raise exception 'Open a round before starting music'; end if;
  update public.imposter_music_round_history
  set status = 'playing', starts_at = v_starts_at
  where round = v_round and status = 'prepared';
  return public.imposter_music_get_state(p_session_token);
end;
$$;

create or replace function public.imposter_music_finish_round(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_round integer;
begin
  select * into v_member from public.imposter_music_is_host(p_session_token);
  update public.imposter_music_room
  set status = 'finished', starts_at = null, updated_at = now()
  where singleton and status in ('prepared', 'playing')
  returning round into v_round;
  if not found then raise exception 'There is no active round to stop'; end if;
  update public.imposter_music_round_history
  set status = 'finished', finished_at = now(), finished_by = v_member.username, finish_reason = 'manual'
  where round = v_round and status in ('prepared', 'playing');
  delete from public.imposter_music_ready where round = v_round;
  return public.imposter_music_get_state(p_session_token);
end;
$$;

create or replace function public.imposter_music_delete_track(p_session_token text, p_track_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.imposter_music_is_host(p_session_token);
  if exists (select 1 from public.imposter_music_room where singleton and status in ('draft', 'prepared', 'playing') and p_track_id in (common_track_id, imposter_track_id)) then
    raise exception 'Cannot delete a track selected for the current round';
  end if;
  delete from public.imposter_music_tracks where id = p_track_id;
  if not found then raise exception 'Track not found'; end if;
  return public.imposter_music_get_state(p_session_token);
end;
$$;

create or replace function public.imposter_music_update_track(p_session_token text, p_track_id uuid, p_youtube_url text, p_label text, p_start_seconds integer, p_duration_seconds integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.imposter_music_is_host(p_session_token);
  if exists (select 1 from public.imposter_music_room where singleton and status in ('draft', 'prepared', 'playing') and p_track_id in (common_track_id, imposter_track_id)) then
    raise exception 'Cannot edit a track selected for the current round';
  end if;
  update public.imposter_music_tracks
  set youtube_url = btrim(p_youtube_url),
      label = left(btrim(coalesce(p_label, '')), 100),
      start_seconds = greatest(0, least(coalesce(p_start_seconds, 0), 43200)),
      duration_seconds = greatest(5, least(coalesce(p_duration_seconds, 20), 180))
  where id = p_track_id;
  if not found then raise exception 'Track not found'; end if;
  return public.imposter_music_get_state(p_session_token);
end;
$$;

revoke all on function public.imposter_music_get_state(text), public.imposter_music_save_draft(text, uuid, uuid, text), public.imposter_music_prepare_round(text, uuid, uuid, text), public.imposter_music_randomize_round(text), public.imposter_music_open_round(text), public.imposter_music_start_round(text), public.imposter_music_finish_round(text), public.imposter_music_delete_track(text, uuid), public.imposter_music_update_track(text, uuid, text, text, integer, integer) from public;
grant execute on function public.imposter_music_get_state(text), public.imposter_music_save_draft(text, uuid, uuid, text), public.imposter_music_prepare_round(text, uuid, uuid, text), public.imposter_music_randomize_round(text), public.imposter_music_open_round(text), public.imposter_music_start_round(text), public.imposter_music_finish_round(text), public.imposter_music_delete_track(text, uuid), public.imposter_music_update_track(text, uuid, text, text, integer, integer) to anon;
