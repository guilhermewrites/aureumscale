ROAS Deep-Tracking SOP
Meta Pixel + Conversions API — GHL Setup Guide


————————————————————————————————


WHY THIS EXISTS

Meta Pixel fires from the browser.
It can be blocked by iOS 14+, ad blockers, and privacy browsers.

The Conversions API (CAPI) fires from GHL's servers.
It bypasses all of that and sends a stronger signal to Meta.

When both fire together with the same Event ID,
Meta deduplicates them and counts 1 lead — not 2.

If they don't share the same Event ID, Meta counts 2 leads
and your campaign data becomes unreliable.

The good news: GHL handles all of this natively.
You don't need to write code or host anything yourself.


————————————————————————————————


WHAT YOU NEED BEFORE STARTING

  · A Meta Business Manager account
  · A Meta Pixel created inside Events Manager
  · A Conversions API Access Token (generated from the same Pixel)
  · A GHL account with at least one funnel or website

How to get your Access Token:
  1. Go to Meta Events Manager
  2. Select your Pixel
  3. Settings → Conversions API → Generate Access Token
  4. Copy and save it somewhere safe — you'll paste it into GHL


————————————————————————————————


STEP 1 — CONNECT YOUR PIXEL TO GHL

  1. In GHL, go to Settings (bottom left gear icon)
  2. Click Integrations
  3. Find Facebook / Meta and click Connect
  4. Paste your Pixel ID
  5. Save

GHL will now fire a PageView event automatically
on every page load across your funnels and websites.


————————————————————————————————


STEP 2 — ENABLE THE CONVERSIONS API IN GHL

This is the server-side layer. Do not skip this step.

  1. In the same Facebook / Meta integration screen
  2. Look for the Conversions API section
  3. Toggle it ON
  4. Paste your Access Token
  5. Save

GHL will now send a server-side copy of every event
to Meta using the same Event ID as the browser Pixel.
This is what enables deduplication.


————————————————————————————————


STEP 3 — MAP YOUR FORM TO A LEAD EVENT

GHL needs to know which action counts as a "Lead."

  1. Go to your Funnel or Website
  2. Open the page that has your opt-in form
  3. Click on the form element to edit it
  4. Go to the form's Options or Tracking settings
  5. Set the Conversion Event to Lead
  6. Save and publish the page

Now every time someone submits that form,
GHL fires Lead from both the browser and the server
with matching Event IDs automatically.


————————————————————————————————


STEP 4 — PASS LEAD DATA FOR BETTER MATCHING

The more data Meta receives, the better it can match
the lead to a Facebook profile. This improves your ROAS.

Make sure your form collects at least:

  · Full Name
  · Email
  · Phone Number

GHL automatically passes these fields to CAPI and hashes them
(SHA-256) before sending — you don't need to do this manually.

If you're running paid ads, also make sure your ad links
include the fbclid parameter. This happens automatically
when someone clicks a Meta ad — just don't strip it from your URL.


————————————————————————————————


STEP 5 — TEST BEFORE RUNNING ADS

Never run paid traffic to a funnel you haven't verified.

  1. Go to Meta Events Manager
  2. Click on your Pixel → Test Events tab
  3. Copy the test code shown (e.g. TEST13006)
  4. Open your funnel URL and add ?meta_test=TEST13006 at the end
     Example: yoursite.com/funnel?meta_test=TEST13006
  5. Submit the form with real-looking test data
  6. Go back to Meta → Test Events

You should see:

    Lead · Browser · Processed        ← Pixel fired ✓
    Lead · Server  · Deduplicated     ← CAPI fired + matched ✓

Both events must show the same Event ID.
If Server shows "Deduplicated" — you're set up correctly.
If you only see Browser events — CAPI is not connected properly,
go back to Step 2 and verify the Access Token is saved.


————————————————————————————————


TROUBLESHOOTING

I only see Browser events, no Server event
→ Your Access Token is missing or incorrect in GHL
→ Go to Settings → Integrations → Meta → re-paste the token

I see two Lead events that are NOT deduplicated
→ GHL is not passing a consistent Event ID
→ Make sure you're using GHL's native form — not an embedded
   third-party form (Typeform, Jotform, etc.)

I see no events at all
→ Your Pixel ID is wrong or not saved
→ Disable any ad blockers when testing
→ Use the Meta Pixel Helper Chrome extension to verify the Pixel fires

The Lead event fires on page load, not on form submit
→ You mapped the event to the page instead of the form
→ Go back to the form element settings and set the conversion event there

My match quality in Meta is low
→ Add more fields to your form (phone is the most valuable after email)
→ Make sure your form is not stripping the phone country code


————————————————————————————————


HOW DEDUPLICATION WORKS

  Same Event ID · within 48h     →  Meta counts 1 conversion ✓
  Different Event IDs             →  Meta counts 2 conversions ✗
  Browser only                    →  1 conversion, vulnerable to blockers
  Server only                     →  1 conversion, most reliable signal

Running both (browser + server) with matching IDs gives you
the best of both worlds: reliability + match quality.

GHL generates and matches these Event IDs for you automatically
as long as the Pixel and CAPI are both connected in the same integration.


————————————————————————————————


QUICK CHECKLIST

  ○  Pixel ID connected in GHL Settings → Integrations → Meta
  ○  Conversions API Access Token pasted and saved
  ○  Form element has Conversion Event set to Lead
  ○  Form collects Full Name, Email, and Phone
  ○  Tested with ?meta_test= URL — Server event shows Deduplicated
  ○  Ad links include fbclid (Meta adds this automatically on click)
  ○  Page is published before testing


————————————————————————————————


ONCE IT'S VERIFIED — WHAT TO DO IN ADS MANAGER

  1. Create a new campaign
  2. Set the Optimization Event to Lead
  3. Select the Pixel you just verified
  4. Point the ad to the funnel URL (no test code in the URL)
  5. Let the campaign run until you have 50 Lead events
     — Meta's algorithm needs 50 events per week to exit learning phase

Do not change the creative, audience, or budget during learning phase.
Touching the campaign resets the learning and wastes spend.
