-- Run in one database connection. Everything below is rolled back.
-- Clone the deployed tables/gateway into pg_temp; no crew accounts or rows change.
-- Only the temporary gateway replaces active_member with a fixture identity.
-- This tests framing validation and photo ownership, not Auth/session authorization.
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
declare saved jsonb; photo jsonb; crop jsonb; attempted jsonb; photo_id uuid; other_id uuid; size jsonb; count_checks integer:=0;
begin
  photo:=pg_temp.diary_gateway('reserve_photo'); photo_id:=(photo->>'id')::uuid;
  update pg_temp.photos set state='ready',bytes=1024,width=640,height=360 where id=photo_id;
  saved:=pg_temp.diary_gateway('draft');
  photo:=jsonb_build_object('id',photo_id,'caption','Fixture','alt','Fixture');
  -- Existing records have no crop; both defaults and boundary values save unchanged.
  for attempted in select value from jsonb_array_elements(jsonb_build_array(photo,
    photo||'{"crop":{"x":0,"y":1,"zoom":1}}'::jsonb,
    photo||'{"crop":{"x":1,"y":0,"zoom":3}}'::jsonb,
    photo||'{"crop":{"x":0.23,"y":0.79,"zoom":1.87}}'::jsonb)) loop
    saved:=pg_temp.diary_gateway('save_draft',null,null,jsonb_build_object('revision',saved->'revision','title','','body','','photos',jsonb_build_array(attempted)));
    if saved->'photos'->0 is distinct from attempted then raise exception 'Crop metadata was changed'; end if;
    count_checks:=count_checks+1;
  end loop;
  saved:=pg_temp.diary_gateway('publish',null,null,jsonb_build_object('revision',saved->'revision','base_revision',saved->'base_revision'));
  if (select photos->0->'crop' from pg_temp.entries where member_id='mi') is distinct from '{"x":0.23,"y":0.79,"zoom":1.87}'::jsonb then raise exception 'Publication lost crop'; end if;
  for crop in select value from jsonb_array_elements('[null,[],"center",{},
    {"x":0.5,"y":0.5},{"x":-0.01,"y":0.5,"zoom":1},{"x":0.5,"y":1.01,"zoom":1},
    {"x":0.5,"y":0.5,"zoom":0.99},{"x":0.5,"y":0.5,"zoom":3.01},
    {"x":"0.5","y":0.5,"zoom":1},{"x":true,"y":0.5,"zoom":1},
    {"x":0.5,"y":0.5,"zoom":1,"owner":"san"}]'::jsonb) loop
    begin
      perform pg_temp.diary_gateway('save_draft',null,null,jsonb_build_object('revision',saved->'revision','title','','body','','photos',jsonb_build_array(photo||jsonb_build_object('crop',crop))));
      raise exception 'Malformed crop accepted: %',crop;
    exception when others then if sqlerrm<>'INVALID_PHOTO' then raise; end if; end;
    count_checks:=count_checks+1;
  end loop;
  for size in select value from jsonb_array_elements('["small","medium","large"]'::jsonb) loop
    attempted:=photo||jsonb_build_object('size',size,'crop',jsonb_build_object('x',0.23,'y',0.79,'zoom',1.87));
    saved:=pg_temp.diary_gateway('save_draft',null,null,jsonb_build_object('revision',saved->'revision','title','','body','','photos',jsonb_build_array(attempted)));
    if saved->'photos'->0 is distinct from attempted then raise exception 'Size or crop metadata was changed'; end if;
    saved:=pg_temp.diary_gateway('publish',null,null,jsonb_build_object('revision',saved->'revision','base_revision',saved->'base_revision'));
    if (select photos->0 from pg_temp.entries where member_id='mi') is distinct from attempted then raise exception 'Publication lost photo size'; end if;
    count_checks:=count_checks+2;
  end loop;
  for size in select value from jsonb_array_elements('[null,0,true,{},[],"auto","huge","SMALL"]'::jsonb) loop
    begin
      perform pg_temp.diary_gateway('save_draft',null,null,jsonb_build_object('revision',saved->'revision','title','','body','','photos',jsonb_build_array(photo||jsonb_build_object('size',size))));
      raise exception 'Malformed size accepted: %',size;
    exception when others then if sqlerrm<>'INVALID_PHOTO' then raise; end if; end;
    count_checks:=count_checks+1;
  end loop;
  insert into pg_temp.members(id,name,position) values('san','Temporary fixture 2',2);
  insert into pg_temp.photos(member_id,state,bytes,width,height) values('san','ready',1024,640,360) returning id into other_id;
  begin
    perform pg_temp.diary_gateway('save_draft',null,null,jsonb_build_object('revision',saved->'revision','member_id','san','title','','body','','photos',jsonb_build_array(photo||jsonb_build_object('id',other_id,'size','large','crop',jsonb_build_object('x',0.5,'y',0.5,'zoom',1)))));
    raise exception 'Foreign photo accepted';
  exception when others then if sqlerrm<>'INVALID_PHOTO' then raise; end if; end;
  raise notice 'Passed % framing boundaries, publication and foreign photo rejection',count_checks;
end $$;
select 'passed' as result, 32 as checks;
rollback;
