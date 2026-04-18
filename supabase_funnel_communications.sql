-- Funnel communications (Email / SMS / Telegram broadcasts per funnel)
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS funnel_communications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  funnel_id TEXT NOT NULL,
  channel TEXT NOT NULL,              -- 'email' | 'sms' | 'telegram'
  subject TEXT DEFAULT '',            -- email only
  body TEXT DEFAULT '',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',        -- 'draft' | 'scheduled' | 'sent' | 'failed'
  recipient_count INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_comms_user_funnel
  ON funnel_communications(user_id, funnel_id);

CREATE INDEX IF NOT EXISTS idx_funnel_comms_schedule
  ON funnel_communications(user_id, scheduled_at);

ALTER TABLE funnel_communications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own funnel communications" ON funnel_communications;
CREATE POLICY "Users can manage their own funnel communications"
  ON funnel_communications FOR ALL
  USING (true)
  WITH CHECK (true);
