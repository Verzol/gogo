create extension if not exists pgcrypto;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  body text not null,
  reply_to_id uuid references public.chat_messages(id) on delete set null,
  reply_to_username text,
  reply_to_body text,
  created_at timestamptz not null default now(),
  constraint chat_messages_username_len check (
    char_length(btrim(username)) between 1 and 32
  ),
  constraint chat_messages_body_len check (
    char_length(body) between 0 and 500
  ),
  constraint chat_messages_reply_username_len check (
    reply_to_username is null
    or char_length(btrim(reply_to_username)) between 1 and 32
  ),
  constraint chat_messages_reply_body_len check (
    reply_to_body is null
    or char_length(btrim(reply_to_body)) between 1 and 500
  )
);

create index if not exists chat_messages_created_at_idx
  on public.chat_messages (created_at desc, id desc);

create table if not exists public.chat_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id text not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint chat_reactions_user_len check (
    char_length(btrim(user_id)) between 8 and 80
  ),
  constraint chat_reactions_emoji_len check (
    char_length(btrim(emoji)) between 1 and 16
  ),
  constraint chat_reactions_one_per_user_emoji unique (message_id, user_id, emoji)
);

create index if not exists chat_reactions_message_id_idx
  on public.chat_reactions (message_id);

alter table public.chat_reactions replica identity full;

alter table public.chat_messages enable row level security;
alter table public.chat_reactions enable row level security;

revoke all on public.chat_messages from anon;
revoke all on public.chat_reactions from anon;
grant select on public.chat_messages to anon;
grant insert (username, body, reply_to_id, reply_to_username, reply_to_body) on public.chat_messages to anon;
grant update on public.chat_messages to anon;
grant select, insert, delete on public.chat_reactions to anon;

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

drop policy if exists "Anyone can soft delete own chat messages" on public.chat_messages;
drop policy if exists "Anyone can soft delete chat messages" on public.chat_messages;
create policy "Anyone can soft delete chat messages"
  on public.chat_messages
  for update
  to anon
  using (true)
  with check (
    body = ''
    and reply_to_id is null
    and reply_to_username is null
    and reply_to_body is null
    and char_length(username) between 1 and 32
  );

create or replace function public.enforce_chat_soft_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id <> old.id
    or new.username <> old.username
    or new.created_at <> old.created_at
    or new.body <> ''
    or new.reply_to_id is not null
    or new.reply_to_username is not null
    or new.reply_to_body is not null then
    raise exception 'Only chat soft delete is allowed';
  end if;

  return new;
end;
$$;

drop trigger if exists chat_messages_soft_delete_only on public.chat_messages;
create trigger chat_messages_soft_delete_only
  before update on public.chat_messages
  for each row
  execute function public.enforce_chat_soft_delete();

drop policy if exists "Anyone can read chat reactions" on public.chat_reactions;
create policy "Anyone can read chat reactions"
  on public.chat_reactions
  for select
  to anon
  using (true);

drop policy if exists "Anyone can add chat reactions" on public.chat_reactions;
create policy "Anyone can add chat reactions"
  on public.chat_reactions
  for insert
  to anon
  with check (
    char_length(btrim(user_id)) between 8 and 80
    and char_length(btrim(emoji)) between 1 and 16
  );

drop policy if exists "Anyone can remove chat reactions" on public.chat_reactions;
create policy "Anyone can remove chat reactions"
  on public.chat_reactions
  for delete
  to anon
  using (true);

create or replace function public.enforce_chat_reaction_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.message_id::text));

  if not exists (
    select 1
    from public.chat_reactions
    where message_id = new.message_id
      and emoji = new.emoji
  ) and (
    select count(distinct emoji)
    from public.chat_reactions
    where message_id = new.message_id
  ) >= 5 then
    raise exception 'A message can have at most 5 reaction icons';
  end if;

  return new;
end;
$$;

drop trigger if exists chat_reactions_max_5_icons on public.chat_reactions;
create trigger chat_reactions_max_5_icons
  before insert on public.chat_reactions
  for each row
  execute function public.enforce_chat_reaction_limit();

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

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_reactions'
  ) then
    alter publication supabase_realtime add table public.chat_reactions;
  end if;
end;
$$;
