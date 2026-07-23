-- Hue 2026 opt-in Realtime restoration.
--
-- This deliberately trades read confidentiality for instant browser updates.
-- The custom member session is not a Supabase Auth JWT, so Postgres Changes
-- cannot enforce member-only subscriptions. Every row in the listed tables is
-- readable by anyone holding the publishable key. No direct INSERT, UPDATE,
-- DELETE, or RPC permission is restored; writes still go through trip-api.
--
-- Apply only after 03_security_lockdown.sql and only if this trade-off is
-- explicitly accepted by the project owner.

begin;

grant usage on schema public to anon, authenticated;

do $$
declare
  target_table text;
  realtime_tables constant text[] := array[
    'chat_messages',
    'chat_reactions',
    'trip_game_live_updates',
    'community_journal_live_updates',
    'photo_challenge_live_updates',
    'imposter_music_room',
    'spy_game_live_updates'
  ];
begin
  foreach target_table in array realtime_tables
  loop
    if to_regclass('public.' || target_table) is null then
      raise exception 'Required Realtime table public.% does not exist', target_table;
    end if;

    -- Realtime needs SELECT plus an RLS SELECT policy. Keep every write grant
    -- revoked so the browser cannot bypass the trip-api Edge allowlist.
    execute format('grant select on table public.%I to anon, authenticated', target_table);
    execute format('revoke insert, update, delete, truncate, references, trigger on table public.%I from anon, authenticated', target_table);
    execute format('alter table public.%I enable row level security', target_table);
    execute format('drop policy if exists %I on public.%I', 'Browser Realtime read', target_table);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      'Browser Realtime read', target_table
    );
  end loop;
end;
$$;

-- Include full records in update/delete events needed by chat reactions and
-- the existing UI's state-refresh handlers.
alter table public.chat_messages replica identity full;
alter table public.chat_reactions replica identity full;
alter table public.imposter_music_room replica identity full;

do $$
declare
  target_table text;
  realtime_tables constant text[] := array[
    'chat_messages',
    'chat_reactions',
    'trip_game_live_updates',
    'community_journal_live_updates',
    'photo_challenge_live_updates',
    'imposter_music_room',
    'spy_game_live_updates'
  ];
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'supabase_realtime publication does not exist';
  end if;

  foreach target_table in array realtime_tables
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', target_table);
    end if;
  end loop;
end;
$$;

commit;
