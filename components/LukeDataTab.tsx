/**
 * LukeDataTab — the "Data" view inside /luke-alexander.
 *
 * Reads the `luke_people` master roster (populated by the sync endpoint in
 * aifreelancer-funnel) and shows the 9 buckets Guilherme asked for:
 *   1. Registrants in ConvertKit
 *   2. Registrants in Close CRM
 *   3. Registered (WebinarJam)
 *   4. Attended
 *   5. SLO buyers
 *   6. Main-offer buyers
 *   7. No-shows
 *   8. Buyers who booked Calendly
 *   9. Buyers who have NOT booked Calendly
 *
 * The table at the bottom is the drilldown — every row can be filtered by any
 * of the nine buckets via the KPI cards.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users, UserCheck, UserX, DollarSign, Crown, Calendar, CalendarX,
  RefreshCw, CheckCircle2, AlertCircle, Search, Download, Loader2,
  Mail, XCircle, Instagram, TrendingUp, Target, Pencil, Check, X,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

// Approximate Stripe + Whop fee blend used for net-cash math.
const PROCESSING_FEE_RATE = 0.05;
const AD_SPEND_KEY = 'aureum_luke_ad_spend_v2';

// ---------------------------------------------------------------- types

type Person = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  in_webinarjam: boolean;
  in_close: boolean;
  in_kit: boolean;
  kit_tags: string[];
  close_status: string | null;
  wj_attended_live: boolean;
  wj_time_live_seconds: number;
  wj_event_times: string[];
  bought_slo: boolean;
  slo_amount: number | null;
  slo_purchase_date: string | null;
  bought_main: boolean;
  main_amount: number | null;
  main_purchase_date: string | null;
  calendly_booked: boolean;
  calendly_event_name: string | null;
  calendly_booking_time: string | null;
  last_synced_at: string;
  created_at: string;
};

type SyncRun = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'ok' | 'error';
  webinarjam_count: number | null;
  close_count: number | null;
  kit_count: number | null;
  whop_count: number | null;
  whop_attempts_count: number | null;
  upserted_count: number | null;
  error: string | null;
};

type PaymentAttempt = {
  id: string;
  whop_payment_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  instagram_handle: string | null;
  product_id: string | null;
  product_label: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  failure_reason: string | null;
  attempted_at: string | null;
};

type BucketKey =
  | 'all' | 'kit' | 'close' | 'registered' | 'attended' | 'slo' | 'main'
  | 'noshow' | 'booked' | 'not_booked';

type ViewMode = 'people' | 'failed';

type DateRange = 'all' | 'today' | '7d' | '30d' | '90d';

const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: 'all',   label: 'All time'     },
  { key: 'today', label: 'Today'        },
  { key: '7d',    label: 'Last 7 days'  },
  { key: '30d',   label: 'Last 30 days' },
  { key: '90d',   label: 'Last 90 days' },
];

const rangeStart = (key: DateRange): Date | null => {
  if (key === 'all') return null;
  const d = new Date();
  if (key === 'today') d.setHours(0, 0, 0, 0);
  else if (key === '7d')  d.setDate(d.getDate() - 7);
  else if (key === '30d') d.setDate(d.getDate() - 30);
  else if (key === '90d') d.setDate(d.getDate() - 90);
  return d;
};

// ---------------------------------------------------------------- bucket defs

const BUCKETS: {
  key: BucketKey;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  filter: (p: Person) => boolean;
  hint: string;
}[] = [
  { key: 'kit',        label: 'In ConvertKit',    icon: Mail,        hint: 'Tagged in Kit',             filter: (p) => p.in_kit },
  { key: 'close',      label: 'In Close CRM',     icon: Users,       hint: 'Lead in Workshop pipeline', filter: (p) => p.in_close },
  { key: 'registered', label: 'Registered',       icon: UserCheck,   hint: 'WebinarJam registrant',     filter: (p) => p.in_webinarjam },
  { key: 'attended',   label: 'Attended live',    icon: UserCheck,   hint: 'Joined the live webinar',   filter: (p) => p.wj_attended_live },
  { key: 'noshow',     label: 'No-shows',         icon: UserX,       hint: 'Registered but did not join', filter: (p) => p.in_webinarjam && !p.wj_attended_live },
  { key: 'slo',        label: 'Bought SLO',       icon: DollarSign,  hint: '$27 Toolkit purchase',       filter: (p) => p.bought_slo },
  { key: 'main',       label: 'Bought Main',      icon: Crown,       hint: '$1,297 Accelerator',          filter: (p) => p.bought_main },
  { key: 'booked',     label: 'Buyers + booked',  icon: Calendar,    hint: 'Bought something + Calendly', filter: (p) => (p.bought_slo || p.bought_main) && p.calendly_booked },
  { key: 'not_booked', label: 'Buyers, no call',  icon: CalendarX,   hint: 'Bought something, no Calendly yet', filter: (p) => (p.bought_slo || p.bought_main) && !p.calendly_booked },
];

// ---------------------------------------------------------------- component

const LukeDataTab: React.FC = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
  const [lastRun, setLastRun] = useState<SyncRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [activeBucket, setActiveBucket] = useState<BucketKey>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('people');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [hideRecovered, setHideRecovered] = useState(true);

  // Per-range ad spend, persisted to localStorage. Meta API token doesn't have
  // ads_read scope, so this is maintained manually from Luke's Ads Manager.
  // Default seed values come from the Apr 24, 2026 Ads Manager reconciliation.
  const [adSpendByRange, setAdSpendByRange] = useState<Record<DateRange, number>>(() => {
    try {
      const raw = localStorage.getItem(AD_SPEND_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { all: 9896.20, today: 0, '7d': 0, '30d': 9896.20, '90d': 9896.20 };
  });
  const [editingSpend, setEditingSpend] = useState(false);
  const [spendDraft, setSpendDraft] = useState('');

  // ---- data load -----------------------------------------------------------
  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    // Supabase's PostgREST caps responses at 1000 rows regardless of .limit(),
    // so we page through with .range() until we've got everything.
    const fetchAllPages = async <T,>(
      table: string,
      orderBy: string,
    ): Promise<T[]> => {
      const pageSize = 1000;
      const out: T[] = [];
      for (let from = 0; from < 100000; from += pageSize) {
        const { data, error } = await supabase!
          .from(table)
          .select('*')
          .order(orderBy, { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const chunk = (data || []) as T[];
        out.push(...chunk);
        if (chunk.length < pageSize) break;
      }
      return out;
    };
    const [peopleAll, attemptsAll, runRes] = await Promise.all([
      fetchAllPages<Person>('luke_people', 'last_synced_at'),
      fetchAllPages<PaymentAttempt>('luke_payment_attempts', 'attempted_at'),
      supabase
        .from('luke_sync_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setPeople(peopleAll);
    setAttempts(attemptsAll);
    setLastRun((runRes.data || null) as SyncRun | null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---- refresh -------------------------------------------------------------
  const syncUrl = (import.meta as any).env.VITE_LUKE_SYNC_URL as string | undefined;
  const syncToken = (import.meta as any).env.VITE_LUKE_SYNC_TOKEN as string | undefined;
  const canSync = Boolean(syncUrl && syncToken);

  const refresh = useCallback(async () => {
    if (!canSync) {
      setSyncError('Sync URL not configured. Set VITE_LUKE_SYNC_URL + VITE_LUKE_SYNC_TOKEN in .env.');
      return;
    }
    setSyncing(true);
    setSyncError(null);
    try {
      const url = `${syncUrl}?token=${encodeURIComponent(syncToken!)}`;
      const r = await fetch(url);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      await load();
    } catch (e: any) {
      setSyncError(e?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [canSync, syncUrl, syncToken, load]);

  // ---- date-scoped slice (used by every derived stat below) --------------
  // A person is "in window" if ANY real activity timestamp falls inside it:
  //   - SLO / Main purchase
  //   - Calendly booking
  //   - WebinarJam event they registered for (latest entry in wj_event_times)
  // We deliberately ignore luke_people.created_at because that's the sync time,
  // not the time they entered Luke's pipeline — using it collapses every date
  // range into "Everyone" right after a sync.
  const dateScopedPeople = useMemo(() => {
    const start = rangeStart(dateRange);
    if (!start) return people;
    const s = start.getTime();
    const toMs = (v: string | null | undefined) => (v ? new Date(v).getTime() : 0);
    return people.filter((p) => {
      const sloAt    = toMs(p.slo_purchase_date);
      const mainAt   = toMs(p.main_purchase_date);
      const calAt    = toMs(p.calendly_booking_time);
      let wjAt = 0;
      for (const t of p.wj_event_times || []) {
        const v = toMs(t);
        if (v > wjAt) wjAt = v;
      }
      const latest = Math.max(sloAt, mainAt, calAt, wjAt);
      return latest >= s;
    });
  }, [people, dateRange]);

  const dateScopedAttempts = useMemo(() => {
    const start = rangeStart(dateRange);
    if (!start) return attempts;
    const s = start.getTime();
    return attempts.filter((a) => {
      const t = a.attempted_at ? new Date(a.attempted_at).getTime() : 0;
      return t >= s;
    });
  }, [attempts, dateRange]);

  // ---- derive counts for each bucket --------------------------------------
  const counts = useMemo(() => {
    const c: Record<BucketKey, number> = {
      all: dateScopedPeople.length, kit: 0, close: 0, registered: 0, attended: 0,
      slo: 0, main: 0, noshow: 0, booked: 0, not_booked: 0,
    };
    for (const p of dateScopedPeople) {
      for (const b of BUCKETS) if (b.filter(p)) c[b.key]++;
    }
    return c;
  }, [dateScopedPeople]);

  const money = useMemo(() => {
    let slo = 0, main = 0;
    for (const p of dateScopedPeople) {
      if (p.bought_slo && p.slo_amount) slo += Number(p.slo_amount);
      if (p.bought_main && p.main_amount) main += Number(p.main_amount);
    }
    return { slo, main, total: slo + main };
  }, [dateScopedPeople]);

  // ---- profit breakdown (webinar = in_kit, organic = NOT in_kit) -----------
  // Webinar revenue is the only revenue we credit ads with — everyone else
  // came in through some other path (Whop direct, social, etc.).
  const profit = useMemo(() => {
    let webSlo = 0, webMain = 0, orgSlo = 0, orgMain = 0;
    let webSloN = 0, webMainN = 0, orgSloN = 0, orgMainN = 0;
    const webBuyers = new Set<string>();
    const orgBuyers = new Set<string>();
    for (const p of dateScopedPeople) {
      if (!p.bought_slo && !p.bought_main) continue;
      const k = (p.email || p.id).toLowerCase();
      if (p.in_kit) {
        if (p.bought_slo)  { webSlo  += Number(p.slo_amount  || 0); webSloN++;  webBuyers.add(k); }
        if (p.bought_main) { webMain += Number(p.main_amount || 0); webMainN++; webBuyers.add(k); }
      } else {
        if (p.bought_slo)  { orgSlo  += Number(p.slo_amount  || 0); orgSloN++;  orgBuyers.add(k); }
        if (p.bought_main) { orgMain += Number(p.main_amount || 0); orgMainN++; orgBuyers.add(k); }
      }
    }
    const webRev = webSlo + webMain;
    const orgRev = orgSlo + orgMain;
    return {
      webSlo, webMain, orgSlo, orgMain,
      webSloN, webMainN, orgSloN, orgMainN,
      webRev, orgRev, totalRev: webRev + orgRev,
      webBuyers: webBuyers.size, orgBuyers: orgBuyers.size,
    };
  }, [dateScopedPeople]);

  const adSpend = adSpendByRange[dateRange] ?? 0;
  const grossProfit = profit.webRev - adSpend;
  const roas = adSpend > 0 ? profit.webRev / adSpend : 0;
  const totalCash = grossProfit + profit.orgRev;
  const fees = totalCash > 0 ? totalCash * PROCESSING_FEE_RATE : 0;
  const netCash = totalCash - fees;
  const cpaMain = profit.webMainN > 0 ? adSpend / profit.webMainN : 0;
  const cpaWebBuyer = profit.webBuyers > 0 ? adSpend / profit.webBuyers : 0;
  const ltvWebBuyer = profit.webBuyers > 0 ? profit.webRev / profit.webBuyers : 0;

  // ---- ad-spend editor -----------------------------------------------------
  const startEditSpend = () => {
    setSpendDraft(String(adSpend.toFixed(2)));
    setEditingSpend(true);
  };
  const cancelEditSpend = () => {
    setEditingSpend(false);
    setSpendDraft('');
  };
  const saveEditSpend = () => {
    const n = Number(spendDraft.replace(/[, ]/g, ''));
    if (Number.isFinite(n) && n >= 0) {
      const next = { ...adSpendByRange, [dateRange]: n };
      setAdSpendByRange(next);
      try { localStorage.setItem(AD_SPEND_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    }
    setEditingSpend(false);
    setSpendDraft('');
  };

  // ---- recovery map: for each buyer email, which products they eventually
  //       paid for. Used to stamp failed-payment rows as "recovered" when the
  //       same person later completed the purchase. An SLO attempt only counts
  //       as recovered if the person has bought_slo; same for Main.
  const buyersByProduct = useMemo(() => {
    const slo = new Set<string>();
    const main = new Set<string>();
    for (const p of people) {
      const k = (p.email || '').toLowerCase();
      if (!k) continue;
      if (p.bought_slo)  slo.add(k);
      if (p.bought_main) main.add(k);
    }
    return { slo, main };
  }, [people]);

  const isRecovered = useCallback((a: PaymentAttempt): boolean => {
    const k = (a.email || '').toLowerCase();
    if (!k) return false;
    if (a.product_label === 'SLO')  return buyersByProduct.slo.has(k);
    if (a.product_label === 'Main') return buyersByProduct.main.has(k);
    return false;
  }, [buyersByProduct]);

  // ---- failed-payments stats ----------------------------------------------
  // Lost revenue only counts UNRECOVERED attempts — a failed card that later
  // succeeded on a second try isn't actually lost money. Recovered count is
  // reported separately so Luke sees the recovery rate.
  const attemptsStats = useMemo(() => {
    let lostSlo = 0, lostMain = 0, lostOther = 0;
    let recoveredCount = 0, unrecoveredCount = 0;
    const byStatus: Record<string, number> = {};
    for (const a of dateScopedAttempts) {
      const amt = Number(a.amount || 0);
      const recovered = isRecovered(a);
      if (recovered) {
        recoveredCount++;
      } else {
        unrecoveredCount++;
        if (a.product_label === 'SLO')      lostSlo += amt;
        else if (a.product_label === 'Main') lostMain += amt;
        else                                  lostOther += amt;
      }
      const s = a.status || 'unknown';
      byStatus[s] = (byStatus[s] || 0) + 1;
    }
    return {
      lostSlo, lostMain, lostOther,
      lostTotal: lostSlo + lostMain + lostOther,
      recoveredCount, unrecoveredCount,
      byStatus,
    };
  }, [dateScopedAttempts, isRecovered]);

  const filteredAttempts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dateScopedAttempts.filter((a) => {
      if (hideRecovered && isRecovered(a)) return false;
      if (!q) return true;
      const hay = [
        a.email, a.first_name, a.last_name, a.phone, a.instagram_handle,
        a.product_label, a.status, a.failure_reason,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [dateScopedAttempts, search, hideRecovered, isRecovered]);

  // ---- tag index -----------------------------------------------------------
  // Every unique Kit tag seen in the current date slice, with a count of
  // people carrying it. Sorted by count desc so the noisy tags are at the
  // front of the strip.
  const tagIndex = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of dateScopedPeople) {
      for (const t of p.kit_tags || []) {
        if (!t) continue;
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [dateScopedPeople]);

  // When the date range changes, prune any selected tags that no longer exist
  // in the slice so the filter doesn't silently zero out the table.
  useEffect(() => {
    if (selectedTags.length === 0) return;
    const present = new Set(tagIndex.map((t) => t.tag));
    const kept = selectedTags.filter((t) => present.has(t));
    if (kept.length !== selectedTags.length) setSelectedTags(kept);
  }, [tagIndex, selectedTags]);

  // ---- filter table --------------------------------------------------------
  // Tag filter uses OR semantics (match any selected tag) — cheaper mental
  // model than AND for the typical "export everyone tagged SLO Buyer OR
  // workshop-registered" use case.
  const filtered = useMemo(() => {
    const bucket = BUCKETS.find((b) => b.key === activeBucket);
    const q = search.trim().toLowerCase();
    const tagSet = selectedTags.length ? new Set(selectedTags) : null;
    return dateScopedPeople.filter((p) => {
      if (bucket && !bucket.filter(p)) return false;
      if (tagSet) {
        const has = (p.kit_tags || []).some((t) => tagSet.has(t));
        if (!has) return false;
      }
      if (!q) return true;
      const hay = [
        p.email, p.first_name, p.last_name, p.phone, p.close_status,
        (p.kit_tags || []).join(' '),
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [dateScopedPeople, activeBucket, search, selectedTags]);

  // ---- csv export ----------------------------------------------------------
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };

  const download = (name: string, body: string) => {
    const blob = new Blob([body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    if (view === 'failed') {
      const cols: { key: keyof PaymentAttempt | 'recovered'; label: string }[] = [
        { key: 'first_name', label: 'First' },
        { key: 'last_name', label: 'Last' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'instagram_handle', label: 'Instagram' },
        { key: 'product_label', label: 'Product' },
        { key: 'amount', label: 'Amount' },
        { key: 'currency', label: 'Currency' },
        { key: 'status', label: 'Status' },
        { key: 'recovered', label: 'Recovered?' },
        { key: 'failure_reason', label: 'Failure reason' },
        { key: 'attempted_at', label: 'Attempted at' },
        { key: 'whop_payment_id', label: 'Whop payment ID' },
      ];
      const lines = [cols.map((c) => c.label).join(',')];
      for (const a of filteredAttempts) {
        lines.push(cols.map((c) => {
          if (c.key === 'recovered') return esc(isRecovered(a) ? 'Yes' : 'No');
          return esc((a as any)[c.key]);
        }).join(','));
      }
      download(
        `luke-failed-payments-${new Date().toISOString().slice(0, 10)}.csv`,
        lines.join('\n'),
      );
      return;
    }
    const cols: { key: keyof Person | 'full_name' | 'kit_tags_joined'; label: string }[] = [
      { key: 'first_name', label: 'First' },
      { key: 'last_name', label: 'Last' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'kit_tags_joined', label: 'Tags' },
      { key: 'in_kit', label: 'In Kit' },
      { key: 'in_close', label: 'In Close' },
      { key: 'close_status', label: 'Close status' },
      { key: 'in_webinarjam', label: 'Registered' },
      { key: 'wj_attended_live', label: 'Attended' },
      { key: 'wj_time_live_seconds', label: 'Seconds live' },
      { key: 'bought_slo', label: 'Bought SLO' },
      { key: 'slo_amount', label: 'SLO $' },
      { key: 'bought_main', label: 'Bought Main' },
      { key: 'main_amount', label: 'Main $' },
      { key: 'calendly_booked', label: 'Booked call' },
    ];
    const lines = [cols.map((c) => c.label).join(',')];
    for (const p of filtered) {
      lines.push(cols.map((c) => {
        if (c.key === 'kit_tags_joined') return esc((p.kit_tags || []).join('; '));
        return esc((p as any)[c.key]);
      }).join(','));
    }
    download(
      `luke-${activeBucket}-${new Date().toISOString().slice(0, 10)}.csv`,
      lines.join('\n'),
    );
  };

  // ---- render --------------------------------------------------------------
  const activeBucketDef = BUCKETS.find((b) => b.key === activeBucket);

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">
      {/* header row */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 text-xs text-[#666]">
          {lastRun ? (
            lastRun.status === 'ok' ? (
              <span className="flex items-center gap-1.5 text-[#888]">
                <CheckCircle2 size={12} className="text-emerald-500" />
                Synced {formatRelative(lastRun.finished_at || lastRun.started_at)} · {lastRun.upserted_count ?? '?'} people · {lastRun.whop_attempts_count ?? 0} failed payments
              </span>
            ) : lastRun.status === 'error' ? (
              <span className="flex items-center gap-1.5 text-rose-400">
                <AlertCircle size={12} />
                Last sync failed: {lastRun.error?.slice(0, 80)}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400">
                <Loader2 size={12} className="animate-spin" /> Sync in progress…
              </span>
            )
          ) : (
            <span>Not synced yet</span>
          )}
          {syncError && <span className="text-rose-400">· {syncError}</span>}
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={syncing || !canSync}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#333] text-[#ECECEC] text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Refreshing…' : 'Refresh now'}
        </button>
      </div>

      {/* view toggle: people vs. failed payments */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex gap-1 bg-[#1a1a1a] rounded-lg p-1">
          <button
            onClick={() => setView('people')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === 'people' ? 'bg-[#2a2a2a] text-[#ECECEC]' : 'text-[#666] hover:text-[#999]'
            }`}
          >
            <Users size={12} /> People <span className="text-[#555]">· {dateScopedPeople.length}</span>
          </button>
          <button
            onClick={() => setView('failed')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === 'failed' ? 'bg-[#2a2a2a] text-[#ECECEC]' : 'text-[#666] hover:text-[#999]'
            }`}
          >
            <XCircle size={12} /> Failed payments <span className={dateScopedAttempts.length > 0 ? 'text-rose-400' : 'text-[#555]'}>· {dateScopedAttempts.length}</span>
          </button>
        </div>
        <div className="flex gap-1 bg-[#1a1a1a] rounded-lg p-1">
          {DATE_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setDateRange(r.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                dateRange === r.key ? 'bg-[#2a2a2a] text-[#ECECEC]' : 'text-[#666] hover:text-[#999]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'people' ? (
        <>
          {/* PROFIT HERO — net cash, ad spend (editable), webinar revenue, ROAS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 flex-shrink-0">
            <ProfitCard
              icon={TrendingUp}
              label="Net cash (after fees)"
              value={fmtMoney(netCash)}
              sub={`After ~${(PROCESSING_FEE_RATE * 100).toFixed(0)}% processor fees`}
              accent="emerald"
              emphasized
            />
            <div className="rounded-lg p-3 border bg-[#121212] border-[#1f1f1f]">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] uppercase tracking-wider text-[#555]">Ad spend</p>
                <div className="flex items-center gap-1">
                  <Target size={11} className="text-[#fca5a5]" />
                  {!editingSpend && (
                    <button
                      type="button"
                      onClick={startEditSpend}
                      className="p-0.5 rounded hover:bg-[rgba(255,255,255,0.05)] text-[#666] hover:text-[#ECECEC]"
                      title="Edit ad spend for this period"
                    >
                      <Pencil size={10} />
                    </button>
                  )}
                </div>
              </div>
              {editingSpend ? (
                <div className="flex items-center gap-1">
                  <span className="text-[#666] text-sm">$</span>
                  <input
                    autoFocus
                    type="text"
                    inputMode="decimal"
                    value={spendDraft}
                    onChange={(e) => setSpendDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditSpend();
                      if (e.key === 'Escape') cancelEditSpend();
                    }}
                    className="flex-1 min-w-0 bg-[#161616] border border-[#2a2a2a] rounded px-1.5 py-0.5 text-lg font-semibold text-[#ECECEC] focus:outline-none focus:border-[#3a3a3a]"
                  />
                  <button type="button" onClick={saveEditSpend} className="p-1 rounded bg-emerald-500/10 text-emerald-400">
                    <Check size={11} />
                  </button>
                  <button type="button" onClick={cancelEditSpend} className="p-1 rounded bg-[#2a2a2a] text-[#888]">
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <p className="font-semibold text-lg text-[#bdbdbd]">{fmtMoney(adSpend)}</p>
              )}
              <p className="text-[10px] text-[#555] mt-0.5">
                {DATE_RANGES.find((r) => r.key === dateRange)!.label} · click pencil to edit
              </p>
            </div>
            <ProfitCard
              icon={DollarSign}
              label="Webinar revenue"
              value={fmtMoney(profit.webRev)}
              sub={`${profit.webBuyers} buyers (in Kit)`}
              accent="emerald"
            />
            <ProfitCard
              icon={TrendingUp}
              label="ROAS"
              value={`${roas.toFixed(2)}x`}
              sub={`Gross profit ${fmtMoney(grossProfit)}`}
              accent={roas >= 2 ? 'emerald' : roas >= 1 ? 'amber' : 'rose'}
            />
          </div>

          {/* compact unit-economics strip — single line, small text, no card chrome */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-[#888] flex-shrink-0">
            <span><span className="text-[#555]">Webinar</span> {fmtMoney(profit.webRev)} <span className="text-[#555]">· {profit.webBuyers} buyers</span></span>
            <span className="text-[#333]">|</span>
            <span><span className="text-[#555]">Organic</span> {fmtMoney(profit.orgRev)} <span className="text-[#555]">· {profit.orgBuyers} buyers</span></span>
            <span className="text-[#333]">|</span>
            <span><span className="text-[#555]">CAC / main</span> {profit.webMainN > 0 ? fmtMoney(cpaMain) : '—'}</span>
            <span className="text-[#333]">|</span>
            <span><span className="text-[#555]">CAC / buyer</span> {profit.webBuyers > 0 ? fmtMoney(cpaWebBuyer) : '—'}</span>
            <span className="text-[#333]">|</span>
            <span><span className="text-[#555]">LTV / buyer</span> {profit.webBuyers > 0 ? fmtMoney(ltvWebBuyer) : '—'}</span>
            <span className="text-[#333]">|</span>
            <span className={ltvWebBuyer > cpaWebBuyer ? 'text-emerald-400' : 'text-rose-400'}>
              <span className="text-[#555]">Profit / buyer</span> {profit.webBuyers > 0 ? fmtMoney(ltvWebBuyer - cpaWebBuyer) : '—'}
            </span>
          </div>

          {/* legacy revenue strip — keep for per-product split */}
          <div className="grid grid-cols-3 gap-2 flex-shrink-0">
            <RevenueCard label="SLO revenue" value={fmtMoney(money.slo)} sub={`${counts.slo} buyers`} />
            <RevenueCard label="Main revenue" value={fmtMoney(money.main)} sub={`${counts.main} buyers`} />
            <RevenueCard label="Total" value={fmtMoney(money.total)} sub={`${dateScopedPeople.length} people tracked`} emphasized />
          </div>

          {/* KPI cards — the 9 buckets */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 flex-shrink-0">
            <KpiCard
              active={activeBucket === 'all'}
              onClick={() => setActiveBucket('all')}
              icon={Users}
              label="Everyone"
              hint="All tracked people"
              value={counts.all}
            />
            {BUCKETS.map((b) => (
              <KpiCard
                key={b.key}
                active={activeBucket === b.key}
                onClick={() => setActiveBucket(b.key)}
                icon={b.icon}
                label={b.label}
                hint={b.hint}
                value={counts[b.key]}
              />
            ))}
          </div>

          {/* search + export */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${activeBucketDef ? activeBucketDef.label.toLowerCase() : 'everyone'}…`}
                className="w-full pl-8 pr-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-xs text-[#ECECEC] placeholder:text-[#555] focus:outline-none focus:border-[#3a3a3a]"
              />
            </div>
            <span className="text-xs text-[#555]">{filtered.length} of {counts.all}</span>
            <button
              type="button"
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#333] text-[#ECECEC] text-xs font-medium disabled:opacity-40"
            >
              <Download size={12} /> CSV
            </button>
          </div>

          {/* tag filter strip — every Kit tag seen in the current slice */}
          {tagIndex.length > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-[#555] mr-1">Tags</span>
              {selectedTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTags([])}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-[#ECECEC] hover:border-[#3a3a3a]"
                >
                  Clear ({selectedTags.length})
                </button>
              )}
              {tagIndex.slice(0, 40).map(({ tag, count }) => {
                const on = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setSelectedTags((prev) =>
                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                      )
                    }
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      on
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#999] hover:text-[#ECECEC] hover:border-[#3a3a3a]'
                    }`}
                  >
                    {tag} <span className={on ? 'text-emerald-400/70' : 'text-[#555]'}>· {count}</span>
                  </button>
                );
              })}
              {tagIndex.length > 40 && (
                <span className="text-[10px] text-[#555]">+{tagIndex.length - 40} more (use search)</span>
              )}
            </div>
          )}

          {/* table */}
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-[#222]">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-[#181818] border-b border-[#222] text-[#666]">
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Tags</Th>
                  <Th>Kit</Th>
                  <Th>Close</Th>
                  <Th>Registered</Th>
                  <Th>Attended</Th>
                  <Th>SLO</Th>
                  <Th>Main</Th>
                  <Th>Calendly</Th>
                </tr>
              </thead>
              <tbody className="text-[#bdbdbd]">
                {loading ? (
                  <tr><td colSpan={10} className="p-6 text-center text-[#555]">
                    <Loader2 size={14} className="inline-block animate-spin mr-2" /> Loading…
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} className="p-6 text-center text-[#555]">
                    {people.length === 0
                      ? 'No data yet. Click "Refresh now" to pull from WebinarJam, Close, Kit, and Whop.'
                      : 'No rows match this filter.'}
                  </td></tr>
                ) : (
                  filtered.slice(0, 500).map((p) => (
                    <tr key={p.id} className="border-b border-[#1a1a1a] hover:bg-[#141414]">
                      <Td>{[p.first_name, p.last_name].filter(Boolean).join(' ') || <span className="text-[#444]">—</span>}</Td>
                      <Td><span className="text-[#888]">{p.email}</span></Td>
                      <Td>
                        {(p.kit_tags || []).length === 0 ? (
                          <span className="text-[#444]">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(p.kit_tags || []).slice(0, 3).map((t) => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#aaa]">{t}</span>
                            ))}
                            {(p.kit_tags || []).length > 3 && (
                              <span className="text-[10px] text-[#555]" title={(p.kit_tags || []).slice(3).join(', ')}>+{(p.kit_tags || []).length - 3}</span>
                            )}
                          </div>
                        )}
                      </Td>
                      <Td><Flag on={p.in_kit} /></Td>
                      <Td>{p.in_close ? <span className="text-[#bdbdbd]">{p.close_status || 'yes'}</span> : <Flag on={false} />}</Td>
                      <Td><Flag on={p.in_webinarjam} /></Td>
                      <Td>{p.wj_attended_live ? (
                        <span className="text-emerald-500">{formatSeconds(p.wj_time_live_seconds)}</span>
                      ) : <Flag on={false} />}</Td>
                      <Td>{p.bought_slo ? <span className="text-emerald-500">{fmtMoney(p.slo_amount || 0)}</span> : <Flag on={false} />}</Td>
                      <Td>{p.bought_main ? <span className="text-emerald-500">{fmtMoney(p.main_amount || 0)}</span> : <Flag on={false} />}</Td>
                      <Td>{p.calendly_booked ? (
                        <span className="text-emerald-500">
                          {p.calendly_booking_time ? formatDate(p.calendly_booking_time) : 'booked'}
                        </span>
                      ) : <Flag on={false} />}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filtered.length > 500 && (
              <div className="py-2 text-center text-[11px] text-[#555] bg-[#101010]">
                Showing first 500 of {filtered.length} — use search to narrow, or export full CSV.
              </div>
            )}
          </div>

          {/* calendly notice — only shows if none of the current buyers have booked a call yet */}
          {counts.booked === 0 && counts.slo + counts.main > 0 && (
            <div className="flex-shrink-0 p-3 rounded-lg bg-[#1a1510] border border-amber-800/40 text-xs text-amber-200/80 flex items-start gap-2">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-medium text-amber-200">No buyers have booked a Calendly call yet.</p>
                <p className="mt-0.5 text-amber-200/60">
                  Calendly is connected — as soon as a buyer books, buckets 8 + 9 will split out.
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* lost-revenue strip — only UNRECOVERED dollars. Recovered attempts
              (where the same person later completed the purchase) aren't lost. */}
          <div className="grid grid-cols-3 gap-2 flex-shrink-0">
            <RevenueCard label="Lost SLO" value={fmtMoney(attemptsStats.lostSlo)} sub="$27 attempts still open" />
            <RevenueCard label="Lost Main" value={fmtMoney(attemptsStats.lostMain)} sub="$1,297 attempts still open" />
            <RevenueCard
              label="Recoverable"
              value={fmtMoney(attemptsStats.lostTotal)}
              sub={`${attemptsStats.unrecoveredCount} to recover · ${attemptsStats.recoveredCount} already recovered`}
              emphasized
            />
          </div>

          {/* status breakdown chips */}
          {Object.keys(attemptsStats.byStatus).length > 0 && (
            <div className="flex flex-wrap gap-1.5 flex-shrink-0">
              {(Object.entries(attemptsStats.byStatus) as [string, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <span
                    key={status}
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#999]"
                  >
                    {status} <span className="text-[#666]">· {count}</span>
                  </span>
                ))}
            </div>
          )}

          {/* search + recovered toggle + export */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, Instagram, status…"
                className="w-full pl-8 pr-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-xs text-[#ECECEC] placeholder:text-[#555] focus:outline-none focus:border-[#3a3a3a]"
              />
            </div>
            <button
              type="button"
              onClick={() => setHideRecovered((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                hideRecovered
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#888] hover:text-[#ECECEC]'
              }`}
              title="Hide attempts where the same email eventually bought"
            >
              {hideRecovered ? 'Showing unrecovered only' : 'Showing all attempts'}
            </button>
            <span className="text-xs text-[#555]">{filteredAttempts.length} of {dateScopedAttempts.length}</span>
            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredAttempts.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#333] text-[#ECECEC] text-xs font-medium disabled:opacity-40"
            >
              <Download size={12} /> CSV
            </button>
          </div>

          {/* attempts table */}
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-[#222]">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-[#181818] border-b border-[#222] text-[#666]">
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Instagram</Th>
                  <Th>Phone</Th>
                  <Th>Product</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Recovered?</Th>
                  <Th>Reason</Th>
                  <Th>Attempted</Th>
                </tr>
              </thead>
              <tbody className="text-[#bdbdbd]">
                {loading ? (
                  <tr><td colSpan={10} className="p-6 text-center text-[#555]">
                    <Loader2 size={14} className="inline-block animate-spin mr-2" /> Loading…
                  </td></tr>
                ) : filteredAttempts.length === 0 ? (
                  <tr><td colSpan={10} className="p-6 text-center text-[#555]">
                    {attempts.length === 0
                      ? 'No failed payments yet. Click "Refresh now" to pull from Whop.'
                      : hideRecovered
                        ? 'Everyone already bought. Toggle "Showing unrecovered only" off to see recovered attempts too.'
                        : 'No rows match this filter.'}
                  </td></tr>
                ) : (
                  filteredAttempts.slice(0, 500).map((a) => {
                    const recovered = isRecovered(a);
                    return (
                    <tr key={a.id} className={`border-b border-[#1a1a1a] hover:bg-[#141414] ${recovered ? 'opacity-60' : ''}`}>
                      <Td>{[a.first_name, a.last_name].filter(Boolean).join(' ') || <span className="text-[#444]">—</span>}</Td>
                      <Td><span className="text-[#888]">{a.email || <span className="text-[#444]">—</span>}</span></Td>
                      <Td>
                        {a.instagram_handle ? (
                          <a
                            href={`https://instagram.com/${a.instagram_handle.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#bdbdbd] hover:text-[#ECECEC]"
                          >
                            <Instagram size={11} /> {a.instagram_handle}
                          </a>
                        ) : <span className="text-[#444]">—</span>}
                      </Td>
                      <Td>{a.phone || <span className="text-[#444]">—</span>}</Td>
                      <Td>
                        {a.product_label === 'SLO' ? (
                          <span className="text-amber-300">SLO</span>
                        ) : a.product_label === 'Main' ? (
                          <span className="text-purple-300">Main</span>
                        ) : (
                          <span className="text-[#888]">{a.product_label || '—'}</span>
                        )}
                      </Td>
                      <Td>{a.amount ? <span className="text-rose-300">{fmtMoney(Number(a.amount))}</span> : <span className="text-[#444]">—</span>}</Td>
                      <Td>
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-900/40">
                          {a.status || 'unknown'}
                        </span>
                      </Td>
                      <Td>
                        {recovered ? (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-900/40">
                            <CheckCircle2 size={10} /> Yes
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#888] border border-[#2a2a2a]">
                            Open
                          </span>
                        )}
                      </Td>
                      <Td>
                        {a.failure_reason ? (
                          <span className="text-[#888]" title={a.failure_reason}>
                            {a.failure_reason.length > 50 ? a.failure_reason.slice(0, 50) + '…' : a.failure_reason}
                          </span>
                        ) : <span className="text-[#444]">—</span>}
                      </Td>
                      <Td>{a.attempted_at ? <span className="text-[#888]">{formatDate(a.attempted_at)}</span> : <span className="text-[#444]">—</span>}</Td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {filteredAttempts.length > 500 && (
              <div className="py-2 text-center text-[11px] text-[#555] bg-[#101010]">
                Showing first 500 of {filteredAttempts.length} — use search to narrow, or export full CSV.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default LukeDataTab;

// ---------------------------------------------------------------- sub-components

const RevenueCard: React.FC<{ label: string; value: string; sub: string; emphasized?: boolean }> = ({
  label, value, sub, emphasized,
}) => (
  <div
    className={`rounded-lg p-3 border ${
      emphasized ? 'bg-[#151515] border-[#2a2a2a]' : 'bg-[#121212] border-[#1f1f1f]'
    }`}
  >
    <p className="text-[10px] uppercase tracking-wider text-[#555] mb-1">{label}</p>
    <p className={`font-semibold ${emphasized ? 'text-[#ECECEC] text-xl' : 'text-[#bdbdbd] text-lg'}`}>{value}</p>
    <p className="text-[10px] text-[#555] mt-0.5">{sub}</p>
  </div>
);

const ProfitCard: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent?: 'emerald' | 'amber' | 'rose';
  emphasized?: boolean;
}> = ({ icon: Icon, label, value, sub, accent, emphasized }) => {
  const tint = accent === 'emerald'
    ? 'text-[#86efac]'
    : accent === 'amber'
      ? 'text-[#fde68a]'
      : accent === 'rose'
        ? 'text-[#fca5a5]'
        : 'text-[#888]';
  return (
    <div className={`rounded-lg p-3 border ${emphasized ? 'bg-[#151515] border-[#2a2a2a]' : 'bg-[#121212] border-[#1f1f1f]'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] uppercase tracking-wider text-[#555]">{label}</p>
        <Icon size={11} className={tint} />
      </div>
      <p className={`font-semibold ${emphasized ? 'text-[#ECECEC] text-xl' : `${tint === 'text-[#888]' ? 'text-[#bdbdbd]' : tint} text-lg`}`}>
        {value}
      </p>
      <p className="text-[10px] text-[#555] mt-0.5">{sub}</p>
    </div>
  );
};

const KpiCard: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  hint: string;
  value: number;
}> = ({ active, onClick, icon: Icon, label, hint, value }) => (
  <button
    type="button"
    onClick={onClick}
    title={hint}
    className={`text-left rounded-lg p-3 border transition-colors ${
      active
        ? 'bg-[#1c1c1c] border-[#444]'
        : 'bg-[#121212] border-[#1f1f1f] hover:border-[#2a2a2a]'
    }`}
  >
    <div className="flex items-center gap-1.5 mb-1.5 text-[#666]">
      <Icon size={11} />
      <span className="text-[10px] uppercase tracking-wider">{label}</span>
    </div>
    <p className={`text-lg font-semibold ${active ? 'text-[#ECECEC]' : 'text-[#bdbdbd]'}`}>{value}</p>
  </button>
);

const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="px-3 py-2 font-medium text-[10px] uppercase tracking-wider">{children}</th>
);
const Td: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className="px-3 py-2 whitespace-nowrap">{children}</td>
);
const Flag: React.FC<{ on: boolean }> = ({ on }) => (
  on ? <span className="text-emerald-500">yes</span> : <span className="text-[#444]">—</span>
);

// ---------------------------------------------------------------- formatters

function fmtMoney(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}
function formatSeconds(s: number) {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function formatRelative(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
