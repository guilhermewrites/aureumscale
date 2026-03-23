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
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- If the table already exists, add the active column:
ALTER TABLE clients ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

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
ALTER TABLE client_details ADD COLUMN IF NOT EXISTS twitter_banner_url TEXT NOT NULL DEFAULT '';
ALTER TABLE client_details ADD COLUMN IF NOT EXISTS twitter_handle TEXT NOT NULL DEFAULT '';
ALTER TABLE client_details ADD COLUMN IF NOT EXISTS twitter_bio TEXT NOT NULL DEFAULT '';
ALTER TABLE client_details ADD COLUMN IF NOT EXISTS twitter_followers INTEGER NOT NULL DEFAULT 0;
ALTER TABLE client_details ADD COLUMN IF NOT EXISTS twitter_following INTEGER NOT NULL DEFAULT 0;

-- Add amount, client_type, and cadence columns to clients table:
ALTER TABLE clients ADD COLUMN IF NOT EXISTS amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type TEXT NOT NULL DEFAULT 'recurring';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cadence TEXT NOT NULL DEFAULT '1x/month';

-- ============================================================
-- 5. BILLING_HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_history (
  id             TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL,
  user_id        TEXT NOT NULL,
  invoice_number TEXT NOT NULL DEFAULT '',
  amount         NUMERIC NOT NULL DEFAULT 0,
  service        TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'Draft',
  date_sent      TEXT NOT NULL DEFAULT '',
  date_paid      TEXT NOT NULL DEFAULT '',
  notes          TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Add due date column to billing_history:
ALTER TABLE billing_history ADD COLUMN IF NOT EXISTS date_due TEXT NOT NULL DEFAULT '';

ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON billing_history
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 6. COLUMN_OPTIONS TABLE (custom dropdown options)
-- ============================================================
CREATE TABLE IF NOT EXISTS column_options (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  column_name  TEXT NOT NULL,
  option_value TEXT NOT NULL,
  order_num    INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE column_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON column_options
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 7. CLIENT_TWEETS TABLE (X/Twitter content per client)
-- ============================================================
CREATE TABLE IF NOT EXISTS client_tweets (
  id           TEXT PRIMARY KEY,
  client_id    TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  text         TEXT NOT NULL DEFAULT '',
  post_date    TEXT NOT NULL DEFAULT '',
  image_url    TEXT NOT NULL DEFAULT '',
  likes        INTEGER NOT NULL DEFAULT 0,
  retweets     INTEGER NOT NULL DEFAULT 0,
  replies      INTEGER NOT NULL DEFAULT 0,
  views        INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE client_tweets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON client_tweets
  FOR ALL
  USING (true)
  WITH CHECK (true);
