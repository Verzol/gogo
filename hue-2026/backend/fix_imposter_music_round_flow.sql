-- Apply this once on existing Supabase projects that already ran
-- add_imposter_music_game.sql. It replaces the affected RPCs only.

create or replace function public.imposter_music_prepare_round(p_session_token text, p_common_track_id uuid, p_imposter_track_id uuid, p_imposter_username text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_previous_round integer;
begin
  select * into v_member from public.imposter_music_is_host(p_session_token);
  if p_common_track_id = p_imposter_track_id then raise exception 'Choose two different tracks'; end if;
  if not exists (select 1 from public.imposter_music_tracks where id = p_common_track_id) or not exists (select 1 from public.imposter_music_tracks where id = p_imposter_track_id) then raise exception 'Track not found'; end if;
  if not exists (select 1 from public.trip_members where username = p_imposter_username and role <> 'host') then raise exception 'Imposter must be a player'; end if;

  -- Serialize preparations and never replace the choices while music is playing.
  select round into v_previous_round from public.imposter_music_room where singleton for update;
  if not found then raise exception 'Imposter music room is not initialized'; end if;
  if exists (select 1 from public.imposter_music_room where singleton and status = 'playing') then
    raise exception 'Finish the current round before preparing another one';
  end if;
  if v_previous_round >= 999 then raise exception 'Round limit reached'; end if;

  update public.imposter_music_room
  set round = v_previous_round + 1,
      status = 'prepared',
      common_track_id = p_common_track_id,
      imposter_track_id = p_imposter_track_id,
      starts_at = null,
      updated_at = now()
  where singleton;
  insert into public.imposter_music_assignments (round, imposter_username)
  select round, p_imposter_username from public.imposter_music_room where singleton
  on conflict (round) do update set imposter_username = excluded.imposter_username;

  delete from public.imposter_music_ready where round = v_previous_round;
  return public.imposter_music_get_state(p_session_token);
end;
$$;

create or replace function public.imposter_music_finish_round(p_session_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.imposter_music_is_host(p_session_token);
  update public.imposter_music_room
  set status = 'finished', starts_at = null, updated_at = now()
  where singleton and status = 'playing';
  if not found then raise exception 'Start a prepared round before finishing it'; end if;
  return public.imposter_music_get_state(p_session_token);
end;
$$;
