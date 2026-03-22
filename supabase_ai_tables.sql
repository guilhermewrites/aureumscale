-- AI Memory: stores user's preferences, brand voice, writing style instructions
CREATE TABLE IF NOT EXISTS ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',  -- 'general', 'tone', 'audience', 'examples', 'rules'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Conversations: stores chat history per client
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  client_id TEXT,  -- nullable, for global conversations
  role TEXT NOT NULL,  -- 'user' or 'assistant'
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_memory
CREATE POLICY "Users can view own ai_memory" ON ai_memory FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own ai_memory" ON ai_memory FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own ai_memory" ON ai_memory FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own ai_memory" ON ai_memory FOR DELETE USING (auth.uid()::text = user_id);

-- RLS policies for ai_conversations
CREATE POLICY "Users can view own ai_conversations" ON ai_conversations FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own ai_conversations" ON ai_conversations FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own ai_conversations" ON ai_conversations FOR DELETE USING (auth.uid()::text = user_id);
