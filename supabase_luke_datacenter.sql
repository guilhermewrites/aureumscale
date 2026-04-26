-- =============================================================================
-- Luke Alexander webinar datacenter schema
-- Run this ONCE in the Supabase SQL Editor. Safe to re-run (idempotent).
-- =============================================================================

-- ---------- luke_people -------------------------------------------------
-- One row per unique email across WebinarJam + Close + Kit + Whop + Calendly.
-- This is the master roster Guilherme reads from the Data tab.
create table if not exists public.luke_people (
  id                      uuid primary key default gen_random_uuid(),
  email                   text not null,

  first_name              text,
  last_name               text,
  phone                   text,
  instagram_handle        text,

  -- Presence flags — "is this person in system X?"
  in_webinarjam           boolean not null default false,
  in_close                boolean not null default false,
  in_kit                  boolean not null default false,

  -- Kit (ConvertKit)
  kit_subscriber_id       bigint,
  kit_tags                text[] not null default '{}',

  -- Close CRM
  close_lead_id           text,
  close_opportunity_id    text,
  close_status            text,          -- 'Registered' | 'Bought VIP Ticket' | 'Bought Main Product' | 'Lost'

  -- WebinarJam
  wj_registrant_ids       integer[] not null default '{}',
  wj_event_times          text[] not null default '{}',
  wj_attended_live        boolean not null default false,
  wj_time_live_seconds    integer not null default 0,
  wj_purchased_live       boolean not null default false,
  wj_revenue_live         numeric(10,2) not null default 0,
  wj_attended_replay      boolean not null default false,
  wj_purchased_replay     boolean not null default false,
  wj_revenue_replay       numeric(10,2) not null default 0,

  -- Purchases (authoritative: Close opportunity + Whop payment_id)
  bought_slo              boolean not null default false,
  slo_amount              numeric(10,2),
  slo_purchase_date       timestamptz,
  slo_whop_payment_id     text,

  bought_main             boolean not null default false,
  main_amount             numeric(10,2),
  main_purchase_date      timestamptz,
  main_whop_payment_id    text,

  -- Calendly
  calendly_booked         boolean not null default false,
  calendly_event_uri      text,
  calendly_event_name     text,
  calendly_booking_time   timestamptz,
  calendly_cancelled      boolean not null default false,

  -- UTM attribution (from first touch, usually WebinarJam registration)
  utm_source              text,
  utm_medium              text,
  utm_campaign            text,
  utm_term                text,
  utm_content             text,

  -- Bookkeeping
  last_synced_at          timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Email uniqueness. The sync pipeline normalizes every email to lowercase
-- before insert, so a plain column-level unique constraint is enough and
-- PostgREST's on_conflict=email upsert works against it.
alter table public.luke_people
  drop constraint if exists luke_people_email_key;
alter table public.luke_people
  add constraint luke_people_email_key unique (email);
drop index if exists public.luke_people_email_ci_idx;

create index if not exists luke_people_close_status_idx
  on public.luke_people (close_status);

create index if not exists luke_people_bought_slo_idx
  on public.luke_people (bought_slo) where bought_slo = true;

create index if not exists luke_people_bought_main_idx
  on public.luke_people (bought_main) where bought_main = true;

create index if not exists luke_people_attended_idx
  on public.luke_people (wj_attended_live) where wj_attended_live = true;

-- Idempotent forward-migration for projects created before instagram_handle
-- was part of the initial schema. Safe to leave permanently in place.
alter table public.luke_people add column if not exists instagram_handle text;

-- ---------- updated_at trigger ---------------------------------------------
create or replace function public.luke_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists luke_people_touch on public.luke_people;
create trigger luke_people_touch
before update on public.luke_people
for each row execute function public.luke_touch_updated_at();

-- ---------- luke_payment_attempts ------------------------------------------
-- Every Whop payment record for the Luke products that did NOT end in a clean
-- 'paid' — failed, errored, open/stuck, disputed, etc. One row per Whop
-- payment id. Luke uses this to chase buyers whose card bounced.
-- Instagram handle is pulled from the matching Close lead's description.
create table if not exists public.luke_payment_attempts (
  id                 uuid primary key default gen_random_uuid(),
  whop_payment_id    text not null unique,
  email              text,
  first_name         text,
  last_name          text,
  phone              text,
  instagram_handle   text,

  product_id         text,
  product_label      text,             -- 'SLO' | 'Main' | raw product id fallback
  amount             numeric(10,2),
  currency           text,

  status             text,             -- whop raw status: 'failed' | 'errored' | 'open' | 'disputed' | ...
  failure_reason     text,             -- error_message / failure_message / checkout error

  attempted_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists luke_payment_attempts_email_idx
  on public.luke_payment_attempts (lower(email));
create index if not exists luke_payment_attempts_status_idx
  on public.luke_payment_attempts (status);
create index if not exists luke_payment_attempts_attempted_idx
  on public.luke_payment_attempts (attempted_at desc);

drop trigger if exists luke_payment_attempts_touch on public.luke_payment_attempts;
create trigger luke_payment_attempts_touch
before update on public.luke_payment_attempts
for each row execute function public.luke_touch_updated_at();

-- ---------- luke_sync_runs -------------------------------------------------
-- One row per sync attempt. Lets the Data tab show "last synced at X, status
-- OK / failed" and surface API errors without digging through Vercel logs.
create table if not exists public.luke_sync_runs (
  id                 uuid primary key default gen_random_uuid(),
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  status             text not null default 'running'  -- 'running' | 'ok' | 'error'
                     check (status in ('running', 'ok', 'error')),
  source             text,                            -- 'manual' | 'cron' | 'webhook'
  webinarjam_count   integer,
  close_count        integer,
  kit_count          integer,
  whop_count         integer,
  whop_attempts_count integer,
  calendly_count     integer,
  upserted_count     integer,
  duration_ms        integer,
  error              text
);

-- Idempotent column add for existing deployments where the run table predates
-- the failed-payments feature.
alter table public.luke_sync_runs
  add column if not exists whop_attempts_count integer;

create index if not exists luke_sync_runs_started_idx
  on public.luke_sync_runs (started_at desc);

-- ---------- Row Level Security ---------------------------------------------
alter table public.luke_people            enable row level security;
alter table public.luke_payment_attempts  enable row level security;
alter table public.luke_sync_runs         enable row level security;

-- Aureum App is signed-in-only. Any authenticated user can read both tables.
-- Writes only happen from the sync endpoint via the service role key, which
-- bypasses RLS entirely.
drop policy if exists "read luke_people (authed)" on public.luke_people;
create policy "read luke_people (authed)"
  on public.luke_people for select
  using (auth.role() = 'authenticated');

drop policy if exists "read luke_payment_attempts (authed)" on public.luke_payment_attempts;
create policy "read luke_payment_attempts (authed)"
  on public.luke_payment_attempts for select
  using (auth.role() = 'authenticated');

drop policy if exists "read luke_sync_runs (authed)" on public.luke_sync_runs;
create policy "read luke_sync_runs (authed)"
  on public.luke_sync_runs for select
  using (auth.role() = 'authenticated');

-- =============================================================================
-- Done.
-- Next: wire SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY into aifreelancer-funnel
-- env. The sync endpoint at /api/sync-luke-data writes here; the Data tab in
-- Aureum App reads via the anon client.
-- =============================================================================
