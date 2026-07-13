-- Apply this once on existing Supabase projects after add_imposter_music_game.sql.
-- It supersedes the earlier Imposter fixes, adds durable round history, and
-- stops finished rounds on all devices as soon as they refresh room state.

alter table public.imposter_music_room
  add column if not exists play_duration_seconds integer not null default 20
  check (play_duration_seconds between 5 and 180);

update public.imposter_music_room room
set play_duration_seconds = least(common_track.duration_seconds, imposter_track.duration_seconds)
from public.imposter_music_tracks common_track,
     public.imposter_music_tracks imposter_track
where room.common_track_id = common_track.id
  and room.imposter_track_id = imposter_track.id;

create table if not exists public.imposter_music_round_history (
  round integer primary key check (round between 1 and 999),
  imposter_username text not null references public.trip_members(username) on delete restrict,
  common_track jsonb not null,
  imposter_track jsonb not null,
  play_duration_seconds integer not null check (play_duration_seconds between 5 and 180),
  prepared_by text not null references public.trip_members(username) on delete restrict,
  prepared_at timestamptz not null default now(),
  starts_at timestamptz,
  finished_at timestamptz,
  finished_by text references public.trip_members(username) on delete set null,
  status text not null default 'prepared' check (status in ('prepared', 'playing', 'finished', 'replaced')),
  finish_reason text check (finish_reason in ('manual', 'automatic', 'replaced'))
);

alter table public.imposter_music_round_history enable row level security;
revoke all on public.imposter_music_round_history from anon, authenticated;

create or replace function public.imposter_music_get_state(p_session_token text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
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
  if v_room.status = 'playing' and v_room.starts_at is not null and v_room.starts_at + make_interval(secs => v_room.play_duration_seconds) <= now() then
    update public.imposter_music_room set status = 'finished', starts_at = null, updated_at = now() where singleton and status = 'playing';
    update public.imposter_music_round_history set status = 'finished', finished_at = now(), finish_reason = 'automatic' where round = v_room.round and status = 'playing';
    select * into v_room from public.imposter_music_room where singleton;
  end if;
  if v_room.status in ('prepared', 'playing') then
    select * into v_track from public.imposter_music_tracks
    where id = case when exists (select 1 from public.imposter_music_assignments assignment where assignment.round = v_room.round and assignment.imposter_username = v_member.username) then v_room.imposter_track_id else v_room.common_track_id end;
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
    'tracks', case when v_is_host then coalesce((select jsonb_agg(jsonb_build_object('id', track.id, 'youtubeUrl', track.youtube_url, 'label', track.label, 'startSeconds', track.start_seconds, 'durationSeconds', track.duration_seconds) order by track.created_at desc) from public.imposter_music_tracks track), '[]'::jsonb) else '[]'::jsonb end,
    'hostRound', case when v_is_host then jsonb_build_object('commonTrackId', v_room.common_track_id, 'imposterTrackId', v_room.imposter_track_id, 'imposterUsername', (select assignment.imposter_username from public.imposter_music_assignments assignment where assignment.round = v_room.round)) else null end,
    'history', case when v_is_host then coalesce((select jsonb_agg(jsonb_build_object('round', history.round, 'imposterUsername', history.imposter_username, 'commonTrack', history.common_track, 'imposterTrack', history.imposter_track, 'playDurationSeconds', history.play_duration_seconds, 'preparedBy', history.prepared_by, 'preparedAt', history.prepared_at, 'startsAt', history.starts_at, 'finishedAt', history.finished_at, 'finishedBy', history.finished_by, 'status', history.status, 'finishReason', history.finish_reason) order by history.round desc) from public.imposter_music_round_history history), '[]'::jsonb) else '[]'::jsonb end,
    'players', case when v_is_host then coalesce((select jsonb_agg(jsonb_build_object('username', member.username, 'displayName', member.display_name) order by member.created_at, member.username) from public.trip_members member where member.role <> 'host'), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

create or replace function public.imposter_music_set_ready(p_session_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_member public.trip_members%rowtype; v_round integer;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role = 'host' then raise exception 'Only players can get ready'; end if;
  select round into v_round from public.imposter_music_room where singleton and status = 'prepared';
  if v_round is null then raise exception 'Host has not prepared a round'; end if;
  insert into public.imposter_music_ready (username, round, ready_at) values (v_member.username, v_round, now()) on conflict (username) do update set round = excluded.round, ready_at = excluded.ready_at;
  update public.imposter_music_room set updated_at = now() where singleton;
  return public.imposter_music_get_state(p_session_token);
end;
$$;

create or replace function public.imposter_music_prepare_round(p_session_token text, p_common_track_id uuid, p_imposter_track_id uuid, p_imposter_username text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_previous_round integer;
  v_previous_status text;
  v_play_duration integer;
begin
  select * into v_member from public.imposter_music_is_host(p_session_token);
  if p_common_track_id = p_imposter_track_id then raise exception 'Choose two different tracks'; end if;
  if not exists (select 1 from public.imposter_music_tracks where id = p_common_track_id) or not exists (select 1 from public.imposter_music_tracks where id = p_imposter_track_id) then raise exception 'Track not found'; end if;
  if not exists (select 1 from public.trip_members where username = p_imposter_username and role <> 'host') then raise exception 'Imposter must be a player'; end if;
  select round, status into v_previous_round, v_previous_status from public.imposter_music_room where singleton for update;
  if not found then raise exception 'Imposter music room is not initialized'; end if;
  if v_previous_status = 'playing' then raise exception 'Finish the current round before preparing another one'; end if;
  if v_previous_round >= 999 then raise exception 'Round limit reached'; end if;
  select least(common_track.duration_seconds, imposter_track.duration_seconds) into v_play_duration from public.imposter_music_tracks common_track join public.imposter_music_tracks imposter_track on imposter_track.id = p_imposter_track_id where common_track.id = p_common_track_id;
  if v_play_duration is null then raise exception 'Track not found'; end if;
  if v_previous_status = 'prepared' then update public.imposter_music_round_history set status = 'replaced', finished_at = now(), finished_by = v_member.username, finish_reason = 'replaced' where round = v_previous_round and status = 'prepared'; end if;
  update public.imposter_music_room set round = v_previous_round + 1, status = 'prepared', common_track_id = p_common_track_id, imposter_track_id = p_imposter_track_id, play_duration_seconds = v_play_duration, starts_at = null, updated_at = now() where singleton;
  insert into public.imposter_music_assignments (round, imposter_username) select round, p_imposter_username from public.imposter_music_room where singleton on conflict (round) do update set imposter_username = excluded.imposter_username;
  insert into public.imposter_music_round_history (round, imposter_username, common_track, imposter_track, play_duration_seconds, prepared_by, prepared_at, status)
  select v_previous_round + 1, p_imposter_username, jsonb_build_object('id', common_track.id, 'youtubeUrl', common_track.youtube_url, 'label', common_track.label, 'startSeconds', common_track.start_seconds, 'durationSeconds', common_track.duration_seconds), jsonb_build_object('id', imposter_track.id, 'youtubeUrl', imposter_track.youtube_url, 'label', imposter_track.label, 'startSeconds', imposter_track.start_seconds, 'durationSeconds', imposter_track.duration_seconds), v_play_duration, v_member.username, now(), 'prepared'
  from public.imposter_music_tracks common_track join public.imposter_music_tracks imposter_track on imposter_track.id = p_imposter_track_id where common_track.id = p_common_track_id;
  delete from public.imposter_music_ready where round = v_previous_round;
  return public.imposter_music_get_state(p_session_token);
end;
$$;

create or replace function public.imposter_music_start_round(p_session_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_round integer; v_starts_at timestamptz;
begin
  perform public.imposter_music_is_host(p_session_token);
  update public.imposter_music_room set status = 'playing', starts_at = now() + interval '5 seconds', updated_at = now() where singleton and status = 'prepared' returning round, starts_at into v_round, v_starts_at;
  if not found then raise exception 'Prepare a round before starting'; end if;
  update public.imposter_music_round_history set status = 'playing', starts_at = v_starts_at where round = v_round and status = 'prepared';
  return public.imposter_music_get_state(p_session_token);
end;
$$;

create or replace function public.imposter_music_finish_round(p_session_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_member public.trip_members%rowtype; v_round integer;
begin
  select * into v_member from public.imposter_music_is_host(p_session_token);
  update public.imposter_music_room set status = 'finished', starts_at = null, updated_at = now() where singleton and status = 'playing' returning round into v_round;
  if not found then raise exception 'Start a prepared round before finishing it'; end if;
  update public.imposter_music_round_history set status = 'finished', finished_at = now(), finished_by = v_member.username, finish_reason = 'manual' where round = v_round and status = 'playing';
  return public.imposter_music_get_state(p_session_token);
end;
$$;

create or replace function public.imposter_music_update_track(p_session_token text, p_track_id uuid, p_youtube_url text, p_label text, p_start_seconds integer, p_duration_seconds integer)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.imposter_music_is_host(p_session_token);
  if exists (select 1 from public.imposter_music_room where singleton and status in ('prepared', 'playing') and p_track_id in (common_track_id, imposter_track_id)) then
    raise exception 'Cannot edit a track used in the current round';
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

revoke all on function public.imposter_music_update_track(text, uuid, text, text, integer, integer) from public;
grant execute on function public.imposter_music_update_track(text, uuid, text, text, integer, integer) to anon;
