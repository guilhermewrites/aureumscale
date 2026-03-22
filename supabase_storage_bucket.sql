-- Run this in your Supabase SQL Editor (one time).
-- Creates the funnel-media storage bucket for video/image uploads.

-- 1. Create the bucket (public so video/image URLs work in the app)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('funnel-media', 'funnel-media', true, 104857600)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 104857600;

-- 2. Storage policies (allow upload, read, delete, update)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'funnel-media-insert' AND tablename = 'objects') THEN
    CREATE POLICY "funnel-media-insert" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'funnel-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'funnel-media-select' AND tablename = 'objects') THEN
    CREATE POLICY "funnel-media-select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'funnel-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'funnel-media-delete' AND tablename = 'objects') THEN
    CREATE POLICY "funnel-media-delete" ON storage.objects FOR DELETE TO public USING (bucket_id = 'funnel-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'funnel-media-update' AND tablename = 'objects') THEN
    CREATE POLICY "funnel-media-update" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'funnel-media');
  END IF;
END $$;
