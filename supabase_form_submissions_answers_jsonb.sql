-- Run this in Supabase SQL Editor to store the full set of webinar form answers
-- (q1..q10) as JSON, so no question/answer is lost even if columns change.

ALTER TABLE form_submissions
ADD COLUMN IF NOT EXISTS answers JSONB;

