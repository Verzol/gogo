revoke select, insert, update, delete on public.spy_game_sessions from anon;
revoke select, insert, update, delete on public.spy_game_players from anon;
revoke select, insert, update, delete on public.spy_game_missions from anon;

create or replace function public.spy_game_username_from_token(p_session_token text)
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select s.username
  from public.trip_sessions s
  where s.session_hash = extensions.digest(coalesce(p_session_token, ''), 'sha256')
    and s.expires_at > now()
  limit 1;
$$;

create or replace function public.spy_game_current_session_id()
returns uuid
language sql
security definer
set search_path = public, pg_temp
as $$
  select id
  from public.spy_game_sessions
  order by created_at desc
  limit 1;
$$;

create or replace function public.spy_game_is_host(p_username text, p_session_id uuid default public.spy_game_current_session_id())
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
      'winner', v_session.winner
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
  if v_username is null then
    raise exception 'Not authenticated';
  end if;

  v_can_start := public.spy_game_is_host(v_username, public.spy_game_current_session_id());
  if not v_can_start then
    raise exception 'Only host can start game';
  end if;

  update public.spy_game_missions
  set done = false,
      updated_at = now();

  delete from public.spy_game_sessions;

  insert into public.spy_game_sessions (status, round, tasks_done, winner)
  values ('running', 1, false, null)
  returning id into v_session_id;

  for v_player in select * from jsonb_array_elements(p_players)
  loop
    insert into public.spy_game_players (session_id, username, role, alive)
    values (
      v_session_id,
      v_player->>'username',
      case when v_player->>'role' = 'spy' then 'spy' else 'villager' end,
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
      updated_at = now()
  where id = v_session_id;

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
  if not public.spy_game_is_host(v_username, v_session_id) then raise exception 'Only host can update players'; end if;

  update public.spy_game_players
  set role = case when p_role = 'spy' then 'spy' else 'villager' end,
      alive = p_alive
  where session_id = v_session_id
    and username = p_username;

  return public.spy_game_get_state(p_session_token);
end $$;

create or replace function public.spy_game_upsert_mission(
  p_session_token text,
  p_id uuid,
  p_title text,
  p_done boolean,
  p_order integer,
  p_include_done boolean default true
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
  if not public.spy_game_is_host(v_username, public.spy_game_current_session_id()) then raise exception 'Only host can update missions'; end if;

  if p_id is null then
    insert into public.spy_game_missions (title, done, mission_order)
    values (btrim(p_title), coalesce(p_done, false), p_order);
  elsif p_include_done then
    update public.spy_game_missions
    set title = btrim(p_title),
        done = coalesce(p_done, false),
        mission_order = p_order,
        updated_at = now()
    where id = p_id;
  else
    update public.spy_game_missions
    set title = btrim(p_title),
        mission_order = p_order,
        updated_at = now()
    where id = p_id;
  end if;

  return public.spy_game_get_state(p_session_token);
end $$;

create or replace function public.spy_game_delete_mission(
  p_session_token text,
  p_id uuid
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
  if not public.spy_game_is_host(v_username, public.spy_game_current_session_id()) then raise exception 'Only host can delete missions'; end if;

  delete from public.spy_game_missions where id = p_id;
  return public.spy_game_get_state(p_session_token);
end $$;

revoke all on function public.spy_game_username_from_token(text) from public;
revoke all on function public.spy_game_current_session_id() from public;
revoke all on function public.spy_game_is_host(text, uuid) from public;
revoke all on function public.spy_game_get_state(text) from public;
revoke all on function public.spy_game_start_current(text, jsonb) from public;
revoke all on function public.spy_game_update_session(text, text, integer, boolean, text) from public;
revoke all on function public.spy_game_update_player(text, text, text, boolean) from public;
revoke all on function public.spy_game_upsert_mission(text, uuid, text, boolean, integer, boolean) from public;
revoke all on function public.spy_game_delete_mission(text, uuid) from public;

grant execute on function public.spy_game_get_state(text) to anon;
grant execute on function public.spy_game_start_current(text, jsonb) to anon;
grant execute on function public.spy_game_update_session(text, text, integer, boolean, text) to anon;
grant execute on function public.spy_game_update_player(text, text, text, boolean) to anon;
grant execute on function public.spy_game_upsert_mission(text, uuid, text, boolean, integer, boolean) to anon;
grant execute on function public.spy_game_delete_mission(text, uuid) to anon;
