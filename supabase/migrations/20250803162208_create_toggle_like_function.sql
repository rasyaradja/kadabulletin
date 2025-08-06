create or replace function toggle_like(note_id uuid, session_id uuid)
returns void as $$
begin
  if exists(select 1 from likes where likes.note_id = toggle_like.note_id and likes.session_id = toggle_like.session_id) then
    delete from likes where likes.note_id = toggle_like.note_id and likes.session_id = toggle_like.session_id;
    update notes set likes_count = likes_count - 1 where id = toggle_like.note_id;
  else
    insert into likes (note_id, session_id) values (toggle_like.note_id, toggle_like.session_id);
    update notes set likes_count = likes_count + 1 where id = toggle_like.note_id;
  end if;
end;
$$ language plpgsql;