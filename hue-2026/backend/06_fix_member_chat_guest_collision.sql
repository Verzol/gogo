-- Hue 2026 member chat hotfix.
--
-- Apply after 03_security_lockdown.sql. Browsers can retain a guest token after
-- a member logs in. A valid member session must take precedence so the guest
-- nickname reservation check cannot reject that member's own display name.

begin;

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
  if not exists (select 1 from private.member_from_session(p_session_token))
     and nullif(btrim(coalesce(p_guest_token, '')), '') is not null
     and nullif(btrim(coalesce(p_nickname, '')), '') is not null then
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

revoke all on function public.trip_api_chat_send(text, text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.trip_api_chat_send(text, text, text, text, uuid)
  to service_role;

commit;
