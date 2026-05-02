-- Run this in Supabase SQL Editor to enable the per-funnel "Client Profile" tab.
-- One row per (user_id, funnel_id). Holds description, overview, team, links, etc.

CREATE TABLE IF NOT EXISTS funnel_profiles (
  user_id            TEXT NOT NULL,
  funnel_id          TEXT NOT NULL,
  display_name       TEXT,
  tagline            TEXT,
  status             TEXT DEFAULT 'active',
  start_date         DATE,
  overview           TEXT,
  main_offer         TEXT,
  target_audience    TEXT,
  north_star_metric  TEXT,
  current_focus      TEXT,
  team_member_ids    TEXT[] DEFAULT '{}',
  links              JSONB  DEFAULT '[]'::jsonb,
  notes              TEXT,
  photo_url          TEXT,
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, funnel_id)
);

-- Mirror the project's permissive policy style (single-tenant workspace).
ALTER TABLE funnel_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all funnel_profiles" ON funnel_profiles;
CREATE POLICY "Allow all funnel_profiles" ON funnel_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);
