import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ExternalLink, Plus, Trash2, Loader2,
  BarChart2, Share2, GitBranch, FileText, StickyNote, LayoutDashboard, Camera,
  Receipt, DollarSign,
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
interface BillingInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  service: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  date_sent: string;
  date_paid: string;
  notes: string;
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
  contact_email: string;
  client_since: string;
}

const EMPTY_ADS: AdsPerformance = { roas: '', spend: '', impressions: '', ctr: '', conversions: '', revenue: '' };
const EMPTY_SOCIAL: SocialPlatforms = { instagram: '', tiktok: '', youtube: '', twitter: '', linkedin: '', facebook: '' };
const DEFAULT_DETAILS: ClientDetails = {
  ads_performance: EMPTY_ADS, social_platforms: EMPTY_SOCIAL,
  strategy_overview: '', google_drive_url: '',
  funnel_notes: '', funnel_url: '',
  scripted_ads: [], notes: '', ad_performance_notes: '',
  contact_email: '', client_since: new Date().toISOString().slice(0, 10),
};

export interface ClientPanelProps {
  client: { id: string; name: string; photoUrl?: string; service?: string; status?: string; paymentStatus?: string; amount?: number } | null;
  storagePrefix: string;
  onClose: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

const TABS = [
  { id: 'Overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'Billing',  label: 'Billing',  Icon: Receipt },
  { id: 'Ads',      label: 'Ads',      Icon: BarChart2 },
  { id: 'Social',   label: 'Social',   Icon: Share2 },
  { id: 'Funnel',   label: 'Funnel',   Icon: GitBranch },
  { id: 'Scripts',  label: 'Scripts',  Icon: FileText },
  { id: 'Notes',    label: 'Notes',    Icon: StickyNote },
] as const;
type Tab = typeof TABS[number]['id'];

const INVOICE_STATUSES: BillingInvoice['status'][] = ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];
const invoiceStatusColors: Record<string, string> = {
  Draft: '#9B9B9B', Sent: '#60a5fa', Paid: '#4ade80', Overdue: '#f97316', Cancelled: '#ef4444',
};

// SVG icons for each platform
const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/>
  </svg>
);
const TikTokIcon = () => (
  <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor">
    <path d="M12.5 0C12.5 2.5 14.5 4 16 4.2V7.2C14.5 7.2 13 6.5 12.5 6V12.5C12.5 16 9.5 18 6.5 17.5C3.5 17 1 14.5 1.5 11.5C2 8.5 5 7 7 7.5V10.8C6 10.5 4.5 11 4.2 12.5C3.9 14 5 15.2 6.5 15.2C8 15.2 9.2 14 9.2 12.3V0H12.5Z"/>
  </svg>
);
const YouTubeIcon = () => (
  <svg width="20" height="16" viewBox="0 0 24 18" fill="currentColor">
    <path d="M23.5 3.5C23.2 2.2 22.2 1.2 21 .9 19.2.4 12 .4 12 .4S4.8.4 3 .9C1.8 1.2.8 2.2.5 3.5.1 5.3.1 9 .1 9s0 3.7.4 5.5c.3 1.3 1.3 2.3 2.5 2.6C4.8 17.6 12 17.6 12 17.6s7.2 0 9-0.5c1.2-.3 2.2-1.3 2.5-2.6.4-1.8.4-5.5.4-5.5s0-3.7-.4-5.5zM9.6 12.8V5.2L15.8 9l-6.2 3.8z"/>
  </svg>
);
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const LinkedInIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);
const FacebookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const GoogleDriveIcon = () => (
  <svg width="16" height="14" viewBox="0 0 87.3 78" fill="currentColor">
    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L29 52.2H0c0 1.55.4 3.1 1.2 4.5z"/>
    <path d="M43.65 25.15L28.4 0c-1.35.8-2.5 1.9-3.3 3.3L1.2 43.7C.4 45.1 0 46.65 0 48.2h29z"/>
    <path d="M58.3 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 43.7c.8-1.4 1.2-2.95 1.2-4.5H58.3L43.65 62.5z"/>
    <path d="M43.65 25.15L58.9 0H28.4l15.25 25.15z" opacity=".5"/>
    <path d="M58.3 48.2h29L72.05 23.45c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25.15 58.3 48.2z"/>
    <path d="M29 52.2L14.75 76.8h57.5L58.3 52.2z" opacity=".5"/>
  </svg>
);

const SOCIAL_LIST: { key: keyof SocialPlatforms; label: string; color: string; icon: React.FC }[] = [
  { key: 'instagram', label: 'Instagram', color: '#E1306C', icon: InstagramIcon },
  { key: 'tiktok',    label: 'TikTok',    color: '#ECECEC', icon: TikTokIcon },
  { key: 'youtube',   label: 'YouTube',   color: '#FF4444', icon: YouTubeIcon },
  { key: 'twitter',   label: 'Twitter/X', color: '#ECECEC', icon: XIcon },
  { key: 'linkedin',  label: 'LinkedIn',  color: '#0A66C2', icon: LinkedInIcon },
  { key: 'facebook',  label: 'Facebook',  color: '#1877F2', icon: FacebookIcon },
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
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const invoiceDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
            contact_email:        data.contact_email        ?? '',
            client_since:         data.client_since         ?? new Date().toISOString().slice(0, 10),
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

  // ─── Billing History ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!client || !supabase) return;
    let cancelled = false;
    setInvoicesLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('billing_history')
        .select('*')
        .eq('client_id', client.id)
        .eq('user_id', storagePrefix)
        .order('date_sent', { ascending: false });
      if (cancelled) return;
      if (!error && data) {
        setInvoices(data.map((r: any) => ({
          id: r.id,
          invoice_number: r.invoice_number ?? '',
          amount: r.amount ?? 0,
          service: r.service ?? '',
          status: r.status ?? 'Draft',
          date_sent: r.date_sent ?? '',
          date_paid: r.date_paid ?? '',
          notes: r.notes ?? '',
        })));
      }
      setInvoicesLoading(false);
    })();
    return () => { cancelled = true; };
  }, [client?.id, storagePrefix]);

  const addInvoice = useCallback(async () => {
    if (!supabase || !client) return;
    const inv: BillingInvoice = {
      id: crypto.randomUUID(),
      invoice_number: `INV-${String(invoices.length + 1).padStart(3, '0')}`,
      amount: client.amount ?? 0,
      service: client.service ?? '',
      status: 'Draft',
      date_sent: '',
      date_paid: '',
      notes: '',
    };
    setInvoices(prev => [inv, ...prev]);
    await supabase.from('billing_history').insert({
      ...inv, client_id: client.id, user_id: storagePrefix,
    });
  }, [client, storagePrefix, invoices.length]);

  const updateInvoice = useCallback((id: string, patch: Partial<BillingInvoice>) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...patch } : inv));
    // Debounce the save
    if (invoiceDebounceRef.current[id]) clearTimeout(invoiceDebounceRef.current[id]);
    invoiceDebounceRef.current[id] = setTimeout(async () => {
      if (!supabase) return;
      const dbPatch: Record<string, any> = {};
      if ('invoice_number' in patch) dbPatch.invoice_number = patch.invoice_number;
      if ('amount' in patch) dbPatch.amount = patch.amount;
      if ('service' in patch) dbPatch.service = patch.service;
      if ('status' in patch) dbPatch.status = patch.status;
      if ('date_sent' in patch) dbPatch.date_sent = patch.date_sent;
      if ('date_paid' in patch) dbPatch.date_paid = patch.date_paid;
      if ('notes' in patch) dbPatch.notes = patch.notes;
      await supabase.from('billing_history').update(dbPatch).eq('id', id);
    }, 600);
  }, []);

  const deleteInvoice = useCallback(async (id: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    if (supabase) await supabase.from('billing_history').delete().eq('id', id);
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    Object.values(invoiceDebounceRef.current).forEach(t => clearTimeout(t));
  }, []);

  if (!client) return null;

  // Shared field styles — slightly darker than card bg (#1c1c1c)
  const ta = 'w-full resize-none focus:outline-none bg-[#161616] rounded-xl text-[#DEDEDE] text-sm leading-relaxed p-4 placeholder-[#3a3a3a] focus:ring-1 focus:ring-[#333] transition-all';
  const inp = 'flex-1 focus:outline-none bg-[#161616] rounded-xl text-[#DEDEDE] text-sm px-4 py-3 placeholder-[#3a3a3a] focus:ring-1 focus:ring-[#333] transition-all';

  const card = { background: '#1c1c1c', borderRadius: 20 };

  return (
    <div className="flex w-full h-full overflow-hidden gap-6" style={{ background: '#131313', borderRadius: 20 }}>

      {/* ── LEFT CARD ─────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col flex-shrink-0 overflow-hidden"
        style={{ width: 260, ...card }}
      >
        {/* Photo */}
        <div
          className="relative flex-shrink-0 cursor-pointer group"
          style={{ height: 240, borderRadius: '20px 20px 0 0', overflow: 'hidden' }}
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

        {/* Name + Contact Info */}
        <div className="px-5 pt-4 pb-4 border-b" style={{ borderColor: '#222' }}>
          <p
            className="text-center text-xl font-bold leading-tight"
            style={{ color: '#ECECEC', fontFamily: "'Georgia', 'Times New Roman', serif", fontStyle: 'italic' }}
          >
            {client.name || 'Client Name'}
          </p>

          {/* Info rows */}
          <div className="mt-4 space-y-0">
            <CardRow label="Contact">
              <input type="email" value={details.contact_email}
                onChange={e => setField('contact_email', e.target.value)}
                className="text-xs text-right bg-transparent focus:outline-none w-full truncate"
                style={{ color: '#ECECEC' }} placeholder="email@example.com" />
            </CardRow>
            <CardRow label="Client since">
              <input type="date" value={details.client_since}
                onChange={e => setField('client_since', e.target.value)}
                className="text-xs text-right bg-transparent focus:outline-none w-full"
                style={{ color: '#ECECEC', colorScheme: 'dark' }} />
            </CardRow>
            <CardRow label="Status">
              <CardStatusSelect
                value={(client as any).status ?? 'Happy'}
                onChange={(v) => {
                  if (supabase && client) {
                    supabase.from('clients').update({ status: v }).eq('id', client.id).eq('user_id', storagePrefix);
                  }
                }}
              />
            </CardRow>
            <CardRow label="Payment">
              <CardPaymentSelect
                value={client.paymentStatus ?? 'Pending'}
                onChange={(v) => {
                  if (supabase && client) {
                    supabase.from('clients').update({ payment_status: v }).eq('id', client.id).eq('user_id', storagePrefix);
                  }
                }}
              />
            </CardRow>
            <CardRow label="Amount">
              <div className="flex items-center justify-end gap-0.5">
                <span className="text-xs" style={{ color: '#555' }}>$</span>
                <span className="text-xs font-semibold" style={{ color: '#ECECEC' }}>
                  {(client.amount ?? 0).toLocaleString()}
                </span>
              </div>
            </CardRow>
            {/* Social + Drive icons */}
            <div className="flex items-center justify-center gap-2 pt-3 pb-1">
              <SocialIconBtn href={details.social_platforms.instagram} icon={<InstagramIcon />} color="#E1306C" />
              <SocialIconBtn href={details.social_platforms.twitter} icon={<XIcon />} color="#ECECEC" />
              <SocialIconBtn href={details.social_platforms.linkedin} icon={<LinkedInIcon />} color="#0A66C2" />
              <SocialIconBtn href={details.social_platforms.youtube} icon={<YouTubeIcon />} color="#FF4444" />
              <SocialIconBtn href={details.google_drive_url} icon={<GoogleDriveIcon />} color="#4285F4" />
            </div>
          </div>

          {/* Save status */}
          {saveStatus !== 'idle' && (
            <p className={`text-center text-xs mt-3 ${saveStatus === 'saving' ? 'text-[#555]' : 'text-emerald-500'}`}>
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

      </div>

      {/* ── RIGHT CONTENT ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-6 pr-6">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2.5" style={{ color: '#444' }}>
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading workspace…</span>
          </div>
        ) : (
          <div className="space-y-5">

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

            {/* ── BILLING ───────────────────────────────────────────────── */}
            {activeTab === 'Billing' && (
              <Block
                title={`Billing History${invoices.length > 0 ? ` · ${invoices.length}` : ''}`}
                action={
                  <button onClick={addInvoice}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                    style={{ background: '#ECECEC', color: '#111' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fff')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#ECECEC')}
                  ><Plus size={14} /> New Invoice</button>
                }
              >
                {invoicesLoading ? (
                  <div className="flex items-center justify-center py-12 gap-2" style={{ color: '#444' }}>
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Loading invoices…</span>
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: '#333' }}>
                    <Receipt size={32} strokeWidth={1.5} />
                    <p className="text-sm font-medium mt-1" style={{ color: '#444' }}>No invoices yet</p>
                    <p className="text-xs">Click "New Invoice" to create your first invoice.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl overflow-hidden" style={{ background: '#161616' }}>
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_100px_120px_100px_100px_100px_40px] gap-2 px-5 py-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#444', borderBottom: '1px solid #222' }}>
                      <span>Invoice #</span>
                      <span>Amount</span>
                      <span>Service</span>
                      <span>Status</span>
                      <span>Date Sent</span>
                      <span>Date Paid</span>
                      <span></span>
                    </div>
                    {/* Rows */}
                    {invoices.map(inv => (
                      <div key={inv.id} className="grid grid-cols-[1fr_100px_120px_100px_100px_100px_40px] gap-2 px-5 py-3 items-center transition-colors"
                        style={{ borderBottom: '1px solid #222' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <input
                          value={inv.invoice_number}
                          onChange={e => updateInvoice(inv.id, { invoice_number: e.target.value })}
                          className="bg-transparent text-xs font-medium text-[#ECECEC] focus:outline-none w-full placeholder-[#333]"
                          placeholder="INV-001"
                        />
                        <div className="flex items-center gap-0.5">
                          <span className="text-[10px]" style={{ color: '#555' }}>$</span>
                          <input
                            type="text"
                            value={inv.amount ? inv.amount.toLocaleString() : ''}
                            onChange={e => {
                              const raw = e.target.value.replace(/[^0-9.]/g, '');
                              updateInvoice(inv.id, { amount: parseFloat(raw) || 0 });
                            }}
                            className="bg-transparent text-xs font-medium text-[#ECECEC] focus:outline-none w-full placeholder-[#333]"
                            placeholder="0"
                          />
                        </div>
                        <input
                          value={inv.service}
                          onChange={e => updateInvoice(inv.id, { service: e.target.value })}
                          className="bg-transparent text-xs text-[#ECECEC] focus:outline-none w-full placeholder-[#333]"
                          placeholder="Service…"
                        />
                        <InvoiceStatusSelect
                          value={inv.status}
                          onChange={v => updateInvoice(inv.id, { status: v })}
                        />
                        <input
                          type="date" value={inv.date_sent}
                          onChange={e => updateInvoice(inv.id, { date_sent: e.target.value })}
                          className="bg-transparent text-[10px] text-[#ECECEC] focus:outline-none w-full"
                          style={{ colorScheme: 'dark' }}
                        />
                        <input
                          type="date" value={inv.date_paid}
                          onChange={e => updateInvoice(inv.id, { date_paid: e.target.value })}
                          className="bg-transparent text-[10px] text-[#ECECEC] focus:outline-none w-full"
                          style={{ colorScheme: 'dark' }}
                        />
                        <button
                          onClick={() => deleteInvoice(inv.id)}
                          className="p-1 rounded-lg transition-colors flex-shrink-0"
                          style={{ color: '#333' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#333')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Block>
            )}

            {/* ── ADS ─────────────────────────────────────────────────────── */}
            {activeTab === 'Ads' && (<>
              <Block title="Performance Metrics">
                <div className="grid grid-cols-3 gap-3">
                  {ADS_METRICS.map(({ key, label, prefix }) => (
                    <div key={key} className="rounded-2xl p-5 flex flex-col gap-2" style={{ background: '#161616' }}>
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
                <div className="rounded-2xl overflow-hidden" style={{ background: '#161616' }}>
                  {SOCIAL_LIST.map(({ key, label, color, icon: Icon }, i) => (
                    <div key={key} className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                      style={{ borderTop: i === 0 ? 'none' : '1px solid #222', background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#202020')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="w-7 h-7 flex items-center justify-center flex-shrink-0" style={{ color }}>
                        <Icon />
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
                      <div key={script.id} className="rounded-2xl p-6 space-y-4" style={{ background: '#161616' }}>
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
    <section className="p-6 space-y-4" style={{ background: '#1c1c1c', borderRadius: 20 }}>
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
      style={{ background: '#161616', color: '#777' }}
      onMouseEnter={e => { if (href) e.currentTarget.style.color = '#ECECEC'; }}
      onMouseLeave={e => { e.currentTarget.style.color = '#777'; }}
    >
      <ExternalLink size={13} /> {label}
    </button>
  );
}

function CardRow({ label, children, icon, iconColor, href }: {
  label: string; children: React.ReactNode; icon?: React.ReactNode; iconColor?: string; href?: string;
}) {
  const hasLink = !!href?.trim();
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #222' }}>
      <div className="flex items-center gap-2 flex-shrink-0">
        {icon ? (
          <button
            onClick={() => {
              if (!hasLink) return;
              const url = href!.startsWith('http') ? href! : `https://${href}`;
              window.open(url, '_blank');
            }}
            className="flex items-center transition-opacity"
            style={{ color: hasLink ? iconColor ?? '#555' : '#333', cursor: hasLink ? 'pointer' : 'default', opacity: hasLink ? 1 : 0.5 }}
            title={hasLink ? `Open ${label}` : `No ${label} link yet`}
          >
            {icon}
          </button>
        ) : null}
        <span className="text-xs font-medium" style={{ color: '#555' }}>{label}</span>
      </div>
      <div className="flex-1 min-w-0 ml-3">{children}</div>
    </div>
  );
}

function CardStatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const statuses = ['Happy', 'Moderate', 'Frustrated'] as const;
  const colors: Record<string, string> = {
    Happy: '#4ade80', Moderate: '#9B9B9B', Frustrated: '#f87171',
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative flex justify-end">
      <button onClick={() => setOpen(o => !o)}
        className="text-xs font-medium flex items-center gap-1 cursor-pointer"
        style={{ color: colors[value] ?? '#ECECEC' }}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colors[value] ?? '#ECECEC' }} />
        {value}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 py-1 min-w-[120px] shadow-xl"
          style={{ background: '#222', borderRadius: 10 }}>
          {statuses.map(s => (
            <button key={s} onClick={() => { onChange(s); setOpen(false); }}
              className={`flex items-center gap-2 w-full text-left text-xs px-3 py-2 transition-colors hover:bg-[#2a2a2a] ${s === value ? 'font-semibold' : ''}`}
              style={{ color: colors[s] }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colors[s] }} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SocialIconBtn({ href, icon, color }: { href: string; icon: React.ReactNode; color: string }) {
  const hasLink = !!href.trim();
  return (
    <button
      onClick={() => {
        if (hasLink) {
          const url = href.startsWith('http') ? href : `https://${href}`;
          window.open(url, '_blank');
        }
      }}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
      style={{
        color: hasLink ? color : '#333',
        background: hasLink ? `${color}15` : 'transparent',
        cursor: hasLink ? 'pointer' : 'default',
        opacity: hasLink ? 1 : 0.4,
      }}
      title={hasLink ? href : 'No link added — go to Social tab'}
    >
      {icon}
    </button>
  );
}

function CardPaymentSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const statuses = ['Missing Invoice', 'Pending', 'Paid', 'Late'] as const;
  const colors: Record<string, string> = {
    'Missing Invoice': '#f87171', Pending: '#9B9B9B', Paid: '#4ade80', Late: '#f97316',
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative flex justify-end">
      <button onClick={() => setOpen(o => !o)}
        className="text-xs font-medium flex items-center gap-1 cursor-pointer"
        style={{ color: colors[value] ?? '#ECECEC' }}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colors[value] ?? '#ECECEC' }} />
        {value}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 py-1 min-w-[140px] shadow-xl"
          style={{ background: '#222', borderRadius: 10 }}>
          {statuses.map(s => (
            <button key={s} onClick={() => { onChange(s); setOpen(false); }}
              className={`flex items-center gap-2 w-full text-left text-xs px-3 py-2 transition-colors hover:bg-[#2a2a2a] ${s === value ? 'font-semibold' : ''}`}
              style={{ color: colors[s] }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colors[s] }} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InvoiceStatusSelect({ value, onChange }: { value: BillingInvoice['status']; onChange: (v: BillingInvoice['status']) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="text-xs font-medium flex items-center gap-1.5 cursor-pointer"
        style={{ color: invoiceStatusColors[value] ?? '#ECECEC' }}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: invoiceStatusColors[value] ?? '#ECECEC' }} />
        {value}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 py-1 min-w-[120px] shadow-xl"
          style={{ background: '#222', borderRadius: 10 }}>
          {INVOICE_STATUSES.map(s => (
            <button key={s} onClick={() => { onChange(s); setOpen(false); }}
              className={`flex items-center gap-2 w-full text-left text-xs px-3 py-2 transition-colors hover:bg-[#2a2a2a] ${s === value ? 'font-semibold' : ''}`}
              style={{ color: invoiceStatusColors[s] }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: invoiceStatusColors[s] }} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ClientPanel;
