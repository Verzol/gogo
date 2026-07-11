-- Run after update_confession_code_format.sql.
-- Keep the short anti-flood cooldown, but do not cap confessions per day.

create or replace function public.trip_confession_submit(
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

revoke all on function public.trip_confession_submit(uuid, text) from public;
grant execute on function public.trip_confession_submit(uuid, text) to anon;
