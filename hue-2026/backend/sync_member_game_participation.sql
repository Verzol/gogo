-- Keep game participation aligned with the shared trip_members role.

create or replace function public.trip_sync_member_game_participation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.role = 'host' and new.role <> 'host' then
    -- Add a newly promoted player to every game that already has teams.
    insert into public.trip_game_teams (game_key, username, team_number, updated_at)
    select games.game_key,
           new.username,
           (
             select teams.team_number
             from public.trip_game_teams teams
             where teams.game_key = games.game_key
             group by teams.team_number
             order by count(*) asc, teams.team_number asc
             limit 1
           ),
           now()
    from (select distinct game_key from public.trip_game_teams) games
    where not exists (
      select 1
      from public.trip_game_teams existing
      where existing.game_key = games.game_key
        and existing.username = new.username
    )
    on conflict (game_key, username) do nothing;

    -- A player added during an active spy session starts as a villager.
    insert into public.spy_game_players (session_id, username, role, alive)
    select current_session.id, new.username, 'villager', true
    from (
      select id
      from public.spy_game_sessions
      order by created_at desc
      limit 1
    ) current_session
    where not exists (
      select 1
      from public.spy_game_players existing
      where existing.session_id = current_session.id
        and existing.username = new.username
    )
    on conflict (session_id, username) do nothing;
  elsif old.role <> 'host' and new.role = 'host' then
    delete from public.trip_game_teams
    where username = new.username
      and game_key <> 'anh-challenge-binh-minh';

    delete from public.spy_game_votes
    where session_id = public.spy_game_current_session_id()
      and (voter_username = new.username or target_username = new.username);

    delete from public.spy_game_players
    where session_id = public.spy_game_current_session_id()
      and username = new.username;
  end if;

  return new;
end $$;

drop trigger if exists trip_members_sync_game_participation on public.trip_members;
create trigger trip_members_sync_game_participation
after update of role on public.trip_members
for each row
when (old.role is distinct from new.role)
execute function public.trip_sync_member_game_participation();

revoke all on function public.trip_sync_member_game_participation() from public;
