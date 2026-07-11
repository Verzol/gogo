-- Photo Challenge uses two pose cards per team.

delete from public.photo_challenge_draws d
where d.game_key = 'anh-challenge-binh-minh'
  and d.pose_number not in (
    select keep.pose_number
    from public.photo_challenge_draws keep
    where keep.game_key = d.game_key
      and keep.team_number = d.team_number
    order by keep.created_at, keep.pose_number
    limit 2
  );

create or replace function public.photo_challenge_randomize_draws(
  p_session_token text,
  p_team_number integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_team_count integer;
  v_team integer;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then
    raise exception 'Only host can draw poses';
  end if;

  select team_count into v_team_count
  from public.photo_challenge_settings
  where game_key = 'anh-challenge-binh-minh';
  if p_team_number is not null and p_team_number not between 1 and v_team_count then
    raise exception 'Invalid team number';
  end if;

  for v_team in
    select team_number
    from generate_series(1, v_team_count) as teams(team_number)
    where p_team_number is null or team_number = p_team_number
  loop
    delete from public.photo_challenge_draws
    where game_key = 'anh-challenge-binh-minh'
      and team_number = v_team;

    insert into public.photo_challenge_draws (game_key, team_number, pose_number)
    select 'anh-challenge-binh-minh', v_team, pose_number
    from generate_series(1, 5) as poses(pose_number)
    order by random()
    limit 2;
  end loop;

  return public.photo_challenge_get_state(p_session_token);
end;
$$;

create or replace function public.photo_challenge_set_vote_status(
  p_session_token text,
  p_status text,
  p_reset boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_team_count integer;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then
    raise exception 'Only host can control voting';
  end if;
  if p_status not in ('draft', 'open', 'closed') then
    raise exception 'Invalid vote status';
  end if;

  select team_count into v_team_count
  from public.photo_challenge_settings
  where game_key = 'anh-challenge-binh-minh';

  if p_status = 'open' then
    if exists (
      select 1
      from generate_series(1, v_team_count) as teams(team_number)
      where not exists (
        select 1 from public.trip_game_teams t
        where t.game_key = 'anh-challenge-binh-minh'
          and t.team_number = teams.team_number
      )
    ) then
      raise exception 'Every team needs at least one player';
    end if;

    if exists (
      select 1
      from generate_series(1, v_team_count) as teams(team_number)
      where 2 <> (
        select count(*)
        from public.photo_challenge_draws d
        where d.game_key = 'anh-challenge-binh-minh'
          and d.team_number = teams.team_number
      )
    ) then
      raise exception 'Every team needs exactly two poses';
    end if;
  end if;

  if p_reset or p_status = 'draft' then
    delete from public.photo_challenge_votes
    where game_key = 'anh-challenge-binh-minh';
  end if;

  update public.photo_challenge_settings
  set vote_status = p_status,
      updated_at = now()
  where game_key = 'anh-challenge-binh-minh';

  return public.photo_challenge_get_state(p_session_token);
end;
$$;

revoke all on function public.photo_challenge_randomize_draws(text, integer) from public;
revoke all on function public.photo_challenge_set_vote_status(text, text, boolean) from public;

grant execute on function public.photo_challenge_randomize_draws(text, integer) to anon;
grant execute on function public.photo_challenge_set_vote_status(text, text, boolean) to anon;
