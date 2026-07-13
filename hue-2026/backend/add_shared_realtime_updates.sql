-- Run after the game hub, Community Journal, and Spy Game migrations.
-- Realtime exposes only opaque revision signals. Each browser reloads its
-- permitted state through the existing RPC functions.

create table if not exists public.trip_game_live_updates (
  scope text primary key check (scope = 'game-hub'),
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.trip_game_live_updates (scope) values ('game-hub')
on conflict (scope) do nothing;

create table if not exists public.community_journal_live_updates (
  scope text primary key check (scope in ('confessions', 'reflections')),
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.community_journal_live_updates (scope)
values ('confessions'), ('reflections')
on conflict (scope) do nothing;

create table if not exists public.spy_game_live_updates (
  singleton boolean primary key default true check (singleton),
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.spy_game_live_updates (singleton) values (true)
on conflict (singleton) do nothing;

alter table public.trip_game_live_updates enable row level security;
alter table public.community_journal_live_updates enable row level security;
alter table public.spy_game_live_updates enable row level security;

revoke all on public.trip_game_live_updates, public.community_journal_live_updates, public.spy_game_live_updates from anon, authenticated;
grant select on public.trip_game_live_updates, public.community_journal_live_updates, public.spy_game_live_updates to anon, authenticated;

drop policy if exists "Trip game live updates are visible" on public.trip_game_live_updates;
create policy "Trip game live updates are visible" on public.trip_game_live_updates
for select to anon, authenticated using (scope = 'game-hub');

drop policy if exists "Community live updates are visible" on public.community_journal_live_updates;
create policy "Community live updates are visible" on public.community_journal_live_updates
for select to anon, authenticated using (scope in ('confessions', 'reflections'));

drop policy if exists "Spy game live updates are visible" on public.spy_game_live_updates;
create policy "Spy game live updates are visible" on public.spy_game_live_updates
for select to anon, authenticated using (singleton);

create or replace function public.trip_game_touch_live_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.trip_game_live_updates
  set revision = revision + 1, updated_at = now()
  where scope = 'game-hub';
  return null;
end;
$$;

create or replace function public.community_journal_touch_live_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.community_journal_live_updates
  set revision = revision + 1, updated_at = now()
  where scope = TG_ARGV[0];
  return null;
end;
$$;

create or replace function public.spy_game_touch_live_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.spy_game_live_updates
  set revision = revision + 1, updated_at = now()
  where singleton;
  return null;
end;
$$;

drop trigger if exists trip_game_teams_live_update on public.trip_game_teams;
create trigger trip_game_teams_live_update
after insert or update or delete on public.trip_game_teams
for each statement execute function public.trip_game_touch_live_update();

drop trigger if exists trip_game_results_live_update on public.trip_game_results;
create trigger trip_game_results_live_update
after insert or update or delete on public.trip_game_results
for each statement execute function public.trip_game_touch_live_update();

drop trigger if exists trip_confessions_live_update on public.trip_confessions;
create trigger trip_confessions_live_update
after insert or update or delete on public.trip_confessions
for each statement execute function public.community_journal_touch_live_update('confessions');

drop trigger if exists trip_confession_reactions_live_update on public.trip_confession_reactions;
create trigger trip_confession_reactions_live_update
after insert or update or delete on public.trip_confession_reactions
for each statement execute function public.community_journal_touch_live_update('confessions');

drop trigger if exists trip_reflections_live_update on public.trip_reflections;
create trigger trip_reflections_live_update
after insert or update or delete on public.trip_reflections
for each statement execute function public.community_journal_touch_live_update('reflections');

drop trigger if exists spy_game_sessions_live_update on public.spy_game_sessions;
create trigger spy_game_sessions_live_update
after insert or update or delete on public.spy_game_sessions
for each statement execute function public.spy_game_touch_live_update();

drop trigger if exists spy_game_players_live_update on public.spy_game_players;
create trigger spy_game_players_live_update
after insert or update or delete on public.spy_game_players
for each statement execute function public.spy_game_touch_live_update();

drop trigger if exists spy_game_votes_live_update on public.spy_game_votes;
create trigger spy_game_votes_live_update
after insert or update or delete on public.spy_game_votes
for each statement execute function public.spy_game_touch_live_update();

drop trigger if exists spy_game_missions_live_update on public.spy_game_missions;
create trigger spy_game_missions_live_update
after insert or update or delete on public.spy_game_missions
for each statement execute function public.spy_game_touch_live_update();

revoke all on function public.trip_game_touch_live_update(), public.community_journal_touch_live_update(), public.spy_game_touch_live_update() from public;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_game_live_updates') then
      alter publication supabase_realtime add table public.trip_game_live_updates;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_journal_live_updates') then
      alter publication supabase_realtime add table public.community_journal_live_updates;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'spy_game_live_updates') then
      alter publication supabase_realtime add table public.spy_game_live_updates;
    end if;
  end if;
end;
$$;
