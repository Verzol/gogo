-- Hosts are managers in every game except the photo challenge, where they also play.

create or replace function public.trip_game_save_teams(
  p_session_token text,
  p_game_key text,
  p_assignments jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_assignment jsonb;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then
    raise exception 'Only host can save teams';
  end if;
  if char_length(btrim(coalesce(p_game_key, ''))) not between 1 and 80 then
    raise exception 'Invalid game key';
  end if;

  delete from public.trip_game_teams where game_key = btrim(p_game_key);
  for v_assignment in select * from jsonb_array_elements(coalesce(p_assignments, '[]'::jsonb))
  loop
    if exists (
      select 1
      from public.trip_members
      where username = v_assignment->>'username'
        and (role <> 'host' or p_game_key = 'anh-challenge-binh-minh')
    ) then
      insert into public.trip_game_teams (game_key, username, team_number, updated_at)
      values (
        btrim(p_game_key),
        v_assignment->>'username',
        (v_assignment->>'teamNumber')::integer,
        now()
      );
    end if;
  end loop;

  return public.trip_games_get_state(p_session_token);
end;
$$;

create or replace function public.trip_game_save_results(
  p_session_token text,
  p_game_key text,
  p_results jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_result jsonb;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then
    raise exception 'Only host can save results';
  end if;

  for v_result in select * from jsonb_array_elements(coalesce(p_results, '[]'::jsonb))
  loop
    if exists (
      select 1
      from public.trip_members
      where username = btrim(v_result->>'username')
        and (role <> 'host' or p_game_key = 'anh-challenge-binh-minh')
    ) then
      insert into public.trip_game_results (game_key, username, points, note, updated_by, updated_at)
      values (
        btrim(p_game_key),
        btrim(v_result->>'username'),
        greatest(0, least(coalesce((v_result->>'points')::integer, 0), 100)),
        left(btrim(coalesce(v_result->>'note', '')), 180),
        v_member.username,
        now()
      )
      on conflict (game_key, username) do update
      set points = excluded.points,
          note = excluded.note,
          updated_by = excluded.updated_by,
          updated_at = now();
    end if;
  end loop;

  return public.trip_games_get_state(p_session_token);
end;
$$;

create or replace function public.photo_challenge_cast_vote(
  p_session_token text,
  p_team_number integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_settings public.photo_challenge_settings%rowtype;
  v_my_team integer;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null then raise exception 'Not authenticated'; end if;

  select * into v_settings from public.photo_challenge_settings
  where game_key = 'anh-challenge-binh-minh';
  if v_settings.vote_status <> 'open' then raise exception 'Voting is not open'; end if;
  if p_team_number not between 1 and v_settings.team_count then raise exception 'Invalid team'; end if;

  select team_number into v_my_team
  from public.trip_game_teams
  where game_key = 'anh-challenge-binh-minh'
    and username = v_member.username;
  if v_my_team is null then raise exception 'You are not assigned to a team'; end if;

  insert into public.photo_challenge_votes (game_key, voter_username, team_number, updated_at)
  values ('anh-challenge-binh-minh', v_member.username, p_team_number, now())
  on conflict (game_key, voter_username) do update
  set team_number = excluded.team_number,
      updated_at = now();

  return public.photo_challenge_get_state(p_session_token);
end;
$$;

revoke all on function public.trip_game_save_teams(text, text, jsonb) from public;
revoke all on function public.trip_game_save_results(text, text, jsonb) from public;
revoke all on function public.photo_challenge_cast_vote(text, integer) from public;

grant execute on function public.trip_game_save_teams(text, text, jsonb) to anon;
grant execute on function public.trip_game_save_results(text, text, jsonb) to anon;
grant execute on function public.photo_challenge_cast_vote(text, integer) to anon;
