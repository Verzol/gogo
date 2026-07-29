-- Run after 02_security_prepare.sql to remove the legacy 2,000-character
-- reflection limit while preserving the member-session requirement for writes.

alter table public.trip_reflections
  drop constraint if exists trip_reflections_body_len;

alter table public.trip_reflections
  add constraint trip_reflections_body_len
  check (char_length(btrim(body)) >= 1);

create or replace function public.trip_reflections_save(
  p_session_token text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_member record;
  v_body text := btrim(coalesce(p_body, ''));
  v_opens_at constant timestamptz := timestamptz '2026-07-19 00:00:00+07';
begin
  if now() < v_opens_at then raise exception 'Reflections are not open'; end if;
  if char_length(v_body) < 1 then raise exception 'Invalid reflection'; end if;

  select * into v_member from private.member_from_session(p_session_token);
  if not found then raise exception 'Member session required'; end if;

  insert into public.trip_reflections (username, body, updated_at)
  values (v_member.username, v_body, now())
  on conflict (username) do update
  set body = excluded.body,
      updated_at = excluded.updated_at;

  return public.trip_reflections_get(p_session_token);
end;
$$;
