-- Run after update_photo_challenge_host_participation.sql and the Photo Challenge fixes.
-- Existing votes for a voter's own team are invalid and are removed once.

delete from public.photo_challenge_votes vote
using public.trip_game_teams team
where vote.game_key = 'anh-challenge-binh-minh'
  and team.game_key = vote.game_key
  and team.username = vote.voter_username
  and team.team_number = vote.team_number;

create or replace function public.photo_challenge_cast_vote(
  p_session_token text,
  p_team_number integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_settings public.photo_challenge_settings%rowtype;
  v_my_team integer;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null then raise exception 'Not authenticated'; end if;

  select * into v_settings from public.photo_challenge_settings
  where game_key = 'anh-challenge-binh-minh';
  if v_settings.vote_status <> 'open' then raise exception 'Voting is not open'; end if;
  if p_team_number not between 1 and v_settings.team_count then raise exception 'Invalid team'; end if;

  select team_number into v_my_team
  from public.trip_game_teams
  where game_key = 'anh-challenge-binh-minh'
    and username = v_member.username;
  if v_my_team is null then raise exception 'You are not assigned to a team'; end if;
  if p_team_number = v_my_team then raise exception 'You cannot vote for your own team'; end if;

  insert into public.photo_challenge_votes (game_key, voter_username, team_number, updated_at)
  values ('anh-challenge-binh-minh', v_member.username, p_team_number, now())
  on conflict (game_key, voter_username) do update
  set team_number = excluded.team_number,
      updated_at = now();

  return public.photo_challenge_get_state(p_session_token);
end;
$$;

revoke all on function public.photo_challenge_cast_vote(text, integer) from public;
grant execute on function public.photo_challenge_cast_vote(text, integer) to anon;
