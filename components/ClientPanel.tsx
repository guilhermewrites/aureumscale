import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, ExternalLink, Plus, Trash2, Loader2,
  BarChart2, Share2, GitBranch, FileText, StickyNote, LayoutDashboard,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdsPerformance {
  roas: string; spend: string; impressions: string;
  ctr: string; conversions: string; revenue: string;
}

interface SocialPlatforms {
  instagram: string; tiktok: string; youtube: string;
  twitter: string; linkedin: string; facebook: string;
}

interface ScriptedAd { id: string; title: string; content: string; }

interface ClientDetails {
  ads_performance: AdsPerformance;
  social_platforms: SocialPlatforms;
  strategy_overview: string;
  google_drive_url: string;
  funnel_notes: string;
  funnel_url: string;
  scripted_ads: ScriptedAd[];
  notes: string;
  ad_performance_notes: string;
}

const EMPTY_ADS: AdsPerformance = { roas: '', spend: '', impressions: '', ctr: '', conversions: '', revenue: '' };
const EMPTY_SOCIAL: SocialPlatforms = { instagram: '', tiktok: '', youtube: '', twitter: '', linkedin: '', facebook: '' };

const DEFAULT_DETAILS: ClientDetails = {
  ads_performance: EMPTY_ADS,
  social_platforms: EMPTY_SOCIAL,
  strategy_overview: '', google_drive_url: '',
  funnel_notes: '', funnel_url: '',
  scripted_ads: [], notes: '', ad_performance_notes: '',
};

export interface ClientPanelProps {
  client: { id: string; name: string; photoUrl?: string; service?: string } | null;
  storagePrefix: string;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.trim().split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

type SaveStatus = 'idle' | 'saving' | 'saved';

const TABS = [
  { id: 'Overview', label: 'Overview',  Icon: LayoutDashboard },
  { id: 'Ads',      label: 'Ads',       Icon: BarChart2 },
  { id: 'Social',   label: 'Social',    Icon: Share2 },
  { id: 'Funnel',   label: 'Funnel',    Icon: GitBranch },
  { id: 'Scripts',  label: 'Scripts',   Icon: FileText },
  { id: 'Notes',    label: 'Notes',     Icon: StickyNote },
] as const;
type Tab = typeof TABS[number]['id'];

const SOCIAL_LIST: { key: keyof SocialPlatforms; label: string; color: string; letter: string }[] = [
  { key: 'instagram', label: 'Instagram', color: '#E1306C', letter: 'IG' },
  { key: 'tiktok',    label: 'TikTok',    color: '#69C9D0', letter: 'TT' },
  { key: 'youtube',   label: 'YouTube',   color: '#FF0000', letter: 'YT' },
  { key: 'twitter',   label: 'Twitter/X', color: '#1DA1F2', letter: 'X' },
  { key: 'linkedin',  label: 'LinkedIn',  color: '#0A66C2', letter: 'LI' },
  { key: 'facebook',  label: 'Facebook',  color: '#1877F2', letter: 'FB' },
];

const ADS_METRICS: { key: keyof AdsPerformance; label: string; prefix?: string }[] = [
  { key: 'roas',        label: 'ROAS',        prefix: '' },
  { key: 'spend',       label: 'Ad Spend',    prefix: '$' },
  { key: 'revenue',     label: 'Revenue',     prefix: '$' },
  { key: 'impressions', label: 'Impressions', prefix: '' },
  { key: 'ctr',         label: 'CTR',         prefix: '' },
  { key: 'conversions', label: 'Conversions', prefix: '' },
];

// ─── Auto-resize textarea ─────────────────────────────────────────────────────

function AutoTextarea({ value, onChange, className, placeholder, style }: {
  value: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref} value={value} onChange={onChange}
      className={className} placeholder={placeholder}
      rows={4} style={style}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ClientPanel: React.FC<ClientPanelProps> = ({ client, storagePrefix, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [details, setDetails] = useState<ClientDetails>(DEFAULT_DETAILS);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    setLoading(true);
    setDetails(DEFAULT_DETAILS);
    setActiveTab('Overview');

    const load = async () => {
      if (!supabase) { setLoading(false); return; }
      try {
        const { data, error } = await supabase
          .from('client_details').select('*').eq('client_id', client.id).single();
        if (cancelled) return;
        if (error && error.code !== 'PGRST116') { setLoading(false); return; }
        if (!data) {
          await supabase.from('client_details').insert({
            client_id: client.id, user_id: storagePrefix, ...DEFAULT_DETAILS, scripted_ads: [],
          });
          if (!cancelled) setLoading(false);
          return;
        }
        if (!cancelled) {
          setDetails({
            ads_performance:      data.ads_performance      ?? EMPTY_ADS,
            social_platforms:     data.social_platforms     ?? EMPTY_SOCIAL,
            strategy_overview:    data.strategy_overview    ?? '',
            google_drive_url:     data.google_drive_url     ?? '',
            funnel_notes:         data.funnel_notes         ?? '',
            funnel_url:           data.funnel_url           ?? '',
            scripted_ads:         data.scripted_ads         ?? [],
            notes:                data.notes                ?? '',
            ad_performance_notes: data.ad_performance_notes ?? '',
          });
          setLoading(false);
        }
      } catch (err) {
        console.error('ClientPanel load error:', err);
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [client?.id, storagePrefix]);

  // ─── Save ──────────────────────────────────────────────────────────────────

  const saveDetails = useCallback(async (next: ClientDetails) => {
    if (!supabase || !client) return;
    setSaveStatus('saving');
    try {
      const { error } = await supabase.from('client_details').upsert({
        client_id: client.id, user_id: storagePrefix, ...next,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSaveStatus('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      console.error('ClientPanel save error:', err);
      setSaveStatus('idle');
    }
  }, [client, storagePrefix]);

  const schedule = useCallback((next: ClientDetails) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveDetails(next), 800);
  }, [saveDetails]);

  const set = useCallback(<K extends keyof ClientDetails>(key: K, value: ClientDetails[K]) => {
    setDetails(prev => { const n = { ...prev, [key]: value }; schedule(n); return n; });
  }, [schedule]);

  const setAds = useCallback((key: keyof AdsPerformance, value: string) => {
    setDetails(prev => { const n = { ...prev, ads_performance: { ...prev.ads_performance, [key]: value } }; schedule(n); return n; });
  }, [schedule]);

  const setSocial = useCallback((key: keyof SocialPlatforms, value: string) => {
    setDetails(prev => { const n = { ...prev, social_platforms: { ...prev.social_platforms, [key]: value } }; schedule(n); return n; });
  }, [schedule]);

  const addScript = useCallback(() => {
    setDetails(prev => {
      const n: ClientDetails = { ...prev, scripted_ads: [...prev.scripted_ads, { id: crypto.randomUUID(), title: '', content: '' }] };
      schedule(n); return n;
    });
  }, [schedule]);

  const patchScript = useCallback((id: string, patch: Partial<ScriptedAd>) => {
    setDetails(prev => {
      const n: ClientDetails = { ...prev, scripted_ads: prev.scripted_ads.map(s => s.id === id ? { ...s, ...patch } : s) };
      schedule(n); return n;
    });
  }, [schedule]);

  const removeScript = useCallback((id: string) => {
    setDetails(prev => {
      const n: ClientDetails = { ...prev, scripted_ads: prev.scripted_ads.filter(s => s.id !== id) };
      schedule(n); return n;
    });
  }, [schedule]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  if (!client) return null;

  // ─── Shared styles ─────────────────────────────────────────────────────────

  const ta = [
    'w-full resize-none focus:outline-none',
    'bg-[#181818] border border-[#252525] rounded-2xl',
    'text-[#DEDEDE] text-sm leading-relaxed p-4',
    'placeholder-[#383838] focus:border-[#383838] transition-colors',
  ].join(' ');

  const inp = [
    'w-full focus:outline-none',
    'bg-[#181818] border border-[#252525] rounded-2xl',
    'text-[#DEDEDE] text-sm px-4 py-3',
    'placeholder-[#383838] focus:border-[#383838] transition-colors',
  ].join(' ');

  return (
    <div className="flex w-full h-full overflow-hidden" style={{ background: '#0f0f0f' }}>

      {/* ── Left Sidebar ────────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col flex-shrink-0 h-full overflow-y-auto"
        style={{ width: 240, background: '#141414', borderRight: '1px solid #1e1e1e' }}
      >
        {/* Back button */}
        <div className="px-5 pt-6 pb-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors hover:bg-[#222]"
            style={{ color: '#555' }}
            title="Go back"
          >
            <ArrowLeft size={17} />
          </button>
        </div>

        {/* Client identity */}
        <div className="px-5 pb-6 border-b flex-shrink-0" style={{ borderColor: '#1e1e1e' }}>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg mb-3 overflow-hidden flex-shrink-0"
            style={{ background: '#252525', color: '#ECECEC' }}
          >
            {client.photoUrl
              ? <img src={client.photoUrl} alt={client.name} className="w-full h-full object-cover" />
              : getInitials(client.name)
            }
          </div>
          <p className="text-[#ECECEC] font-semibold text-sm leading-snug">{client.name}</p>
          {client.service && (
            <p className="text-[#555] text-xs mt-1">{client.service}</p>
          )}

          {/* Save status */}
          <div className="mt-3 h-5">
            {saveStatus !== 'idle' && (
              <span className={`text-xs flex items-center gap-1.5 ${saveStatus === 'saving' ? 'text-[#555]' : 'text-emerald-500'}`}>
                {saveStatus === 'saving'
                  ? <><Loader2 size={11} className="animate-spin" /> Saving…</>
                  : '✓ Saved'
                }
              </span>
            )}
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex flex-col gap-0.5 p-3 flex-1">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left w-full',
                activeTab === id
                  ? 'bg-[#222] text-white'
                  : 'text-[#555] hover:text-[#ECECEC] hover:bg-[#1a1a1a]',
              ].join(' ')}
            >
              <Icon size={15} className="flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto" style={{ background: '#0f0f0f' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2.5" style={{ color: '#444' }}>
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading workspace…</span>
          </div>
        ) : (
          <div className="px-10 py-10 max-w-3xl space-y-8">

            {/* ── OVERVIEW ──────────────────────────────────────────────── */}
            {activeTab === 'Overview' && (
              <>
                <Block title="Strategy Overview">
                  <AutoTextarea
                    value={details.strategy_overview}
                    onChange={e => set('strategy_overview', e.target.value)}
                    className={ta} style={{ minHeight: 180 }}
                    placeholder="Describe the full strategy for this client — goals, channels, key messages, and approach…"
                  />
                </Block>

                <Block title="Google Drive">
                  <div className="flex gap-3">
                    <input type="url" value={details.google_drive_url}
                      onChange={e => set('google_drive_url', e.target.value)}
                      className={inp + ' flex-1'} placeholder="Paste the Drive folder URL…" />
                    <OpenButton href={details.google_drive_url} label="Open Drive" />
                  </div>
                </Block>
              </>
            )}

            {/* ── ADS ───────────────────────────────────────────────────── */}
            {activeTab === 'Ads' && (
              <>
                <Block title="Performance Metrics">
                  <div className="grid grid-cols-3 gap-3">
                    {ADS_METRICS.map(({ key, label, prefix }) => (
                      <div
                        key={key}
                        className="rounded-2xl p-5 flex flex-col gap-2 transition-colors"
                        style={{ background: '#161616', border: '1px solid #1e1e1e' }}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#555' }}>
                          {label}
                        </span>
                        <div className="flex items-baseline gap-0.5">
                          {prefix && <span className="text-sm font-bold" style={{ color: '#444' }}>{prefix}</span>}
                          <input
                            type="text"
                            value={details.ads_performance[key]}
                            onChange={e => setAds(key, e.target.value)}
                            className="bg-transparent text-2xl font-bold focus:outline-none w-full"
                            style={{ color: '#ECECEC' }}
                            placeholder="—"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Block>

                <Block title="Notes">
                  <AutoTextarea
                    value={details.ad_performance_notes}
                    onChange={e => set('ad_performance_notes', e.target.value)}
                    className={ta} style={{ minHeight: 120 }}
                    placeholder="Observations, trends, what's working…"
                  />
                </Block>
              </>
            )}

            {/* ── SOCIAL ────────────────────────────────────────────────── */}
            {activeTab === 'Social' && (
              <Block title="Platforms">
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1e1e1e' }}>
                  {SOCIAL_LIST.map(({ key, label, color, letter }, i) => (
                    <div
                      key={key}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[#161616]"
                      style={{ borderTop: i === 0 ? 'none' : '1px solid #1e1e1e', background: 'transparent' }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                        style={{ background: color + '22', color }}
                      >
                        {letter}
                      </div>
                      <span className="text-sm font-medium w-24 flex-shrink-0" style={{ color: '#555' }}>{label}</span>
                      <input
                        type="text"
                        value={details.social_platforms[key]}
                        onChange={e => setSocial(key, e.target.value)}
                        className="bg-transparent text-sm focus:outline-none flex-1 placeholder-[#2e2e2e]"
                        style={{ color: '#DEDEDE' }}
                        placeholder="@handle or profile URL…"
                      />
                      {details.social_platforms[key] && (
                        <button
                          onClick={() => window.open(details.social_platforms[key], '_blank')}
                          className="transition-colors flex-shrink-0"
                          style={{ color: '#383838' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ECECEC')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#383838')}
                        >
                          <ExternalLink size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Block>
            )}

            {/* ── FUNNEL ────────────────────────────────────────────────── */}
            {activeTab === 'Funnel' && (
              <>
                <Block title="Funnel Overview">
                  <AutoTextarea
                    value={details.funnel_notes}
                    onChange={e => set('funnel_notes', e.target.value)}
                    className={ta} style={{ minHeight: 240 }}
                    placeholder="Describe the full funnel — landing pages, emails, ads, offers, upsells, retargeting…"
                  />
                </Block>

                <Block title="Funnel Link">
                  <div className="flex gap-3">
                    <input type="url" value={details.funnel_url}
                      onChange={e => set('funnel_url', e.target.value)}
                      className={inp + ' flex-1'} placeholder="https://…" />
                    <OpenButton href={details.funnel_url} label="Open" />
                  </div>
                </Block>
              </>
            )}

            {/* ── SCRIPTS ───────────────────────────────────────────────── */}
            {activeTab === 'Scripts' && (
              <Block
                title={`Scripts${details.scripted_ads.length > 0 ? ` · ${details.scripted_ads.length}` : ''}`}
                action={
                  <button
                    onClick={addScript}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                    style={{ background: '#ECECEC', color: '#0f0f0f' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#ffffff')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#ECECEC')}
                  >
                    <Plus size={14} /> New Script
                  </button>
                }
              >
                {details.scripted_ads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-2" style={{ color: '#333' }}>
                    <FileText size={32} strokeWidth={1.5} />
                    <p className="text-sm font-medium mt-1" style={{ color: '#444' }}>No scripts yet</p>
                    <p className="text-xs">Click "New Script" to write your first ad.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {details.scripted_ads.map((script, index) => (
                      <div
                        key={script.id}
                        className="rounded-2xl p-6 space-y-4"
                        style={{ background: '#161616', border: '1px solid #1e1e1e' }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold w-5 flex-shrink-0" style={{ color: '#383838' }}>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <input
                            type="text"
                            value={script.title}
                            onChange={e => patchScript(script.id, { title: e.target.value })}
                            className="bg-transparent text-sm font-semibold focus:outline-none flex-1 placeholder-[#2e2e2e] border-b border-transparent focus:border-[#2e2e2e] pb-0.5 transition-colors"
                            style={{ color: '#ECECEC' }}
                            placeholder="Script title…"
                          />
                          <button
                            onClick={() => removeScript(script.id)}
                            className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
                            style={{ color: '#383838' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#383838')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <AutoTextarea
                          value={script.content}
                          onChange={e => patchScript(script.id, { content: e.target.value })}
                          className={ta} style={{ minHeight: 160 }}
                          placeholder="Write the full ad script here…"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Block>
            )}

            {/* ── NOTES ─────────────────────────────────────────────────── */}
            {activeTab === 'Notes' && (
              <Block title="Internal Notes">
                <AutoTextarea
                  value={details.notes}
                  onChange={e => set('notes', e.target.value)}
                  className={ta} style={{ minHeight: 360 }}
                  placeholder="Meetings, feedback, action items, reminders…"
                />
              </Block>
            )}

          </div>
        )}
      </main>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Block({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#444' }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function OpenButton({ href, label }: { href: string; label: string }) {
  return (
    <button
      onClick={() => href && window.open(href, '_blank')}
      disabled={!href}
      className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
      style={{ background: '#161616', border: '1px solid #1e1e1e', color: '#777' }}
      onMouseEnter={e => { if (href) e.currentTarget.style.color = '#ECECEC'; }}
      onMouseLeave={e => { e.currentTarget.style.color = '#777'; }}
    >
      <ExternalLink size={13} /> {label}
    </button>
  );
}

export default ClientPanel;
