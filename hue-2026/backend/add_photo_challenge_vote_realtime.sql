-- Run after fix_photo_challenge_flow.sql and migrate_photo_challenge_3_team_random.sql.
-- This publishes an opaque revision signal, never the vote rows themselves.

create table if not exists public.photo_challenge_live_updates (
  game_key text primary key references public.photo_challenge_settings(game_key) on delete cascade,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.photo_challenge_live_updates (game_key)
select game_key
from public.photo_challenge_settings
where game_key = 'anh-challenge-binh-minh'
on conflict (game_key) do nothing;

alter table public.photo_challenge_live_updates enable row level security;
revoke all on table public.photo_challenge_live_updates from anon, authenticated;
grant select on table public.photo_challenge_live_updates to anon, authenticated;

drop policy if exists "Photo challenge live update is visible" on public.photo_challenge_live_updates;
create policy "Photo challenge live update is visible"
on public.photo_challenge_live_updates
for select to anon, authenticated
using (game_key = 'anh-challenge-binh-minh');

create or replace function public.photo_challenge_touch_live_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.photo_challenge_live_updates
  set revision = revision + 1,
      updated_at = now()
  where game_key = 'anh-challenge-binh-minh';
  return null;
end;
$$;

drop trigger if exists photo_challenge_votes_live_update on public.photo_challenge_votes;
create trigger photo_challenge_votes_live_update
after insert or update or delete on public.photo_challenge_votes
for each statement
execute function public.photo_challenge_touch_live_update();

drop trigger if exists photo_challenge_settings_live_update on public.photo_challenge_settings;
create trigger photo_challenge_settings_live_update
after update on public.photo_challenge_settings
for each statement
execute function public.photo_challenge_touch_live_update();

revoke all on function public.photo_challenge_touch_live_update() from public;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'photo_challenge_live_updates'
     ) then
    alter publication supabase_realtime add table public.photo_challenge_live_updates;
  end if;
end;
$$;
