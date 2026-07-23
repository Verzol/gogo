-- Hue 2026 security hardening, phase 2.
--
-- This phase creates service-only primitives consumed by the trip-api Edge
-- Function. It does not alter usernames, roles, or an existing password hash.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.guest_sessions (
  actor_id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique,
  nickname text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_sessions_nickname_len check (char_length(btrim(nickname)) between 1 and 32)
);

create index if not exists guest_sessions_expires_at_idx
  on private.guest_sessions (expires_at);

create table if not exists private.login_failure_windows (
  scope text not null,
  key_hash text not null,
  window_started_at timestamptz not null,
  failures integer not null default 0 check (failures >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash, window_started_at)
);

create index if not exists login_failure_windows_cleanup_idx
  on private.login_failure_windows (window_started_at);

create table if not exists private.security_audit_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  subject text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint security_audit_event_type_len check (char_length(event_type) between 1 and 80)
);

revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all sequences in schema private from public, anon, authenticated;

-- New rows carry an unforgeable server-side actor key. Existing chat data is
-- deliberately marked legacy so it remains readable but can never be edited
-- or deleted by a new guest/member identity.
alter table public.chat_messages add column if not exists actor_key text;
-- The pre-existing soft-delete trigger correctly rejects any update to a
-- non-deleted legacy message. Temporarily disable only that trigger while
-- assigning the immutable migration marker; the explicit transaction restores
-- it automatically if this migration fails before the following block.
do $$
declare
  trigger_name text;
begin
  for trigger_name in
    select tg.tgname
    from pg_trigger tg
    join pg_proc proc on proc.oid = tg.tgfoid
    join pg_namespace proc_schema on proc_schema.oid = proc.pronamespace
    where tg.tgrelid = 'public.chat_messages'::regclass
      and not tg.tgisinternal
      and proc_schema.nspname = 'public'
      and proc.proname = 'enforce_chat_soft_delete'
  loop
    execute format('alter table public.chat_messages disable trigger %I', trigger_name);
  end loop;
end;
$$;
update public.chat_messages
set actor_key = 'legacy:' || id::text
where actor_key is null or btrim(actor_key) = '';
do $$
declare
  trigger_name text;
begin
  for trigger_name in
    select tg.tgname
    from pg_trigger tg
    join pg_proc proc on proc.oid = tg.tgfoid
    join pg_namespace proc_schema on proc_schema.oid = proc.pronamespace
    where tg.tgrelid = 'public.chat_messages'::regclass
      and not tg.tgisinternal
      and proc_schema.nspname = 'public'
      and proc.proname = 'enforce_chat_soft_delete'
  loop
    execute format('alter table public.chat_messages enable trigger %I', trigger_name);
  end loop;
end;
$$;
alter table public.chat_messages alter column actor_key set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.chat_messages'::regclass
      and conname = 'chat_messages_actor_key_len'
  ) then
    alter table public.chat_messages add constraint chat_messages_actor_key_len
      check (char_length(actor_key) between 8 and 100);
  end if;
end;
$$;

alter table public.chat_reactions add column if not exists actor_key text;
update public.chat_reactions
set actor_key = 'legacy-reaction:' || id::text
where actor_key is null or btrim(actor_key) = '';
alter table public.chat_reactions alter column actor_key set not null;

create unique index if not exists chat_reactions_one_per_actor_emoji
  on public.chat_reactions (message_id, actor_key, emoji);

-- Internal helper: only the fields needed for authorization cross this
-- boundary. Password/session hashes never appear in a function result.
create or replace function private.member_from_session(p_session_token text)
returns table (
  username text,
  display_name text,
  role text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = private, public, extensions, pg_temp
as $$
  select m.username, m.display_name, m.role, s.expires_at
  from public.trip_sessions s
  join public.trip_members m on m.username = s.username
  where s.session_hash = extensions.digest(coalesce(p_session_token, ''), 'sha256')
    and s.expires_at > now()
  limit 1;
$$;

create or replace function private.issue_member_session(p_username text)
returns table (session_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = private, public, extensions, pg_temp
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at timestamptz := now() + interval '12 hours';
begin
  insert into public.trip_sessions (username, session_hash, expires_at)
  values (p_username, extensions.digest(v_token, 'sha256'), v_expires_at);
  return query select v_token, v_expires_at;
end;
$$;

create or replace function private.valid_guest_nickname(p_nickname text)
returns text
language plpgsql
stable
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_nickname text := left(regexp_replace(btrim(coalesce(p_nickname, 'Khach')), '\s+', ' ', 'g'), 32);
begin
  if char_length(v_nickname) not between 1 and 32 then
    raise exception 'Invalid guest nickname';
  end if;
  if exists (
    select 1
    from public.trip_members m
    where lower(m.username) = lower(v_nickname)
       or lower(m.display_name) = lower(v_nickname)
  ) then
    raise exception 'Guest nickname is reserved';
  end if;
  return v_nickname;
end;
$$;

create or replace function private.issue_guest_session(p_guest_token text, p_nickname text default null)
returns table (guest_token text, actor_key text, nickname text, expires_at timestamptz)
language plpgsql
security definer
set search_path = private, public, extensions, pg_temp
as $$
declare
  v_actor private.guest_sessions%rowtype;
  v_token text := nullif(btrim(coalesce(p_guest_token, '')), '');
  v_nickname text;
begin
  delete from private.guest_sessions where expires_at <= now();

  if v_token is not null then
    select * into v_actor
    from private.guest_sessions
    where token_hash = extensions.digest(v_token, 'sha256')
      and expires_at > now()
    limit 1
    for update;
  end if;

  if found then
    if nullif(btrim(coalesce(p_nickname, '')), '') is not null then
      v_nickname := private.valid_guest_nickname(p_nickname);
      update private.guest_sessions
      set nickname = v_nickname, updated_at = now()
      where actor_id = v_actor.actor_id
      returning * into v_actor;
    end if;
    return query select v_token, 'guest:' || v_actor.actor_id::text, v_actor.nickname, v_actor.expires_at;
    return;
  end if;

  v_nickname := private.valid_guest_nickname(coalesce(nullif(btrim(coalesce(p_nickname, '')), ''), 'Khach'));
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into private.guest_sessions (token_hash, nickname, expires_at)
  values (extensions.digest(v_token, 'sha256'), v_nickname, now() + interval '24 hours')
  returning * into v_actor;
  return query select v_token, 'guest:' || v_actor.actor_id::text, v_actor.nickname, v_actor.expires_at;
end;
$$;

create or replace function private.actor_from_tokens(p_session_token text, p_guest_token text)
returns table (actor_key text, username text, nickname text, is_member boolean)
language plpgsql
stable
security definer
set search_path = private, public, extensions, pg_temp
as $$
declare
  v_member record;
  v_guest private.guest_sessions%rowtype;
begin
  select * into v_member from private.member_from_session(p_session_token);
  if found then
    -- chat_messages caps a visible name at 32 characters while member display
    -- names may be longer; identity remains the server-owned actor key.
    return query select 'member:' || v_member.username, v_member.username, left(v_member.display_name, 32), true;
    return;
  end if;

  select * into v_guest
  from private.guest_sessions
  where token_hash = extensions.digest(coalesce(p_guest_token, ''), 'sha256')
    and expires_at > now()
  limit 1;
  if found then
    return query select 'guest:' || v_guest.actor_id::text, null::text, v_guest.nickname, false;
  end if;
end;
$$;

create or replace function private.failure_window_start(p_window_seconds integer)
returns timestamptz
language sql
stable
set search_path = private, pg_temp
as $$
  select to_timestamp(floor(extract(epoch from now()) / greatest(p_window_seconds, 1)) * greatest(p_window_seconds, 1));
$$;

create or replace function public.trip_api_rate_limit_check(
  p_scope text,
  p_key_hash text,
  p_window_seconds integer,
  p_limit integer
)
returns boolean
language sql
stable
security definer
set search_path = private, public, pg_temp
as $$
  select coalesce((
    select failures >= greatest(p_limit, 1)
    from private.login_failure_windows
    where scope = left(coalesce(p_scope, ''), 80)
      and key_hash = left(coalesce(p_key_hash, ''), 128)
      and window_started_at = private.failure_window_start(p_window_seconds)
  ), false);
$$;

create or replace function public.trip_api_rate_limit_record_failure(
  p_scope text,
  p_key_hash text,
  p_window_seconds integer
)
returns void
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_started_at timestamptz := private.failure_window_start(p_window_seconds);
begin
  insert into private.login_failure_windows (scope, key_hash, window_started_at, failures, updated_at)
  values (left(coalesce(p_scope, ''), 80), left(coalesce(p_key_hash, ''), 128), v_started_at, 1, now())
  on conflict (scope, key_hash, window_started_at) do update
  set failures = private.login_failure_windows.failures + 1,
      updated_at = now();
  delete from private.login_failure_windows where window_started_at < now() - interval '2 days';
end;
$$;

create or replace function public.trip_api_auth_login(
  p_username text,
  p_password text,
  p_account_key_hash text,
  p_ip_key_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, extensions, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_session record;
  v_cost integer;
  v_account_started_at timestamptz := private.failure_window_start(900);
  v_ip_started_at timestamptz := private.failure_window_start(3600);
  v_account_key text := left(coalesce(p_account_key_hash, ''), 128);
  v_ip_key text := left(coalesce(p_ip_key_hash, ''), 128);
begin
  -- The check and increment live in one locked transaction. Splitting them
  -- across Edge calls lets concurrent bad-password requests bypass a limit.
  if v_account_key !~ '^[0-9a-f]{64}$' or v_ip_key !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('authenticated', false);
  end if;
  perform pg_advisory_xact_lock(hashtext('trip-api-login-account:' || v_account_key));
  perform pg_advisory_xact_lock(hashtext('trip-api-login-ip:' || v_ip_key));
  if exists (
    select 1
    from private.login_failure_windows
    where scope = 'login-ip-account'
      and key_hash = v_account_key
      and window_started_at = v_account_started_at
      and failures >= 5
  ) or exists (
    select 1
    from private.login_failure_windows
    where scope = 'login-ip'
      and key_hash = v_ip_key
      and window_started_at = v_ip_started_at
      and failures >= 30
  ) then
    insert into private.security_audit_events (event_type, subject, detail)
    values ('member.login.throttled', left(btrim(coalesce(p_username, '')), 32), jsonb_build_object('scope', 'edge'));
    return jsonb_build_object('authenticated', false, 'throttled', true);
  end if;

  select * into v_member
  from public.trip_members
  where username = btrim(coalesce(p_username, ''))
  limit 1
  for update;

  if not found
     or v_member.password_hash is null
     or coalesce(p_password, '') = ''
     or extensions.crypt(p_password, v_member.password_hash) <> v_member.password_hash then
    insert into private.login_failure_windows (scope, key_hash, window_started_at, failures, updated_at)
    values ('login-ip-account', v_account_key, v_account_started_at, 1, now())
    on conflict (scope, key_hash, window_started_at) do update
    set failures = private.login_failure_windows.failures + 1,
        updated_at = now();
    insert into private.login_failure_windows (scope, key_hash, window_started_at, failures, updated_at)
    values ('login-ip', v_ip_key, v_ip_started_at, 1, now())
    on conflict (scope, key_hash, window_started_at) do update
    set failures = private.login_failure_windows.failures + 1,
        updated_at = now();
    insert into private.security_audit_events (event_type, subject, detail)
    values ('member.login.failed', left(btrim(coalesce(p_username, '')), 32), jsonb_build_object('scope', 'edge'));
    delete from private.login_failure_windows where window_started_at < now() - interval '2 days';
    return jsonb_build_object('authenticated', false);
  end if;

  v_cost := coalesce((regexp_match(v_member.password_hash, '^\$2[abxy]\$([0-9]{2})\$'))[1]::integer, 0);
  if v_cost < 12 then
    update public.trip_members
    set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 12)),
        updated_at = now()
    where username = v_member.username;
  end if;

  -- A successful login rotates the token and invalidates prior browser copies.
  delete from public.trip_sessions where username = v_member.username or expires_at <= now();
  delete from private.login_failure_windows
  where (scope = 'login-ip-account' and key_hash = v_account_key)
     or (scope = 'login-ip' and key_hash = v_ip_key);
  select * into v_session from private.issue_member_session(v_member.username);
  insert into private.security_audit_events (event_type, subject)
  values ('member.login.success', v_member.username);

  return jsonb_build_object(
    'authenticated', true,
    'username', v_member.username,
    'displayName', v_member.display_name,
    'role', v_member.role,
    'sessionToken', v_session.session_token,
    'expiresAt', v_session.expires_at
  );
end;
$$;

create or replace function public.trip_api_auth_session(p_session_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_member record;
begin
  select * into v_member from private.member_from_session(p_session_token);
  if not found then return jsonb_build_object('authenticated', false); end if;
  return jsonb_build_object(
    'authenticated', true,
    'username', v_member.username,
    'displayName', v_member.display_name,
    'role', v_member.role,
    'expiresAt', v_member.expires_at
  );
end;
$$;

create or replace function public.trip_api_auth_logout(p_session_token text)
returns boolean
language plpgsql
security definer
set search_path = private, public, extensions, pg_temp
as $$
declare
  v_username text;
begin
  select username into v_username from private.member_from_session(p_session_token);
  delete from public.trip_sessions
  where session_hash = extensions.digest(coalesce(p_session_token, ''), 'sha256');
  if v_username is not null then
    insert into private.security_audit_events (event_type, subject) values ('member.logout', v_username);
  end if;
  return true;
end;
$$;

create or replace function public.trip_api_auth_change_password(
  p_session_token text,
  p_current_password text,
  p_new_password text
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, extensions, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_session record;
begin
  if char_length(coalesce(p_new_password, '')) < 12 then
    return jsonb_build_object('authenticated', false, 'message', 'Mật khẩu mới cần ít nhất 12 ký tự.');
  end if;

  select m.* into v_member
  from public.trip_sessions s
  join public.trip_members m on m.username = s.username
  where s.session_hash = extensions.digest(coalesce(p_session_token, ''), 'sha256')
    and s.expires_at > now()
  limit 1
  for update of m;
  if not found
     or v_member.password_hash is null
     or extensions.crypt(coalesce(p_current_password, ''), v_member.password_hash) <> v_member.password_hash then
    return jsonb_build_object('authenticated', false, 'message', 'Không thể đổi mật khẩu.');
  end if;

  update public.trip_members
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 12)),
      updated_at = now()
  where username = v_member.username;
  delete from public.trip_sessions where username = v_member.username;
  select * into v_session from private.issue_member_session(v_member.username);
  insert into private.security_audit_events (event_type, subject) values ('member.password.changed', v_member.username);
  return jsonb_build_object(
    'authenticated', true,
    'username', v_member.username,
    'displayName', v_member.display_name,
    'role', v_member.role,
    'sessionToken', v_session.session_token,
    'expiresAt', v_session.expires_at
  );
end;
$$;

create or replace function public.trip_api_guest_session(p_guest_token text default null, p_nickname text default null)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_guest record;
begin
  select * into v_guest from private.issue_guest_session(p_guest_token, p_nickname);
  return jsonb_build_object(
    'guestToken', v_guest.guest_token,
    'actorKey', v_guest.actor_key,
    'nickname', v_guest.nickname,
    'expiresAt', v_guest.expires_at
  );
end;
$$;

create or replace function public.trip_api_chat_list(p_session_token text default null, p_guest_token text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_actor record;
begin
  select * into v_actor from private.actor_from_tokens(p_session_token, p_guest_token);
  return jsonb_build_object(
    'viewerActorKey', v_actor.actor_key,
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', row.id,
        'user_id', row.actor_key,
        'username', row.username,
        'body', row.body,
        'created_at', row.created_at,
        'reply_to_id', row.reply_to_id,
        'reply_to_username', row.reply_to_username,
        'reply_to_body', row.reply_to_body
      ) order by row.created_at, row.id)
      from (
        select * from public.chat_messages
        order by created_at desc, id desc
        limit 1000
      ) row
    ), '[]'::jsonb),
    'reactions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'message_id', r.message_id,
        'user_id', r.actor_key,
        'emoji', r.emoji
      ) order by r.created_at, r.id)
      from public.chat_reactions r
      where r.message_id in (
        select id from public.chat_messages order by created_at desc, id desc limit 1000
      )
    ), '[]'::jsonb),
    'count', least((select count(*) from public.chat_messages), 1000)
  );
end;
$$;

create or replace function public.trip_api_chat_send(
  p_session_token text,
  p_guest_token text,
  p_nickname text,
  p_body text,
  p_reply_to_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, extensions, pg_temp
as $$
declare
  v_actor record;
  v_guest record;
  v_body text := btrim(coalesce(p_body, ''));
  v_reply public.chat_messages%rowtype;
  v_message public.chat_messages%rowtype;
begin
  if char_length(v_body) not between 1 and 500 then raise exception 'Invalid chat message'; end if;
  if nullif(btrim(coalesce(p_guest_token, '')), '') is not null and nullif(btrim(coalesce(p_nickname, '')), '') is not null then
    select * into v_guest from private.issue_guest_session(p_guest_token, p_nickname);
    p_guest_token := v_guest.guest_token;
  end if;
  select * into v_actor from private.actor_from_tokens(p_session_token, p_guest_token);
  if not found then raise exception 'Guest or member session required'; end if;
  if p_reply_to_id is not null then
    select * into v_reply from public.chat_messages where id = p_reply_to_id and btrim(body) <> '';
  end if;
  insert into public.chat_messages (actor_key, user_id, username, body, reply_to_id, reply_to_username, reply_to_body)
  values (
    v_actor.actor_key,
    v_actor.actor_key,
    v_actor.nickname,
    v_body,
    v_reply.id,
    case when v_reply.id is null then null else v_reply.username end,
    case when v_reply.id is null then null else left(v_reply.body, 90) end
  )
  returning * into v_message;
  return jsonb_build_object(
    'id', v_message.id, 'user_id', v_message.actor_key, 'username', v_message.username,
    'body', v_message.body, 'created_at', v_message.created_at, 'reply_to_id', v_message.reply_to_id,
    'reply_to_username', v_message.reply_to_username, 'reply_to_body', v_message.reply_to_body
  );
end;
$$;

create or replace function public.trip_api_chat_delete(
  p_session_token text,
  p_guest_token text,
  p_message_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_actor record;
begin
  select * into v_actor from private.actor_from_tokens(p_session_token, p_guest_token);
  if not found then raise exception 'Guest or member session required'; end if;
  update public.chat_messages
  set body = '', reply_to_id = null, reply_to_username = null, reply_to_body = null
  where id = p_message_id and actor_key = v_actor.actor_key and btrim(body) <> '';
  if not found then raise exception 'Message not found or not owned by actor'; end if;
  return true;
end;
$$;

create or replace function public.trip_api_chat_toggle_reaction(
  p_session_token text,
  p_guest_token text,
  p_message_id uuid,
  p_emoji text
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_actor record;
  v_active boolean;
begin
  if char_length(btrim(coalesce(p_emoji, ''))) not between 1 and 16 then raise exception 'Invalid reaction'; end if;
  select * into v_actor from private.actor_from_tokens(p_session_token, p_guest_token);
  if not found then raise exception 'Guest or member session required'; end if;
  if not exists (select 1 from public.chat_messages where id = p_message_id and btrim(body) <> '') then
    raise exception 'Message not found';
  end if;
  delete from public.chat_reactions
  where message_id = p_message_id and actor_key = v_actor.actor_key and emoji = btrim(p_emoji);
  if found then
    v_active := false;
  else
    if (select count(distinct emoji) from public.chat_reactions where message_id = p_message_id) >= 5 then
      raise exception 'Too many reactions';
    end if;
    insert into public.chat_reactions (message_id, user_id, actor_key, emoji)
    values (p_message_id, v_actor.actor_key, v_actor.actor_key, btrim(p_emoji));
    v_active := true;
  end if;
  return jsonb_build_object('active', v_active, 'message_id', p_message_id, 'user_id', v_actor.actor_key, 'emoji', btrim(p_emoji));
end;
$$;

-- Do not let any service-only helper accidentally return password_hash. The
-- legacy functions still return their existing composite type for compatibility
-- with internal game functions, but the sensitive field is always NULL.
create or replace function public.trip_game_member_from_token(p_session_token text)
returns public.trip_members
language sql
stable
security definer
set search_path = private, public, pg_temp
as $$
  select row(identity.username, identity.display_name, identity.role, null::text, now(), now())::public.trip_members
  from private.member_from_session(p_session_token) identity
  limit 1;
$$;

create or replace function public.trip_reflection_member_from_token(p_session_token text)
returns public.trip_members
language sql
stable
security definer
set search_path = private, public, pg_temp
as $$
  select row(identity.username, identity.display_name, identity.role, null::text, now(), now())::public.trip_members
  from private.member_from_session(p_session_token) identity
  limit 1;
$$;

create or replace function public.imposter_music_is_host(p_session_token text)
returns public.trip_members
language plpgsql
stable
security definer
set search_path = private, public, pg_temp
as $$
declare v_member public.trip_members%rowtype;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then
    raise exception 'Only host can control imposter music';
  end if;
  return v_member;
end;
$$;

-- Reflections are member-only even after their scheduled opening time.
create or replace function public.trip_reflections_get(p_session_token text default null)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_member record;
  v_opens_at constant timestamptz := timestamptz '2026-07-19 00:00:00+07';
  v_is_open boolean := now() >= v_opens_at;
begin
  select * into v_member from private.member_from_session(p_session_token);
  if not found then
    return jsonb_build_object('open', v_is_open, 'opensAt', v_opens_at, 'authenticated', false, 'viewer', null, 'reflection', null, 'reflections', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'open', v_is_open,
    'opensAt', v_opens_at,
    'authenticated', true,
    'viewer', jsonb_build_object('username', v_member.username, 'displayName', v_member.display_name),
    'reflection', case when not v_is_open then null else (
      select jsonb_build_object('body', r.body, 'updatedAt', r.updated_at)
      from public.trip_reflections r where r.username = v_member.username
    ) end,
    'reflections', case when not v_is_open then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object('username', r.username, 'displayName', m.display_name, 'body', r.body, 'updatedAt', r.updated_at) order by r.updated_at desc, r.username)
      from public.trip_reflections r join public.trip_members m on m.username = r.username
    ), '[]'::jsonb) end
  );
end;
$$;

create or replace function public.trip_reflections_save(p_session_token text, p_body text)
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
  if char_length(v_body) not between 1 and 2000 then raise exception 'Invalid reflection'; end if;
  select * into v_member from private.member_from_session(p_session_token);
  if not found then raise exception 'Member session required'; end if;
  insert into public.trip_reflections (username, body, updated_at)
  values (v_member.username, v_body, now())
  on conflict (username) do update set body = excluded.body, updated_at = excluded.updated_at;
  return public.trip_reflections_get(p_session_token);
end;
$$;

alter function public.trip_confession_code(bigint) set search_path = public, pg_temp;

revoke execute on all functions in schema private from public, anon, authenticated;

commit;
