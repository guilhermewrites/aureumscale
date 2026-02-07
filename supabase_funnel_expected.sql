-- Run in Supabase SQL Editor if you use funnel expected metrics (expected vs real-time with red/yellow/green).
-- Adds optional expected_metrics column to store targets for views, clicks, conversions.

ALTER TABLE funnels ADD COLUMN IF NOT EXISTS expected_metrics JSONB DEFAULT NULL;
