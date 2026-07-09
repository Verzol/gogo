create or replace function public.trip_list_members()
returns table (
  username text,
  "displayName" text,
  role text
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select trip_members.username, trip_members.display_name as "displayName", trip_members.role
  from public.trip_members
  order by trip_members.created_at, trip_members.username;
$$;

revoke all on function public.trip_list_members() from public;
grant execute on function public.trip_list_members() to anon;
