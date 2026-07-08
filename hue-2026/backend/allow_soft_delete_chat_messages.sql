alter table public.chat_messages
  drop constraint if exists chat_messages_body_len;

alter table public.chat_messages
  add constraint chat_messages_body_len check (
    char_length(body) between 0 and 500
  );

grant select on public.chat_messages to anon;
grant update on public.chat_messages to anon;

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
