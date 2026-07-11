-- Expose only the public leaderboard data so the ranking does not require login.
create or replace function public.trip_games_get_public_state()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'username', m.username,
        'displayName', m.display_name,
        'role', m.role
      ) order by m.created_at, m.username)
      from public.trip_members m
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
$$;

revoke all on function public.trip_games_get_public_state() from public;
grant execute on function public.trip_games_get_public_state() to anon;
