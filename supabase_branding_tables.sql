-- Run this in Supabase SQL Editor to create the Branding tables

-- ============================================================
-- 1. BRANDING_ACCOUNTS TABLE (connected social media accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS branding_accounts (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  platform      TEXT NOT NULL,
  username      TEXT NOT NULL,
  connected     BOOLEAN DEFAULT true,
  api_token     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE branding_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_branding_accounts" ON branding_accounts;
CREATE POLICY "allow_all_branding_accounts" ON branding_accounts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. BRANDING_SNAPSHOTS TABLE (daily metrics snapshots)
-- ============================================================
CREATE TABLE IF NOT EXISTS branding_snapshots (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL,
  platform       TEXT NOT NULL,
  followers      INTEGER DEFAULT 0,
  following      INTEGER DEFAULT 0,
  total_views    BIGINT DEFAULT 0,
  total_posts    INTEGER DEFAULT 0,
  subscribers    INTEGER DEFAULT 0,
  snapshot_date  DATE NOT NULL,
  raw_data       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE branding_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_branding_snapshots" ON branding_snapshots;
CREATE POLICY "allow_all_branding_snapshots" ON branding_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);
