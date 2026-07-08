create extension if not exists pgcrypto;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint chat_messages_username_len check (
    char_length(btrim(username)) between 1 and 32
  ),
  constraint chat_messages_body_len check (
    char_length(btrim(body)) between 1 and 500
  )
);

create index if not exists chat_messages_created_at_idx
  on public.chat_messages (created_at desc, id desc);

alter table public.chat_messages enable row level security;

revoke all on public.chat_messages from anon;
grant select on public.chat_messages to anon;
grant insert (username, body) on public.chat_messages to anon;

drop policy if exists "Anyone can read chat messages" on public.chat_messages;
create policy "Anyone can read chat messages"
  on public.chat_messages
  for select
  to anon
  using (true);

drop policy if exists "Anyone can send chat messages" on public.chat_messages;
create policy "Anyone can send chat messages"
  on public.chat_messages
  for insert
  to anon
  with check (
    char_length(btrim(username)) between 1 and 32
    and char_length(btrim(body)) between 1 and 500
  );

create or replace function public.purge_old_chat_messages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.chat_messages
  where id in (
    select id
    from public.chat_messages
    order by created_at desc, id desc
    offset 200
  );

  return null;
end;
$$;

drop trigger if exists chat_messages_keep_latest_200 on public.chat_messages;
create trigger chat_messages_keep_latest_200
  after insert on public.chat_messages
  for each statement
  execute function public.purge_old_chat_messages();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end;
$$;
