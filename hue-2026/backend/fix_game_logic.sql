-- Apply after the existing game migrations. This hardens game-state transitions
-- so votes and music rounds cannot carry state across invalid game actions.

create or replace function public.spy_game_start_current(
  p_session_token text,
  p_players jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_username text := public.spy_game_username_from_token(p_session_token);
  v_session_id uuid;
  v_player jsonb;
  v_submitted_players integer;
  v_distinct_players integer;
  v_spy_count integer;
begin
  if v_username is null then raise exception 'Not authenticated'; end if;
  if not public.spy_game_is_host(v_username, public.spy_game_current_session_id()) then
    raise exception 'Only host can start game';
  end if;

  select count(*), count(distinct btrim(player->>'username')),
         count(*) filter (where player->>'role' = 'spy')
  into v_submitted_players, v_distinct_players, v_spy_count
  from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) player;

  if v_submitted_players < 2
     or v_distinct_players <> v_submitted_players
     or v_spy_count <> 2
     or exists (
       select 1
       from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) player
       where not exists (
         select 1
         from public.trip_members member
         where member.username = btrim(player->>'username')
           and member.role <> 'host'
       )
     ) then
    raise exception 'A game needs distinct current players and exactly 2 spies';
  end if;

  -- Delete explicitly before replacing the session. The foreign key also cascades,
  -- but this repairs legacy rows and guarantees both vote rounds are cleared.
  delete from public.spy_game_votes
  where session_id in (select id from public.spy_game_sessions);
  delete from public.spy_game_sessions
  where id is not null;

  update public.spy_game_missions
  set done = false,
      visible_to_spies = false,
      updated_at = now()
  where id is not null;

  insert into public.spy_game_sessions (status, round, tasks_done, winner, voting_open, vote_round)
  values ('running', 1, false, null, false, 1)
  returning id into v_session_id;

  for v_player in select * from jsonb_array_elements(p_players)
  loop
    insert into public.spy_game_players (session_id, username, role, alive)
    values (
      v_session_id,
      btrim(v_player->>'username'),
      case when v_player->>'role' = 'spy' then 'spy' else 'villager' end,
      true
    );
  end loop;

  return public.spy_game_get_state(p_session_token);
end;
$$;

create or replace function public.spy_game_update_session(
  p_session_token text,
  p_status text,
  p_round integer,
  p_tasks_done boolean,
  p_winner text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_username text := public.spy_game_username_from_token(p_session_token);
  v_session public.spy_game_sessions%rowtype;
  v_winner text := nullif(btrim(coalesce(p_winner, '')), '');
begin
  if v_username is null then raise exception 'Not authenticated'; end if;
  if p_status not in ('stopped', 'running') then raise exception 'Invalid game status'; end if;
  if p_round not between 1 and 3 then raise exception 'Invalid game round'; end if;
  if v_winner is not null and v_winner not in ('villagers', 'spies') then raise exception 'Invalid winner'; end if;

  select * into v_session
  from public.spy_game_sessions
  order by created_at desc
  limit 1
  for update;
  if v_session.id is null or not public.spy_game_is_host(v_username, v_session.id) then
    raise exception 'Only host can update game';
  end if;

  update public.spy_game_sessions
  set status = case when v_winner is null then p_status else 'stopped' end,
      round = p_round,
      tasks_done = coalesce(p_tasks_done, false),
      winner = v_winner,
      vote_round = case when p_round <> v_session.round then least(p_round, 2) else vote_round end,
      voting_open = case
        when v_winner is not null or p_status <> 'running' or p_round <> v_session.round then false
        else voting_open
      end,
      updated_at = now()
  where id = v_session.id;

  return public.spy_game_get_state(p_session_token);
end;
$$;

create or replace function public.spy_game_set_voting(
  p_session_token text,
  p_round integer,
  p_open boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_username text := public.spy_game_username_from_token(p_session_token);
  v_session public.spy_game_sessions%rowtype;
begin
  if v_username is null then raise exception 'Not authenticated'; end if;
  if p_round not between 1 and 2 then raise exception 'Invalid vote round'; end if;

  select * into v_session
  from public.spy_game_sessions
  order by created_at desc
  limit 1
  for update;
  if v_session.id is null or not public.spy_game_is_host(v_username, v_session.id) then
    raise exception 'Only host can control voting';
  end if;
  if v_session.status <> 'running' or v_session.winner is not null then
    raise exception 'Game is not running';
  end if;
  if p_round <> v_session.round then
    raise exception 'Voting must match the current game round';
  end if;

  update public.spy_game_sessions
  set vote_round = p_round,
      voting_open = coalesce(p_open, false),
      updated_at = now()
  where id = v_session.id;

  return public.spy_game_get_state(p_session_token);
end;
$$;

create or replace function public.spy_game_update_player(
  p_session_token text,
  p_username text,
  p_role text,
  p_alive boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_username text := public.spy_game_username_from_token(p_session_token);
  v_session public.spy_game_sessions%rowtype;
begin
  if v_username is null then raise exception 'Not authenticated'; end if;
  if p_role not in ('villager', 'spy') or p_alive is null then raise exception 'Invalid player state'; end if;

  select * into v_session
  from public.spy_game_sessions
  order by created_at desc
  limit 1
  for update;
  if v_session.id is null or not public.spy_game_is_host(v_username, v_session.id) then
    raise exception 'Only host can update players';
  end if;

  update public.spy_game_players
  set role = p_role,
      alive = p_alive
  where session_id = v_session.id
    and username = btrim(p_username);
  if not found then raise exception 'Player not found'; end if;

  -- A dead player cannot keep a vote, and no one can keep voting for them.
  if not p_alive then
    delete from public.spy_game_votes
    where session_id = v_session.id
      and (voter_username = btrim(p_username) or target_username = btrim(p_username));
  end if;

  return public.spy_game_get_state(p_session_token);
end;
$$;

create or replace function public.photo_challenge_reset_vote_on_team_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game_key text;
begin
  if tg_op = 'DELETE' then
    v_game_key := old.game_key;
  else
    v_game_key := new.game_key;
  end if;
  if v_game_key = 'anh-challenge-binh-minh' then
    delete from public.photo_challenge_votes where game_key = v_game_key;
    update public.photo_challenge_settings
    set vote_status = 'draft', updated_at = now()
    where game_key = v_game_key;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists photo_challenge_reset_vote_on_team_change on public.trip_game_teams;
create trigger photo_challenge_reset_vote_on_team_change
after insert or update or delete on public.trip_game_teams
for each row execute function public.photo_challenge_reset_vote_on_team_change();

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
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then
    raise exception 'Only host can save teams';
  end if;
  if char_length(v_game_key) not between 1 and 80 then
    raise exception 'Invalid game key';
  end if;

  if v_game_key = 'anh-challenge-binh-minh' then
    select team_count into v_photo_team_count
    from public.photo_challenge_settings
    where game_key = v_game_key;
    if v_photo_team_count is null then raise exception 'Photo challenge is not configured'; end if;
  end if;

  for v_assignment in select * from jsonb_array_elements(coalesce(p_assignments, '[]'::jsonb))
  loop
    if btrim(coalesce(v_assignment->>'username', '')) = ''
       or coalesce((v_assignment->>'teamNumber')::integer, 0) not between 1 and 10 then
      raise exception 'Invalid team assignment';
    end if;
    if v_photo_team_count is not null
       and (v_assignment->>'teamNumber')::integer > v_photo_team_count then
      raise exception 'Photo challenge team number is out of range';
    end if;
    if not exists (
      select 1
      from public.trip_members
      where username = btrim(v_assignment->>'username')
        and (role <> 'host' or v_game_key = 'anh-challenge-binh-minh')
    ) then
      raise exception 'Invalid team member';
    end if;
  end loop;

  delete from public.trip_game_teams where game_key = v_game_key;
  for v_assignment in select * from jsonb_array_elements(coalesce(p_assignments, '[]'::jsonb))
  loop
    insert into public.trip_game_teams (game_key, username, team_number, updated_at)
    values (
      v_game_key,
      btrim(v_assignment->>'username'),
      (v_assignment->>'teamNumber')::integer,
      now()
    );
  end loop;

  return public.trip_games_get_state(p_session_token);
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
  v_team integer;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then
    raise exception 'Only host can draw poses';
  end if;

  select team_count into v_team_count
  from public.photo_challenge_settings
  where game_key = 'anh-challenge-binh-minh'
  for update;
  if p_team_number is not null and p_team_number not between 1 and v_team_count then
    raise exception 'Invalid team number';
  end if;

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

  -- New poses change the contest, so old votes cannot remain valid.
  delete from public.photo_challenge_votes where game_key = 'anh-challenge-binh-minh';
  update public.photo_challenge_settings
  set vote_status = 'draft', updated_at = now()
  where game_key = 'anh-challenge-binh-minh';

  return public.photo_challenge_get_state(p_session_token);
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
  v_ready_count integer;
  v_player_count integer;
begin
  perform public.imposter_music_is_host(p_session_token);

  select round into v_round
  from public.imposter_music_room
  where singleton and status = 'prepared'
  for update;
  if v_round is null then raise exception 'Prepare a round before starting'; end if;

  select count(*) into v_ready_count
  from public.imposter_music_ready
  where round = v_round;
  select count(*) into v_player_count
  from public.trip_members
  where role <> 'host';
  if v_ready_count <> v_player_count then
    raise exception 'Wait until every player is ready';
  end if;

  update public.imposter_music_room
  set status = 'playing', starts_at = now() + interval '5 seconds', updated_at = now()
  where singleton and status = 'prepared'
  returning starts_at into v_starts_at;

  update public.imposter_music_round_history
  set status = 'playing', starts_at = v_starts_at
  where round = v_round and status = 'prepared';

  return public.imposter_music_get_state(p_session_token);
end;
$$;

revoke all on function public.spy_game_start_current(text, jsonb), public.spy_game_update_session(text, text, integer, boolean, text), public.spy_game_set_voting(text, integer, boolean), public.spy_game_update_player(text, text, text, boolean), public.photo_challenge_reset_vote_on_team_change(), public.trip_game_save_teams(text, text, jsonb), public.photo_challenge_randomize_draws(text, integer), public.imposter_music_start_round(text) from public;
grant execute on function public.spy_game_start_current(text, jsonb), public.spy_game_update_session(text, text, integer, boolean, text), public.spy_game_set_voting(text, integer, boolean), public.spy_game_update_player(text, text, text, boolean), public.trip_game_save_teams(text, text, jsonb), public.photo_challenge_randomize_draws(text, integer), public.imposter_music_start_round(text) to anon;
