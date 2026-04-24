/**
 * TheresaDataTab — the "Data" view inside /theresa-the-reader.
 *
 * Reads the `theresa_leads` table (written directly by the quiz SPA) and
 * shows funnel-step buckets plus a revenue strip.
 *
 * There's no external sync endpoint — quiz writes straight to Supabase, so
 * "Refresh now" just re-reads the table.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users, UserCheck, DollarSign, Eye, FileText, Sparkles,
  RefreshCw, CheckCircle2, Search, Download, Loader2,
  CircleDollarSign, TrendingDown, Mail, Flag as FlagIcon,
  MousePointerClick, Globe,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

// ---------------------------------------------------------------- types

type Lead = {
  id: string;
  created_at: string | null;

  first_name: string | null;
  email: string | null;
  phone: string | null;

  path: 'deceased' | 'future' | 'both' | null;

  // Path B (deceased)
  loved_one_relationship: string | null;
  loved_one_name: string | null;
  time_since_loss: string | null;
  passing_type: string | null;
  signs_noticed: string[] | null;
  question_for_deceased: string | null;
  grief_state: string | null;
  include_future: boolean | null;
  message_topic: string | null;

  // Path A (future)
  focus_area: string | null;
  decision_weighing: string | null;
  signs_future: string[] | null;
  partnered_status: string | null;
  tried_so_far: string[] | null;
  timing_urgency: string | null;
  include_deceased: boolean | null;

  // Funnel tracking
  quiz_started_at: string | null;
  quiz_completed_at: string | null;
  reveal_viewed_at: string | null;
  offer_viewed_at: string | null;
  purchased_at: string | null;
  purchase_sku: string | null;

  // Attribution
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  fbclid: string | null;

  // Per-page funnel tracking
  landed_at: string | null;
  quiz_step_reached: number | null;
  last_page_viewed: string | null;
  last_page_viewed_at: string | null;
  checkout_clicked_at: string | null;
};

type BucketKey =
  | 'all'
  | 'landed'
  | 'started'
  | 'completed'
  | 'reveal'
  | 'offer'
  | 'checkout_click'
  | 'purchased'
  | 'drop_quiz'
  | 'drop_offer'
  | 'drop_checkout'
  | 'meta_ad'
  | 'br_lead'
  | 'has_contact';

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

// BR one-off price. If a second SKU ever ships, move this to a map.
const PRICE_BRL = 27.97;

// ---------------------------------------------------------------- bucket defs

const BUCKETS: {
  key: BucketKey;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  filter: (l: Lead) => boolean;
  hint: string;
}[] = [
  { key: 'landed',         label: 'Landed',             icon: Globe,              hint: 'Opened any funnel page',               filter: (l) => !!(l.landed_at || l.quiz_started_at) },
  { key: 'started',        label: 'Quiz started',       icon: Sparkles,           hint: 'Clicked into the quiz',                filter: (l) => !!l.quiz_started_at },
  { key: 'completed',      label: 'Quiz completed',     icon: UserCheck,          hint: 'Finished all questions',               filter: (l) => !!l.quiz_completed_at },
  { key: 'reveal',         label: 'Reveal viewed',      icon: Eye,                hint: 'Saw the personalized reveal',          filter: (l) => !!l.reveal_viewed_at },
  { key: 'offer',          label: 'Offer viewed',       icon: FileText,           hint: 'Got to the paywall',                   filter: (l) => !!l.offer_viewed_at },
  { key: 'checkout_click', label: 'Clicked checkout',   icon: MousePointerClick,  hint: 'Tapped the Buckpay CTA',               filter: (l) => !!l.checkout_clicked_at },
  { key: 'purchased',      label: 'Purchased',          icon: DollarSign,         hint: 'Paid — the reading was sold',          filter: (l) => !!l.purchased_at },
  { key: 'drop_quiz',      label: 'Dropped at quiz',    icon: TrendingDown,       hint: 'Started quiz, never finished',         filter: (l) => !!l.quiz_started_at && !l.quiz_completed_at },
  { key: 'drop_offer',     label: 'Dropped at offer',   icon: TrendingDown,       hint: 'Reached offer, never clicked checkout',filter: (l) => !!l.offer_viewed_at && !l.checkout_clicked_at },
  { key: 'drop_checkout',  label: 'Dropped at checkout',icon: TrendingDown,       hint: 'Clicked checkout, never paid',         filter: (l) => !!l.checkout_clicked_at && !l.purchased_at },
  { key: 'meta_ad',        label: 'From Meta ad',       icon: FlagIcon,           hint: 'Came in with fbclid',                  filter: (l) => !!l.fbclid },
  { key: 'br_lead',        label: 'BR lead',            icon: FlagIcon,           hint: 'Has a BR message topic',               filter: (l) => !!l.message_topic },
  { key: 'has_contact',    label: 'Has contact',        icon: Mail,               hint: 'Email or phone on file',               filter: (l) => !!(l.email || l.phone) },
];

// Step-by-step funnel used in the drop-off chart. Each step is a strict
// gate — if a lead satisfies step N's filter, they're counted in step N
// regardless of whether they continued.
type FunnelStep = {
  key: string;
  label: string;
  filter: (l: Lead) => boolean;
};

const FUNNEL_STEPS: FunnelStep[] = [
  { key: 'landed',    label: 'Landed',         filter: (l) => !!(l.landed_at || l.quiz_started_at) },
  { key: 'started',   label: 'Started quiz',   filter: (l) => !!l.quiz_started_at },
  { key: 'q1',        label: 'Reached Q1',     filter: (l) => (l.quiz_step_reached ?? 0) >= 1 || !!l.quiz_completed_at },
  { key: 'q2',        label: 'Reached Q2',     filter: (l) => (l.quiz_step_reached ?? 0) >= 2 || !!l.quiz_completed_at },
  { key: 'q3',        label: 'Reached Q3',     filter: (l) => (l.quiz_step_reached ?? 0) >= 3 || !!l.quiz_completed_at },
  { key: 'q4',        label: 'Reached Q4',     filter: (l) => (l.quiz_step_reached ?? 0) >= 4 || !!l.quiz_completed_at },
  { key: 'q5',        label: 'Reached Q5',     filter: (l) => (l.quiz_step_reached ?? 0) >= 5 || !!l.quiz_completed_at },
  { key: 'q6',        label: 'Reached Q6',     filter: (l) => (l.quiz_step_reached ?? 0) >= 6 || !!l.quiz_completed_at },
  { key: 'q7',        label: 'Reached Q7',     filter: (l) => (l.quiz_step_reached ?? 0) >= 7 || !!l.quiz_completed_at },
  { key: 'completed', label: 'Completed quiz', filter: (l) => !!l.quiz_completed_at },
  { key: 'reveal',    label: 'Viewed reveal',  filter: (l) => !!l.reveal_viewed_at },
  { key: 'offer',     label: 'Viewed offer',   filter: (l) => !!l.offer_viewed_at },
  { key: 'checkout',  label: 'Clicked checkout', filter: (l) => !!l.checkout_clicked_at },
  { key: 'paid',      label: 'Paid',           filter: (l) => !!l.purchased_at },
];

// ---------------------------------------------------------------- component

const TheresaDataTab: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);
  const [activeBucket, setActiveBucket] = useState<BucketKey>('all');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  // ---- data load -----------------------------------------------------------
  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      setLoadError('Supabase not configured (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY).');
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      // Page through the 1000-row cap in PostgREST.
      const pageSize = 1000;
      const out: Lead[] = [];
      for (let from = 0; from < 100000; from += pageSize) {
        const { data, error } = await supabase
          .from('theresa_leads')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const chunk = (data || []) as Lead[];
        out.push(...chunk);
        if (chunk.length < pageSize) break;
      }
      setLeads(out);
      setLastLoadedAt(new Date().toISOString());
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // ---- date-scoped slice ---------------------------------------------------
  const scopedLeads = useMemo(() => {
    const start = rangeStart(dateRange);
    if (!start) return leads;
    const s = start.getTime();
    return leads.filter((l) => {
      const created = l.created_at ? new Date(l.created_at).getTime() : 0;
      const purchased = l.purchased_at ? new Date(l.purchased_at).getTime() : 0;
      return Math.max(created, purchased) >= s;
    });
  }, [leads, dateRange]);

  // ---- derive counts -------------------------------------------------------
  const counts = useMemo(() => {
    const c: Record<BucketKey, number> = {
      all: scopedLeads.length,
      landed: 0, started: 0, completed: 0, reveal: 0, offer: 0,
      checkout_click: 0, purchased: 0,
      drop_quiz: 0, drop_offer: 0, drop_checkout: 0,
      meta_ad: 0, br_lead: 0, has_contact: 0,
    };
    for (const l of scopedLeads) {
      for (const b of BUCKETS) if (b.filter(l)) c[b.key]++;
    }
    return c;
  }, [scopedLeads]);

  // ---- funnel drop-off -----------------------------------------------------
  const funnelCounts = useMemo(() => {
    const c = FUNNEL_STEPS.map(() => 0);
    for (const l of scopedLeads) {
      FUNNEL_STEPS.forEach((s, i) => { if (s.filter(l)) c[i]++; });
    }
    return c;
  }, [scopedLeads]);

  // ---- UTM / fbclid breakdown ---------------------------------------------
  const utmBreakdown = useMemo(() => {
    const bySource: Record<string, number> = {};
    const byCampaign: Record<string, number> = {};
    const byLastPage: Record<string, number> = {};
    for (const l of scopedLeads) {
      const src = l.utm_source || (l.fbclid ? 'meta (fbclid)' : '(direct)');
      bySource[src] = (bySource[src] || 0) + 1;
      if (l.utm_campaign) byCampaign[l.utm_campaign] = (byCampaign[l.utm_campaign] || 0) + 1;
      const page = l.last_page_viewed || '(unknown)';
      byLastPage[page] = (byLastPage[page] || 0) + 1;
    }
    const sortEntries = (o: Record<string, number>) =>
      Object.entries(o).sort((a, b) => b[1] - a[1]);
    return {
      bySource: sortEntries(bySource),
      byCampaign: sortEntries(byCampaign),
      byLastPage: sortEntries(byLastPage),
    };
  }, [scopedLeads]);

  // ---- revenue strip -------------------------------------------------------
  const money = useMemo(() => {
    const revenue = counts.purchased * PRICE_BRL;
    const convRate = counts.started > 0 ? (counts.purchased / counts.started) * 100 : 0;
    const completeRate = counts.started > 0 ? (counts.completed / counts.started) * 100 : 0;
    return { revenue, convRate, completeRate };
  }, [counts]);

  // ---- filter table --------------------------------------------------------
  const filtered = useMemo(() => {
    const bucket = BUCKETS.find((b) => b.key === activeBucket);
    const q = search.trim().toLowerCase();
    return scopedLeads.filter((l) => {
      if (bucket && !bucket.filter(l)) return false;
      if (!q) return true;
      const hay = [
        l.email, l.first_name, l.phone, l.loved_one_name, l.loved_one_relationship,
        l.message_topic, l.focus_area, l.utm_source, l.utm_campaign,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [scopedLeads, activeBucket, search]);

  // ---- csv export ----------------------------------------------------------
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = Array.isArray(v) ? v.join('; ') : String(v);
    const cleaned = s.replace(/"/g, '""');
    return /[",\n]/.test(cleaned) ? `"${cleaned}"` : cleaned;
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
    const cols: { key: keyof Lead; label: string }[] = [
      { key: 'first_name', label: 'First' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'path', label: 'Path' },
      { key: 'loved_one_relationship', label: 'Loved one — relation' },
      { key: 'loved_one_name', label: 'Loved one — name' },
      { key: 'message_topic', label: 'Message topic (BR)' },
      { key: 'signs_noticed', label: 'Signs noticed' },
      { key: 'question_for_deceased', label: 'Question' },
      { key: 'focus_area', label: 'Focus area' },
      { key: 'quiz_started_at', label: 'Quiz started' },
      { key: 'quiz_completed_at', label: 'Quiz completed' },
      { key: 'reveal_viewed_at', label: 'Reveal viewed' },
      { key: 'offer_viewed_at', label: 'Offer viewed' },
      { key: 'purchased_at', label: 'Purchased' },
      { key: 'purchase_sku', label: 'SKU' },
      { key: 'landed_at', label: 'Landed' },
      { key: 'quiz_step_reached', label: 'Quiz step reached' },
      { key: 'last_page_viewed', label: 'Last page' },
      { key: 'last_page_viewed_at', label: 'Last page at' },
      { key: 'checkout_clicked_at', label: 'Checkout clicked' },
      { key: 'fbclid', label: 'fbclid' },
      { key: 'utm_source', label: 'UTM source' },
      { key: 'utm_medium', label: 'UTM medium' },
      { key: 'utm_campaign', label: 'UTM campaign' },
      { key: 'created_at', label: 'Created' },
    ];
    const lines = [cols.map((c) => c.label).join(',')];
    for (const l of filtered) {
      lines.push(cols.map((c) => esc((l as any)[c.key])).join(','));
    }
    download(
      `theresa-${activeBucket}-${new Date().toISOString().slice(0, 10)}.csv`,
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
          {loadError ? (
            <span className="text-rose-400">Error: {loadError}</span>
          ) : lastLoadedAt ? (
            <span className="flex items-center gap-1.5 text-[#888]">
              <CheckCircle2 size={12} className="text-emerald-500" />
              Loaded {formatRelative(lastLoadedAt)} · {leads.length} leads
            </span>
          ) : (
            <span>Loading…</span>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#333] text-[#ECECEC] text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh now'}
        </button>
      </div>

      {/* date range */}
      <div className="flex items-center justify-end flex-shrink-0">
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

      {/* revenue strip */}
      <div className="grid grid-cols-3 gap-2 flex-shrink-0">
        <RevenueCard
          label="Revenue"
          value={fmtMoneyBRL(money.revenue)}
          sub={`${counts.purchased} purchases · R$ ${PRICE_BRL.toFixed(2)} each`}
          emphasized
        />
        <RevenueCard
          label="Conversion"
          value={`${money.convRate.toFixed(1)}%`}
          sub={`${counts.purchased} of ${counts.started} quiz starts`}
        />
        <RevenueCard
          label="Quiz completion"
          value={`${money.completeRate.toFixed(1)}%`}
          sub={`${counts.completed} finished the ${BUCKETS.length > 0 ? '7' : ''}-step quiz`}
        />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 flex-shrink-0">
        <KpiCard
          active={activeBucket === 'all'}
          onClick={() => setActiveBucket('all')}
          icon={Users}
          label="Everyone"
          hint="All tracked leads"
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

      {/* funnel drop-off */}
      <FunnelDropoff steps={FUNNEL_STEPS} counts={funnelCounts} />

      {/* breakdown chips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-shrink-0">
        <BreakdownBlock title="Traffic source" entries={utmBreakdown.bySource} />
        <BreakdownBlock title="Campaign" entries={utmBreakdown.byCampaign} emptyLabel="No UTM campaigns yet" />
        <BreakdownBlock title="Last page viewed" entries={utmBreakdown.byLastPage} />
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
              <Th>Loved one</Th>
              <Th>Topic</Th>
              <Th>Started</Th>
              <Th>Completed</Th>
              <Th>Reveal</Th>
              <Th>Offer</Th>
              <Th>Paid</Th>
              <Th>Source</Th>
            </tr>
          </thead>
          <tbody className="text-[#bdbdbd]">
            {loading ? (
              <tr><td colSpan={10} className="p-6 text-center text-[#555]">
                <Loader2 size={14} className="inline-block animate-spin mr-2" /> Loading…
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="p-6 text-center text-[#555]">
                {leads.length === 0
                  ? 'No leads yet. The table populates as people start the quiz.'
                  : 'No rows match this filter.'}
              </td></tr>
            ) : (
              filtered.slice(0, 500).map((l) => (
                <tr key={l.id} className="border-b border-[#1a1a1a] hover:bg-[#141414]">
                  <Td>{l.first_name || <span className="text-[#444]">—</span>}</Td>
                  <Td><span className="text-[#888]">{l.email || <span className="text-[#444]">—</span>}</span></Td>
                  <Td>
                    {l.loved_one_name ? (
                      <span>
                        <span className="text-[#bdbdbd]">{l.loved_one_name}</span>
                        {l.loved_one_relationship && (
                          <span className="text-[#555]"> · {l.loved_one_relationship}</span>
                        )}
                      </span>
                    ) : <span className="text-[#444]">—</span>}
                  </Td>
                  <Td>
                    {l.message_topic ? (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#bdbdbd]">
                        {l.message_topic}
                      </span>
                    ) : <span className="text-[#444]">—</span>}
                  </Td>
                  <Td>{l.quiz_started_at ? <span className="text-[#888]">{formatDate(l.quiz_started_at)}</span> : <Flag on={false} />}</Td>
                  <Td>{l.quiz_completed_at ? <span className="text-emerald-500">{formatDate(l.quiz_completed_at)}</span> : <Flag on={false} />}</Td>
                  <Td><Flag on={!!l.reveal_viewed_at} /></Td>
                  <Td><Flag on={!!l.offer_viewed_at} /></Td>
                  <Td>{l.purchased_at ? (
                    <span className="text-emerald-500">{formatDate(l.purchased_at)}</span>
                  ) : <Flag on={false} />}</Td>
                  <Td>
                    {l.utm_source ? (
                      <span className="text-[#888]">{l.utm_source}</span>
                    ) : <span className="text-[#444]">—</span>}
                  </Td>
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

      {/* meta-ads hint */}
      <div className="flex-shrink-0 p-3 rounded-lg bg-[#111] border border-[#1f1f1f] text-xs text-[#777] flex items-start gap-2">
        <CircleDollarSign size={14} className="flex-shrink-0 mt-0.5 text-[#555]" />
        <div>
          <p className="text-[#bdbdbd]">Meta Ads pixel: 1612698409151497</p>
          <p className="mt-0.5">
            Supabase = source of truth. Pixel counts (Meta Ads Manager) will be lower due to iOS tracking / ad blockers.
            To pull spend + CPL into this dashboard, connect the Meta Marketing API.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TheresaDataTab;

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

const FunnelDropoff: React.FC<{ steps: FunnelStep[]; counts: number[] }> = ({ steps, counts }) => {
  const top = counts[0] || 0;
  return (
    <div className="rounded-lg border border-[#1f1f1f] bg-[#111] p-3 flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider text-[#555]">Funnel drop-off</p>
        <p className="text-[10px] text-[#555]">
          {top > 0
            ? `${(((counts[counts.length - 1] || 0) / top) * 100).toFixed(2)}% landed → paid`
            : 'No data yet'}
        </p>
      </div>
      <div className="space-y-1">
        {steps.map((s, i) => {
          const n = counts[i] || 0;
          const pct = top > 0 ? (n / top) * 100 : 0;
          const prev = i > 0 ? counts[i - 1] || 0 : n;
          const dropPct = prev > 0 ? ((prev - n) / prev) * 100 : 0;
          return (
            <div key={s.key} className="flex items-center gap-2 text-[11px]">
              <span className="w-28 text-[#bdbdbd] truncate">{s.label}</span>
              <div className="flex-1 h-4 bg-[#1a1a1a] rounded overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-emerald-800/80 to-emerald-600/80"
                  style={{ width: `${pct}%` }}
                />
                <span className="absolute inset-y-0 left-2 flex items-center text-[#ECECEC] font-medium">
                  {n.toLocaleString()}
                </span>
              </div>
              <span className="w-14 text-right text-[#888] tabular-nums">{pct.toFixed(1)}%</span>
              <span className={`w-16 text-right text-[10px] tabular-nums ${
                i === 0 ? 'text-[#444]' : dropPct > 50 ? 'text-rose-400' : dropPct > 20 ? 'text-amber-400' : 'text-[#666]'
              }`}>
                {i === 0 ? '—' : `-${dropPct.toFixed(0)}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BreakdownBlock: React.FC<{ title: string; entries: [string, number][]; emptyLabel?: string }> = ({
  title, entries, emptyLabel,
}) => (
  <div className="rounded-lg border border-[#1f1f1f] bg-[#111] p-3">
    <p className="text-[10px] uppercase tracking-wider text-[#555] mb-2">{title}</p>
    {entries.length === 0 ? (
      <p className="text-[11px] text-[#444]">{emptyLabel || 'No data yet'}</p>
    ) : (
      <div className="flex flex-wrap gap-1">
        {entries.slice(0, 12).map(([label, count]) => (
          <span
            key={label}
            className="text-[11px] px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#bdbdbd]"
          >
            {label} <span className="text-[#666]">· {count}</span>
          </span>
        ))}
        {entries.length > 12 && (
          <span className="text-[11px] text-[#555] px-2 py-0.5">+ {entries.length - 12} more</span>
        )}
      </div>
    )}
  </div>
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

function fmtMoneyBRL(n: number) {
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
