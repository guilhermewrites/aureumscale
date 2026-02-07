-- Run this in Supabase SQL Editor to store team members in Supabase

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  initials TEXT NOT NULL,
  color TEXT NOT NULL,
  photo_url TEXT,
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- Optional: enable RLS and allow all for now
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all team_members" ON team_members;
CREATE POLICY "Allow all team_members" ON team_members FOR ALL USING (true);
