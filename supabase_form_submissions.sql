-- Form submissions from Aureum Webinars landing page
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instagram TEXT,
  info_product TEXT,
  bottleneck TEXT,
  monthly_revenue TEXT,
  webinar_before TEXT,
  running_ads TEXT,
  investment_range TEXT,
  seriousness TEXT,
  email TEXT,
  phone TEXT,
  source TEXT DEFAULT 'aureum-webinars',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Allow inserts from the anon key (public landing page)
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public inserts"
  ON form_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only authenticated users (you) can read submissions
CREATE POLICY "Authenticated users can read"
  ON form_submissions
  FOR SELECT
  TO authenticated
  USING (true);
