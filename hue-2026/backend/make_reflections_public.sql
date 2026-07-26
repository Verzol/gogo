-- Run after 02_security_prepare.sql on databases where reflections should be readable without login.
-- Writing remains protected by trip_reflections_save's member-session check.

create or replace function public.trip_reflections_get(p_session_token text default null)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_member record;
  v_is_authenticated boolean;
  v_opens_at constant timestamptz := timestamptz '2026-07-19 00:00:00+07';
  v_is_open boolean := now() >= v_opens_at;
begin
  select * into v_member from private.member_from_session(p_session_token);
  v_is_authenticated := found;

  return jsonb_build_object(
    'open', v_is_open,
    'opensAt', v_opens_at,
    'authenticated', v_is_authenticated,
    'viewer', case when not v_is_authenticated then null else jsonb_build_object(
      'username', v_member.username,
      'displayName', v_member.display_name
    ) end,
    'reflection', case when not v_is_authenticated or not v_is_open then null else (
      select jsonb_build_object('body', r.body, 'updatedAt', r.updated_at)
      from public.trip_reflections r where r.username = v_member.username
    ) end,
    'reflections', case when not v_is_open then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
        'username', r.username,
        'displayName', m.display_name,
        'body', r.body,
        'updatedAt', r.updated_at
      ) order by r.updated_at desc, r.username)
      from public.trip_reflections r
      join public.trip_members m on m.username = r.username
    ), '[]'::jsonb) end
  );
end;
$$;
