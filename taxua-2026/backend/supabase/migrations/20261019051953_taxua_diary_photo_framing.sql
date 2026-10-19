-- Backward-compatible framing metadata. No crew rows, images or permissions change.
create or replace function public.taxua_diary_gateway(
  p_action text, p_actor uuid default null, p_session uuid default null,
  p_payload jsonb default '{}'
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  who text;
  memberRow taxua_diary.members%rowtype;
  entryRow taxua_diary.entries%rowtype;
  draftRow taxua_diary.drafts%rowtype;
  photoRow taxua_diary.photos%rowtype;
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
    select * into memberRow from taxua_diary.members where id=p_payload->>'member_id' for update;
    if not found then raise exception 'INVALID_MEMBER'; end if;
    if memberRow.disabled or memberRow.user_id is not null then raise exception 'ALREADY_CLAIMED'; end if;
    if memberRow.claim_until>now() then raise exception 'CLAIM_BUSY'; end if;
    nonce:=gen_random_uuid(); candidate:=gen_random_uuid();
    update taxua_diary.members set claim_nonce=nonce,claim_uid=candidate,
      claim_until=now()+interval '5 minutes',alias=candidate::text||'@taxua-diary.invalid' where id=memberRow.id;
    return jsonb_build_object('nonce',nonce,'uid',candidate,'alias',candidate::text||'@taxua-diary.invalid');
  elsif p_action='finish_claim' then
    update taxua_diary.members set user_id=claim_uid,claimed_at=now(),claim_nonce=null,
      claim_until=null,claim_uid=null
    where id=p_payload->>'member_id' and claim_nonce=(p_payload->>'nonce')::uuid
      and claim_until>now() and user_id is null returning * into memberRow;
    if not found then raise exception 'CLAIM_EXPIRED'; end if;
    return jsonb_build_object('id',memberRow.id);
  elsif p_action='abort_claim' then
    update taxua_diary.members set claim_nonce=null,claim_until=null,claim_uid=null,alias=null
    where id=p_payload->>'member_id' and claim_nonce=(p_payload->>'nonce')::uuid and user_id is null;
    return '{}';
  elsif p_action='login_alias' then
    select * into memberRow from taxua_diary.members where id=p_payload->>'member_id' and not disabled;
    if not found or memberRow.user_id is null then raise exception 'LOGIN_FAILED'; end if;
    return jsonb_build_object('alias',memberRow.alias);
  end if;

  who:=taxua_diary.active_member(p_actor,p_session);
  if who is null then raise exception 'SESSION_EXPIRED'; end if;
  if p_action='me' then return jsonb_build_object('member_id',who); end if;
  if p_action='read' then
    select jsonb_agg(to_jsonb(t) order by t.position) into result from
      (select ent.*,roster.name,roster.position from taxua_diary.entries ent
       join taxua_diary.members roster on roster.id=ent.member_id) t;
    return jsonb_build_object('member_id',who,'entries',result);
  end if;

  -- Serialize all writes for an owner, including upload reservations and publish.
  perform 1 from taxua_diary.members where id=who for update;
  if p_action in ('draft','save_draft','publish') then
    insert into taxua_diary.drafts(member_id,title,body,photos,base_revision)
      select member_id,title,body,photos,revision from taxua_diary.entries where member_id=who
      on conflict(member_id) do nothing;
    select * into draftRow from taxua_diary.drafts where member_id=who for update;
    if p_action='save_draft' then
      if (p_payload->>'revision')::integer is distinct from draftRow.revision then raise exception 'DRAFT_CONFLICT'; end if;
      if jsonb_typeof(p_payload->'title') is distinct from 'string'
        or jsonb_typeof(p_payload->'body') is distinct from 'string'
        or char_length(p_payload->>'title')>100 or char_length(p_payload->>'body')>8000
        or jsonb_typeof(p_payload->'photos') is distinct from 'array' then raise exception 'INVALID_INPUT'; end if;
      items:=p_payload->'photos';
      if jsonb_array_length(items)>9 then raise exception 'PHOTO_LIMIT'; end if;
      if (select count(distinct value->>'id') from jsonb_array_elements(items))<>jsonb_array_length(items) then raise exception 'INVALID_PHOTO'; end if;
      for item in select value from jsonb_array_elements(items) loop
        if jsonb_typeof(item->'caption') is distinct from 'string' or jsonb_typeof(item->'alt') is distinct from 'string'
          or char_length(item->>'caption')>160 or char_length(item->>'alt')>160
          or not exists(select 1 from taxua_diary.photos where id=(item->>'id')::uuid and member_id=who and state='ready')
          then raise exception 'INVALID_PHOTO'; end if;
        -- Optional framing is display metadata; photo ownership is still checked above.
        if item ? 'crop' then
          if jsonb_typeof(item->'crop') is distinct from 'object' then raise exception 'INVALID_PHOTO'; end if;
          if jsonb_typeof(item->'crop'->'x') is distinct from 'number'
            or jsonb_typeof(item->'crop'->'y') is distinct from 'number'
            or jsonb_typeof(item->'crop'->'zoom') is distinct from 'number'
            then raise exception 'INVALID_PHOTO'; end if;
          if (select count(*) from jsonb_object_keys(item->'crop'))<>3
            or (item->'crop'->>'x')::numeric not between 0 and 1
            or (item->'crop'->>'y')::numeric not between 0 and 1
            or (item->'crop'->>'zoom')::numeric not between 1 and 3
            then raise exception 'INVALID_PHOTO'; end if;
        end if;
      end loop;
      update taxua_diary.drafts set title=p_payload->>'title',body=p_payload->>'body',photos=items,
        revision=revision+1,updated_at=now() where member_id=who returning * into draftRow;
    elsif p_action='publish' then
      if (p_payload->>'revision')::integer is distinct from draftRow.revision then raise exception 'DRAFT_CONFLICT'; end if;
      select * into entryRow from taxua_diary.entries where member_id=who for update;
      if (p_payload->>'base_revision')::integer is distinct from entryRow.revision then raise exception 'ENTRY_CONFLICT'; end if;
      if entryRow.revision>0 then
        insert into taxua_diary.history(member_id,revision,snapshot) values(who,entryRow.revision,to_jsonb(entryRow));
      end if;
      update taxua_diary.entries set title=draftRow.title,body=draftRow.body,photos=draftRow.photos,revision=revision+1,
        updated_at=now() where member_id=who returning * into entryRow;
      update taxua_diary.drafts set base_revision=entryRow.revision,revision=revision+1,updated_at=now()
        where member_id=who returning * into draftRow;
      delete from taxua_diary.history where member_id=who and revision < entryRow.revision-10;
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'width',width,'height',height) order by created_at),'[]')
      into items from taxua_diary.photos where member_id=who and state='ready';
    return to_jsonb(draftRow)||jsonb_build_object('library',items);
  elsif p_action='reserve_photo' then
    if (select count(*) from taxua_diary.photos where member_id=who)>=9
      or (select coalesce(sum(bytes),0)+4194304 from taxua_diary.photos where member_id=who)>31457280 then raise exception 'PHOTO_LIMIT'; end if;
    insert into taxua_diary.photos(member_id) values(who) returning * into photoRow;
    return to_jsonb(photoRow);
  elsif p_action in ('photo_ticket','photo_state','finish_photo','cancel_photo','purge_photo','media') then
    select * into photoRow from taxua_diary.photos where id=(p_payload->>'id')::uuid for update;
    if not found then raise exception 'PHOTO_NOT_FOUND'; end if;
    if p_action='media' then
      if photoRow.state<>'ready' or (photoRow.member_id<>who and not exists(
        select 1 from taxua_diary.entries ent,jsonb_array_elements(ent.photos) j
        where ent.member_id=photoRow.member_id and j->>'id'=photoRow.id::text)) then raise exception 'PHOTO_NOT_FOUND'; end if;
      return to_jsonb(photoRow);
    end if;
    if photoRow.member_id<>who then raise exception 'FORBIDDEN'; end if;
    if p_action='photo_state' then return to_jsonb(photoRow); end if;
    if p_action='purge_photo' then
      if photoRow.state<>'deleting' then raise exception 'INVALID_PHOTO'; end if;
      delete from taxua_diary.photos where id=photoRow.id;
      return to_jsonb(photoRow);
    end if;
    if p_action='cancel_photo' then
      if photoRow.state='processing' and photoRow.expires_at>now() and coalesce(p_payload->>'failed','false')<>'true' then raise exception 'UPLOAD_BUSY'; end if;
      if exists(select 1 from taxua_diary.entries ent,jsonb_array_elements(ent.photos) j where j->>'id'=photoRow.id::text)
        or exists(select 1 from taxua_diary.drafts df,jsonb_array_elements(df.photos) j where j->>'id'=photoRow.id::text)
        then raise exception 'PHOTO_IN_USE'; end if;
      -- Explicit removal also erases this unused image from retained revisions.
      update taxua_diary.history h set snapshot=jsonb_set(h.snapshot,'{photos}',
        coalesce((select jsonb_agg(j) from jsonb_array_elements(h.snapshot->'photos') j
          where j->>'id'<>photoRow.id::text),'[]')) where h.member_id=who;
      update taxua_diary.photos set state='deleting' where id=photoRow.id returning * into photoRow;
    else
      if photoRow.expires_at<now() or (p_action='photo_ticket' and photoRow.state<>'pending')
        or (p_action='finish_photo' and photoRow.state<>'processing') then raise exception 'UPLOAD_EXPIRED'; end if;
      if p_action='photo_ticket' then
        update taxua_diary.photos set state='processing' where id=photoRow.id returning * into photoRow;
      end if;
      if p_action='finish_photo' then
        update taxua_diary.photos set state='ready',bytes=(p_payload->>'bytes')::integer,
          width=(p_payload->>'width')::integer,height=(p_payload->>'height')::integer where id=photoRow.id returning * into photoRow;
      end if;
    end if;
    return to_jsonb(photoRow);
  elsif p_action='cleanup' then
    with obsolete as (
      update taxua_diary.photos p set state='deleting'
      where p.member_id=who and (p.state='deleting' or
        (p.state in ('pending','processing') and p.expires_at<now()) or p.created_at<now()-interval '1 day')
      and not exists(select 1 from taxua_diary.entries ent,jsonb_array_elements(ent.photos) j where j->>'id'=p.id::text)
      and not exists(select 1 from taxua_diary.drafts df,jsonb_array_elements(df.photos) j where j->>'id'=p.id::text)
      and not exists(select 1 from taxua_diary.history h,jsonb_array_elements(h.snapshot->'photos') j where j->>'id'=p.id::text)
      returning p.*
    ) select coalesce(jsonb_agg(to_jsonb(obsolete)),'[]') into result from obsolete;
    return result;
  end if;
  raise exception 'INVALID_ACTION';
end $$;
revoke all on function public.taxua_diary_gateway(text,uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.taxua_diary_gateway(text,uuid,uuid,jsonb) to service_role;
