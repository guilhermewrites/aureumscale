-- Board tasks table for client task management
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS board_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  client_id TEXT,
  client_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Lead',
  estimated_revenue NUMERIC(12,2) DEFAULT 0,
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_tasks_user ON board_tasks(user_id, status);

ALTER TABLE board_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own board tasks"
  ON board_tasks FOR ALL
  USING (true)
  WITH CHECK (true);
