-- Run this in Supabase SQL Editor to add missing columns

-- Add missing columns to content_items table
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS script_link TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS style TEXT;

-- Verify the table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'content_items';
