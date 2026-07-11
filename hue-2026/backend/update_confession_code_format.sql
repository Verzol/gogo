-- Run after add_community_journal.sql.
-- Codes are shown as #000001, #000002, and so on.

do $$
begin
  -- Safely correct databases created with the older #10045 example.
  if not exists (select 1 from public.trip_confessions) then
    alter table public.trip_confessions
      alter column id restart with 1;
  end if;
end;
$$;

create or replace function public.trip_confession_code(p_id bigint)
returns text
language sql
immutable
strict
as $$
  select '#' || lpad(p_id::text, 6, '0');
$$;

drop function if exists public.trip_confession_submit(uuid, text);
create function public.trip_confession_submit(
  p_author_token uuid,
  p_body text
)
returns table (
  id bigint,
  code text,
  body text,
  "createdAt" timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_body text := btrim(coalesce(p_body, ''));
begin
  if char_length(v_body) not between 1 and 800 then
    raise exception 'Confession cần từ 1 đến 800 ký tự.';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_author_token::text));

  if exists (
    select 1
    from public.trip_confessions c
    where c.author_token = p_author_token
      and c.created_at > now() - interval '30 seconds'
  ) then
    raise exception 'Bạn vừa gửi rồi, chờ 30 giây nhé.';
  end if;

  if (
    select count(*)
    from public.trip_confessions c
    where c.author_token = p_author_token
      and c.created_at >= now() - interval '24 hours'
  ) >= 15 then
    raise exception 'Bạn đã gửi đủ 15 confession trong hôm nay.';
  end if;

  return query
  insert into public.trip_confessions (author_token, body)
  values (p_author_token, v_body)
  returning
    trip_confessions.id,
    public.trip_confession_code(trip_confessions.id),
    trip_confessions.body,
    trip_confessions.created_at;
end;
$$;

drop function if exists public.trip_confession_list();
create function public.trip_confession_list()
returns table (
  id bigint,
  code text,
  body text,
  "createdAt" timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.id, public.trip_confession_code(c.id), c.body, c.created_at as "createdAt"
  from public.trip_confessions c
  order by c.created_at desc, c.id desc
  limit 100;
$$;

revoke all on function public.trip_confession_code(bigint) from public;
revoke all on function public.trip_confession_submit(uuid, text) from public;
revoke all on function public.trip_confession_list() from public;

grant execute on function public.trip_confession_submit(uuid, text) to anon;
grant execute on function public.trip_confession_list() to anon;
