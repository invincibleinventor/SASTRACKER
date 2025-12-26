INSERT INTO storage.buckets (id, name, public)
VALUES ('resume-files', 'resume-files', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view resume files" ON storage.objects
  FOR SELECT USING (bucket_id = 'resume-files');

CREATE POLICY "Authenticated users can upload resume files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resume-files' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own resume files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'resume-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own resume files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'resume-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view project images" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-images');

CREATE POLICY "Authenticated users can upload project images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own project images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own project images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
