ALTER TABLE notes
ADD COLUMN replying_to_id INTEGER REFERENCES notes(id);