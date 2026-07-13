-- Run after add_confession_reactions.sql.
-- Limit each member to five distinct icons per confession without limiting
-- the total number of reactions other members can add to that confession.

create or replace function public.trip_confession_toggle_reaction(
  p_session_token text,
  p_confession_id bigint,
  p_emoji text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_active boolean;
begin
  select m.* into v_member
  from public.trip_sessions s
  join public.trip_members m on m.username = s.username
  where s.session_hash = extensions.digest(coalesce(p_session_token, ''), 'sha256')
    and s.expires_at > now()
  limit 1;

  if v_member.username is null then
    raise exception 'Bạn cần đăng nhập để thả reaction.';
  end if;
  if p_emoji not in ('❤️', '😂', '😮', '😢', '👍', '🔥', '🎉', '🙏', '💀', '🤡') then
    raise exception 'Reaction không hợp lệ.';
  end if;
  if not exists (select 1 from public.trip_confessions where id = p_confession_id) then
    raise exception 'Confession không tồn tại.';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_confession_id::text));

  if exists (
    select 1 from public.trip_confession_reactions
    where confession_id = p_confession_id
      and username = v_member.username
      and emoji = p_emoji
  ) then
    delete from public.trip_confession_reactions
    where confession_id = p_confession_id
      and username = v_member.username
      and emoji = p_emoji;
    v_active := false;
  else
    if (
      select count(*)
      from public.trip_confession_reactions
      where confession_id = p_confession_id
        and username = v_member.username
    ) >= 5 then
      raise exception 'Mỗi người chỉ được thả tối đa 5 icon cho một confession.';
    end if;

    insert into public.trip_confession_reactions (confession_id, username, emoji)
    values (p_confession_id, v_member.username, p_emoji);
    v_active := true;
  end if;

  return jsonb_build_object('active', v_active, 'username', v_member.username, 'emoji', p_emoji);
end;
$$;

revoke all on function public.trip_confession_toggle_reaction(text, bigint, text) from public;
grant execute on function public.trip_confession_toggle_reaction(text, bigint, text) to anon;
