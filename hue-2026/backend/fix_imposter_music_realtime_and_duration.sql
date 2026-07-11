-- Apply this once on existing Supabase projects after
-- add_imposter_music_game.sql and fix_imposter_music_round_flow.sql.
-- It keeps ready counts live through the published room row and makes both
-- sides of a round use the shorter selected clip duration.

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
  if v_room.status in ('prepared', 'playing') then
    select least(common_track.duration_seconds, imposter_track.duration_seconds)
    into v_round_duration
    from public.imposter_music_tracks common_track
    join public.imposter_music_tracks imposter_track on imposter_track.id = v_room.imposter_track_id
    where common_track.id = v_room.common_track_id;
    select * into v_track from public.imposter_music_tracks
    where id = case when exists (select 1 from public.imposter_music_assignments a where a.round = v_room.round and a.imposter_username = v_member.username) then v_room.imposter_track_id else v_room.common_track_id end;
  end if;
  return jsonb_build_object(
    'authenticated', true,
    'serverNow', now(),
    'isHost', v_is_host,
    'viewer', jsonb_build_object('username', v_member.username, 'displayName', v_member.display_name),
    'room', jsonb_build_object('round', v_room.round, 'status', v_room.status, 'startsAt', v_room.starts_at),
    'myTrack', case when v_track.id is null then null else jsonb_build_object('id', v_track.id, 'youtubeUrl', v_track.youtube_url, 'startSeconds', v_track.start_seconds, 'durationSeconds', coalesce(v_round_duration, v_track.duration_seconds)) end,
    'roundDurationSeconds', v_round_duration,
    'ready', exists(select 1 from public.imposter_music_ready r where r.username = v_member.username and r.round = v_room.round),
    'readyCount', (select count(*) from public.imposter_music_ready r where r.round = v_room.round),
    'playerCount', (select count(*) from public.trip_members m where m.role <> 'host'),
    'tracks', case when v_is_host then coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'youtubeUrl', t.youtube_url, 'label', t.label, 'startSeconds', t.start_seconds, 'durationSeconds', t.duration_seconds) order by t.created_at desc) from public.imposter_music_tracks t), '[]'::jsonb) else '[]'::jsonb end,
    'hostRound', case when v_is_host then jsonb_build_object('commonTrackId', v_room.common_track_id, 'imposterTrackId', v_room.imposter_track_id, 'imposterUsername', (select a.imposter_username from public.imposter_music_assignments a where a.round = v_room.round)) else null end,
    'players', case when v_is_host then coalesce((select jsonb_agg(jsonb_build_object('username', m.username, 'displayName', m.display_name) order by m.created_at, m.username) from public.trip_members m where m.role <> 'host'), '[]'::jsonb) else '[]'::jsonb end
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
