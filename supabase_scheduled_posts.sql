-- Scheduled posts table (posting calendar on Branding page)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  post_date DATE NOT NULL,
  post_time TEXT DEFAULT '',
  title TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'scheduled',
  link TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_date ON scheduled_posts(user_id, post_date);

ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own scheduled posts"
  ON scheduled_posts FOR ALL
  USING (true)
  WITH CHECK (true);
