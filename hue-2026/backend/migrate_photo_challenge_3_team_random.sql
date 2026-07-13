-- Run after fix_photo_challenge_flow.sql.
-- Keeps manual team editing unrestricted, while the Random button and pose draw
-- use the three-team flow required to distribute all five poses.

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
  v_game_key text := btrim(coalesce(p_game_key, ''));
  v_photo_team_count integer;
  v_changed boolean;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then
    raise exception 'Only host can save teams';
  end if;
  if char_length(v_game_key) not between 1 and 80 then raise exception 'Invalid game key'; end if;

  if v_game_key = 'anh-challenge-binh-minh' then
    select team_count into v_photo_team_count
    from public.photo_challenge_settings
    where game_key = v_game_key
    for update;
    if v_photo_team_count is null then raise exception 'Photo challenge is not configured'; end if;
    if v_photo_team_count <> 3 then raise exception 'Photo challenge uses 3 teams'; end if;
  end if;

  if (select count(*) from jsonb_array_elements(coalesce(p_assignments, '[]'::jsonb))) <>
     (select count(distinct btrim(assignment->>'username')) from jsonb_array_elements(coalesce(p_assignments, '[]'::jsonb)) assignment) then
    raise exception 'A player can only belong to one team';
  end if;

  for v_assignment in select * from jsonb_array_elements(coalesce(p_assignments, '[]'::jsonb))
  loop
    if btrim(coalesce(v_assignment->>'username', '')) = ''
       or coalesce((v_assignment->>'teamNumber')::integer, 0) not between 1 and 10 then
      raise exception 'Invalid team assignment';
    end if;
    if v_photo_team_count is not null and (v_assignment->>'teamNumber')::integer > v_photo_team_count then
      raise exception 'Photo challenge team number is out of range';
    end if;
    if not exists (
      select 1 from public.trip_members
      where username = btrim(v_assignment->>'username')
        and (role <> 'host' or v_game_key = 'anh-challenge-binh-minh')
    ) then raise exception 'Invalid team member'; end if;
  end loop;

  if v_photo_team_count is not null then
    select exists (
      (select username, team_number from public.trip_game_teams where game_key = v_game_key)
      except
      (select btrim(assignment->>'username'), (assignment->>'teamNumber')::integer
       from jsonb_array_elements(coalesce(p_assignments, '[]'::jsonb)) assignment)
    ) or exists (
      (select btrim(assignment->>'username'), (assignment->>'teamNumber')::integer
       from jsonb_array_elements(coalesce(p_assignments, '[]'::jsonb)) assignment)
      except
      (select username, team_number from public.trip_game_teams where game_key = v_game_key)
    ) into v_changed;

    if not v_changed then return public.trip_games_get_state(p_session_token); end if;
  end if;

  delete from public.trip_game_teams where game_key = v_game_key;
  for v_assignment in select * from jsonb_array_elements(coalesce(p_assignments, '[]'::jsonb))
  loop
    insert into public.trip_game_teams (game_key, username, team_number, updated_at)
    values (v_game_key, btrim(v_assignment->>'username'), (v_assignment->>'teamNumber')::integer, now());
  end loop;

  return public.trip_games_get_state(p_session_token);
end;
$$;

create or replace function public.photo_challenge_set_team_count(
  p_session_token text,
  p_team_count integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_current_count integer;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then raise exception 'Only host can configure teams'; end if;
  if p_team_count <> 3 then raise exception 'Photo challenge uses 3 teams so all 5 poses can be distributed'; end if;

  select team_count into v_current_count
  from public.photo_challenge_settings
  where game_key = 'anh-challenge-binh-minh'
  for update;
  if v_current_count is null then raise exception 'Photo challenge is not configured'; end if;
  if p_team_count = v_current_count then return public.photo_challenge_get_state(p_session_token); end if;

  update public.photo_challenge_settings
  set team_count = p_team_count, vote_status = 'draft', updated_at = now()
  where game_key = 'anh-challenge-binh-minh';
  delete from public.trip_game_teams
  where game_key = 'anh-challenge-binh-minh' and team_number > p_team_count;
  delete from public.photo_challenge_draws
  where game_key = 'anh-challenge-binh-minh';
  delete from public.photo_challenge_votes
  where game_key = 'anh-challenge-binh-minh';

  return public.photo_challenge_get_state(p_session_token);
end;
$$;

create or replace function public.photo_challenge_randomize_draws(
  p_session_token text,
  p_team_number integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_team_count integer;
  v_team_order integer[];
  v_pose_order integer[];
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then raise exception 'Only host can draw poses'; end if;

  select team_count into v_team_count
  from public.photo_challenge_settings
  where game_key = 'anh-challenge-binh-minh'
  for update;
  if v_team_count is null then raise exception 'Photo challenge is not configured'; end if;
  if v_team_count <> 3 then
    raise exception 'Photo challenge needs 3 teams to distribute all 5 poses with 2 photos per team';
  end if;
  if p_team_number is not null then
    raise exception 'Draw all teams together so the 5-pose distribution stays valid';
  end if;

  -- The last team receives the two remaining unused poses.
  select array_agg(team_number order by random()) into v_team_order
  from generate_series(1, 3) as teams(team_number);
  select array_agg(pose_number order by random()) into v_pose_order
  from generate_series(1, 5) as poses(pose_number);

  delete from public.photo_challenge_draws
  where game_key = 'anh-challenge-binh-minh';
  insert into public.photo_challenge_draws (game_key, team_number, pose_number)
  values
    ('anh-challenge-binh-minh', v_team_order[1], v_pose_order[1]),
    ('anh-challenge-binh-minh', v_team_order[1], v_pose_order[2]),
    ('anh-challenge-binh-minh', v_team_order[2], v_pose_order[3]),
    ('anh-challenge-binh-minh', v_team_order[2], v_pose_order[1]),
    ('anh-challenge-binh-minh', v_team_order[3], v_pose_order[4]),
    ('anh-challenge-binh-minh', v_team_order[3], v_pose_order[5]);

  delete from public.photo_challenge_votes where game_key = 'anh-challenge-binh-minh';
  update public.photo_challenge_settings
  set vote_status = 'draft', updated_at = now()
  where game_key = 'anh-challenge-binh-minh';
  return public.photo_challenge_get_state(p_session_token);
end;
$$;

revoke all on function public.trip_game_save_teams(text, text, jsonb), public.photo_challenge_set_team_count(text, integer), public.photo_challenge_randomize_draws(text, integer) from public;
grant execute on function public.trip_game_save_teams(text, text, jsonb), public.photo_challenge_set_team_count(text, integer), public.photo_challenge_randomize_draws(text, integer) to anon;
