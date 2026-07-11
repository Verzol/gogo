-- Truth or Dare is a casual game and must not create leaderboard points.

delete from public.trip_game_results
where game_key in ('truth-or-dare', 'su-that-va-loi-noi-doi');

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
      select 1
      from public.trip_members
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

revoke all on function public.trip_game_save_results(text, text, jsonb) from public;
grant execute on function public.trip_game_save_results(text, text, jsonb) to anon;
