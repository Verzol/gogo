-- Let the host decide which missions are visible to spies.

alter table public.spy_game_missions
  add column if not exists visible_to_spies boolean not null default false;

update public.spy_game_missions
set visible_to_spies = false
where visible_to_spies is null;

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
      when v_is_host then (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', m.id,
          'title', m.title,
          'done', m.done,
          'visibleToSpies', m.visible_to_spies,
          'order', m.mission_order
        ) order by m.mission_order, m.created_at), '[]'::jsonb)
        from public.spy_game_missions m
      )
      when v_session.status = 'running' and v_player.role = 'spy' then (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', m.id,
          'title', m.title,
          'done', m.done,
          'visibleToSpies', true,
          'order', m.mission_order
        ) order by m.mission_order, m.created_at), '[]'::jsonb)
        from public.spy_game_missions m
        where m.visible_to_spies
      )
      else '[]'::jsonb
    end
  );
end $$;

create or replace function public.spy_game_set_mission_visibility(
  p_session_token text,
  p_id uuid,
  p_visible boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_username text := public.spy_game_username_from_token(p_session_token);
begin
  if v_username is null then raise exception 'Not authenticated'; end if;
  if not public.spy_game_is_host(v_username, public.spy_game_current_session_id()) then
    raise exception 'Only host can change mission visibility';
  end if;

  update public.spy_game_missions
  set visible_to_spies = coalesce(p_visible, false),
      updated_at = now()
  where id = p_id;

  return public.spy_game_get_state(p_session_token);
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
  set done = false,
      visible_to_spies = false,
      updated_at = now();

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

revoke all on function public.spy_game_get_state(text) from public;
revoke all on function public.spy_game_set_mission_visibility(text, uuid, boolean) from public;
revoke all on function public.spy_game_start_current(text, jsonb) from public;

grant execute on function public.spy_game_get_state(text) to anon;
grant execute on function public.spy_game_set_mission_visibility(text, uuid, boolean) to anon;
grant execute on function public.spy_game_start_current(text, jsonb) to anon;
