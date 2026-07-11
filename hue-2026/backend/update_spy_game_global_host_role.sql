-- Keep spy-game permissions in trip_members and reserve game roles for players.

delete from public.spy_game_players p
using public.trip_members m
where p.username = m.username
  and m.role = 'host';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'spy_game_players_role'
      and conrelid = 'public.spy_game_players'::regclass
  ) then
    alter table public.spy_game_players drop constraint spy_game_players_role;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'spy_game_players_player_role'
      and conrelid = 'public.spy_game_players'::regclass
  ) then
    alter table public.spy_game_players
      add constraint spy_game_players_player_role check (role in ('villager', 'spy'));
  end if;
end $$;

create or replace function public.spy_game_is_host(
  p_username text,
  p_session_id uuid default public.spy_game_current_session_id()
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.trip_members m
    where m.username = p_username
      and m.role = 'host'
  );
$$;

create or replace function public.spy_game_get_state(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_username text := public.spy_game_username_from_token(p_session_token);
  v_session public.spy_game_sessions%rowtype;
  v_player public.spy_game_players%rowtype;
  v_is_host boolean := false;
begin
  if v_username is null then
    return jsonb_build_object('authenticated', false);
  end if;

  select * into v_session
  from public.spy_game_sessions
  order by created_at desc
  limit 1;

  if v_session.id is not null then
    select * into v_player
    from public.spy_game_players
    where session_id = v_session.id
      and username = v_username;
  end if;

  v_is_host := public.spy_game_is_host(v_username, v_session.id);

  return jsonb_build_object(
    'authenticated', true,
    'username', v_username,
    'isHost', v_is_host,
    'session', case when v_session.id is null then null else jsonb_build_object(
      'id', v_session.id,
      'status', v_session.status,
      'round', v_session.round,
      'tasksDone', v_session.tasks_done,
      'winner', v_session.winner,
      'votingOpen', v_session.voting_open,
      'voteRound', v_session.vote_round
    ) end,
    'self', case
      when v_player.id is null then null
      when not v_is_host and v_session.status <> 'running' then jsonb_build_object(
        'username', v_player.username,
        'role', null,
        'alive', null
      )
      else jsonb_build_object(
        'username', v_player.username,
        'role', v_player.role,
        'alive', v_player.alive
      )
    end,
    'players', case when v_is_host then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'username', p.username,
        'role', p.role,
        'alive', p.alive
      ) order by p.created_at), '[]'::jsonb)
      from public.spy_game_players p
      join public.trip_members m on m.username = p.username
      where p.session_id = v_session.id
        and m.role <> 'host'
    ) else '[]'::jsonb end,
    'candidates', case when v_session.status = 'running' then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'username', p.username,
        'alive', p.alive,
        'displayName', p.username
      ) order by p.created_at), '[]'::jsonb)
      from public.spy_game_players p
      join public.trip_members m on m.username = p.username
      where p.session_id = v_session.id
        and m.role <> 'host'
    ) else '[]'::jsonb end,
    'myVotes', case when v_session.id is null then '[]'::jsonb else (
      select coalesce(jsonb_agg(v.target_username order by v.created_at), '[]'::jsonb)
      from public.spy_game_votes v
      where v.session_id = v_session.id
        and v.round = v_session.vote_round
        and v.voter_username = v_username
    ) end,
    'voteTallies', case when v_is_host and v_session.id is not null then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'username', c.username,
        'displayName', c.username,
        'alive', c.alive,
        'count', coalesce(t.vote_count, 0),
        'voters', coalesce(t.voters, '[]'::jsonb)
      ) order by coalesce(t.vote_count, 0) desc, c.created_at), '[]'::jsonb)
      from public.spy_game_players c
      join public.trip_members cm on cm.username = c.username
      left join (
        select v.target_username,
               count(*) as vote_count,
               jsonb_agg(v.voter_username order by v.voter_username) as voters
        from public.spy_game_votes v
        join public.spy_game_players voter
          on voter.session_id = v.session_id
         and voter.username = v.voter_username
        join public.trip_members vm
          on vm.username = voter.username
         and vm.role <> 'host'
        join public.spy_game_players target
          on target.session_id = v.session_id
         and target.username = v.target_username
        join public.trip_members tm
          on tm.username = target.username
         and tm.role <> 'host'
        where v.session_id = v_session.id
          and v.round = v_session.vote_round
        group by v.target_username
      ) t on t.target_username = c.username
      where c.session_id = v_session.id
        and cm.role <> 'host'
    ) else '[]'::jsonb end,
    'missions', case
      when v_is_host or (v_session.status = 'running' and v_player.role = 'spy') then (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', m.id,
          'title', m.title,
          'done', m.done,
          'order', m.mission_order
        ) order by m.mission_order, m.created_at), '[]'::jsonb)
        from public.spy_game_missions m
      )
      else '[]'::jsonb
    end
  );
end $$;

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
begin
  if v_username is null then raise exception 'Not authenticated'; end if;
  if not public.spy_game_is_host(v_username, public.spy_game_current_session_id()) then
    raise exception 'Only host can start game';
  end if;

  update public.spy_game_missions
  set done = false, updated_at = now();

  delete from public.spy_game_sessions;

  insert into public.spy_game_sessions (status, round, tasks_done, winner, voting_open, vote_round)
  values ('running', 1, false, null, false, 1)
  returning id into v_session_id;

  for v_player in select * from jsonb_array_elements(coalesce(p_players, '[]'::jsonb))
  loop
    if exists (
      select 1
      from public.trip_members m
      where m.username = btrim(v_player->>'username')
        and m.role <> 'host'
    ) then
      insert into public.spy_game_players (session_id, username, role, alive)
      values (
        v_session_id,
        btrim(v_player->>'username'),
        case when v_player->>'role' = 'spy' then 'spy' else 'villager' end,
        coalesce((v_player->>'alive')::boolean, true)
      );
    end if;
  end loop;

  return public.spy_game_get_state(p_session_token);
end $$;

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
  v_session_id uuid := public.spy_game_current_session_id();
begin
  if v_username is null then raise exception 'Not authenticated'; end if;
  if not public.spy_game_is_host(v_username, v_session_id) then
    raise exception 'Only host can update players';
  end if;

  update public.spy_game_players p
  set role = case when p_role = 'spy' then 'spy' else 'villager' end,
      alive = p_alive
  where p.session_id = v_session_id
    and p.username = p_username
    and exists (
      select 1 from public.trip_members m
      where m.username = p.username and m.role <> 'host'
    );

  return public.spy_game_get_state(p_session_token);
end $$;

revoke all on function public.spy_game_is_host(text, uuid) from public;
revoke all on function public.spy_game_get_state(text) from public;
revoke all on function public.spy_game_start_current(text, jsonb) from public;
revoke all on function public.spy_game_update_player(text, text, text, boolean) from public;

grant execute on function public.spy_game_get_state(text) to anon;
grant execute on function public.spy_game_start_current(text, jsonb) to anon;
grant execute on function public.spy_game_update_player(text, text, text, boolean) to anon;
