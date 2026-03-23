-- Add acquisition channel column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS acquisition TEXT NOT NULL DEFAULT 'Inbound — DMs';
