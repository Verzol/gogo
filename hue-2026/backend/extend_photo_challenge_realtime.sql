-- Run after add_photo_challenge_vote_realtime.sql.
-- Keeps draw changes and Storage uploads/deletes in sync without publishing
-- a vote row or a Storage object event to browsers.

alter table public.photo_challenge_live_updates
  add column if not exists album_revision bigint not null default 0;

create or replace function public.photo_challenge_mark_album_changed(p_session_token text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null then raise exception 'Not authenticated'; end if;
  if v_member.role <> 'host' and not exists (
    select 1
    from public.trip_game_teams
    where game_key = 'anh-challenge-binh-minh'
      and username = v_member.username
  ) then
    raise exception 'You are not assigned to a photo challenge team';
  end if;

  update public.photo_challenge_live_updates
  set revision = revision + 1,
      album_revision = album_revision + 1,
      updated_at = now()
  where game_key = 'anh-challenge-binh-minh';
  return true;
end;
$$;

drop trigger if exists photo_challenge_draws_live_update on public.photo_challenge_draws;
create trigger photo_challenge_draws_live_update
after insert or update or delete on public.photo_challenge_draws
for each statement execute function public.photo_challenge_touch_live_update();

revoke all on function public.photo_challenge_mark_album_changed(text) from public;
grant execute on function public.photo_challenge_mark_album_changed(text) to anon;
