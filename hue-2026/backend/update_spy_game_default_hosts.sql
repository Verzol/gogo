create or replace function public.spy_game_start_new_session(
  p_players text[],
  p_hosts text[] default array['gtm', 'linh'],
  p_missions text[] default array[]::text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_spies text[];
  v_player text;
begin
  if array_length(p_players, 1) is null then
    raise exception 'p_players is required';
  end if;

  insert into public.spy_game_sessions (status, round, tasks_done, winner)
  values ('stopped', 1, false, null)
  returning id into v_session_id;

  select coalesce(array_agg(player_name), array[]::text[])
    into v_spies
  from (
    select player_name
    from (
      select distinct trim(raw_player_name) as player_name
      from unnest(p_players) as raw_player_name
      where trim(raw_player_name) <> ''
    ) clean_players
    order by random()
    limit 2
  ) picked;

  foreach v_player in array p_players loop
    v_player := trim(v_player);
    if v_player = '' then
      continue;
    end if;

    if not exists (
      select 1 from public.trip_members m
      where m.username = v_player and m.role <> 'host'
    ) then
      continue;
    end if;

    insert into public.spy_game_players (session_id, username, role, alive)
    values (
      v_session_id,
      v_player,
      case
        when v_player = any(v_spies) then 'spy'
        else 'villager'
      end,
      true
    );
  end loop;

  return v_session_id;
end $$;

revoke all on function public.spy_game_start_new_session(text[], text[], text[]) from public;
grant execute on function public.spy_game_start_new_session(text[], text[], text[]) to anon;
