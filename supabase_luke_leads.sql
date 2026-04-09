-- ══════════════════════════════════════════════════════════════
--  Luke Alexander Leads
--  Feeds: Meta CAPI · ConvertKit · Close CRM
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS luke_alexander_leads (
  -- Core identity
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT now(),

  -- Opt-in form fields
  instagram       TEXT,
  full_name       TEXT,
  email           TEXT,
  phone           TEXT,

  -- Attribution / UTM (for Meta & analytics)
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  utm_term        TEXT,
  fbclid          TEXT,        -- Facebook Click ID for Meta CAPI deduplication
  referrer        TEXT,
  page_url        TEXT,
  user_agent      TEXT,

  -- Funnel context
  funnel_event    TEXT DEFAULT 'luke-alexander-optin',   -- which event/webinar
  telegram_joined BOOLEAN DEFAULT false,

  -- Sync status flags (update these when you push to each platform)
  synced_meta     BOOLEAN DEFAULT false,
  synced_convertkit BOOLEAN DEFAULT false,
  synced_close    BOOLEAN DEFAULT false,

  -- Platform IDs (fill in after sync)
  meta_event_id            TEXT,
  convertkit_subscriber_id TEXT,
  close_lead_id            TEXT,

  -- Notes / manual tags
  notes           TEXT
);

-- ── Indexes for fast lookups ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_luke_leads_email      ON luke_alexander_leads (email);
CREATE INDEX IF NOT EXISTS idx_luke_leads_created    ON luke_alexander_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_luke_leads_fbclid     ON luke_alexander_leads (fbclid);
CREATE INDEX IF NOT EXISTS idx_luke_leads_sync_meta  ON luke_alexander_leads (synced_meta) WHERE synced_meta = false;
CREATE INDEX IF NOT EXISTS idx_luke_leads_sync_ck    ON luke_alexander_leads (synced_convertkit) WHERE synced_convertkit = false;
CREATE INDEX IF NOT EXISTS idx_luke_leads_sync_close ON luke_alexander_leads (synced_close) WHERE synced_close = false;

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE luke_alexander_leads ENABLE ROW LEVEL SECURITY;

-- Anyone with the anon key (landing page) can INSERT
CREATE POLICY "Public can insert leads"
  ON luke_alexander_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only authenticated users (you + team) can SELECT / UPDATE
CREATE POLICY "Authenticated users can read leads"
  ON luke_alexander_leads
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update leads"
  ON luke_alexander_leads
  FOR UPDATE
  TO authenticated
  USING (true);
