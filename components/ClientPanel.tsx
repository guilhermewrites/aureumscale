import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, ExternalLink, Plus, Trash2, Loader2, BarChart2, Share2, GitBranch, FileText, StickyNote, LayoutDashboard } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdsPerformance {
  roas: string;
  spend: string;
  impressions: string;
  ctr: string;
  conversions: string;
  revenue: string;
}

interface SocialPlatforms {
  instagram: string;
  tiktok: string;
  youtube: string;
  twitter: string;
  linkedin: string;
  facebook: string;
}

interface ScriptedAd {
  id: string;
  title: string;
  content: string;
}

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

const DEFAULT_DETAILS: ClientDetails = {
  ads_performance: { roas: '', spend: '', impressions: '', ctr: '', conversions: '', revenue: '' },
  social_platforms: { instagram: '', tiktok: '', youtube: '', twitter: '', linkedin: '', facebook: '' },
  strategy_overview: '',
  google_drive_url: '',
  funnel_notes: '',
  funnel_url: '',
  scripted_ads: [],
  notes: '',
  ad_performance_notes: '',
};

export interface ClientPanelProps {
  client: { id: string; name: string; photoUrl?: string } | null;
  storagePrefix: string;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.trim().split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

type SaveStatus = 'idle' | 'saving' | 'saved';

const TABS = [
  { id: 'Overview',  label: 'Overview',  icon: LayoutDashboard },
  { id: 'Ads',       label: 'Ads',       icon: BarChart2 },
  { id: 'Social',    label: 'Social',    icon: Share2 },
  { id: 'Funnel',    label: 'Funnel',    icon: GitBranch },
  { id: 'Scripts',   label: 'Scripts',   icon: FileText },
  { id: 'Notes',     label: 'Notes',     icon: StickyNote },
] as const;

type Tab = typeof TABS[number]['id'];

const SOCIAL_PLATFORMS: { key: keyof SocialPlatforms; label: string; emoji: string }[] = [
  { key: 'instagram', label: 'Instagram', emoji: '📸' },
  { key: 'tiktok',    label: 'TikTok',    emoji: '🎵' },
  { key: 'youtube',   label: 'YouTube',   emoji: '▶️' },
  { key: 'twitter',   label: 'Twitter/X', emoji: '🐦' },
  { key: 'linkedin',  label: 'LinkedIn',  emoji: '💼' },
  { key: 'facebook',  label: 'Facebook',  emoji: '📘' },
];

const ADS_METRICS: { key: keyof AdsPerformance; label: string }[] = [
  { key: 'roas',        label: 'ROAS' },
  { key: 'spend',       label: 'Spend' },
  { key: 'impressions', label: 'Impressions' },
  { key: 'ctr',         label: 'CTR' },
  { key: 'conversions', label: 'Conversions' },
  { key: 'revenue',     label: 'Revenue' },
];

// ─── Auto-resize textarea ─────────────────────────────────────────────────────

interface AutoTextareaProps {
  value: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}

function AutoTextarea({ value, className, ...rest }: AutoTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} value={value} className={className} rows={4} {...rest} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ClientPanel: React.FC<ClientPanelProps> = ({ client, storagePrefix, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [details, setDetails] = useState<ClientDetails>(DEFAULT_DETAILS);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load ─────────────────────────────────────────────────────────────────

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
          .from('client_details')
          .select('*')
          .eq('client_id', client.id)
          .single();

        if (cancelled) return;

        if (error && error.code !== 'PGRST116') {
          console.error('ClientPanel load error:', error);
          setLoading(false);
          return;
        }

        if (!data) {
          await supabase.from('client_details').insert({
            client_id: client.id,
            user_id: storagePrefix,
            ...DEFAULT_DETAILS,
            scripted_ads: [],
          });
          if (!cancelled) setLoading(false);
          return;
        }

        if (!cancelled) {
          setDetails({
            ads_performance:     data.ads_performance     ?? DEFAULT_DETAILS.ads_performance,
            social_platforms:    data.social_platforms    ?? DEFAULT_DETAILS.social_platforms,
            strategy_overview:   data.strategy_overview   ?? '',
            google_drive_url:    data.google_drive_url    ?? '',
            funnel_notes:        data.funnel_notes        ?? '',
            funnel_url:          data.funnel_url          ?? '',
            scripted_ads:        data.scripted_ads        ?? [],
            notes:               data.notes               ?? '',
            ad_performance_notes: data.ad_performance_notes ?? '',
          });
          setLoading(false);
        }
      } catch (err) {
        console.error('ClientPanel unexpected error:', err);
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
        client_id: client.id,
        user_id: storagePrefix,
        ...next,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSaveStatus('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('ClientPanel save error:', err);
      setSaveStatus('idle');
    }
  }, [client, storagePrefix]);

  const scheduleAutoSave = useCallback((next: ClientDetails) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveDetails(next), 700);
  }, [saveDetails]);

  const updateField = useCallback(<K extends keyof ClientDetails>(key: K, value: ClientDetails[K]) => {
    setDetails(prev => {
      const next = { ...prev, [key]: value };
      scheduleAutoSave(next);
      return next;
    });
  }, [scheduleAutoSave]);

  const updateAdsPerformance = useCallback((key: keyof AdsPerformance, value: string) => {
    setDetails(prev => {
      const next = { ...prev, ads_performance: { ...prev.ads_performance, [key]: value } };
      scheduleAutoSave(next);
      return next;
    });
  }, [scheduleAutoSave]);

  const updateSocialPlatform = useCallback((key: keyof SocialPlatforms, value: string) => {
    setDetails(prev => {
      const next = { ...prev, social_platforms: { ...prev.social_platforms, [key]: value } };
      scheduleAutoSave(next);
      return next;
    });
  }, [scheduleAutoSave]);

  const addScript = useCallback(() => {
    setDetails(prev => {
      const next: ClientDetails = { ...prev, scripted_ads: [...prev.scripted_ads, { id: crypto.randomUUID(), title: 'New Script', content: '' }] };
      scheduleAutoSave(next);
      return next;
    });
  }, [scheduleAutoSave]);

  const updateScript = useCallback((id: string, patch: Partial<ScriptedAd>) => {
    setDetails(prev => {
      const next: ClientDetails = { ...prev, scripted_ads: prev.scripted_ads.map(s => s.id === id ? { ...s, ...patch } : s) };
      scheduleAutoSave(next);
      return next;
    });
  }, [scheduleAutoSave]);

  const deleteScript = useCallback((id: string) => {
    setDetails(prev => {
      const next: ClientDetails = { ...prev, scripted_ads: prev.scripted_ads.filter(s => s.id !== id) };
      scheduleAutoSave(next);
      return next;
    });
  }, [scheduleAutoSave]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  if (!client) return null;

  const ta = 'bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-[#ECECEC] text-sm p-4 w-full focus:outline-none focus:border-[#444] resize-none leading-relaxed';
  const inp = 'bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-[#ECECEC] text-sm px-4 py-2.5 w-full focus:outline-none focus:border-[#444]';

  return (
    <div className="flex flex-col w-full h-full" style={{ background: '#111111' }}>

      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-[#222] flex-shrink-0" style={{ background: '#161616' }}>
        <div className="flex items-center gap-4">
          {/* Back button */}
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-[#666] hover:text-[#ECECEC] transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} />
            <span>Clients</span>
          </button>

          <span className="text-[#333]">/</span>

          {/* Client avatar + name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#2a2a2a] flex items-center justify-center text-[#ECECEC] text-xs font-bold flex-shrink-0 overflow-hidden border border-[#333]">
              {client.photoUrl
                ? <img src={client.photoUrl} alt={client.name} className="w-full h-full object-cover" />
                : getInitials(client.name)
              }
            </div>
            <div>
              <h1 className="text-[#ECECEC] font-semibold text-base leading-none">{client.name}</h1>
              <p className="text-[#555] text-xs mt-0.5">Client Workspace</p>
            </div>
          </div>
        </div>

        {/* Save status */}
        <span className={`text-xs transition-opacity duration-300 ${
          saveStatus === 'idle' ? 'opacity-0' :
          saveStatus === 'saving' ? 'text-[#9B9B9B] opacity-100' :
          'text-emerald-400 opacity-100'
        }`}>
          {saveStatus === 'saving' ? 'Saving…' : 'Saved ✓'}
        </span>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Sidebar — vertical tabs */}
        <div className="flex flex-col gap-1 p-4 border-r border-[#1e1e1e] flex-shrink-0" style={{ width: 200, background: '#161616' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left w-full ${
                activeTab === id
                  ? 'bg-[#222] text-white'
                  : 'text-[#666] hover:text-[#ECECEC] hover:bg-[#1a1a1a]'
              }`}
            >
              <Icon size={15} className="flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full gap-2 text-[#555]">
              <Loader2 size={22} className="animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : (
            <div className="p-8 max-w-4xl space-y-8">

              {/* ── OVERVIEW ──────────────────────────────────────────────── */}
              {activeTab === 'Overview' && (
                <>
                  <Section title="Strategy Overview">
                    <AutoTextarea
                      value={details.strategy_overview}
                      onChange={e => updateField('strategy_overview', e.target.value)}
                      className={ta}
                      placeholder="Write the full strategy for this client — goals, approach, key focus areas…"
                      style={{ minHeight: 200 }}
                    />
                  </Section>

                  <Section title="Google Drive">
                    <div className="flex gap-3">
                      <input type="url" value={details.google_drive_url}
                        onChange={e => updateField('google_drive_url', e.target.value)}
                        className={inp + ' flex-1'} placeholder="https://drive.google.com/…" />
                      <button
                        onClick={() => details.google_drive_url && window.open(details.google_drive_url, '_blank')}
                        disabled={!details.google_drive_url}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-sm text-[#9B9B9B] hover:text-white hover:border-[#444] transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        <ExternalLink size={14} /> Open Drive
                      </button>
                    </div>
                  </Section>
                </>
              )}

              {/* ── ADS ───────────────────────────────────────────────────── */}
              {activeTab === 'Ads' && (
                <>
                  <Section title="Performance Metrics">
                    <div className="grid grid-cols-3 gap-4">
                      {ADS_METRICS.map(({ key, label }) => (
                        <div key={key} className="bg-[#1a1a1a] border border-[#222] rounded-2xl p-5 flex flex-col gap-3 hover:border-[#333] transition-colors">
                          <span className="text-xs text-[#555] font-semibold uppercase tracking-widest">{label}</span>
                          <input
                            type="text"
                            value={details.ads_performance[key]}
                            onChange={e => updateAdsPerformance(key, e.target.value)}
                            className="bg-transparent text-white text-2xl font-bold focus:outline-none w-full placeholder-[#333]"
                            placeholder="—"
                          />
                        </div>
                      ))}
                    </div>
                  </Section>

                  <Section title="Performance Notes">
                    <AutoTextarea
                      value={details.ad_performance_notes}
                      onChange={e => updateField('ad_performance_notes', e.target.value)}
                      className={ta}
                      placeholder="Notes on ad performance, trends, observations…"
                      style={{ minHeight: 140 }}
                    />
                  </Section>
                </>
              )}

              {/* ── SOCIAL ────────────────────────────────────────────────── */}
              {activeTab === 'Social' && (
                <Section title="Social Platforms">
                  <div className="bg-[#1a1a1a] border border-[#222] rounded-2xl overflow-hidden divide-y divide-[#222]">
                    {SOCIAL_PLATFORMS.map(({ key, label, emoji }) => (
                      <div key={key} className="flex items-center gap-5 px-6 py-4 hover:bg-[#1e1e1e] transition-colors">
                        <span className="text-xl w-7 flex-shrink-0 text-center">{emoji}</span>
                        <span className="text-sm text-[#666] font-medium w-28 flex-shrink-0">{label}</span>
                        <input
                          type="text"
                          value={details.social_platforms[key]}
                          onChange={e => updateSocialPlatform(key, e.target.value)}
                          className="bg-transparent text-[#ECECEC] text-sm focus:outline-none flex-1 placeholder-[#333]"
                          placeholder="Handle or profile URL…"
                        />
                        {details.social_platforms[key] && (
                          <button
                            onClick={() => window.open(details.social_platforms[key], '_blank')}
                            className="text-[#444] hover:text-[#ECECEC] transition-colors"
                          >
                            <ExternalLink size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* ── FUNNEL ────────────────────────────────────────────────── */}
              {activeTab === 'Funnel' && (
                <>
                  <Section title="Funnel Overview">
                    <AutoTextarea
                      value={details.funnel_notes}
                      onChange={e => updateField('funnel_notes', e.target.value)}
                      className={ta}
                      placeholder="Describe the full funnel — landing pages, emails, ads, offers, upsells…"
                      style={{ minHeight: 240 }}
                    />
                  </Section>

                  <Section title="Funnel Link">
                    <div className="flex gap-3">
                      <input type="url" value={details.funnel_url}
                        onChange={e => updateField('funnel_url', e.target.value)}
                        className={inp + ' flex-1'} placeholder="https://…" />
                      <button
                        onClick={() => details.funnel_url && window.open(details.funnel_url, '_blank')}
                        disabled={!details.funnel_url}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-sm text-[#9B9B9B] hover:text-white hover:border-[#444] transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        <ExternalLink size={14} /> Open
                      </button>
                    </div>
                  </Section>
                </>
              )}

              {/* ── SCRIPTS ───────────────────────────────────────────────── */}
              {activeTab === 'Scripts' && (
                <Section
                  title={`Scripted Ads ${details.scripted_ads.length > 0 ? `(${details.scripted_ads.length})` : ''}`}
                  action={
                    <button onClick={addScript}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-semibold hover:bg-[#e0e0e0] transition-colors">
                      <Plus size={14} /> New Script
                    </button>
                  }
                >
                  {details.scripted_ads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[#444]">
                      <FileText size={36} className="mb-3 opacity-40" />
                      <p className="text-sm font-medium">No scripts yet</p>
                      <p className="text-xs mt-1">Click "New Script" to write your first ad.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {details.scripted_ads.map((script, index) => (
                        <div key={script.id} className="bg-[#1a1a1a] border border-[#222] rounded-2xl p-6 space-y-4 hover:border-[#333] transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#444] font-bold w-6">#{index + 1}</span>
                            <input
                              type="text"
                              value={script.title}
                              onChange={e => updateScript(script.id, { title: e.target.value })}
                              className="bg-transparent text-white text-base font-semibold focus:outline-none flex-1 placeholder-[#333] border-b border-transparent focus:border-[#333] pb-0.5"
                              placeholder="Script title…"
                            />
                            <button onClick={() => deleteScript(script.id)}
                              className="text-[#444] hover:text-red-400 transition-colors p-1 rounded">
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <AutoTextarea
                            value={script.content}
                            onChange={e => updateScript(script.id, { content: e.target.value })}
                            className={ta}
                            placeholder="Write the full ad script here…"
                            style={{ minHeight: 160 }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {/* ── NOTES ─────────────────────────────────────────────────── */}
              {activeTab === 'Notes' && (
                <Section title="Internal Notes">
                  <AutoTextarea
                    value={details.notes}
                    onChange={e => updateField('notes', e.target.value)}
                    className={ta}
                    placeholder="Internal notes about this client — meetings, feedback, reminders…"
                    style={{ minHeight: 320 }}
                  />
                </Section>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#ECECEC] uppercase tracking-wider">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export default ClientPanel;
