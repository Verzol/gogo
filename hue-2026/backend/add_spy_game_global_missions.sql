create table if not exists public.spy_game_missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  mission_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spy_game_missions_title_len check (char_length(title) between 1 and 180)
);

create index if not exists spy_game_missions_order_idx
  on public.spy_game_missions (mission_order, created_at);

alter table public.spy_game_missions enable row level security;

grant select, insert, update, delete on public.spy_game_missions to anon;

drop policy if exists "Anyone can read spy missions" on public.spy_game_missions;
create policy "Anyone can read spy missions"
  on public.spy_game_missions for select to anon using (true);

drop policy if exists "Anyone can write spy missions" on public.spy_game_missions;
create policy "Anyone can write spy missions"
  on public.spy_game_missions for all to anon using (true) with check (true);

insert into public.spy_game_missions (title, mission_order)
select title, mission_order
from (
  values
    ('Chụp lén 3 tấm ảnh nhóm đang cười mà không ai biết.', 1),
    ('Rủ ít nhất 2 người đổi chỗ ngồi trong một bữa ăn.', 2),
    ('Làm cả nhóm nói từ "Huế" ít nhất 10 lần trong 30 phút.', 3),
    ('Gài một câu hát vào cuộc nói chuyện mà không bị bắt bài.', 4),
    ('Thuyết phục một người chụp ảnh sống ảo ở địa điểm bất kỳ.', 5)
) as seed(title, mission_order)
where not exists (select 1 from public.spy_game_missions);

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
        and not (trim(raw_player_name) = any(coalesce(p_hosts, array[]::text[])))
    ) clean_players
    order by random()
    limit 2
  ) picked;

  foreach v_player in array p_players loop
    v_player := trim(v_player);
    if v_player = '' then
      continue;
    end if;

    insert into public.spy_game_players (session_id, username, role, alive)
    values (
      v_session_id,
      v_player,
      case
        when v_player = any(coalesce(p_hosts, array[]::text[])) then 'host'
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

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'spy_game_missions'
    ) then
      alter publication supabase_realtime add table public.spy_game_missions;
    end if;
  end if;
end $$;
