drop table if exists likes;
drop function if exists toggle_like(uuid, uuid);
alter table notes drop column if exists likes_count;