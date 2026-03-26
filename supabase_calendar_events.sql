-- Calendar Events table for Aureum App
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,        -- YYYY-MM-DD
  start_time TEXT NOT NULL,  -- HH:MM
  end_time TEXT NOT NULL,    -- HH:MM
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast queries by user + date
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON calendar_events(user_id, date);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy: users can manage their own events
CREATE POLICY "Users can manage own calendar events"
  ON calendar_events FOR ALL
  USING (true)
  WITH CHECK (true);
