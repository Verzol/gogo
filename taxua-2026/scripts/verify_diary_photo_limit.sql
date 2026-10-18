-- Run in one database connection. Everything below is rolled back.
-- Clone the deployed tables/gateway into pg_temp; no crew accounts or rows change.
-- Only the temporary gateway replaces active_member with a fixture identity.
-- This tests count/constraint boundaries, not Auth/session authorization.
begin;
create temporary table members (like taxua_diary.members including all) on commit drop;
create temporary table entries (like taxua_diary.entries including all) on commit drop;
create temporary table drafts (like taxua_diary.drafts including all) on commit drop;
create temporary table photos (like taxua_diary.photos including all) on commit drop;
create temporary table history (like taxua_diary.history including all) on commit drop;
create temporary table rate_limits (like taxua_diary.rate_limits including all) on commit drop;
insert into pg_temp.members(id,name,position) values('mi','Temporary fixture',1);
insert into pg_temp.entries(member_id) values('mi');
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.taxua_diary_gateway(text,uuid,uuid,jsonb)'::regprocedure);
  if position('who:=taxua_diary.active_member(p_actor,p_session);' in definition)=0 then
    raise exception 'Unexpected gateway identity check; review the temporary fixture';
  end if;
  definition := replace(definition, 'public.taxua_diary_gateway(', 'pg_temp.diary_gateway(');
  definition := replace(definition, 'who:=taxua_diary.active_member(p_actor,p_session);', 'who:=''mi'';');
  definition := replace(definition, 'taxua_diary.', 'pg_temp.');
  execute definition;
end $$;
do $$
declare item jsonb; items jsonb; saved jsonb;
begin
  for i in 1..9 loop
    item := pg_temp.diary_gateway('reserve_photo');
    -- Simulate completed processing without creating any Storage objects.
    update pg_temp.photos set state='ready',bytes=1024,width=640,height=360 where id=(item->>'id')::uuid;
  end loop;
  if (select count(*) from pg_temp.photos)<>9 then raise exception 'Nine reservations failed'; end if;
  begin
    perform pg_temp.diary_gateway('reserve_photo');
    raise exception 'Tenth reservation was accepted';
  exception when others then
    if sqlerrm<>'PHOTO_LIMIT' then raise; end if;
  end;
  select jsonb_agg(jsonb_build_object('id',id,'caption','Fixture','alt','Fixture') order by id) into items from pg_temp.photos;
  saved := pg_temp.diary_gateway('draft');
  saved := pg_temp.diary_gateway('save_draft',null,null,jsonb_build_object('revision',saved->'revision','title','','body','','photos',items));
  if jsonb_array_length(saved->'photos')<>9 then raise exception 'Nine-photo draft failed'; end if;
  saved := pg_temp.diary_gateway('publish',null,null,jsonb_build_object('revision',saved->'revision','base_revision',saved->'base_revision'));
  if (select jsonb_array_length(photos) from pg_temp.entries where member_id='mi')<>9 then raise exception 'Nine-photo publication failed'; end if;
  items := items || jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'caption','','alt',''));
  begin
    perform pg_temp.diary_gateway('save_draft',null,null,jsonb_build_object('revision',saved->'revision','title','','body','','photos',items));
    raise exception 'Ten-photo draft was accepted';
  exception when others then
    if sqlerrm<>'PHOTO_LIMIT' then raise; end if;
  end;
  begin
    insert into pg_temp.entries(member_id,photos) values('over-limit-fixture',items);
    raise exception 'Entry constraint accepted ten photos';
  exception when check_violation then null;
  end;
  begin
    insert into pg_temp.drafts(member_id,photos) values('over-limit-fixture',items);
    raise exception 'Draft constraint accepted ten photos';
  exception when check_violation then null;
  end;
end $$;
select 'passed' as result, 7 as boundary_checks,
  (select count(*) from pg_temp.photos) as accepted_reservations,
  (select jsonb_array_length(photos) from pg_temp.entries where member_id='mi') as published_photos;
rollback;
