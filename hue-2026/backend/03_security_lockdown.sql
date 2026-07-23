-- Hue 2026 security hardening, phase 3.
--
-- Apply only after the trip-api Edge Function and the frontend client have
-- been deployed. This is intentionally idempotent and invalidates every old
-- browser session once; usernames, roles, and password hashes are untouched.

begin;

-- Storage is private. Signed URLs are generated only by trip-api for a member
-- session and expire after five minutes.
update storage.buckets
set public = false,
    file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'trip-game-photos';

do $$
declare
  policy_name text;
begin
  for policy_name in
    select pol.polname
    from pg_policy pol
    join pg_class rel on rel.oid = pol.polrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'storage'
      and rel.relname = 'objects'
      and coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') like '%trip-game-photos%'
  loop
    execute format('drop policy if exists %I on storage.objects', policy_name);
  end loop;
end;
$$;

revoke all on storage.objects from public, anon, authenticated;

-- No public table has a direct browser use after the Edge cutover. Removing
-- every policy avoids permissive policies surviving under a different name.
do $$
declare
  target record;
  policy_name text;
begin
  for target in
    select c.oid, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('alter table public.%I enable row level security', target.relname);
    for policy_name in
      select polname from pg_policy where polrelid = target.oid
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, target.relname);
    end loop;
  end loop;
end;
$$;

-- Realtime row replication would expose table rows before the Edge can apply
-- authorization. The client now polls the sanitized API response instead.
do $$
declare
  target record;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    for target in
      select c.relname
      from pg_publication_rel pr
      join pg_publication pub on pub.oid = pr.prpubid
      join pg_class c on c.oid = pr.prrelid
      join pg_namespace n on n.oid = c.relnamespace
      where pub.pubname = 'supabase_realtime' and n.nspname = 'public'
    loop
      execute format('alter publication supabase_realtime drop table public.%I', target.relname);
    end loop;
  end if;
end;
$$;

revoke usage on schema public from public, anon, authenticated;
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

grant usage on schema public to service_role;

-- Do not let a future table/function silently become part of the Data API.
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema private
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema private
  revoke execute on functions from public, anon, authenticated;

-- Explicit service-only function allowlist. The browser can call only the
-- trip-api Edge Function; its service credential may call these procedures.
do $$
declare
  fn record;
  allowed_names constant text[] := array[
    'trip_api_auth_login', 'trip_api_auth_session', 'trip_api_auth_logout',
    'trip_api_auth_change_password', 'trip_api_guest_session',
    'trip_api_chat_list', 'trip_api_chat_send', 'trip_api_chat_delete',
    'trip_api_chat_toggle_reaction',
    'trip_list_members', 'trip_confession_list', 'trip_confession_submit',
    'trip_confession_toggle_reaction', 'trip_reflections_get', 'trip_reflections_save',
    'trip_games_get_public_state', 'trip_games_get_state',
    'trip_game_save_teams', 'trip_game_save_results',
    'photo_challenge_get_state', 'photo_challenge_cast_vote',
    'photo_challenge_set_team_count', 'photo_challenge_randomize_draws',
    'photo_challenge_set_vote_status', 'photo_challenge_mark_album_changed',
    'imposter_music_get_state', 'imposter_music_add_track',
    'imposter_music_delete_track', 'imposter_music_finish_round',
    'imposter_music_open_round', 'imposter_music_randomize_round',
    'imposter_music_save_draft', 'imposter_music_set_ready',
    'imposter_music_start_round', 'imposter_music_update_track',
    'spy_game_get_state', 'spy_game_start_current', 'spy_game_update_session',
    'spy_game_update_player', 'spy_game_set_voting', 'spy_game_cast_votes',
    'spy_game_upsert_mission', 'spy_game_delete_mission', 'spy_game_set_mission_visibility'
  ];
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any(allowed_names)
  loop
    execute format('grant execute on function %s to service_role', fn.signature);
  end loop;
end;
$$;

-- Never grant the bootstrap or raw composite helpers, even to service_role.
revoke all on function public.trip_set_initial_password(text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.spy_game_start_new_session(text[], text[], text[])
  from public, anon, authenticated, service_role;
revoke all on function public.trip_game_member_from_token(text)
  from public, anon, authenticated, service_role;
revoke all on function public.trip_reflection_member_from_token(text)
  from public, anon, authenticated, service_role;
revoke all on function public.imposter_music_is_host(text)
  from public, anon, authenticated, service_role;

-- Harden every remaining SECURITY DEFINER function in the exposed schema.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    -- trip-api and the compatibility helpers intentionally call private
    -- authorization primitives. Keep their path explicit instead of
    -- clobbering it with the legacy public-only path.
    if fn.proname like 'trip_api_%'
       or fn.proname in ('trip_game_member_from_token', 'trip_reflection_member_from_token', 'imposter_music_is_host') then
      execute format('alter function %s set search_path = private, public, extensions, pg_temp', fn.signature);
    else
      execute format('alter function %s set search_path = public, pg_temp', fn.signature);
    end if;
  end loop;
end;
$$;

-- Force a one-time member re-login under the 12-hour rotating session model.
delete from public.trip_sessions;
delete from private.guest_sessions where expires_at <= now();

commit;
