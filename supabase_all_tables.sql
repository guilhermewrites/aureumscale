-- Migration: Create all Supabase tables for Aureum App
-- Run this in the Supabase SQL Editor

-- ============================================================
-- 1. CLIENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  name         TEXT NOT NULL DEFAULT '',
  photo_url    TEXT,
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  service      TEXT NOT NULL DEFAULT 'Ghostwriting',
  leader       TEXT NOT NULL DEFAULT 'Guilherme Writes',
  status       TEXT NOT NULL DEFAULT 'Happy',
  order_num    INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON clients
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. SWIPEFILE_ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS swipefile_items (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  content    TEXT NOT NULL DEFAULT '',
  category   TEXT NOT NULL DEFAULT 'prompts',
  media_type TEXT NOT NULL DEFAULT 'text',
  media_url  TEXT,
  notes      TEXT,
  tags       TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE swipefile_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON swipefile_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. FINANCE_ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS finance_items (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  label      TEXT NOT NULL DEFAULT '',
  amount     NUMERIC NOT NULL DEFAULT 0,
  type       TEXT NOT NULL DEFAULT 'income',
  status     TEXT NOT NULL DEFAULT 'pending',
  date       TEXT NOT NULL DEFAULT '',
  category   TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE finance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON finance_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 4. CLIENT_DETAILS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS client_details (
  client_id   TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  ads_performance   JSONB NOT NULL DEFAULT '{"roas":"","spend":"","impressions":"","ctr":"","conversions":"","revenue":""}',
  social_platforms  JSONB NOT NULL DEFAULT '{"instagram":"","tiktok":"","youtube":"","twitter":"","linkedin":"","facebook":""}',
  strategy_overview TEXT NOT NULL DEFAULT '',
  google_drive_url  TEXT NOT NULL DEFAULT '',
  funnel_notes      TEXT NOT NULL DEFAULT '',
  scripted_ads      JSONB NOT NULL DEFAULT '[]',
  notes             TEXT NOT NULL DEFAULT '',
  ad_performance_notes TEXT NOT NULL DEFAULT '',
  contact_email     TEXT NOT NULL DEFAULT '',
  client_since      TEXT NOT NULL DEFAULT '',
  funnel_url        TEXT NOT NULL DEFAULT '',
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE client_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON client_details
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- If the table already exists, add the new columns:
ALTER TABLE client_details ADD COLUMN IF NOT EXISTS ad_performance_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE client_details ADD COLUMN IF NOT EXISTS contact_email TEXT NOT NULL DEFAULT '';
ALTER TABLE client_details ADD COLUMN IF NOT EXISTS client_since TEXT NOT NULL DEFAULT '';
ALTER TABLE client_details ADD COLUMN IF NOT EXISTS funnel_url TEXT NOT NULL DEFAULT '';
