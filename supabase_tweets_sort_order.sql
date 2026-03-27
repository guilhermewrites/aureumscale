-- Add sort_order column to client_tweets for manual post reordering
ALTER TABLE client_tweets ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
