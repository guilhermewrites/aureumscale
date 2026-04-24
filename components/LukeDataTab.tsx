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
  Mail, XCircle, Instagram,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

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
  // Uses created_at as a proxy for "when this person entered the pipeline".
  // Purchases that happened after the range start keep the person in view
  // too, so buyers don't drop off the chart when a short range is selected.
  const dateScopedPeople = useMemo(() => {
    const start = rangeStart(dateRange);
    if (!start) return people;
    const s = start.getTime();
    return people.filter((p) => {
      const created = p.created_at ? new Date(p.created_at).getTime() : 0;
      const sloAt   = p.slo_purchase_date ? new Date(p.slo_purchase_date).getTime() : 0;
      const mainAt  = p.main_purchase_date ? new Date(p.main_purchase_date).getTime() : 0;
      return Math.max(created, sloAt, mainAt) >= s;
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

  // ---- failed-payments stats ----------------------------------------------
  const attemptsStats = useMemo(() => {
    let lostSlo = 0, lostMain = 0, lostOther = 0;
    const byStatus: Record<string, number> = {};
    for (const a of dateScopedAttempts) {
      const amt = Number(a.amount || 0);
      if (a.product_label === 'SLO') lostSlo += amt;
      else if (a.product_label === 'Main') lostMain += amt;
      else lostOther += amt;
      const s = a.status || 'unknown';
      byStatus[s] = (byStatus[s] || 0) + 1;
    }
    return { lostSlo, lostMain, lostOther, lostTotal: lostSlo + lostMain + lostOther, byStatus };
  }, [dateScopedAttempts]);

  const filteredAttempts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dateScopedAttempts;
    return dateScopedAttempts.filter((a) => {
      const hay = [
        a.email, a.first_name, a.last_name, a.phone, a.instagram_handle,
        a.product_label, a.status, a.failure_reason,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [dateScopedAttempts, search]);

  // ---- filter table --------------------------------------------------------
  const filtered = useMemo(() => {
    const bucket = BUCKETS.find((b) => b.key === activeBucket);
    const q = search.trim().toLowerCase();
    return dateScopedPeople.filter((p) => {
      if (bucket && !bucket.filter(p)) return false;
      if (!q) return true;
      const hay = [
        p.email, p.first_name, p.last_name, p.phone, p.close_status,
        (p.kit_tags || []).join(' '),
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [dateScopedPeople, activeBucket, search]);

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
      const cols: { key: keyof PaymentAttempt; label: string }[] = [
        { key: 'first_name', label: 'First' },
        { key: 'last_name', label: 'Last' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'instagram_handle', label: 'Instagram' },
        { key: 'product_label', label: 'Product' },
        { key: 'amount', label: 'Amount' },
        { key: 'currency', label: 'Currency' },
        { key: 'status', label: 'Status' },
        { key: 'failure_reason', label: 'Failure reason' },
        { key: 'attempted_at', label: 'Attempted at' },
        { key: 'whop_payment_id', label: 'Whop payment ID' },
      ];
      const lines = [cols.map((c) => c.label).join(',')];
      for (const a of filteredAttempts) {
        lines.push(cols.map((c) => esc((a as any)[c.key])).join(','));
      }
      download(
        `luke-failed-payments-${new Date().toISOString().slice(0, 10)}.csv`,
        lines.join('\n'),
      );
      return;
    }
    const cols: { key: keyof Person | 'full_name'; label: string }[] = [
      { key: 'first_name', label: 'First' },
      { key: 'last_name', label: 'Last' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
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
      lines.push(cols.map((c) => esc((p as any)[c.key])).join(','));
    }
    download(
      `luke-${activeBucket}-${new Date().toISOString().slice(0, 10)}.csv`,
      lines.join('\n'),
    );
  };

  // ---- render --------------------------------------------------------------
  const activeBucketDef = BUCKETS.find((b) => b.key === activeBucket);

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
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
          {/* revenue strip */}
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

          {/* table */}
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-[#222]">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-[#181818] border-b border-[#222] text-[#666]">
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
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
                  <tr><td colSpan={9} className="p-6 text-center text-[#555]">
                    <Loader2 size={14} className="inline-block animate-spin mr-2" /> Loading…
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="p-6 text-center text-[#555]">
                    {people.length === 0
                      ? 'No data yet. Click "Refresh now" to pull from WebinarJam, Close, Kit, and Whop.'
                      : 'No rows match this filter.'}
                  </td></tr>
                ) : (
                  filtered.slice(0, 500).map((p) => (
                    <tr key={p.id} className="border-b border-[#1a1a1a] hover:bg-[#141414]">
                      <Td>{[p.first_name, p.last_name].filter(Boolean).join(' ') || <span className="text-[#444]">—</span>}</Td>
                      <Td><span className="text-[#888]">{p.email}</span></Td>
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

          {/* calendly notice */}
          {counts.booked === 0 && counts.slo + counts.main > 0 && (
            <div className="flex-shrink-0 p-3 rounded-lg bg-[#1a1510] border border-amber-800/40 text-xs text-amber-200/80 flex items-start gap-2">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-medium text-amber-200">Calendly isn't connected yet.</p>
                <p className="mt-0.5 text-amber-200/60">
                  Buckets 8 + 9 (buyers with / without a booked call) will stay at 0 until I wire it.
                  Send me your Calendly Personal Access Token and the event URI for the booking link and I'll plug it in.
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* lost-revenue strip */}
          <div className="grid grid-cols-3 gap-2 flex-shrink-0">
            <RevenueCard label="Lost SLO" value={fmtMoney(attemptsStats.lostSlo)} sub="failed $27 attempts" />
            <RevenueCard label="Lost Main" value={fmtMoney(attemptsStats.lostMain)} sub="failed $1,297 attempts" />
            <RevenueCard label="Lost total" value={fmtMoney(attemptsStats.lostTotal)} sub={`${attempts.length} attempts to recover`} emphasized />
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

          {/* search + export */}
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
            <span className="text-xs text-[#555]">{filteredAttempts.length} of {attempts.length}</span>
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
                  <Th>Reason</Th>
                  <Th>Attempted</Th>
                </tr>
              </thead>
              <tbody className="text-[#bdbdbd]">
                {loading ? (
                  <tr><td colSpan={9} className="p-6 text-center text-[#555]">
                    <Loader2 size={14} className="inline-block animate-spin mr-2" /> Loading…
                  </td></tr>
                ) : filteredAttempts.length === 0 ? (
                  <tr><td colSpan={9} className="p-6 text-center text-[#555]">
                    {attempts.length === 0
                      ? 'No failed payments yet. Click "Refresh now" to pull from Whop.'
                      : 'No rows match this filter.'}
                  </td></tr>
                ) : (
                  filteredAttempts.slice(0, 500).map((a) => (
                    <tr key={a.id} className="border-b border-[#1a1a1a] hover:bg-[#141414]">
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
                        {a.failure_reason ? (
                          <span className="text-[#888]" title={a.failure_reason}>
                            {a.failure_reason.length > 50 ? a.failure_reason.slice(0, 50) + '…' : a.failure_reason}
                          </span>
                        ) : <span className="text-[#444]">—</span>}
                      </Td>
                      <Td>{a.attempted_at ? <span className="text-[#888]">{formatDate(a.attempted_at)}</span> : <span className="text-[#444]">—</span>}</Td>
                    </tr>
                  ))
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
