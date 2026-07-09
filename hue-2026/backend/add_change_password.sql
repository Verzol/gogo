create extension if not exists pgcrypto with schema extensions;

create or replace function public.trip_change_password(
  p_session_token text,
  p_current_password text,
  p_new_password text
)
returns table (
  authenticated boolean,
  needs_password boolean,
  username text,
  "displayName" text,
  role text,
  "sessionToken" text,
  "expiresAt" timestamptz,
  message text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  member record;
begin
  if char_length(coalesce(p_new_password, '')) < 4 then
    return query select false, false, null::text, null::text, null::text, null::text, null::timestamptz, 'Mật khẩu mới cần ít nhất 4 ký tự.';
    return;
  end if;

  delete from public.trip_sessions where trip_sessions.expires_at <= now();

  select m.*, s.expires_at
  into member
  from public.trip_sessions s
  join public.trip_members m on m.username = s.username
  where s.session_hash = extensions.digest(coalesce(p_session_token, ''), 'sha256')
    and s.expires_at > now()
  for update of m;

  if not found then
    return query select false, false, null::text, null::text, null::text, null::text, null::timestamptz, 'Session hết hạn.';
    return;
  end if;

  if member.password_hash is null
    or p_current_password is null
    or extensions.crypt(p_current_password, member.password_hash) <> member.password_hash then
    return query select false, false, member.username, member.display_name, member.role, null::text, null::timestamptz, 'Sai mật khẩu cũ.';
    return;
  end if;

  update public.trip_members
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = now()
  where trip_members.username = member.username;

  return query select true, false, member.username, member.display_name, member.role, p_session_token, member.expires_at, null::text;
end;
$$;

revoke all on function public.trip_change_password(text, text, text) from public;
grant execute on function public.trip_change_password(text, text, text) to anon;
