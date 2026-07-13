-- Music control room for the "Who Is The Imposter?" game.
-- Run after add_game_hub.sql and add_trip_login.sql.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.imposter_music_tracks (
  id uuid primary key default gen_random_uuid(),
  youtube_url text not null check (char_length(btrim(youtube_url)) between 11 and 500),
  label text not null default '' check (char_length(label) <= 100),
  start_seconds integer not null default 0 check (start_seconds between 0 and 43200),
  duration_seconds integer not null default 20 check (duration_seconds between 5 and 180),
  created_by text not null references public.trip_members(username) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.imposter_music_room (
  singleton boolean primary key default true check (singleton),
  round integer not null default 0 check (round between 0 and 999),
  status text not null default 'idle' check (status in ('idle', 'prepared', 'playing', 'finished')),
  common_track_id uuid references public.imposter_music_tracks(id) on delete set null,
  imposter_track_id uuid references public.imposter_music_tracks(id) on delete set null,
  play_duration_seconds integer not null default 20 check (play_duration_seconds between 5 and 180),
  starts_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.imposter_music_room (singleton) values (true) on conflict (singleton) do nothing;

create table if not exists public.imposter_music_ready (
  username text primary key references public.trip_members(username) on delete cascade,
  round integer not null check (round between 0 and 999),
  ready_at timestamptz not null default now()
);

create table if not exists public.imposter_music_assignments (
  round integer primary key check (round between 0 and 999),
  imposter_username text not null references public.trip_members(username) on delete cascade
);

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

alter table public.imposter_music_tracks enable row level security;
alter table public.imposter_music_room enable row level security;
alter table public.imposter_music_ready enable row level security;
alter table public.imposter_music_assignments enable row level security;
alter table public.imposter_music_round_history enable row level security;
revoke all on public.imposter_music_tracks, public.imposter_music_room, public.imposter_music_ready, public.imposter_music_assignments, public.imposter_music_round_history from anon, authenticated;

-- Realtime publishes only the non-secret room timing. Tracks and assignments stay behind RPCs.
drop policy if exists "Imposter music room timing is visible" on public.imposter_music_room;
create policy "Imposter music room timing is visible" on public.imposter_music_room
  for select to anon, authenticated using (true);
grant select on public.imposter_music_room to anon, authenticated;

create or replace function public.imposter_music_is_host(p_session_token text)
returns public.trip_members
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_member public.trip_members%rowtype;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then
    raise exception 'Only host can control imposter music';
  end if;
  return v_member;
end;
$$;

create or replace function public.imposter_music_get_state(p_session_token text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_room public.imposter_music_room%rowtype;
  v_is_host boolean := false;
  v_track public.imposter_music_tracks%rowtype;
  v_round_duration integer;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null then return jsonb_build_object('authenticated', false); end if;
  v_is_host := v_member.role = 'host';
  select * into v_room from public.imposter_music_room where singleton;
  if v_room.status = 'playing' and v_room.starts_at is not null and v_room.starts_at + make_interval(secs => v_room.play_duration_seconds) <= now() then
    update public.imposter_music_room
    set status = 'finished', starts_at = null, updated_at = now()
    where singleton and status = 'playing';
    update public.imposter_music_round_history
    set status = 'finished', finished_at = now(), finish_reason = 'automatic'
    where round = v_room.round and status = 'playing';
    select * into v_room from public.imposter_music_room where singleton;
  end if;
  if v_room.status in ('prepared', 'playing') then
    select least(common_track.duration_seconds, imposter_track.duration_seconds)
    into v_round_duration
    from public.imposter_music_tracks common_track
    join public.imposter_music_tracks imposter_track on imposter_track.id = v_room.imposter_track_id
    where common_track.id = v_room.common_track_id;
    v_round_duration := coalesce(v_room.play_duration_seconds, v_round_duration);
    select * into v_track from public.imposter_music_tracks
    where id = case when exists (select 1 from public.imposter_music_assignments a where a.round = v_room.round and a.imposter_username = v_member.username) then v_room.imposter_track_id else v_room.common_track_id end;
  end if;
  return jsonb_build_object(
    'authenticated', true,
    'serverNow', now(),
    'isHost', v_is_host,
    'viewer', jsonb_build_object('username', v_member.username, 'displayName', v_member.display_name),
    'room', jsonb_build_object('round', v_room.round, 'status', v_room.status, 'startsAt', v_room.starts_at, 'durationSeconds', v_room.play_duration_seconds),
    'myTrack', case when v_track.id is null then null else jsonb_build_object('id', v_track.id, 'youtubeUrl', v_track.youtube_url, 'startSeconds', v_track.start_seconds, 'durationSeconds', coalesce(v_round_duration, v_track.duration_seconds)) end,
    'roundDurationSeconds', v_room.play_duration_seconds,
    'ready', exists(select 1 from public.imposter_music_ready r where r.username = v_member.username and r.round = v_room.round),
    'readyCount', (select count(*) from public.imposter_music_ready r where r.round = v_room.round),
    'playerCount', (select count(*) from public.trip_members m where m.role <> 'host'),
    'tracks', case when v_is_host then coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'youtubeUrl', t.youtube_url, 'label', t.label, 'startSeconds', t.start_seconds, 'durationSeconds', t.duration_seconds) order by t.created_at desc) from public.imposter_music_tracks t), '[]'::jsonb) else '[]'::jsonb end,
    'hostRound', case when v_is_host then jsonb_build_object('commonTrackId', v_room.common_track_id, 'imposterTrackId', v_room.imposter_track_id, 'imposterUsername', (select a.imposter_username from public.imposter_music_assignments a where a.round = v_room.round)) else null end,
    'history', case when v_is_host then coalesce((select jsonb_agg(jsonb_build_object('round', h.round, 'imposterUsername', h.imposter_username, 'commonTrack', h.common_track, 'imposterTrack', h.imposter_track, 'playDurationSeconds', h.play_duration_seconds, 'preparedBy', h.prepared_by, 'preparedAt', h.prepared_at, 'startsAt', h.starts_at, 'finishedAt', h.finished_at, 'finishedBy', h.finished_by, 'status', h.status, 'finishReason', h.finish_reason) order by h.round desc) from public.imposter_music_round_history h), '[]'::jsonb) else '[]'::jsonb end,
    'players', case when v_is_host then coalesce((select jsonb_agg(jsonb_build_object('username', m.username, 'displayName', m.display_name) order by m.created_at, m.username) from public.trip_members m where m.role <> 'host'), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

create or replace function public.imposter_music_add_track(p_session_token text, p_youtube_url text, p_label text, p_start_seconds integer, p_duration_seconds integer)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_member public.trip_members%rowtype;
begin
  select * into v_member from public.imposter_music_is_host(p_session_token);
  insert into public.imposter_music_tracks (youtube_url, label, start_seconds, duration_seconds, created_by)
  values (btrim(p_youtube_url), left(btrim(coalesce(p_label, '')), 100), greatest(0, least(coalesce(p_start_seconds, 0), 43200)), greatest(5, least(coalesce(p_duration_seconds, 20), 180)), v_member.username);
  return public.imposter_music_get_state(p_session_token);
end;
$$;

create or replace function public.imposter_music_delete_track(p_session_token text, p_track_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.imposter_music_is_host(p_session_token);
  if exists (select 1 from public.imposter_music_room where singleton and status in ('prepared', 'playing') and p_track_id in (common_track_id, imposter_track_id)) then
    raise exception 'Cannot delete a track used in the current round';
  end if;
  delete from public.imposter_music_tracks where id = p_track_id;
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
  -- Lock the singleton room so two host clicks cannot create overlapping rounds.
  select round, status into v_previous_round, v_previous_status from public.imposter_music_room where singleton for update;
  if not found then raise exception 'Imposter music room is not initialized'; end if;
  if exists (select 1 from public.imposter_music_room where singleton and status = 'playing') then
    raise exception 'Finish the current round before preparing another one';
  end if;
  if v_previous_round >= 999 then raise exception 'Round limit reached'; end if;
  select least(common_track.duration_seconds, imposter_track.duration_seconds)
  into v_play_duration
  from public.imposter_music_tracks common_track
  join public.imposter_music_tracks imposter_track on imposter_track.id = p_imposter_track_id
  where common_track.id = p_common_track_id;
  if v_play_duration is null then raise exception 'Track not found'; end if;

  if v_previous_status = 'prepared' then
    update public.imposter_music_round_history
    set status = 'replaced', finished_at = now(), finished_by = v_member.username, finish_reason = 'replaced'
    where round = v_previous_round and status = 'prepared';
  end if;

  update public.imposter_music_room
  set round = v_previous_round + 1,
      status = 'prepared',
      common_track_id = p_common_track_id,
      imposter_track_id = p_imposter_track_id,
      play_duration_seconds = v_play_duration,
      starts_at = null,
      updated_at = now()
  where singleton;
  insert into public.imposter_music_assignments (round, imposter_username)
  select round, p_imposter_username from public.imposter_music_room where singleton
  on conflict (round) do update set imposter_username = excluded.imposter_username;
  insert into public.imposter_music_round_history (round, imposter_username, common_track, imposter_track, play_duration_seconds, prepared_by, prepared_at, status)
  select
    v_previous_round + 1,
    p_imposter_username,
    jsonb_build_object('id', common_track.id, 'youtubeUrl', common_track.youtube_url, 'label', common_track.label, 'startSeconds', common_track.start_seconds, 'durationSeconds', common_track.duration_seconds),
    jsonb_build_object('id', imposter_track.id, 'youtubeUrl', imposter_track.youtube_url, 'label', imposter_track.label, 'startSeconds', imposter_track.start_seconds, 'durationSeconds', imposter_track.duration_seconds),
    v_play_duration,
    v_member.username,
    now(),
    'prepared'
  from public.imposter_music_tracks common_track
  join public.imposter_music_tracks imposter_track on imposter_track.id = p_imposter_track_id
  where common_track.id = p_common_track_id;
  -- Ready records belong to the just-finished round. A scoped delete also works
  -- with databases that reject an unqualified DELETE as a safety measure.
  delete from public.imposter_music_ready where round = v_previous_round;
  return public.imposter_music_get_state(p_session_token);
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
  -- The room is published to Realtime; touching it pushes the new ready count
  -- without exposing individual ready rows to other players.
  update public.imposter_music_room set updated_at = now() where singleton;
  return public.imposter_music_get_state(p_session_token);
end;
$$;

create or replace function public.imposter_music_start_round(p_session_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_round integer;
  v_starts_at timestamptz;
begin
  select * into v_member from public.imposter_music_is_host(p_session_token);
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

create or replace function public.imposter_music_finish_round(p_session_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_round integer;
begin
  select * into v_member from public.imposter_music_is_host(p_session_token);
  update public.imposter_music_room
  set status = 'finished', starts_at = null, updated_at = now()
  where singleton and status = 'playing'
  returning round into v_round;
  if not found then raise exception 'Start a prepared round before finishing it'; end if;
  update public.imposter_music_round_history
  set status = 'finished', finished_at = now(), finished_by = v_member.username, finish_reason = 'manual'
  where round = v_round and status = 'playing';
  return public.imposter_music_get_state(p_session_token);
end;
$$;

revoke all on function public.imposter_music_is_host(text), public.imposter_music_get_state(text), public.imposter_music_add_track(text, text, text, integer, integer), public.imposter_music_delete_track(text, uuid), public.imposter_music_update_track(text, uuid, text, text, integer, integer), public.imposter_music_prepare_round(text, uuid, uuid, text), public.imposter_music_set_ready(text), public.imposter_music_start_round(text), public.imposter_music_finish_round(text) from public;
grant execute on function public.imposter_music_get_state(text), public.imposter_music_add_track(text, text, text, integer, integer), public.imposter_music_delete_track(text, uuid), public.imposter_music_update_track(text, uuid, text, text, integer, integer), public.imposter_music_prepare_round(text, uuid, uuid, text), public.imposter_music_set_ready(text), public.imposter_music_start_round(text), public.imposter_music_finish_round(text) to anon;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'imposter_music_room') then
    alter publication supabase_realtime add table public.imposter_music_room;
  end if;
end $$;
