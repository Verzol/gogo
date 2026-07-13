-- Apply after the existing Photo Challenge and game-hub migrations.
-- It exposes live vote details to authenticated trip members and prevents a
-- vote from opening until every team has submitted its two challenge photos.

create or replace function public.photo_challenge_get_state(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_public jsonb;
  v_team integer;
  v_vote integer;
  v_tallies jsonb;
begin
  v_public := public.photo_challenge_public_state();
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null then
    return v_public || jsonb_build_object('authenticated', false);
  end if;

  select team_number into v_team
  from public.trip_game_teams
  where game_key = 'anh-challenge-binh-minh'
    and username = v_member.username;

  select team_number into v_vote
  from public.photo_challenge_votes
  where game_key = 'anh-challenge-binh-minh'
    and voter_username = v_member.username;

  -- Authenticated players and hosts see the live tally and voter list.
  select coalesce(jsonb_agg(jsonb_build_object(
    'teamNumber', series.team_number,
    'voteCount', coalesce(votes.vote_count, 0),
    'voters', coalesce(votes.voters, '[]'::jsonb)
  ) order by series.team_number), '[]'::jsonb)
  into v_tallies
  from generate_series(1, (v_public->>'teamCount')::integer) as series(team_number)
  left join (
    select team_number,
           count(*)::integer as vote_count,
           jsonb_agg(voter_username order by voter_username) as voters
    from public.photo_challenge_votes
    where game_key = 'anh-challenge-binh-minh'
    group by team_number
  ) votes on votes.team_number = series.team_number;

  return v_public || jsonb_build_object(
    'authenticated', true,
    'viewer', jsonb_build_object('username', v_member.username, 'role', v_member.role),
    'myTeam', coalesce(v_team, 0),
    'myVote', coalesce(v_vote, 0),
    'voteTallies', v_tallies
  );
end;
$$;

create or replace function public.photo_challenge_set_vote_status(
  p_session_token text,
  p_status text,
  p_reset boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_team_count integer;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then
    raise exception 'Only host can control voting';
  end if;
  if p_status not in ('draft', 'open', 'closed') then raise exception 'Invalid vote status'; end if;

  select team_count into v_team_count
  from public.photo_challenge_settings
  where game_key = 'anh-challenge-binh-minh'
  for update;
  if v_team_count is null then raise exception 'Photo challenge is not configured'; end if;

  if p_status = 'open' then
    if exists (
      select 1 from generate_series(1, v_team_count) as teams(team_number)
      where not exists (
        select 1 from public.trip_game_teams t
        where t.game_key = 'anh-challenge-binh-minh'
          and t.team_number = teams.team_number
      )
    ) then raise exception 'Every team needs at least one player'; end if;

    if exists (
      select 1 from generate_series(1, v_team_count) as teams(team_number)
      where 2 <> (
        select count(*) from public.photo_challenge_draws d
        where d.game_key = 'anh-challenge-binh-minh'
          and d.team_number = teams.team_number
      )
    ) then raise exception 'Every team needs exactly two poses'; end if;

    if exists (
      select 1 from generate_series(1, v_team_count) as teams(team_number)
      where 2 <> (
        select count(*) from storage.objects storage_object
        where storage_object.bucket_id = 'trip-game-photos'
          and storage_object.name like 'anh-challenge-binh-minh/team-' || teams.team_number || '/%'
          and storage_object.name not like '%.emptyFolderPlaceholder'
      )
    ) then raise exception 'Every team needs exactly two uploaded photos'; end if;
  end if;

  if p_reset or p_status = 'draft' then
    delete from public.photo_challenge_votes
    where game_key = 'anh-challenge-binh-minh';
  end if;

  update public.photo_challenge_settings
  set vote_status = p_status,
      updated_at = now()
  where game_key = 'anh-challenge-binh-minh';

  return public.photo_challenge_get_state(p_session_token);
end;
$$;

revoke all on function public.photo_challenge_get_state(text), public.photo_challenge_set_vote_status(text, text, boolean) from public;
grant execute on function public.photo_challenge_get_state(text), public.photo_challenge_set_vote_status(text, text, boolean) to anon;

-- Once a team has submitted photos, the team list and drawn poses become part
-- of the evidence shown beside those photos. Do not let later setup changes
-- silently detach an image from its team or pose.
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
  v_vote_status text;
  v_changed boolean;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then
    raise exception 'Only host can save teams';
  end if;
  if char_length(v_game_key) not between 1 and 80 then raise exception 'Invalid game key'; end if;

  if v_game_key = 'anh-challenge-binh-minh' then
    select team_count, vote_status into v_photo_team_count, v_vote_status
    from public.photo_challenge_settings
    where game_key = v_game_key
    for update;
    if v_photo_team_count is null then raise exception 'Photo challenge is not configured'; end if;
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
    if v_vote_status <> 'draft' then raise exception 'Reset vote before changing photo challenge teams'; end if;
    if exists (
      select 1 from storage.objects
      where bucket_id = 'trip-game-photos'
        and name like 'anh-challenge-binh-minh/team-%/%'
        and name not like '%.emptyFolderPlaceholder'
    ) then raise exception 'Delete submitted photos before changing photo challenge teams'; end if;
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
  v_vote_status text;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then raise exception 'Only host can configure teams'; end if;
  if p_team_count not in (2, 3) then raise exception 'Team count must be 2 or 3'; end if;

  select team_count, vote_status into v_current_count, v_vote_status
  from public.photo_challenge_settings
  where game_key = 'anh-challenge-binh-minh'
  for update;
  if v_current_count is null then raise exception 'Photo challenge is not configured'; end if;
  if p_team_count = v_current_count then return public.photo_challenge_get_state(p_session_token); end if;
  if v_vote_status <> 'draft' then raise exception 'Reset vote before changing the number of teams'; end if;
  if exists (
    select 1 from storage.objects
    where bucket_id = 'trip-game-photos'
      and name like 'anh-challenge-binh-minh/team-%/%'
      and name not like '%.emptyFolderPlaceholder'
  ) then raise exception 'Delete submitted photos before changing the number of teams'; end if;

  update public.photo_challenge_settings
  set team_count = p_team_count, updated_at = now()
  where game_key = 'anh-challenge-binh-minh';
  delete from public.trip_game_teams
  where game_key = 'anh-challenge-binh-minh' and team_number > p_team_count;
  delete from public.photo_challenge_draws
  where game_key = 'anh-challenge-binh-minh' and team_number > p_team_count;
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
  v_vote_status text;
  v_team integer;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then raise exception 'Only host can draw poses'; end if;

  select team_count, vote_status into v_team_count, v_vote_status
  from public.photo_challenge_settings
  where game_key = 'anh-challenge-binh-minh'
  for update;
  if v_team_count is null then raise exception 'Photo challenge is not configured'; end if;
  if p_team_number is not null and p_team_number not between 1 and v_team_count then raise exception 'Invalid team number'; end if;
  if v_vote_status <> 'draft' then raise exception 'Reset vote before drawing new poses'; end if;

  if exists (
    select 1
    from storage.objects storage_object
    where storage_object.bucket_id = 'trip-game-photos'
      and storage_object.name like 'anh-challenge-binh-minh/team-' || coalesce(p_team_number::text, '%') || '/%'
      and storage_object.name not like '%.emptyFolderPlaceholder'
  ) then raise exception 'Delete that team''s submitted photos before drawing new poses'; end if;

  for v_team in
    select team_number
    from generate_series(1, v_team_count) as teams(team_number)
    where p_team_number is null or team_number = p_team_number
  loop
    delete from public.photo_challenge_draws
    where game_key = 'anh-challenge-binh-minh' and team_number = v_team;
    insert into public.photo_challenge_draws (game_key, team_number, pose_number)
    select 'anh-challenge-binh-minh', v_team, pose_number
    from generate_series(1, 5) as poses(pose_number)
    order by random()
    limit 2;
  end loop;

  delete from public.photo_challenge_votes where game_key = 'anh-challenge-binh-minh';
  update public.photo_challenge_settings
  set vote_status = 'draft', updated_at = now()
  where game_key = 'anh-challenge-binh-minh';
  return public.photo_challenge_get_state(p_session_token);
end;
$$;

revoke all on function public.trip_game_save_teams(text, text, jsonb), public.photo_challenge_set_team_count(text, integer), public.photo_challenge_randomize_draws(text, integer) from public;
grant execute on function public.trip_game_save_teams(text, text, jsonb), public.photo_challenge_set_team_count(text, integer), public.photo_challenge_randomize_draws(text, integer) to anon;
