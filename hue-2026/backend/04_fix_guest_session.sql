-- Hue 2026 post-cutover hotfix.
--
-- Apply after 03_security_lockdown.sql. The original helper's OUT column
-- names (nickname and expires_at) collided with unqualified table columns,
-- causing guest.session to fail through PostgREST. This only replaces the
-- private helper; it preserves all members, password hashes, sessions, and
-- chat data.

begin;

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
  delete from private.guest_sessions as guest_session
  where guest_session.expires_at <= now();

  if v_token is not null then
    select * into v_actor
    from private.guest_sessions as guest_session
    where guest_session.token_hash = extensions.digest(v_token, 'sha256')
      and guest_session.expires_at > now()
    limit 1
    for update;
  end if;

  if found then
    if nullif(btrim(coalesce(p_nickname, '')), '') is not null then
      v_nickname := private.valid_guest_nickname(p_nickname);
      update private.guest_sessions as guest_session
      set nickname = v_nickname, updated_at = now()
      where guest_session.actor_id = v_actor.actor_id
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

revoke execute on function private.issue_guest_session(text, text)
  from public, anon, authenticated;

commit;
