alter table public.spy_game_missions
  add column if not exists done boolean not null default false;

update public.spy_game_missions
set done = false
where done is null;

delete from public.spy_game_sessions
where id not in (
  select id
  from public.spy_game_sessions
  order by created_at desc
  limit 1
);
