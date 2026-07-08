alter table public.chat_messages
  add column if not exists reply_to_id uuid references public.chat_messages(id) on delete set null,
  add column if not exists reply_to_username text,
  add column if not exists reply_to_body text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_messages_reply_username_len'
      and conrelid = 'public.chat_messages'::regclass
  ) then
    alter table public.chat_messages
      add constraint chat_messages_reply_username_len check (
        reply_to_username is null
        or char_length(btrim(reply_to_username)) between 1 and 32
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_messages_reply_body_len'
      and conrelid = 'public.chat_messages'::regclass
  ) then
    alter table public.chat_messages
      add constraint chat_messages_reply_body_len check (
        reply_to_body is null
        or char_length(btrim(reply_to_body)) between 1 and 500
      );
  end if;
end;
$$;

grant insert (username, body, reply_to_id, reply_to_username, reply_to_body)
  on public.chat_messages
  to anon;
