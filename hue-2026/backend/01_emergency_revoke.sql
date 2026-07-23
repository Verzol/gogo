-- Hue 2026 security hardening, phase 1.
--
-- Run this as the database owner, after taking an encrypted data backup. This
-- migration intentionally stops before changing any grants if an account is
-- still missing a password hash. Provision that account privately first; do
-- not re-enable the Internet-facing bootstrap-password RPC.

begin;

do $$
declare
  missing_hashes integer;
begin
  if to_regclass('public.trip_members') is null then
    raise exception 'trip_members does not exist; apply the historical schema first';
  end if;

  select count(*) into missing_hashes
  from public.trip_members
  where password_hash is null or btrim(password_hash) = '';

  if missing_hashes > 0 then
    raise exception using
      message = format('Refusing lockdown: %s trip member(s) have no password hash.', missing_hashes),
      hint = 'Provision a bcrypt password through the owner-only runbook, then rerun this migration.';
  end if;
end;
$$;

-- The database is no longer a browser API. The Edge API gets the minimum
-- service_role grants back in 03_security_lockdown.sql.
revoke usage on schema public from public, anon, authenticated;
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- The old first-password endpoint must never be reachable from the Internet.
revoke all on function public.trip_set_initial_password(text, text)
  from public, anon, authenticated, service_role;

-- This function was callable without a member session. It is not used by the
-- supported UI and stays owner-only even for the Edge service role.
revoke all on function public.spy_game_start_new_session(text[], text[], text[])
  from public, anon, authenticated, service_role;

-- The bucket becomes private in phase 03. Remove every policy that refers to
-- it now so public/list access cannot survive a differently named policy.
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

commit;
