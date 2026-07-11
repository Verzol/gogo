-- Shared team assignments and scoring for all trip games.
create table if not exists public.trip_game_teams (
  game_key text not null,
  username text not null references public.trip_members(username) on delete cascade,
  team_number integer not null check (team_number between 1 and 10),
  updated_at timestamptz not null default now(),
  primary key (game_key, username)
);

create table if not exists public.trip_game_results (
  game_key text not null,
  username text not null references public.trip_members(username) on delete cascade,
  points integer not null default 0 check (points between 0 and 100),
  note text not null default '',
  updated_by text references public.trip_members(username) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (game_key, username),
  constraint trip_game_results_note_len check (char_length(note) <= 180)
);

alter table public.trip_game_teams enable row level security;
alter table public.trip_game_results enable row level security;

revoke all on public.trip_game_teams from anon;
revoke all on public.trip_game_results from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-game-photos',
  'trip-game-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view trip game photos" on storage.objects;
create policy "Public can view trip game photos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'trip-game-photos');

update public.trip_members
set role = 'host', updated_at = now()
where username in ('gtm', 'linh');

-- Keep the existing spy room aligned with the shared trip member role.
create or replace function public.spy_game_is_host(
  p_username text,
  p_session_id uuid default public.spy_game_current_session_id()
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.trip_members m
    where m.username = p_username and m.role = 'host'
  );
$$;

create or replace function public.trip_game_member_from_token(p_session_token text)
returns public.trip_members
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m
  from public.trip_sessions s
  join public.trip_members m on m.username = s.username
  where s.session_hash = extensions.digest(coalesce(p_session_token, ''), 'sha256')
    and s.expires_at > now()
  limit 1;
$$;

create or replace function public.trip_games_get_state(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null then
    return jsonb_build_object('authenticated', false);
  end if;

  return jsonb_build_object(
    'authenticated', true,
    'viewer', jsonb_build_object('username', v_member.username, 'role', v_member.role),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'username', m.username,
        'displayName', m.display_name,
        'role', m.role
      ) order by m.created_at, m.username)
      from public.trip_members m
    ), '[]'::jsonb),
    'teams', coalesce((
      select jsonb_agg(jsonb_build_object(
        'gameKey', t.game_key,
        'username', t.username,
        'teamNumber', t.team_number
      ) order by t.game_key, t.team_number, t.username)
      from public.trip_game_teams t
    ), '[]'::jsonb),
    'results', coalesce((
      select jsonb_agg(jsonb_build_object(
        'gameKey', r.game_key,
        'username', r.username,
        'points', r.points,
        'note', r.note
      ) order by r.game_key, r.username)
      from public.trip_game_results r
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.trip_games_get_public_state()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'teams', coalesce((
      select jsonb_agg(jsonb_build_object(
        'gameKey', t.game_key,
        'username', t.username,
        'teamNumber', t.team_number
      ) order by t.game_key, t.team_number, t.username)
      from public.trip_game_teams t
    ), '[]'::jsonb)
  );
$$;

create or replace function public.trip_game_save_teams(
  p_session_token text,
  p_game_key text,
  p_assignments jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_assignment jsonb;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then
    raise exception 'Only host can save teams';
  end if;
  if char_length(btrim(coalesce(p_game_key, ''))) not between 1 and 80 then
    raise exception 'Invalid game key';
  end if;

  delete from public.trip_game_teams where game_key = btrim(p_game_key);
  for v_assignment in select * from jsonb_array_elements(coalesce(p_assignments, '[]'::jsonb))
  loop
    if exists (
      select 1 from public.trip_members
      where username = v_assignment->>'username'
        and (role <> 'host' or p_game_key = 'anh-challenge-binh-minh')
    ) then
      insert into public.trip_game_teams (game_key, username, team_number, updated_at)
      values (
        btrim(p_game_key),
        v_assignment->>'username',
        (v_assignment->>'teamNumber')::integer,
        now()
      );
    end if;
  end loop;

  return public.trip_games_get_state(p_session_token);
end;
$$;

create or replace function public.trip_game_save_results(
  p_session_token text,
  p_game_key text,
  p_results jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.trip_members%rowtype;
  v_result jsonb;
begin
  select * into v_member from public.trip_game_member_from_token(p_session_token);
  if v_member.username is null or v_member.role <> 'host' then
    raise exception 'Only host can save results';
  end if;
  if p_game_key in ('truth-or-dare', 'su-that-va-loi-noi-doi') then
    raise exception 'This game does not use scoring';
  end if;

  for v_result in select * from jsonb_array_elements(coalesce(p_results, '[]'::jsonb))
  loop
    if exists (
      select 1 from public.trip_members
      where username = btrim(v_result->>'username')
        and (role <> 'host' or p_game_key = 'anh-challenge-binh-minh')
    ) then
      insert into public.trip_game_results (game_key, username, points, note, updated_by, updated_at)
      values (
        btrim(p_game_key),
        btrim(v_result->>'username'),
        greatest(0, least(coalesce((v_result->>'points')::integer, 0), 100)),
        left(btrim(coalesce(v_result->>'note', '')), 180),
        v_member.username,
        now()
      )
      on conflict (game_key, username) do update
      set points = excluded.points,
          note = excluded.note,
          updated_by = excluded.updated_by,
          updated_at = now();
    end if;
  end loop;

  return public.trip_games_get_state(p_session_token);
end;
$$;

revoke all on function public.trip_game_member_from_token(text) from public;
revoke all on function public.spy_game_is_host(text, uuid) from public;
revoke all on function public.trip_games_get_state(text) from public;
revoke all on function public.trip_games_get_public_state() from public;
revoke all on function public.trip_game_save_teams(text, text, jsonb) from public;
revoke all on function public.trip_game_save_results(text, text, jsonb) from public;

grant execute on function public.trip_games_get_state(text) to anon;
grant execute on function public.trip_games_get_public_state() to anon;
grant execute on function public.trip_game_save_teams(text, text, jsonb) to anon;
grant execute on function public.trip_game_save_results(text, text, jsonb) to anon;
