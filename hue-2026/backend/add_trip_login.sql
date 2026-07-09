create extension if not exists pgcrypto with schema extensions;

create table if not exists public.trip_members (
  username text primary key,
  display_name text not null,
  role text not null default 'member',
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_members_username_len check (char_length(btrim(username)) between 1 and 32),
  constraint trip_members_display_name_len check (char_length(btrim(display_name)) between 1 and 64),
  constraint trip_members_role_len check (char_length(btrim(role)) between 1 and 32)
);

insert into public.trip_members (username, display_name, role)
values
  ('mạnh', 'Mạnh', 'member'),
  ('san', 'San', 'member'),
  ('thảo', 'Thảo', 'member'),
  ('mi', 'Mi', 'member'),
  ('linh', 'Linh', 'member'),
  ('tamle', 'Tâm', 'member'),
  ('dan', 'An', 'member'),
  ('quanlele', 'Quân', 'member'),
  ('minhtran', 'Minh Trần', 'member'),
  ('gtm', 'Minh', 'member')
on conflict (username) do update
set display_name = excluded.display_name,
    updated_at = now();

create table if not exists public.trip_sessions (
  id uuid primary key default gen_random_uuid(),
  username text not null references public.trip_members(username) on delete cascade,
  session_hash bytea not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists trip_sessions_username_idx
  on public.trip_sessions (username);

create index if not exists trip_sessions_expires_at_idx
  on public.trip_sessions (expires_at);

alter table public.trip_members enable row level security;
alter table public.trip_sessions enable row level security;

revoke all on public.trip_members from anon;
revoke all on public.trip_sessions from anon;

create or replace function public.trip_login(p_username text, p_password text default null)
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
  token text;
  expires timestamptz := now() + interval '30 days';
begin
  select *
  into member
  from public.trip_members
  where trip_members.username = btrim(p_username);

  if not found then
    return query select false, false, null::text, null::text, null::text, null::text, null::timestamptz, 'Tài khoản không tồn tại.';
    return;
  end if;

  if member.password_hash is null then
    return query select false, true, member.username, member.display_name, member.role, null::text, null::timestamptz, 'Tài khoản cần đặt mật khẩu.';
    return;
  end if;

  if p_password is null or extensions.crypt(p_password, member.password_hash) <> member.password_hash then
    return query select false, false, member.username, member.display_name, member.role, null::text, null::timestamptz, 'Sai mật khẩu.';
    return;
  end if;

  delete from public.trip_sessions where trip_sessions.expires_at <= now();

  token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.trip_sessions (username, session_hash, expires_at)
  values (member.username, extensions.digest(token, 'sha256'), expires);

  return query select true, false, member.username, member.display_name, member.role, token, expires, null::text;
end;
$$;

create or replace function public.trip_set_initial_password(p_username text, p_password text)
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
  token text;
  expires timestamptz := now() + interval '30 days';
begin
  if char_length(coalesce(p_password, '')) < 4 then
    return query select false, true, null::text, null::text, null::text, null::text, null::timestamptz, 'Mật khẩu cần ít nhất 4 ký tự.';
    return;
  end if;

  select *
  into member
  from public.trip_members
  where trip_members.username = btrim(p_username)
  for update;

  if not found then
    return query select false, false, null::text, null::text, null::text, null::text, null::timestamptz, 'Tài khoản không tồn tại.';
    return;
  end if;

  if member.password_hash is not null then
    return query select false, false, member.username, member.display_name, member.role, null::text, null::timestamptz, 'Tài khoản đã có mật khẩu.';
    return;
  end if;

  update public.trip_members
  set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
      updated_at = now()
  where trip_members.username = member.username;

  delete from public.trip_sessions where trip_sessions.expires_at <= now();

  token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.trip_sessions (username, session_hash, expires_at)
  values (member.username, extensions.digest(token, 'sha256'), expires);

  return query select true, false, member.username, member.display_name, member.role, token, expires, null::text;
end;
$$;

create or replace function public.trip_validate_session(p_session_token text)
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
begin
  delete from public.trip_sessions where trip_sessions.expires_at <= now();

  return query
  select true, false, m.username, m.display_name, m.role, p_session_token, s.expires_at, null::text
  from public.trip_sessions s
  join public.trip_members m on m.username = s.username
  where s.session_hash = extensions.digest(coalesce(p_session_token, ''), 'sha256')
    and s.expires_at > now()
  limit 1;

  if not found then
    return query select false, false, null::text, null::text, null::text, null::text, null::timestamptz, 'Session hết hạn.';
  end if;
end;
$$;

revoke all on function public.trip_login(text, text) from public;
revoke all on function public.trip_set_initial_password(text, text) from public;
revoke all on function public.trip_validate_session(text) from public;

grant execute on function public.trip_login(text, text) to anon;
grant execute on function public.trip_set_initial_password(text, text) to anon;
grant execute on function public.trip_validate_session(text) to anon;
