-- Optional Tà Xùa diary. No Hue table, Auth setting or existing bucket is changed.
create schema taxua_diary;
revoke all on schema taxua_diary from public, anon, authenticated;
grant usage on schema taxua_diary to service_role;

create table taxua_diary.members (
  id text primary key check (id in ('mi','san','thao','quanlele','gtm','truong','linh')),
  name text not null,
  position smallint not null unique,
  user_id uuid unique references auth.users(id),
  alias text unique,
  claim_nonce uuid,
  claim_uid uuid,
  claim_until timestamptz,
  claimed_at timestamptz,
  disabled boolean not null default false
);
insert into taxua_diary.members(id,name,position) values
  ('mi','mi',1),('san','san',2),('thao','thảo',3),('quanlele','quanlele',4),
  ('gtm','gtm',5),('truong','trường',6),('linh','linh',7);

create table taxua_diary.entries (
  member_id text primary key references taxua_diary.members(id),
  title text not null default '' check (char_length(title) <= 100),
  body text not null default '' check (char_length(body) <= 8000),
  photos jsonb not null default '[]' check (jsonb_typeof(photos)='array' and jsonb_array_length(photos)<=12),
  revision integer not null default 0,
  updated_at timestamptz
);
insert into taxua_diary.entries(member_id) select id from taxua_diary.members;
create table taxua_diary.drafts (
  member_id text primary key references taxua_diary.members(id),
  title text not null default '' check (char_length(title) <= 100),
  body text not null default '' check (char_length(body) <= 8000),
  photos jsonb not null default '[]' check (jsonb_typeof(photos)='array' and jsonb_array_length(photos)<=12),
  base_revision integer not null default 0,
  revision integer not null default 0,
  updated_at timestamptz not null default now()
);
create table taxua_diary.photos (
  id uuid primary key default gen_random_uuid(),
  member_id text not null references taxua_diary.members(id),
  state text not null default 'pending' check(state in ('pending','processing','ready')),
  bytes integer not null default 2097152 check(bytes between 0 and 4194304),
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);
create index diary_photos_member_idx on taxua_diary.photos(member_id);
create table taxua_diary.history (
  id bigint generated always as identity primary key,
  member_id text not null references taxua_diary.members(id),
  revision integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique(member_id,revision)
);
create table taxua_diary.rate_limits (
  key text primary key,
  started_at timestamptz not null default now(),
  attempts integer not null default 1
);

alter table taxua_diary.members enable row level security;
alter table taxua_diary.entries enable row level security;
alter table taxua_diary.drafts enable row level security;
alter table taxua_diary.photos enable row level security;
alter table taxua_diary.history enable row level security;
alter table taxua_diary.rate_limits enable row level security;
revoke all on all tables in schema taxua_diary from public, anon, authenticated;
revoke all on all sequences in schema taxua_diary from public, anon, authenticated;
grant all on all tables in schema taxua_diary to service_role;
grant all on all sequences in schema taxua_diary to service_role;

-- This narrowly privileged helper checks the live Auth session, including logout,
-- rather than trusting a still-valid JWT after its session has been revoked.
create function taxua_diary.active_member(actor uuid, session uuid) returns text
language sql stable security definer set search_path = '' as $$
  select m.id from taxua_diary.members m
  join auth.users u on u.id=m.user_id
  join auth.sessions s on s.user_id=u.id and s.id=session
  where m.user_id=actor and not m.disabled
    and (u.banned_until is null or u.banned_until<now())
    and (s.not_after is null or s.not_after>now())
$$;
revoke all on function taxua_diary.active_member(uuid,uuid) from public, anon, authenticated;
grant execute on function taxua_diary.active_member(uuid,uuid) to service_role;

-- An account keeps its server-assigned alias; user-editable metadata has no role
-- in ownership. This trigger applies only to the seven bound diary accounts.
create function taxua_diary.keep_alias() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is distinct from old.email and exists
    (select 1 from taxua_diary.members where user_id=old.id) then
    raise exception 'DIARY_ALIAS_IMMUTABLE';
  end if;
  return new;
end $$;
revoke all on function taxua_diary.keep_alias() from public, anon, authenticated;
create trigger taxua_diary_keep_alias before update of email on auth.users
for each row execute function taxua_diary.keep_alias();

-- This is the sole Data API bridge. Only the Edge Function's service role may
-- call it. The Edge Function supplies a verified actor/session, never a client ID.
create function public.taxua_diary_gateway(
  p_action text, p_actor uuid default null, p_session uuid default null,
  p_payload jsonb default '{}'
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  who text;
  m taxua_diary.members%rowtype;
  e taxua_diary.entries%rowtype;
  d taxua_diary.drafts%rowtype;
  ph taxua_diary.photos%rowtype;
  item jsonb;
  items jsonb;
  result jsonb;
  nonce uuid;
  candidate uuid;
  attempts integer;
  expected integer;
begin
  if p_action='rate' then
    if char_length(p_payload->>'key')>160 then raise exception 'INVALID_INPUT'; end if;
    insert into taxua_diary.rate_limits as r(key) values(p_payload->>'key')
    on conflict(key) do update set
      attempts=case when r.started_at<now()-interval '15 minutes' then 1 else r.attempts+1 end,
      started_at=case when r.started_at<now()-interval '15 minutes' then now() else r.started_at end
    returning r.attempts into attempts;
    delete from taxua_diary.rate_limits where started_at<now()-interval '1 day';
    return jsonb_build_object('allowed',attempts<=coalesce((p_payload->>'limit')::integer,12));
  elsif p_action='status' then
    select jsonb_agg(jsonb_build_object('id',id,'name',name,'claimed',user_id is not null,
      'busy',user_id is null and claim_until>now()) order by position) into result from taxua_diary.members;
    return result;
  elsif p_action='reserve_claim' then
    select * into m from taxua_diary.members where id=p_payload->>'member_id' for update;
    if not found then raise exception 'INVALID_MEMBER'; end if;
    if m.disabled or m.user_id is not null then raise exception 'ALREADY_CLAIMED'; end if;
    if m.claim_until>now() then raise exception 'CLAIM_BUSY'; end if;
    nonce:=gen_random_uuid(); candidate:=gen_random_uuid();
    update taxua_diary.members set claim_nonce=nonce,claim_uid=candidate,
      claim_until=now()+interval '5 minutes',alias=candidate::text||'@taxua-diary.invalid' where id=m.id;
    return jsonb_build_object('nonce',nonce,'uid',candidate,'alias',candidate::text||'@taxua-diary.invalid');
  elsif p_action='finish_claim' then
    update taxua_diary.members set user_id=claim_uid,claimed_at=now(),claim_nonce=null,
      claim_until=null,claim_uid=null
    where id=p_payload->>'member_id' and claim_nonce=(p_payload->>'nonce')::uuid
      and claim_until>now() and user_id is null returning * into m;
    if not found then raise exception 'CLAIM_EXPIRED'; end if;
    return jsonb_build_object('id',m.id);
  elsif p_action='abort_claim' then
    update taxua_diary.members set claim_nonce=null,claim_until=null,claim_uid=null,alias=null
    where id=p_payload->>'member_id' and claim_nonce=(p_payload->>'nonce')::uuid and user_id is null;
    return '{}';
  elsif p_action='login_alias' then
    select * into m from taxua_diary.members where id=p_payload->>'member_id' and not disabled;
    if not found or m.user_id is null then raise exception 'LOGIN_FAILED'; end if;
    return jsonb_build_object('alias',m.alias);
  end if;

  who:=taxua_diary.active_member(p_actor,p_session);
  if who is null then raise exception 'SESSION_EXPIRED'; end if;
  if p_action='me' then return jsonb_build_object('member_id',who); end if;
  if p_action='read' then
    select jsonb_agg(to_jsonb(t) order by t.position) into result from
      (select e.*,m.name,m.position from taxua_diary.entries e
       join taxua_diary.members m on m.id=e.member_id) t;
    return jsonb_build_object('member_id',who,'entries',result);
  end if;

  -- Serialize all writes for an owner, including upload reservations and publish.
  perform 1 from taxua_diary.members where id=who for update;
  if p_action in ('draft','save_draft','publish') then
    insert into taxua_diary.drafts(member_id,title,body,photos,base_revision)
      select member_id,title,body,photos,revision from taxua_diary.entries where member_id=who
      on conflict(member_id) do nothing;
    select * into d from taxua_diary.drafts where member_id=who for update;
    if p_action='save_draft' then
      if (p_payload->>'revision')::integer is distinct from d.revision then raise exception 'DRAFT_CONFLICT'; end if;
      if jsonb_typeof(p_payload->'title') is distinct from 'string'
        or jsonb_typeof(p_payload->'body') is distinct from 'string'
        or char_length(p_payload->>'title')>100 or char_length(p_payload->>'body')>8000
        or jsonb_typeof(p_payload->'photos') is distinct from 'array' then raise exception 'INVALID_INPUT'; end if;
      items:=p_payload->'photos';
      if jsonb_array_length(items)>12 then raise exception 'PHOTO_LIMIT'; end if;
      if (select count(distinct value->>'id') from jsonb_array_elements(items))<>jsonb_array_length(items) then raise exception 'INVALID_PHOTO'; end if;
      for item in select value from jsonb_array_elements(items) loop
        if jsonb_typeof(item->'caption') is distinct from 'string' or jsonb_typeof(item->'alt') is distinct from 'string'
          or char_length(item->>'caption')>160 or char_length(item->>'alt')>160
          or not exists(select 1 from taxua_diary.photos where id=(item->>'id')::uuid and member_id=who and state='ready')
          then raise exception 'INVALID_PHOTO'; end if;
      end loop;
      update taxua_diary.drafts set title=p_payload->>'title',body=p_payload->>'body',photos=items,
        revision=revision+1,updated_at=now() where member_id=who returning * into d;
    elsif p_action='publish' then
      if (p_payload->>'revision')::integer is distinct from d.revision then raise exception 'DRAFT_CONFLICT'; end if;
      select * into e from taxua_diary.entries where member_id=who for update;
      if (p_payload->>'base_revision')::integer is distinct from e.revision then raise exception 'ENTRY_CONFLICT'; end if;
      if e.revision>0 then
        insert into taxua_diary.history(member_id,revision,snapshot) values(who,e.revision,to_jsonb(e));
      end if;
      update taxua_diary.entries set title=d.title,body=d.body,photos=d.photos,revision=revision+1,
        updated_at=now() where member_id=who returning * into e;
      update taxua_diary.drafts set base_revision=e.revision,revision=revision+1,updated_at=now()
        where member_id=who returning * into d;
      delete from taxua_diary.history where member_id=who and revision < e.revision-10;
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'width',width,'height',height) order by created_at),'[]')
      into items from taxua_diary.photos where member_id=who and state='ready';
    return to_jsonb(d)||jsonb_build_object('library',items);
  elsif p_action='reserve_photo' then
    if (select count(*) from taxua_diary.photos where member_id=who)>=12
      or (select coalesce(sum(bytes),0) from taxua_diary.photos where member_id=who)>29360128 then raise exception 'PHOTO_LIMIT'; end if;
    insert into taxua_diary.photos(member_id) values(who) returning * into ph;
    return to_jsonb(ph);
  elsif p_action in ('photo_ticket','photo_state','finish_photo','cancel_photo','media') then
    select * into ph from taxua_diary.photos where id=(p_payload->>'id')::uuid for update;
    if not found then raise exception 'PHOTO_NOT_FOUND'; end if;
    if p_action='media' then
      if ph.state<>'ready' or (ph.member_id<>who and not exists(
        select 1 from taxua_diary.entries e,jsonb_array_elements(e.photos) j
        where e.member_id=ph.member_id and j->>'id'=ph.id::text)) then raise exception 'PHOTO_NOT_FOUND'; end if;
      return to_jsonb(ph);
    end if;
    if ph.member_id<>who then raise exception 'FORBIDDEN'; end if;
    if p_action='photo_state' then return to_jsonb(ph); end if;
    if p_action='cancel_photo' then
      if exists(select 1 from taxua_diary.entries e,jsonb_array_elements(e.photos) j where j->>'id'=ph.id::text)
        or exists(select 1 from taxua_diary.drafts d,jsonb_array_elements(d.photos) j where j->>'id'=ph.id::text)
        or exists(select 1 from taxua_diary.history h,jsonb_array_elements(h.snapshot->'photos') j where j->>'id'=ph.id::text)
        then raise exception 'PHOTO_IN_USE'; end if;
      delete from taxua_diary.photos where id=ph.id;
    else
      if ph.expires_at<now() or (p_action='photo_ticket' and ph.state<>'pending')
        or (p_action='finish_photo' and ph.state<>'processing') then raise exception 'UPLOAD_EXPIRED'; end if;
      if p_action='photo_ticket' then
        update taxua_diary.photos set state='processing' where id=ph.id returning * into ph;
      end if;
      if p_action='finish_photo' then
        update taxua_diary.photos set state='ready',bytes=(p_payload->>'bytes')::integer,
          width=(p_payload->>'width')::integer,height=(p_payload->>'height')::integer where id=ph.id returning * into ph;
      end if;
    end if;
    return to_jsonb(ph);
  elsif p_action='cleanup' then
    select coalesce(jsonb_agg(to_jsonb(p)),'[]') into result from taxua_diary.photos p
      where p.member_id=who and p.created_at<now()-interval '1 day'
      and not exists(select 1 from taxua_diary.entries e,jsonb_array_elements(e.photos) j where j->>'id'=p.id::text)
      and not exists(select 1 from taxua_diary.drafts d,jsonb_array_elements(d.photos) j where j->>'id'=p.id::text)
      and not exists(select 1 from taxua_diary.history h,jsonb_array_elements(h.snapshot->'photos') j where j->>'id'=p.id::text);
    return result;
  end if;
  raise exception 'INVALID_ACTION';
end $$;
revoke all on function public.taxua_diary_gateway(text,uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.taxua_diary_gateway(text,uuid,uuid,jsonb) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('taxua-diary-photos','taxua-diary-photos',false,4194304,array['image/jpeg']);
-- Restrictive policies also protect the diary if a future Hue policy is broad.
create policy taxua_diary_storage_guard on storage.objects as restrictive for all
to anon,authenticated using(bucket_id<>'taxua-diary-photos') with check(bucket_id<>'taxua-diary-photos');
