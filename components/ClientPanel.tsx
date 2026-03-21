import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ExternalLink, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

type SaveStatus = 'idle' | 'saving' | 'saved';

const TABS = ['Overview', 'Ads', 'Social', 'Funnel', 'Scripts'] as const;
type Tab = typeof TABS[number];

// ─── Social platform config ───────────────────────────────────────────────────

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

// ─── Textarea that auto-resizes ───────────────────────────────────────────────

interface AutoTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

function AutoTextarea({ value, className, ...rest }: AutoTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      className={className}
      rows={3}
      {...rest}
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

  // ─── Load data when client changes ──────────────────────────────────────────

  useEffect(() => {
    if (!client) return;

    let cancelled = false;
    setLoading(true);
    setDetails(DEFAULT_DETAILS);
    setActiveTab('Overview');

    const load = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('client_details')
          .select('*')
          .eq('client_id', client.id)
          .single();

        if (cancelled) return;

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = row not found — that's expected for new clients
          console.error('ClientPanel load error:', error);
          setLoading(false);
          return;
        }

        if (!data) {
          // No row — insert defaults
          const { error: insertError } = await supabase.from('client_details').insert({
            client_id: client.id,
            user_id: storagePrefix,
            ads_performance: DEFAULT_DETAILS.ads_performance,
            social_platforms: DEFAULT_DETAILS.social_platforms,
            strategy_overview: '',
            google_drive_url: '',
            funnel_notes: '',
            scripted_ads: [],
            notes: '',
          });
          if (insertError) console.error('ClientPanel insert error:', insertError);
          if (!cancelled) setLoading(false);
          return;
        }

        if (!cancelled) {
          setDetails({
            ads_performance: data.ads_performance ?? DEFAULT_DETAILS.ads_performance,
            social_platforms: data.social_platforms ?? DEFAULT_DETAILS.social_platforms,
            strategy_overview: data.strategy_overview ?? '',
            google_drive_url: data.google_drive_url ?? '',
            funnel_notes: data.funnel_notes ?? '',
            funnel_url: data.funnel_url ?? '',
            scripted_ads: data.scripted_ads ?? [],
            notes: data.notes ?? '',
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

  // ─── Save ────────────────────────────────────────────────────────────────────

  const saveDetails = useCallback(
    async (nextDetails: ClientDetails) => {
      if (!supabase || !client) return;

      setSaveStatus('saving');
      try {
        const { error } = await supabase.from('client_details').upsert({
          client_id: client.id,
          user_id: storagePrefix,
          ads_performance: nextDetails.ads_performance,
          social_platforms: nextDetails.social_platforms,
          strategy_overview: nextDetails.strategy_overview,
          google_drive_url: nextDetails.google_drive_url,
          funnel_notes: nextDetails.funnel_notes,
          funnel_url: nextDetails.funnel_url,
          scripted_ads: nextDetails.scripted_ads,
          notes: nextDetails.notes,
          ad_performance_notes: nextDetails.ad_performance_notes,
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
    },
    [client, storagePrefix],
  );

  const scheduleAutoSave = useCallback(
    (nextDetails: ClientDetails) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => saveDetails(nextDetails), 700);
    },
    [saveDetails],
  );

  // ─── Field updaters ──────────────────────────────────────────────────────────

  const updateField = useCallback(
    <K extends keyof ClientDetails>(key: K, value: ClientDetails[K]) => {
      setDetails(prev => {
        const next = { ...prev, [key]: value };
        scheduleAutoSave(next);
        return next;
      });
    },
    [scheduleAutoSave],
  );

  const updateAdsPerformance = useCallback(
    (key: keyof AdsPerformance, value: string) => {
      setDetails(prev => {
        const next = { ...prev, ads_performance: { ...prev.ads_performance, [key]: value } };
        scheduleAutoSave(next);
        return next;
      });
    },
    [scheduleAutoSave],
  );

  const updateSocialPlatform = useCallback(
    (key: keyof SocialPlatforms, value: string) => {
      setDetails(prev => {
        const next = { ...prev, social_platforms: { ...prev.social_platforms, [key]: value } };
        scheduleAutoSave(next);
        return next;
      });
    },
    [scheduleAutoSave],
  );

  // ─── Scripts ─────────────────────────────────────────────────────────────────

  const addScript = useCallback(() => {
    setDetails(prev => {
      const next: ClientDetails = {
        ...prev,
        scripted_ads: [
          ...prev.scripted_ads,
          { id: crypto.randomUUID(), title: 'New Script', content: '' },
        ],
      };
      scheduleAutoSave(next);
      return next;
    });
  }, [scheduleAutoSave]);

  const updateScript = useCallback(
    (id: string, patch: Partial<ScriptedAd>) => {
      setDetails(prev => {
        const next: ClientDetails = {
          ...prev,
          scripted_ads: prev.scripted_ads.map(s => (s.id === id ? { ...s, ...patch } : s)),
        };
        scheduleAutoSave(next);
        return next;
      });
    },
    [scheduleAutoSave],
  );

  const deleteScript = useCallback(
    (id: string) => {
      setDetails(prev => {
        const next: ClientDetails = {
          ...prev,
          scripted_ads: prev.scripted_ads.filter(s => s.id !== id),
        };
        scheduleAutoSave(next);
        return next;
      });
    },
    [scheduleAutoSave],
  );

  // ─── Cleanup timers on unmount ───────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (!client) return null;

  const sharedTextarea =
    'bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg text-[#ECECEC] text-sm p-3 w-full focus:outline-none focus:border-[#4a4a4a] resize-none';
  const sharedInput =
    'bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg text-[#ECECEC] text-sm px-3 py-2 w-full focus:outline-none focus:border-[#4a4a4a]';

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex flex-col"
      style={{
        width: 'min(780px, 95vw)',
        background: '#161616',
        borderLeft: '1px solid #2a2a2a',
        transform: 'translateX(0)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-[#3a3a3a] flex items-center justify-center text-[#ECECEC] text-sm font-semibold flex-shrink-0 overflow-hidden">
            {client.photoUrl ? (
              <img src={client.photoUrl} alt={client.name} className="w-full h-full object-cover" />
            ) : (
              getInitials(client.name)
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-[#ECECEC] font-semibold text-base truncate">{client.name}</h2>
            <p className="text-[#9B9B9B] text-xs">Client Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Save status */}
          <span
            className={`text-xs transition-opacity duration-300 ${
              saveStatus === 'idle'
                ? 'opacity-0'
                : saveStatus === 'saving'
                ? 'text-[#9B9B9B] opacity-100'
                : 'text-emerald-400 opacity-100'
            }`}
          >
            {saveStatus === 'saving' ? 'Saving…' : 'Saved ✓'}
          </span>

          {/* Close */}
          <button
            onClick={onClose}
            className="text-[#666666] hover:text-[#ECECEC] transition-colors p-1 rounded"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-[#2a2a2a] px-6 flex-shrink-0 gap-1">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'text-white border-b-2 border-white -mb-px'
                : 'text-[#9B9B9B] hover:text-[#ECECEC]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-[#666666]">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* ── OVERVIEW ────────────────────────────────────────────────── */}
            {activeTab === 'Overview' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wider">
                    Strategy Overview
                  </label>
                  <AutoTextarea
                    value={details.strategy_overview}
                    onChange={e => updateField('strategy_overview', e.target.value)}
                    className={sharedTextarea}
                    placeholder="Write your strategy for this client…"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wider">
                    Notes
                  </label>
                  <AutoTextarea
                    value={details.notes}
                    onChange={e => updateField('notes', e.target.value)}
                    className={sharedTextarea}
                    placeholder="Internal notes…"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wider">
                    Google Drive
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={details.google_drive_url}
                      onChange={e => updateField('google_drive_url', e.target.value)}
                      className={sharedInput + ' flex-1'}
                      placeholder="https://drive.google.com/…"
                    />
                    <button
                      onClick={() => details.google_drive_url && window.open(details.google_drive_url, '_blank')}
                      disabled={!details.google_drive_url}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg text-sm text-[#9B9B9B] hover:text-[#ECECEC] hover:border-[#4a4a4a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      <ExternalLink size={14} />
                      Open
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── ADS ─────────────────────────────────────────────────────── */}
            {activeTab === 'Ads' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wider">
                    Performance Metrics
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {ADS_METRICS.map(({ key, label }) => (
                      <div
                        key={key}
                        className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-4 flex flex-col gap-2"
                      >
                        <span className="text-xs text-[#9B9B9B] font-medium uppercase tracking-wider">
                          {label}
                        </span>
                        <input
                          type="text"
                          value={details.ads_performance[key]}
                          onChange={e => updateAdsPerformance(key, e.target.value)}
                          className="bg-transparent text-[#ECECEC] text-xl font-semibold focus:outline-none w-full placeholder-[#3a3a3a]"
                          placeholder="—"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wider">
                    Ad Performance Notes
                  </label>
                  <AutoTextarea
                    value={details.ad_performance_notes}
                    onChange={e => updateField('ad_performance_notes', e.target.value)}
                    className={sharedTextarea}
                    placeholder="Additional context about ad performance…"
                  />
                </div>
              </>
            )}

            {/* ── SOCIAL ──────────────────────────────────────────────────── */}
            {activeTab === 'Social' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wider block mb-3">
                  Social Platforms
                </label>
                <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#2a2a2a]">
                  {SOCIAL_PLATFORMS.map(({ key, label, emoji }) => (
                    <div key={key} className="flex items-center gap-4 px-4 py-3">
                      <span className="text-lg flex-shrink-0">{emoji}</span>
                      <span className="text-sm text-[#9B9B9B] w-28 flex-shrink-0">{label}</span>
                      <input
                        type="text"
                        value={details.social_platforms[key]}
                        onChange={e => updateSocialPlatform(key, e.target.value)}
                        className="bg-transparent text-[#ECECEC] text-sm focus:outline-none flex-1 placeholder-[#3a3a3a]"
                        placeholder="Handle or URL…"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── FUNNEL ──────────────────────────────────────────────────── */}
            {activeTab === 'Funnel' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wider">
                    Funnel Overview
                  </label>
                  <AutoTextarea
                    value={details.funnel_notes}
                    onChange={e => updateField('funnel_notes', e.target.value)}
                    className={sharedTextarea}
                    placeholder="Describe the full funnel structure…"
                    style={{ minHeight: 180 }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wider">
                    Funnel URL / Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={details.funnel_url}
                      onChange={e => updateField('funnel_url', e.target.value)}
                      className={sharedInput + ' flex-1'}
                      placeholder="https://…"
                    />
                    <button
                      onClick={() => details.funnel_url && window.open(details.funnel_url, '_blank')}
                      disabled={!details.funnel_url}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg text-sm text-[#9B9B9B] hover:text-[#ECECEC] hover:border-[#4a4a4a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      <ExternalLink size={14} />
                      Open
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── SCRIPTS ─────────────────────────────────────────────────── */}
            {activeTab === 'Scripts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wider">
                    Scripted Ads ({details.scripted_ads.length})
                  </label>
                  <button
                    onClick={addScript}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg text-sm text-[#ECECEC] hover:border-[#4a4a4a] transition-colors"
                  >
                    <Plus size={14} />
                    Add Script
                  </button>
                </div>

                {details.scripted_ads.length === 0 && (
                  <div className="text-center py-12 text-[#666666]">
                    <p className="text-sm">No scripts yet. Click "Add Script" to create one.</p>
                  </div>
                )}

                <div className="space-y-3">
                  {details.scripted_ads.map((script, index) => (
                    <div
                      key={script.id}
                      className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-4 space-y-3"
                    >
                      {/* Script header: title + delete */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#666666] font-medium flex-shrink-0">
                          #{index + 1}
                        </span>
                        <input
                          type="text"
                          value={script.title}
                          onChange={e => updateScript(script.id, { title: e.target.value })}
                          className="bg-transparent text-[#ECECEC] text-sm font-semibold focus:outline-none flex-1 placeholder-[#3a3a3a] border-b border-transparent focus:border-[#3a3a3a] pb-0.5"
                          placeholder="Script title…"
                        />
                        <button
                          onClick={() => deleteScript(script.id)}
                          className="text-[#666666] hover:text-red-400 transition-colors flex-shrink-0 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Script content */}
                      <AutoTextarea
                        value={script.content}
                        onChange={e => updateScript(script.id, { content: e.target.value })}
                        className={sharedTextarea}
                        placeholder="Write the ad script here…"
                        style={{ minHeight: 120 }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientPanel;
