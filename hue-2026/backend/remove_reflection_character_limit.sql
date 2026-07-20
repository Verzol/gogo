-- Run this migration after add_community_journal.sql on existing Supabase projects.

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
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_body text := btrim(coalesce(p_body, ''));
  v_opens_at constant timestamptz := timestamptz '2026-07-19 00:00:00+07';
begin
  if now() < v_opens_at then
    raise exception 'Cảm nhận sẽ mở từ 00:00 Chủ Nhật 19/07 (UTC+7).';
  end if;

  select * into v_member
  from public.trip_reflection_member_from_token(p_session_token);

  if v_member.username is null then
    raise exception 'Bạn cần đăng nhập để viết cảm nhận.';
  end if;

  if char_length(v_body) < 1 then
    raise exception 'Cảm nhận không được để trống.';
  end if;

  insert into public.trip_reflections (username, body, updated_at)
  values (v_member.username, v_body, now())
  on conflict (username) do update
  set body = excluded.body,
      updated_at = excluded.updated_at;

  return public.trip_reflections_get(p_session_token);
end;
$$;

revoke all on function public.trip_reflections_save(text, text) from public;
grant execute on function public.trip_reflections_save(text, text) to anon;
