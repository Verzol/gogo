-- Run after add_community_journal.sql and update_confession_code_format.sql.
-- Reactions are private writes through an authenticated trip session, while
-- the grouped names are returned with the public confession feed.

create table if not exists public.trip_confession_reactions (
  id uuid primary key default gen_random_uuid(),
  confession_id bigint not null references public.trip_confessions(id) on delete cascade,
  username text not null references public.trip_members(username) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint trip_confession_reactions_allowed_emoji check (
    emoji in ('❤️', '😂', '😮', '😢', '👍', '🔥', '🎉', '🙏', '💀', '🤡')
  ),
  constraint trip_confession_reactions_one_per_member unique (confession_id, username, emoji)
);

create index if not exists trip_confession_reactions_confession_idx
  on public.trip_confession_reactions (confession_id, emoji, created_at);

alter table public.trip_confession_reactions enable row level security;
revoke all on public.trip_confession_reactions from anon, authenticated;

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
    if not exists (
      select 1 from public.trip_confession_reactions
      where confession_id = p_confession_id and emoji = p_emoji
    ) and (
      select count(distinct emoji)
      from public.trip_confession_reactions
      where confession_id = p_confession_id
    ) >= 5 then
      raise exception 'Mỗi confession tối đa 5 icon reaction.';
    end if;

    insert into public.trip_confession_reactions (confession_id, username, emoji)
    values (p_confession_id, v_member.username, p_emoji);
    v_active := true;
  end if;

  return jsonb_build_object('active', v_active, 'username', v_member.username, 'emoji', p_emoji);
end;
$$;

drop function if exists public.trip_confession_list();
create function public.trip_confession_list()
returns table (
  id bigint,
  code text,
  body text,
  "createdAt" timestamptz,
  reactions jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.id,
    public.trip_confession_code(c.id),
    c.body,
    c.created_at as "createdAt",
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'emoji', reaction_group.emoji,
        'users', reaction_group.users
      ) order by reaction_group.user_count desc, reaction_group.emoji)
      from (
        select
          r.emoji,
          count(*) as user_count,
          jsonb_agg(jsonb_build_object(
            'username', m.username,
            'displayName', m.display_name
          ) order by m.created_at, m.username) as users
        from public.trip_confession_reactions r
        join public.trip_members m on m.username = r.username
        where r.confession_id = c.id
        group by r.emoji
      ) reaction_group
    ), '[]'::jsonb) as reactions
  from public.trip_confessions c
  order by c.created_at desc, c.id desc
  limit 100;
$$;

revoke all on function public.trip_confession_toggle_reaction(text, bigint, text) from public;
revoke all on function public.trip_confession_list() from public;
grant execute on function public.trip_confession_toggle_reaction(text, bigint, text) to anon;
grant execute on function public.trip_confession_list() to anon;
