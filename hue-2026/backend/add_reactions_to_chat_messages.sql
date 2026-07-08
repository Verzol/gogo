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
alter table public.chat_reactions enable row level security;

revoke all on public.chat_reactions from anon;
grant select, insert, delete on public.chat_reactions to anon;

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

do $$
begin
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
