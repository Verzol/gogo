alter table public.chat_messages
  add column if not exists user_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_messages_user_id_len'
      and conrelid = 'public.chat_messages'::regclass
  ) then
    alter table public.chat_messages
      add constraint chat_messages_user_id_len check (
        user_id is null
        or char_length(btrim(user_id)) between 1 and 80
      );
  end if;
end;
$$;

grant insert (user_id, username, body, reply_to_id, reply_to_username, reply_to_body)
  on public.chat_messages
  to anon;

drop policy if exists "Anyone can send chat messages" on public.chat_messages;
create policy "Anyone can send chat messages"
  on public.chat_messages
  for insert
  to anon
  with check (
    char_length(btrim(user_id)) between 1 and 80
    and char_length(btrim(username)) between 1 and 32
    and char_length(btrim(body)) between 1 and 500
  );

create or replace function public.enforce_chat_soft_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id <> old.id
    or new.user_id is distinct from old.user_id
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
    and (user_id is null or char_length(user_id) between 1 and 80)
    and char_length(username) between 1 and 32
  );
