create table if not exists public.spy_game_sessions (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'stopped',
  round integer not null default 1,
  tasks_done boolean not null default false,
  winner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spy_game_sessions_status check (status in ('stopped', 'running')),
  constraint spy_game_sessions_round check (round between 1 and 3),
  constraint spy_game_sessions_winner check (winner is null or winner in ('villagers', 'spies'))
);

create table if not exists public.spy_game_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.spy_game_sessions(id) on delete cascade,
  username text not null,
  role text not null,
  alive boolean not null default true,
  created_at timestamptz not null default now(),
  constraint spy_game_players_role check (role in ('villager', 'spy')),
  constraint spy_game_players_username_len check (char_length(username) between 1 and 40),
  constraint spy_game_players_one_per_session unique (session_id, username)
);

create table if not exists public.spy_game_tasks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.spy_game_sessions(id) on delete cascade,
  title text not null,
  assigned_to text,
  done boolean not null default false,
  task_order integer not null default 1,
  created_at timestamptz not null default now(),
  constraint spy_game_tasks_title_len check (char_length(title) between 1 and 180)
);

create index if not exists spy_game_players_session_id_idx
  on public.spy_game_players (session_id);

create index if not exists spy_game_tasks_session_id_idx
  on public.spy_game_tasks (session_id, task_order);

alter table public.spy_game_sessions enable row level security;
alter table public.spy_game_players enable row level security;
alter table public.spy_game_tasks enable row level security;

grant select, insert, update, delete on public.spy_game_sessions to anon;
grant select, insert, update, delete on public.spy_game_players to anon;
grant select, insert, update, delete on public.spy_game_tasks to anon;

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
  v_mission text;
  v_order integer := 1;
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
    )
    on conflict (session_id, username) do update
      set role = excluded.role,
          alive = excluded.alive;
  end loop;

  foreach v_mission in array p_missions loop
    v_mission := trim(v_mission);
    if v_mission = '' then
      continue;
    end if;

    insert into public.spy_game_tasks (session_id, title, task_order)
    values (v_session_id, v_mission, v_order);
    v_order := v_order + 1;
  end loop;

  return v_session_id;
end $$;

revoke all on function public.spy_game_start_new_session(text[], text[], text[]) from public;
grant execute on function public.spy_game_start_new_session(text[], text[], text[]) to anon;

drop policy if exists "Anyone can read spy sessions" on public.spy_game_sessions;
create policy "Anyone can read spy sessions"
  on public.spy_game_sessions for select to anon using (true);

drop policy if exists "Anyone can write spy sessions" on public.spy_game_sessions;
create policy "Anyone can write spy sessions"
  on public.spy_game_sessions for all to anon using (true) with check (true);

drop policy if exists "Anyone can read spy players" on public.spy_game_players;
create policy "Anyone can read spy players"
  on public.spy_game_players for select to anon using (true);

drop policy if exists "Anyone can write spy players" on public.spy_game_players;
create policy "Anyone can write spy players"
  on public.spy_game_players for all to anon using (true) with check (true);

drop policy if exists "Anyone can read spy tasks" on public.spy_game_tasks;
create policy "Anyone can read spy tasks"
  on public.spy_game_tasks for select to anon using (true);

drop policy if exists "Anyone can write spy tasks" on public.spy_game_tasks;
create policy "Anyone can write spy tasks"
  on public.spy_game_tasks for all to anon using (true) with check (true);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'spy_game_sessions'
    ) then
      alter publication supabase_realtime add table public.spy_game_sessions;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'spy_game_players'
    ) then
      alter publication supabase_realtime add table public.spy_game_players;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'spy_game_tasks'
    ) then
      alter publication supabase_realtime add table public.spy_game_tasks;
    end if;
  end if;
end $$;
