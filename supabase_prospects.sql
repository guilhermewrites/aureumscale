-- Prospects table (CRM — separate from clients)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS prospects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  company TEXT DEFAULT '',
  source TEXT DEFAULT 'Inbound — DMs',
  stage TEXT NOT NULL DEFAULT 'Interested',
  deal_value NUMERIC(12,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  next_action TEXT DEFAULT '',
  next_action_at TIMESTAMPTZ,
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospects_user ON prospects(user_id, stage);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own prospects"
  ON prospects FOR ALL
  USING (true)
  WITH CHECK (true);
