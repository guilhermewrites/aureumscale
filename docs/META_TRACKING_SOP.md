# Meta Pixel + CAPI Deduplication SOP

> Set up browser-side (Pixel) + server-side (CAPI) tracking with full deduplication so Meta counts 1 lead, not 2+.

---

## Why This Matters

- **Meta Pixel** fires from the browser — can be blocked by ad blockers, iOS 14+, browser privacy modes.
- **Conversions API (CAPI)** fires from your server — bypasses blockers, more reliable signal.
- Both must fire with the **same `event_id`** so Meta deduplicates them into 1 conversion.
- If you send both without a matching `event_id`, Meta counts 2 leads per submission — corrupts your campaign data.

---

## Part 1 — GHL (GoHighLevel) Funnels

### Step 1 — Add the Meta Pixel

1. In GHL, go to **Settings → Integrations → Meta Pixel** (or your funnel's **Tracking** tab).
2. Paste your Pixel ID (e.g. `1024811462542782`).
3. GHL will fire `PageView` automatically on every page load.

### Step 2 — Generate a Shared Event ID on Form Submit

GHL does not natively support custom `event_id` deduplication. You need to inject custom JS.

In your funnel page's **Custom Code (Header or Footer)**, add:

```html
<!-- Meta Pixel base code -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
</script>
```

### Step 3 — Fire Pixel Lead Event with event_id

In your funnel's **form submission webhook or custom JS**, fire the Lead event with a UUID in the **4th argument** (EventOptions):

```js
// Generate a unique ID for this submission
const leadId = crypto.randomUUID();

// Store it so your webhook/CAPI call can use the same ID
sessionStorage.setItem('lead_event_id', leadId);

// Fire browser pixel — eventID goes in 4th arg, NOT 3rd
fbq('track', 'Lead', {}, { eventID: leadId });
```

> **Common mistake:** `fbq('track', 'Lead', { eventID: leadId })` — this puts `eventID` in customData (3rd arg). Meta ignores it and generates its own ID. Always use the **4th argument**.

### Step 4 — Send to CAPI via GHL Webhook

GHL supports **Webhooks** on form submission. Configure it to POST to your CAPI endpoint (Vercel, Make, Zapier, etc.):

**GHL Webhook payload** (map these fields from your form):
```json
{
  "email": "{{contact.email}}",
  "phone": "{{contact.phone}}",
  "full_name": "{{contact.full_name}}",
  "fbclid": "{{contact.fbclid}}",
  "page_url": "{{page.url}}",
  "user_agent": "{{contact.user_agent}}",
  "event_id": "{{custom.lead_event_id}}"
}
```

> GHL can pass the `event_id` if you capture it via a hidden field populated by the JS in Step 3.

**Hidden field trick:**
```html
<input type="hidden" name="lead_event_id" id="hidden_event_id" />
<script>
  document.getElementById('hidden_event_id').value = crypto.randomUUID();
</script>
```
Then map that hidden field to the webhook payload as `event_id`.

### Step 5 — CAPI Serverless Function

Deploy a Vercel function (or use Make/n8n) that:
1. Receives the form data
2. SHA-256 hashes all PII (email, phone, name)
3. Sends to Meta's Graph API with the same `event_id`

See **Part 2, Step 4** for the full function code — it's identical regardless of whether the form comes from GHL or a custom page.

### Step 6 — Verify Deduplication

1. Add `?meta_test=TEST13006` (your test code) to your funnel URL.
2. Submit the form.
3. In Meta Events Manager → **Test Events**, you should see:
   - 1x Lead — Browser — `Processed`
   - 1x Lead — Server — `Deduplicated`
   - Both showing the **same event_id**

---

## Part 2 — Custom Pages with Supabase

This is the full stack used on `aifreelancer.ai`.

### Step 1 — Create the Supabase Leads Table

Run this SQL in your Supabase project (SQL Editor):

```sql
CREATE TABLE IF NOT EXISTS your_funnel_leads (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT now(),

  -- Form fields
  instagram       TEXT,
  full_name       TEXT,
  email           TEXT,
  phone           TEXT,

  -- Attribution
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  utm_term        TEXT,
  fbclid          TEXT,
  referrer        TEXT,
  page_url        TEXT,
  user_agent      TEXT,

  -- Funnel context
  funnel_event    TEXT DEFAULT 'your-funnel-name',

  -- Sync flags
  synced_meta       BOOLEAN DEFAULT false,
  synced_convertkit BOOLEAN DEFAULT false,
  synced_close      BOOLEAN DEFAULT false,

  -- Platform IDs
  meta_event_id            TEXT,
  convertkit_subscriber_id TEXT,
  close_lead_id            TEXT
);

-- RLS
ALTER TABLE your_funnel_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert"
  ON your_funnel_leads FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Authenticated can read"
  ON your_funnel_leads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can update"
  ON your_funnel_leads FOR UPDATE TO authenticated USING (true);
```

### Step 2 — Add Meta Pixel to the Page `<head>`

```html
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
</script>
```

Replace `YOUR_PIXEL_ID` with your actual Pixel ID.

### Step 3 — Form Submit Handler (JS)

```js
async function handleSubmit(e) {
  e.preventDefault();

  const instagram  = document.getElementById('instagram').value.trim();
  const full_name  = document.getElementById('full_name').value.trim();
  const email      = document.getElementById('email').value.trim();
  const phone      = document.getElementById('phone').value.trim();

  // 1. Generate the shared event ID (used for both Pixel and CAPI)
  const leadId = crypto.randomUUID();

  // 2. Collect attribution data
  const params     = new URLSearchParams(window.location.search);
  const utmFields  = {
    utm_source:   params.get('utm_source'),
    utm_medium:   params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content:  params.get('utm_content'),
    utm_term:     params.get('utm_term'),
    fbclid:       params.get('fbclid'),
  };

  // 3. Insert into Supabase
  // IMPORTANT: pass `id: leadId` so you don't need to read it back (RLS blocks anon SELECT)
  try {
    await supabase.from('your_funnel_leads').insert({
      id:         leadId,
      instagram,
      full_name,
      email,
      phone,
      referrer:   document.referrer,
      page_url:   window.location.href,
      user_agent: navigator.userAgent,
      ...utmFields,
    });
  } catch (_) {}

  // 4. Fire browser Pixel — eventID in 4th arg
  if (typeof fbq !== 'undefined') {
    fbq('track', 'Lead', {}, { eventID: leadId });
  }

  // 5. Fire CAPI (server-side) with same event_id
  try {
    await fetch('/api/capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        phone,
        full_name,
        fbclid:     utmFields.fbclid,
        page_url:   window.location.href,
        user_agent: navigator.userAgent,
        event_id:   leadId,
        // For testing in Meta Events Manager — add ?meta_test=TEST13006 to URL
        test_event_code: params.get('meta_test') || undefined,
      }),
    });
  } catch (_) {}

  // 6. Redirect / show confirmation
  window.open('https://t.me/your-group-link', '_blank');
}
```

### Step 4 — CAPI Serverless Function (`/api/capi.js`)

Deploy this as a Vercel serverless function. Place it at `api/capi.js` in your project root.

```js
const crypto = require('crypto');

function sha256(value) {
  if (!value) return undefined;
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://yourdomain.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).end();

  const { email, phone, full_name, fbclid, page_url, user_agent, event_id, test_event_code } = req.body;

  // Split name into first/last for better match rate
  const firstName = full_name ? full_name.split(' ')[0] : undefined;
  const lastName  = full_name && full_name.includes(' ')
    ? full_name.split(' ').slice(1).join(' ')
    : undefined;

  // Build hashed user_data — Meta requires SHA-256, trimmed + lowercased
  const userData = {};
  if (email)     userData.em  = [sha256(email)];
  if (phone)     userData.ph  = [sha256(phone.replace(/\D/g, ''))]; // digits only before hashing
  if (firstName) userData.fn  = [sha256(firstName)];
  if (lastName)  userData.ln  = [sha256(lastName)];
  if (fbclid)    userData.fbc = `fb.1.${Date.now()}.${fbclid}`;
  if (user_agent) userData.client_user_agent = user_agent;

  const payload = {
    ...(test_event_code && { test_event_code }),
    data: [{
      event_name:       'Lead',
      event_time:       Math.floor(Date.now() / 1000),
      event_id:         event_id || crypto.randomUUID(), // must match Pixel eventID
      action_source:    'website',
      event_source_url: page_url || 'https://yourdomain.com',
      user_data:        userData,
    }]
  };

  try {
    const r = await fetch(
      `https://graph.facebook.com/v19.0/YOUR_PIXEL_ID/events?access_token=${process.env.META_ACCESS_TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );
    const data = await r.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
```

Replace `YOUR_PIXEL_ID` with your actual Pixel ID.

### Step 5 — Deploy to Vercel

```bash
# Install Vercel CLI (once)
npm install -g vercel

# In your project folder
npx vercel --prod --yes

# Add your Meta access token as an env var
npx vercel env add META_ACCESS_TOKEN production
# Paste your token when prompted

# Redeploy to apply env var
npx vercel --prod --yes
```

> Get your Meta Access Token from: Meta Events Manager → Your Pixel → Settings → Conversions API → Generate Access Token

### Step 6 — Connect Your Domain (if custom domain)

In Vercel dashboard:
1. Go to your project → **Settings → Domains**
2. Add your domain (e.g. `aifreelancer.ai`)
3. Vercel shows a **TXT record** — add it to GoDaddy/Cloudflare DNS
4. Add an **A record** pointing to `216.198.79.1` (Vercel's IP)
5. Wait 5-10 min for propagation

### Step 7 — Test Before Going Live

1. Go to: `https://yourdomain.com?meta_test=YOUR_TEST_CODE`
   - Find your test code: Events Manager → Test Events → copy the code shown
2. Submit the form
3. In Meta Events Manager → **Test Events** you should see:
   - Lead (Browser) — `Processed`
   - Lead (Server) — `Deduplicated`
   - Both with the **same event_id**

If you only see Browser events, the CAPI call is failing — check:
- `META_ACCESS_TOKEN` env var is set in Vercel
- The function is at `/api/capi.js`
- `vercel.json` does not block the `/api/` route

---

## Deduplication Rules (How Meta Decides)

| Condition | Result |
|-----------|--------|
| Browser + Server events with **same** `event_id` within 48h | Meta deduplicates → counts as **1 conversion** |
| Browser + Server events with **different** `event_id` | Meta counts as **2 conversions** — corrupts data |
| Only browser event | Counts as 1, but vulnerable to blockers |
| Only server event | Counts as 1, most reliable signal |

**The `event_id` is the single most important thing.** Generate it once on the client, pass it to both `fbq()` and your CAPI call, and you're covered.

---

## Quick Reference Checklist

- [ ] Meta Pixel base code in `<head>` with correct Pixel ID
- [ ] `fbq('track', 'Lead', {}, { eventID: leadId })` — eventID in **4th arg**
- [ ] `leadId = crypto.randomUUID()` generated once per form submission
- [ ] Same `leadId` passed to CAPI call as `event_id`
- [ ] CAPI function hashes email, phone, first name, last name with SHA-256
- [ ] Phone stripped of non-digits before hashing: `phone.replace(/\D/g, '')`
- [ ] `META_ACCESS_TOKEN` set as Vercel env var (never hardcoded)
- [ ] Tested with `?meta_test=YOUR_TEST_CODE` before running ads
- [ ] Meta Events Manager shows Server event as **Deduplicated**
