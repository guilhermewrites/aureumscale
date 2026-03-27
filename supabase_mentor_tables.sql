-- Mentor section tables for Aureum App
-- Run this in Supabase SQL Editor

-- 1. Mentor profile — personality, tone, life areas, goals
CREATE TABLE IF NOT EXISTS mentor_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  mentor_name TEXT DEFAULT 'Aurelius',
  mentor_photo TEXT DEFAULT '',
  personality TEXT DEFAULT 'stoic',
  custom_personality TEXT,
  tone TEXT DEFAULT 'direct',
  life_areas JSONB DEFAULT '[]',
  wake_time TEXT DEFAULT '07:00',
  sleep_time TEXT DEFAULT '23:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE mentor_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own mentor profile"
  ON mentor_profile FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. Mentor logs — daily tracking (food, sleep, workout, mood, notes)
CREATE TABLE IF NOT EXISTS mentor_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_logs_user_date ON mentor_logs(user_id, date);

ALTER TABLE mentor_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own mentor logs"
  ON mentor_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Mentor conversations — chat history
CREATE TABLE IF NOT EXISTS mentor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_conv_user ON mentor_conversations(user_id, created_at);

ALTER TABLE mentor_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own mentor conversations"
  ON mentor_conversations FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Mentor knowledge base — business playbooks, life knowledge
CREATE TABLE IF NOT EXISTS mentor_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_knowledge_user ON mentor_knowledge(user_id, category);

ALTER TABLE mentor_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own mentor knowledge"
  ON mentor_knowledge FOR ALL
  USING (true)
  WITH CHECK (true);
