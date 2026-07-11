-- Photo challenge configuration, pose draws, and team voting.
create table if not exists public.photo_challenge_settings (
  game_key text primary key,
  team_count integer not null default 2 check (team_count in (2, 3)),
  vote_status text not null default 'draft' check (vote_status in ('draft', 'open', 'closed')),
  updated_at timestamptz not null default now()
);

create table if not exists public.photo_challenge_draws (
  game_key text not null references public.photo_challenge_settings(game_key) on delete cascade,
  team_number integer not null check (team_number between 1 and 3),
  pose_number integer not null check (pose_number between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (game_key, team_number, pose_number)
);

create table if not exists public.photo_challenge_votes (
  game_key text not null references public.photo_challenge_settings(game_key) on delete cascade,
  voter_username text not null references public.trip_members(username) on delete cascade,
  team_number integer not null check (team_number between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (game_key, voter_username)
);

insert into public.photo_challenge_settings (game_key, team_count, vote_status)
values ('anh-challenge-binh-minh', 2, 'draft')
on conflict (game_key) do nothing;

alter table public.photo_challenge_settings enable row level security;
alter table public.photo_challenge_draws enable row level security;
alter table public.photo_challenge_votes enable row level security;

revoke all on public.photo_challenge_settings from anon;
revoke all on public.photo_challenge_draws from anon;
revoke all on public.photo_challenge_votes from anon;

create or replace function public.photo_challenge_public_state()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with settings as (
    select * from public.photo_challenge_settings
    where game_key = 'anh-challenge-binh-minh'
  ), tallies as (
    select series.team_number,
      case when s.vote_status = 'closed' then count(v.voter_username)::integer else 0 end as vote_count
    from settings s
    cross join lateral generate_series(1, s.team_count) as series(team_number)
    left join public.photo_challenge_votes v
      on v.game_key = s.game_key and v.team_number = series.team_number
    group by series.team_number, s.vote_status
  )
  select jsonb_build_object(
    'teamCount', s.team_count,
    'voteStatus', s.vote_status,
    'draws', coalesce((
      select jsonb_agg(jsonb_build_object(
        'teamNumber', d.team_number,
        'poseNumber', d.pose_number
      ) order by d.team_number, d.pose_number)
      from public.photo_challenge_draws d
      where d.game_key = s.game_key
    ), '[]'::jsonb),
    'voteTallies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'teamNumber', t.team_number,
        'voteCount', t.vote_count
      ) order by t.team_number)
      from tallies t
    ), '[]'::jsonb)
  )
  from settings s;
$$;

create or replace function public.photo_challenge_get_state(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_public jsonb;
  v_team integer;
  v_vote integer;
  v_host_tallies jsonb;
begin
  v_public := public.photo_challenge_public_state();
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null then
    return v_public || jsonb_build_object('authenticated', false);
  end if;

  select t.team_number into v_team
  from public.trip_game_teams t
  where t.game_key = 'anh-challenge-binh-minh'
    and t.username = v_member.username;

  select v.team_number into v_vote
  from public.photo_challenge_votes v
  where v.game_key = 'anh-challenge-binh-minh'
    and v.voter_username = v_member.username;

  if v_member.role = 'host' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'teamNumber', series.team_number,
      'voteCount', coalesce(votes.vote_count, 0)
    ) order by series.team_number), '[]'::jsonb)
    into v_host_tallies
    from generate_series(1, (v_public->>'teamCount')::integer) as series(team_number)
    left join (
      select team_number, count(*)::integer as vote_count
      from public.photo_challenge_votes
      where game_key = 'anh-challenge-binh-minh'
      group by team_number
    ) votes on votes.team_number = series.team_number;
  end if;

  return v_public || jsonb_build_object(
    'authenticated', true,
    'viewer', jsonb_build_object('username', v_member.username, 'role', v_member.role),
    'myTeam', coalesce(v_team, 0),
    'myVote', coalesce(v_vote, 0),
    'voteTallies', case when v_member.role = 'host' then v_host_tallies else v_public->'voteTallies' end
  );
end;
$$;

create or replace function public.photo_challenge_set_team_count(
  p_session_token text,
  p_team_count integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then
    raise exception 'Only host can configure teams';
  end if;
  if p_team_count not in (2, 3) then raise exception 'Team count must be 2 or 3'; end if;

  update public.photo_challenge_settings
  set team_count = p_team_count,
      vote_status = 'draft',
      updated_at = now()
  where game_key = 'anh-challenge-binh-minh';

  delete from public.trip_game_teams
  where game_key = 'anh-challenge-binh-minh' and team_number > p_team_count;
  delete from public.photo_challenge_draws
  where game_key = 'anh-challenge-binh-minh' and team_number > p_team_count;
  delete from public.photo_challenge_votes
  where game_key = 'anh-challenge-binh-minh';

  return public.photo_challenge_get_state(p_session_token);
end;
$$;

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
    where game_key = 'anh-challenge-binh-minh' and team_number = v_team;

    insert into public.photo_challenge_draws (game_key, team_number, pose_number)
    select 'anh-challenge-binh-minh', v_team, pose_number
    from generate_series(1, 5) as poses(pose_number)
    order by random()
    limit 4;
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
  if p_status not in ('draft', 'open', 'closed') then raise exception 'Invalid vote status'; end if;

  select team_count into v_team_count
  from public.photo_challenge_settings
  where game_key = 'anh-challenge-binh-minh';

  if p_status = 'open' then
    if exists (
      select 1 from generate_series(1, v_team_count) as teams(team_number)
      where not exists (
        select 1 from public.trip_game_teams t
        where t.game_key = 'anh-challenge-binh-minh'
          and t.team_number = teams.team_number
      )
    ) then raise exception 'Every team needs at least one player'; end if;

    if exists (
      select 1 from generate_series(1, v_team_count) as teams(team_number)
      where 4 <> (
        select count(*) from public.photo_challenge_draws d
        where d.game_key = 'anh-challenge-binh-minh'
          and d.team_number = teams.team_number
      )
    ) then raise exception 'Every team needs exactly four poses'; end if;
  end if;

  if p_reset or p_status = 'draft' then
    delete from public.photo_challenge_votes where game_key = 'anh-challenge-binh-minh';
  end if;

  update public.photo_challenge_settings
  set vote_status = p_status, updated_at = now()
  where game_key = 'anh-challenge-binh-minh';

  return public.photo_challenge_get_state(p_session_token);
end;
$$;

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
  if v_member.role = 'host' then raise exception 'Hosts cannot vote'; end if;

  select * into v_settings from public.photo_challenge_settings
  where game_key = 'anh-challenge-binh-minh';
  if v_settings.vote_status <> 'open' then raise exception 'Voting is not open'; end if;
  if p_team_number not between 1 and v_settings.team_count then raise exception 'Invalid team'; end if;

  select team_number into v_my_team
  from public.trip_game_teams
  where game_key = 'anh-challenge-binh-minh' and username = v_member.username;
  if v_my_team is null then raise exception 'You are not assigned to a team'; end if;
  insert into public.photo_challenge_votes (game_key, voter_username, team_number, updated_at)
  values ('anh-challenge-binh-minh', v_member.username, p_team_number, now())
  on conflict (game_key, voter_username) do update
  set team_number = excluded.team_number, updated_at = now();

  return public.photo_challenge_get_state(p_session_token);
end;
$$;

revoke all on function public.photo_challenge_public_state() from public;
revoke all on function public.photo_challenge_get_state(text) from public;
revoke all on function public.photo_challenge_set_team_count(text, integer) from public;
revoke all on function public.photo_challenge_randomize_draws(text, integer) from public;
revoke all on function public.photo_challenge_set_vote_status(text, text, boolean) from public;
revoke all on function public.photo_challenge_cast_vote(text, integer) from public;

grant execute on function public.photo_challenge_public_state() to anon;
grant execute on function public.photo_challenge_get_state(text) to anon;
grant execute on function public.photo_challenge_set_team_count(text, integer) to anon;
grant execute on function public.photo_challenge_randomize_draws(text, integer) to anon;
grant execute on function public.photo_challenge_set_vote_status(text, text, boolean) to anon;
grant execute on function public.photo_challenge_cast_vote(text, integer) to anon;
