-- Extend the existing private roster; preserve all account bindings and content.
alter table taxua_diary.members drop constraint members_id_check;
alter table taxua_diary.members add constraint members_id_check
  check (id in ('mi','san','thao','quanlele','gtm','truong','tamle','linh'));

-- Keep the two pink scarves at opposite ends of the displayed crew/book.
update taxua_diary.members set position=8 where id='linh';
insert into taxua_diary.members(id,name,position) values ('tamle','tamle',7);
insert into taxua_diary.entries(member_id) values ('tamle');
-- Drafts are created lazily by the existing gateway after authentication.
