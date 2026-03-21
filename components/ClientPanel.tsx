import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ExternalLink, Plus, Trash2, Loader2,
  BarChart2, Share2, GitBranch, FileText, StickyNote, LayoutDashboard, Camera,
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
  ads_performance: EMPTY_ADS, social_platforms: EMPTY_SOCIAL,
  strategy_overview: '', google_drive_url: '',
  funnel_notes: '', funnel_url: '',
  scripted_ads: [], notes: '', ad_performance_notes: '',
};

export interface ClientPanelProps {
  client: { id: string; name: string; photoUrl?: string; service?: string } | null;
  storagePrefix: string;
  onClose: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

const TABS = [
  { id: 'Overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'Ads',      label: 'Ads',      Icon: BarChart2 },
  { id: 'Social',   label: 'Social',   Icon: Share2 },
  { id: 'Funnel',   label: 'Funnel',   Icon: GitBranch },
  { id: 'Scripts',  label: 'Scripts',  Icon: FileText },
  { id: 'Notes',    label: 'Notes',    Icon: StickyNote },
] as const;
type Tab = typeof TABS[number]['id'];

const SOCIAL_LIST: { key: keyof SocialPlatforms; label: string; bg: string; color: string; abbr: string }[] = [
  { key: 'instagram', label: 'Instagram', bg: '#E1306C22', color: '#E1306C', abbr: 'IG' },
  { key: 'tiktok',    label: 'TikTok',    bg: '#69C9D022', color: '#69C9D0', abbr: 'TT' },
  { key: 'youtube',   label: 'YouTube',   bg: '#FF000022', color: '#FF4444', abbr: 'YT' },
  { key: 'twitter',   label: 'Twitter/X', bg: '#1DA1F222', color: '#1DA1F2', abbr: 'X' },
  { key: 'linkedin',  label: 'LinkedIn',  bg: '#0A66C222', color: '#0A66C2', abbr: 'LI' },
  { key: 'facebook',  label: 'Facebook',  bg: '#1877F222', color: '#1877F2', abbr: 'FB' },
];

const ADS_METRICS: { key: keyof AdsPerformance; label: string; prefix?: string }[] = [
  { key: 'roas',        label: 'ROAS' },
  { key: 'spend',       label: 'Ad Spend',    prefix: '$' },
  { key: 'revenue',     label: 'Revenue',     prefix: '$' },
  { key: 'impressions', label: 'Impressions' },
  { key: 'ctr',         label: 'CTR' },
  { key: 'conversions', label: 'Conversions' },
];

function compressImage(file: File): Promise<string> {
  return new Promise(resolve => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = 400;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = url;
  });
}

function AutoTextarea({ value, onChange, className, placeholder, style }: {
  value: string; onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  className?: string; placeholder?: string; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} value={value} onChange={onChange} className={className} placeholder={placeholder} rows={4} style={style} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ClientPanel: React.FC<ClientPanelProps> = ({ client, storagePrefix, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [details, setDetails] = useState<ClientDetails>(DEFAULT_DETAILS);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [localPhoto, setLocalPhoto] = useState<string | undefined>(client?.photoUrl);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalPhoto(client?.photoUrl); }, [client?.photoUrl]);

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

  const setField = useCallback(<K extends keyof ClientDetails>(key: K, value: ClientDetails[K]) => {
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
      const n = { ...prev, scripted_ads: [...prev.scripted_ads, { id: crypto.randomUUID(), title: '', content: '' }] };
      schedule(n); return n;
    });
  }, [schedule]);

  const patchScript = useCallback((id: string, patch: Partial<ScriptedAd>) => {
    setDetails(prev => {
      const n = { ...prev, scripted_ads: prev.scripted_ads.map(s => s.id === id ? { ...s, ...patch } : s) };
      schedule(n); return n;
    });
  }, [schedule]);

  const removeScript = useCallback((id: string) => {
    setDetails(prev => {
      const n = { ...prev, scripted_ads: prev.scripted_ads.filter(s => s.id !== id) };
      schedule(n); return n;
    });
  }, [schedule]);

  const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase || !client) return;
    const compressed = await compressImage(file);
    setLocalPhoto(compressed);
    await supabase.from('clients').update({ photo_url: compressed }).eq('id', client.id).eq('user_id', storagePrefix);
  }, [client, storagePrefix]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  if (!client) return null;

  // Shared field styles
  const ta = 'w-full resize-none focus:outline-none bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl text-[#DEDEDE] text-sm leading-relaxed p-4 placeholder-[#3a3a3a] focus:border-[#3a3a3a] transition-colors';
  const inp = 'flex-1 focus:outline-none bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl text-[#DEDEDE] text-sm px-4 py-3 placeholder-[#3a3a3a] focus:border-[#3a3a3a] transition-colors';

  return (
    <div className="flex w-full h-full overflow-hidden p-5 gap-4" style={{ background: '#111' }}>

      {/* ── LEFT CARD ─────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col flex-shrink-0 rounded-3xl overflow-hidden"
        style={{ width: 260, background: '#1a1a1a', border: '1px solid #252525' }}
      >
        {/* Photo */}
        <div
          className="relative flex-shrink-0 cursor-pointer group"
          style={{ height: 240 }}
          onClick={() => photoInputRef.current?.click()}
        >
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          {localPhoto ? (
            <img src={localPhoto} alt={client.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ background: '#242424' }}>
              <Camera size={28} style={{ color: '#444' }} />
              <span className="text-xs" style={{ color: '#444' }}>Add photo</span>
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <Camera size={22} color="white" />
          </div>
        </div>

        {/* Name */}
        <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: '#252525' }}>
          <p
            className="text-center text-xl font-bold leading-tight"
            style={{ color: '#ECECEC', fontFamily: "'Georgia', 'Times New Roman', serif", fontStyle: 'italic' }}
          >
            {client.name || 'Client Name'}
          </p>
          {saveStatus !== 'idle' && (
            <p className={`text-center text-xs mt-1.5 ${saveStatus === 'saving' ? 'text-[#555]' : 'text-emerald-500'}`}>
              {saveStatus === 'saving' ? 'Saving…' : '✓ Saved'}
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5 p-3 flex-1">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left w-full',
                activeTab === id
                  ? 'text-[#ECECEC]'
                  : 'text-[#555] hover:text-[#ECECEC] hover:bg-[#222]',
              ].join(' ')}
              style={activeTab === id ? { background: '#2a2a2a' } : {}}
            >
              <Icon size={15} className="flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Back button at bottom */}
        <div className="p-3 border-t" style={{ borderColor: '#252525' }}>
          <button
            onClick={onClose}
            className="w-full text-xs font-medium py-2 rounded-xl transition-colors text-center"
            style={{ color: '#444', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ECECEC'; e.currentTarget.style.background = '#222'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#444'; e.currentTarget.style.background = 'transparent'; }}
          >
            ← Back to Clients
          </button>
        </div>
      </div>

      {/* ── RIGHT CARD ────────────────────────────────────────────────────────── */}
      <div
        className="flex-1 rounded-3xl overflow-y-auto"
        style={{ background: '#1a1a1a', border: '1px solid #252525' }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2.5" style={{ color: '#444' }}>
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading workspace…</span>
          </div>
        ) : (
          <div className="p-8 space-y-8 max-w-2xl">

            {/* ── OVERVIEW ────────────────────────────────────────────────── */}
            {activeTab === 'Overview' && (<>
              <Block title="Strategy Overview">
                <AutoTextarea
                  value={details.strategy_overview}
                  onChange={e => setField('strategy_overview', e.target.value)}
                  className={ta} style={{ minHeight: 160 }}
                  placeholder="Describe the full strategy for this client — goals, channels, key messages, and approach…"
                />
              </Block>
              <Block title="Google Drive">
                <div className="flex gap-3">
                  <input type="url" value={details.google_drive_url}
                    onChange={e => setField('google_drive_url', e.target.value)}
                    className={inp} placeholder="Paste the Drive folder URL…" />
                  <OpenBtn href={details.google_drive_url} label="Open Drive" />
                </div>
              </Block>
            </>)}

            {/* ── ADS ─────────────────────────────────────────────────────── */}
            {activeTab === 'Ads' && (<>
              <Block title="Performance Metrics">
                <div className="grid grid-cols-3 gap-3">
                  {ADS_METRICS.map(({ key, label, prefix }) => (
                    <div key={key} className="rounded-2xl p-5 flex flex-col gap-2" style={{ background: '#202020', border: '1px solid #2a2a2a' }}>
                      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#555' }}>{label}</span>
                      <div className="flex items-baseline gap-0.5">
                        {prefix && <span className="text-sm font-bold" style={{ color: '#3a3a3a' }}>{prefix}</span>}
                        <input type="text" value={details.ads_performance[key]}
                          onChange={e => setAds(key, e.target.value)}
                          className="bg-transparent text-2xl font-bold focus:outline-none w-full placeholder-[#2e2e2e]"
                          style={{ color: '#ECECEC' }} placeholder="—" />
                      </div>
                    </div>
                  ))}
                </div>
              </Block>
              <Block title="Notes">
                <AutoTextarea value={details.ad_performance_notes}
                  onChange={e => setField('ad_performance_notes', e.target.value)}
                  className={ta} style={{ minHeight: 120 }}
                  placeholder="Observations, trends, what's working…" />
              </Block>
            </>)}

            {/* ── SOCIAL ──────────────────────────────────────────────────── */}
            {activeTab === 'Social' && (
              <Block title="Platforms">
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #252525' }}>
                  {SOCIAL_LIST.map(({ key, label, bg, color, abbr }, i) => (
                    <div key={key} className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                      style={{ borderTop: i === 0 ? 'none' : '1px solid #252525', background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#202020')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                        style={{ background: bg, color }}>
                        {abbr}
                      </div>
                      <span className="text-sm font-medium w-24 flex-shrink-0" style={{ color: '#555' }}>{label}</span>
                      <input type="text" value={details.social_platforms[key]}
                        onChange={e => setSocial(key, e.target.value)}
                        className="bg-transparent text-sm focus:outline-none flex-1 placeholder-[#2e2e2e]"
                        style={{ color: '#DEDEDE' }} placeholder="@handle or URL…" />
                      {details.social_platforms[key] && (
                        <button onClick={() => window.open(details.social_platforms[key], '_blank')}
                          style={{ color: '#3a3a3a' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ECECEC')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#3a3a3a')}
                        ><ExternalLink size={13} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </Block>
            )}

            {/* ── FUNNEL ──────────────────────────────────────────────────── */}
            {activeTab === 'Funnel' && (<>
              <Block title="Funnel Overview">
                <AutoTextarea value={details.funnel_notes}
                  onChange={e => setField('funnel_notes', e.target.value)}
                  className={ta} style={{ minHeight: 220 }}
                  placeholder="Describe the full funnel — landing pages, emails, ads, offers, upsells, retargeting…" />
              </Block>
              <Block title="Funnel Link">
                <div className="flex gap-3">
                  <input type="url" value={details.funnel_url}
                    onChange={e => setField('funnel_url', e.target.value)}
                    className={inp} placeholder="https://…" />
                  <OpenBtn href={details.funnel_url} label="Open" />
                </div>
              </Block>
            </>)}

            {/* ── SCRIPTS ─────────────────────────────────────────────────── */}
            {activeTab === 'Scripts' && (
              <Block
                title={`Scripts${details.scripted_ads.length > 0 ? ` · ${details.scripted_ads.length}` : ''}`}
                action={
                  <button onClick={addScript}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                    style={{ background: '#ECECEC', color: '#111' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fff')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#ECECEC')}
                  ><Plus size={14} /> New Script</button>
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
                      <div key={script.id} className="rounded-2xl p-6 space-y-4" style={{ background: '#202020', border: '1px solid #2a2a2a' }}>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold w-5 flex-shrink-0" style={{ color: '#3a3a3a' }}>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <input type="text" value={script.title}
                            onChange={e => patchScript(script.id, { title: e.target.value })}
                            className="bg-transparent text-sm font-semibold focus:outline-none flex-1 placeholder-[#2e2e2e] border-b border-transparent focus:border-[#2e2e2e] pb-0.5 transition-colors"
                            style={{ color: '#ECECEC' }} placeholder="Script title…" />
                          <button onClick={() => removeScript(script.id)}
                            className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
                            style={{ color: '#3a3a3a' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#3a3a3a')}
                          ><Trash2 size={14} /></button>
                        </div>
                        <AutoTextarea value={script.content}
                          onChange={e => patchScript(script.id, { content: e.target.value })}
                          className={ta} style={{ minHeight: 160 }}
                          placeholder="Write the full ad script here…" />
                      </div>
                    ))}
                  </div>
                )}
              </Block>
            )}

            {/* ── NOTES ───────────────────────────────────────────────────── */}
            {activeTab === 'Notes' && (
              <Block title="Internal Notes">
                <AutoTextarea value={details.notes}
                  onChange={e => setField('notes', e.target.value)}
                  className={ta} style={{ minHeight: 340 }}
                  placeholder="Meetings, feedback, action items, reminders…" />
              </Block>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Block({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#555' }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function OpenBtn({ href, label }: { href: string; label: string }) {
  return (
    <button
      onClick={() => href && window.open(href, '_blank')}
      disabled={!href}
      className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
      style={{ background: '#202020', border: '1px solid #2a2a2a', color: '#777' }}
      onMouseEnter={e => { if (href) e.currentTarget.style.color = '#ECECEC'; }}
      onMouseLeave={e => { e.currentTarget.style.color = '#777'; }}
    >
      <ExternalLink size={13} /> {label}
    </button>
  );
}

export default ClientPanel;
