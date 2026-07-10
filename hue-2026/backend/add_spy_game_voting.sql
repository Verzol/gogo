alter table public.spy_game_sessions
  add column if not exists voting_open boolean not null default false,
  add column if not exists vote_round integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'spy_game_sessions_vote_round'
      and conrelid = 'public.spy_game_sessions'::regclass
  ) then
    alter table public.spy_game_sessions
      add constraint spy_game_sessions_vote_round check (vote_round between 1 and 2);
  end if;
end $$;

create table if not exists public.spy_game_votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.spy_game_sessions(id) on delete cascade,
  round integer not null,
  voter_username text not null,
  target_username text not null,
  created_at timestamptz not null default now(),
  constraint spy_game_votes_round check (round between 1 and 2),
  constraint spy_game_votes_no_self check (voter_username <> target_username),
  constraint spy_game_votes_one_target unique (session_id, round, voter_username, target_username)
);

create index if not exists spy_game_votes_session_round_idx
  on public.spy_game_votes (session_id, round);

alter table public.spy_game_votes enable row level security;
revoke select, insert, update, delete on public.spy_game_votes from anon;

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

  select *
  into v_session
  from public.spy_game_sessions
  order by created_at desc
  limit 1;

  if v_session.id is not null then
    select *
    into v_player
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
      where p.session_id = v_session.id
    ) else '[]'::jsonb end,
    'candidates', case when v_session.status = 'running' then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'username', p.username,
        'alive', p.alive,
        'displayName', p.username
      ) order by p.created_at), '[]'::jsonb)
      from public.spy_game_players p
      left join public.trip_members m on m.username = p.username
      where p.session_id = v_session.id
        and p.role <> 'host'
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
      left join public.trip_members m on m.username = c.username
      left join (
        select v.target_username,
               count(*) as vote_count,
               jsonb_agg(v.voter_username order by v.voter_username) as voters
        from public.spy_game_votes v
        join public.spy_game_players voter
          on voter.session_id = v.session_id
         and voter.username = v.voter_username
         and voter.role <> 'host'
        join public.spy_game_players target
          on target.session_id = v.session_id
         and target.username = v.target_username
         and target.role <> 'host'
        where v.session_id = v_session.id
          and v.round = v_session.vote_round
        group by v.target_username
      ) t on t.target_username = c.username
      where c.session_id = v_session.id
        and c.role <> 'host'
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
  v_can_start boolean;
  v_session_id uuid;
  v_player jsonb;
begin
  if v_username is null then raise exception 'Not authenticated'; end if;

  v_can_start := public.spy_game_is_host(v_username, public.spy_game_current_session_id());
  if not v_can_start then raise exception 'Only host can start game'; end if;

  update public.spy_game_missions
  set done = false,
      updated_at = now();

  delete from public.spy_game_sessions;

  insert into public.spy_game_sessions (status, round, tasks_done, winner, voting_open, vote_round)
  values ('running', 1, false, null, false, 1)
  returning id into v_session_id;

  for v_player in select * from jsonb_array_elements(p_players)
  loop
    insert into public.spy_game_players (session_id, username, role, alive)
    values (
      v_session_id,
      v_player->>'username',
      case when v_player->>'role' in ('host', 'villager', 'spy') then v_player->>'role' else 'villager' end,
      coalesce((v_player->>'alive')::boolean, true)
    );
  end loop;

  return public.spy_game_get_state(p_session_token);
end $$;

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
  v_session_id uuid := public.spy_game_current_session_id();
begin
  if v_username is null then raise exception 'Not authenticated'; end if;
  if not public.spy_game_is_host(v_username, v_session_id) then raise exception 'Only host can update game'; end if;

  update public.spy_game_sessions
  set status = p_status,
      round = p_round,
      tasks_done = p_tasks_done,
      winner = nullif(p_winner, ''),
      voting_open = case when p_status = 'running' then voting_open else false end,
      updated_at = now()
  where id = v_session_id;

  return public.spy_game_get_state(p_session_token);
end $$;

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
  v_session_id uuid := public.spy_game_current_session_id();
begin
  if v_username is null then raise exception 'Not authenticated'; end if;
  if not public.spy_game_is_host(v_username, v_session_id) then raise exception 'Only host can control voting'; end if;
  if p_round not between 1 and 2 then raise exception 'Invalid vote round'; end if;

  update public.spy_game_sessions
  set vote_round = p_round,
      voting_open = p_open,
      updated_at = now()
  where id = v_session_id;

  return public.spy_game_get_state(p_session_token);
end $$;

create or replace function public.spy_game_cast_votes(
  p_session_token text,
  p_targets text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_username text := public.spy_game_username_from_token(p_session_token);
  v_session public.spy_game_sessions%rowtype;
  v_player public.spy_game_players%rowtype;
  v_target text;
  v_clean_targets text[];
begin
  if v_username is null then raise exception 'Not authenticated'; end if;

  select *
  into v_session
  from public.spy_game_sessions
  order by created_at desc
  limit 1;

  if v_session.id is null or v_session.status <> 'running' or not v_session.voting_open then
    raise exception 'Voting is closed';
  end if;

  select *
  into v_player
  from public.spy_game_players
  where session_id = v_session.id
    and username = v_username;

  if v_player.id is null or v_player.role = 'host' or not v_player.alive then
    raise exception 'You cannot vote';
  end if;

  select coalesce(array_agg(distinct btrim(target)), array[]::text[])
  into v_clean_targets
  from unnest(coalesce(p_targets, array[]::text[])) target
  where btrim(target) <> '';

  if array_length(v_clean_targets, 1) > 2 then
    raise exception 'Only 2 votes allowed';
  end if;

  delete from public.spy_game_votes
  where session_id = v_session.id
    and round = v_session.vote_round
    and voter_username = v_username;

  foreach v_target in array v_clean_targets loop
    if v_target = v_username then raise exception 'Cannot vote yourself'; end if;
    if not exists (
      select 1
      from public.spy_game_players p
      where p.session_id = v_session.id
        and p.username = v_target
        and p.role <> 'host'
        and p.alive
    ) then
      raise exception 'Invalid vote target';
    end if;

    insert into public.spy_game_votes (session_id, round, voter_username, target_username)
    values (v_session.id, v_session.vote_round, v_username, v_target);
  end loop;

  return public.spy_game_get_state(p_session_token);
end $$;

revoke all on public.spy_game_votes from anon;
revoke all on function public.spy_game_set_voting(text, integer, boolean) from public;
revoke all on function public.spy_game_cast_votes(text, text[]) from public;

grant execute on function public.spy_game_set_voting(text, integer, boolean) to anon;
grant execute on function public.spy_game_cast_votes(text, text[]) to anon;
