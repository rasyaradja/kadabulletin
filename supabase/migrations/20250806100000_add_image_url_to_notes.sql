-- Add image_url to notes table
ALTER TABLE public.notes
ADD COLUMN image_url TEXT;

-- Create a new bucket for note images
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-images', 'note-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for the note-images bucket
CREATE POLICY "Anyone can upload an image."
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'note-images');

CREATE POLICY "Anyone can view an image."
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'note-images');
