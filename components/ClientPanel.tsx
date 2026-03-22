import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ExternalLink, Plus, Trash2, Loader2,
  BarChart2, Share2, GitBranch, FileText, StickyNote, LayoutDashboard, Camera,
  Receipt, DollarSign, Pen, Image as ImageIcon, Calendar, Brain, ChevronDown, ChevronRight, X, Check,
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
  status: 'Draft' | 'Scheduled' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  date_due: string;
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
  twitter_banner_url: string;
  twitter_handle: string;
  twitter_bio: string;
  twitter_followers: number;
  twitter_following: number;
}

const EMPTY_ADS: AdsPerformance = { roas: '', spend: '', impressions: '', ctr: '', conversions: '', revenue: '' };
const EMPTY_SOCIAL: SocialPlatforms = { instagram: '', tiktok: '', youtube: '', twitter: '', linkedin: '', facebook: '' };
const DEFAULT_DETAILS: ClientDetails = {
  ads_performance: EMPTY_ADS, social_platforms: EMPTY_SOCIAL,
  strategy_overview: '', google_drive_url: '',
  funnel_notes: '', funnel_url: '',
  scripted_ads: [], notes: '', ad_performance_notes: '',
  twitter_banner_url: '', twitter_handle: '', twitter_bio: '',
  twitter_followers: 0, twitter_following: 0,
  contact_email: '', client_since: new Date().toISOString().slice(0, 10),
};

export interface ClientPanelProps {
  client: { id: string; name: string; photoUrl?: string; service?: string; status?: string; paymentStatus?: string; amount?: number } | null;
  storagePrefix: string;
  onClose: () => void;
  onClientUpdate?: (id: string, patch: Record<string, any>) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

const TABS = [
  { id: 'Overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'Billing',  label: 'Billing',  Icon: Receipt },
  { id: 'Content',  label: 'Content',  Icon: Pen },
  { id: 'Ads',      label: 'Ads',      Icon: BarChart2 },
  { id: 'Social',   label: 'Social',   Icon: Share2 },
  { id: 'Funnel',   label: 'Funnel',   Icon: GitBranch },
  { id: 'Scripts',  label: 'Scripts',  Icon: FileText },
  { id: 'Notes',    label: 'Notes',    Icon: StickyNote },
  { id: 'Memory',   label: 'Memory',   Icon: Brain },
] as const;
type Tab = typeof TABS[number]['id'];

const INVOICE_STATUSES: BillingInvoice['status'][] = ['Draft', 'Scheduled', 'Sent', 'Paid', 'Overdue', 'Cancelled'];
const invoiceStatusColors: Record<string, string> = {
  Draft: '#9B9B9B', Scheduled: '#a78bfa', Sent: '#60a5fa', Paid: '#4ade80', Overdue: '#f97316', Cancelled: '#ef4444',
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

const ClientPanel: React.FC<ClientPanelProps> = ({ client, storagePrefix, onClose, onClientUpdate }) => {
  // Remember last active tab per client
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (!client?.id) return 'Overview';
    const saved = localStorage.getItem(`aureum_tab_${client.id}`);
    return (saved as Tab) || 'Overview';
  });
  const [xTab, setXTab] = useState<'posts'|'replies'|'highlights'|'articles'|'media'|'likes'>('posts');
  const [details, setDetails] = useState<ClientDetails>(DEFAULT_DETAILS);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [localPhoto, setLocalPhoto] = useState<string | undefined>(client?.photoUrl);
  const [localStatus, setLocalStatus] = useState<string>((client as any)?.status ?? 'Happy');
  const [localPayment, setLocalPayment] = useState<string>(client?.paymentStatus ?? 'Pending');
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Tweets (X content)
  interface Tweet { id: string; text: string; post_date: string; image_url: string; likes: number; retweets: number; replies: number; views: number; }
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [tweetsLoading, setTweetsLoading] = useState(false);
  const tweetDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const tweetImageRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const invoiceDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Client Memory (for AI) ──
  interface MemoryItem { id: string; content: string; category: string; }
  const [clientMemories, setClientMemories] = useState<MemoryItem[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [memSavedId, setMemSavedId] = useState<string | null>(null);
  const memoryDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const MEMORY_CATEGORIES = [
    { id: 'tone', label: 'Tone & Voice', placeholder: 'e.g. "This client prefers a professional, authoritative tone."' },
    { id: 'audience', label: 'Audience', placeholder: 'e.g. "Their audience is B2B SaaS founders, 30-50 years old."' },
    { id: 'rules', label: 'Content Rules', placeholder: 'e.g. "Never use emojis. Always include a CTA."' },
    { id: 'examples', label: 'Examples', placeholder: 'Paste content this client loved — the AI will learn from it.' },
    { id: 'general', label: 'Other Context', placeholder: 'Anything else the AI should know about this client.' },
  ];

  useEffect(() => { setLocalPhoto(client?.photoUrl); }, [client?.photoUrl]);
  useEffect(() => { setLocalStatus((client as any)?.status ?? 'Happy'); }, [(client as any)?.status]);
  useEffect(() => { setLocalPayment(client?.paymentStatus ?? 'Pending'); }, [client?.paymentStatus]);

  // Save active tab per client
  useEffect(() => {
    if (client?.id) localStorage.setItem(`aureum_tab_${client.id}`, activeTab);
  }, [activeTab, client?.id]);

  // ─── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    setLoading(true);
    setDetails(DEFAULT_DETAILS);
    // Restore saved tab or default to Overview
    const saved = localStorage.getItem(`aureum_tab_${client.id}`);
    setActiveTab((saved as Tab) || 'Overview');

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
            twitter_banner_url:   data.twitter_banner_url   ?? '',
            twitter_handle:       data.twitter_handle       ?? '',
            twitter_bio:          data.twitter_bio          ?? '',
            twitter_followers:    data.twitter_followers    ?? 0,
            twitter_following:    data.twitter_following    ?? 0,
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
          date_due: r.date_due ?? '',
          date_sent: r.date_sent ?? '',
          date_paid: r.date_paid ?? '',
          notes: r.notes ?? '',
        })));
      }
      setInvoicesLoading(false);
    })();
    return () => { cancelled = true; };
  }, [client?.id, storagePrefix]);

  // ── Load client memories ──
  useEffect(() => {
    if (!client || !supabase) return;
    setMemoriesLoading(true);
    supabase
      .from('ai_memory')
      .select('id, content, category')
      .eq('user_id', storagePrefix)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setClientMemories(data ?? []);
        setMemoriesLoading(false);
      });
  }, [client?.id, storagePrefix]);

  // ─── Load Tweets ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!client || !supabase) return;
    let cancelled = false;
    setTweetsLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('client_tweets')
        .select('*')
        .eq('client_id', client.id)
        .eq('user_id', storagePrefix)
        .order('post_date', { ascending: true });
      if (cancelled) return;
      if (!error && data) {
        setTweets(data.map((r: any) => ({
          id: r.id,
          text: r.text ?? '',
          post_date: r.post_date ?? '',
          image_url: r.image_url ?? '',
          likes: r.likes || Math.floor(Math.random() * 800) + 5,
          retweets: r.retweets || Math.floor(Math.random() * 120) + 1,
          replies: r.replies || Math.floor(Math.random() * 40) + 1,
          views: r.views || Math.floor(Math.random() * 50000) + 500,
        })));
      }
      setTweetsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [client?.id, storagePrefix]);

  const randEngagement = () => ({
    likes: Math.floor(Math.random() * 800) + 5,
    retweets: Math.floor(Math.random() * 120) + 1,
    replies: Math.floor(Math.random() * 40) + 1,
    views: Math.floor(Math.random() * 50000) + 500,
  });

  const addTweet = useCallback(async () => {
    if (!supabase || !client) return;
    const eng = randEngagement();
    const tw: Tweet = { id: crypto.randomUUID(), text: '', post_date: '', image_url: '', ...eng };
    setTweets(prev => [tw, ...prev]);
    await supabase.from('client_tweets').insert({ ...tw, client_id: client.id, user_id: storagePrefix });
  }, [client, storagePrefix]);

  const updateTweet = useCallback((id: string, patch: Partial<Tweet>) => {
    setTweets(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    // Debounced save
    if (tweetDebounceRef.current[id]) clearTimeout(tweetDebounceRef.current[id]);
    tweetDebounceRef.current[id] = setTimeout(async () => {
      if (!supabase) return;
      const dbPatch: any = {};
      if ('text' in patch) dbPatch.text = patch.text;
      if ('post_date' in patch) dbPatch.post_date = patch.post_date;
      if ('image_url' in patch) dbPatch.image_url = patch.image_url;
      if ('likes' in patch) dbPatch.likes = patch.likes;
      if ('retweets' in patch) dbPatch.retweets = patch.retweets;
      if ('replies' in patch) dbPatch.replies = patch.replies;
      if ('views' in patch) dbPatch.views = patch.views;
      await supabase.from('client_tweets').update(dbPatch).eq('id', id);
    }, 600);
  }, []);

  const deleteTweet = useCallback(async (id: string) => {
    setTweets(prev => prev.filter(t => t.id !== id));
    if (supabase) await supabase.from('client_tweets').delete().eq('id', id);
  }, []);

  const uploadTweetImage = useCallback(async (tweetId: string, file: File) => {
    if (!supabase) return;
    try {
      // Compress image first
      const compressed = await new Promise<Blob>((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const img = new Image();
        img.onload = () => {
          const max = 800;
          let w = img.width, h = img.height;
          if (w > max || h > max) { const r = Math.min(max / w, max / h); w *= r; h *= r; }
          canvas.width = w; canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(b => resolve(b || file), 'image/jpeg', 0.85);
        };
        img.src = URL.createObjectURL(file);
      });

      const path = `tweets/${storagePrefix}/${tweetId}.jpg`;
      // Try to remove old file first (ignore error)
      await supabase.storage.from('funnel-media').remove([path]);
      const { error } = await supabase.storage.from('funnel-media').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
      if (error) {
        console.error('Tweet image upload error:', error);
        // Fallback: use base64 data URL
        const reader = new FileReader();
        reader.onload = () => { updateTweet(tweetId, { image_url: reader.result as string }); };
        reader.readAsDataURL(compressed as Blob);
        return;
      }
      const { data: urlData } = supabase.storage.from('funnel-media').getPublicUrl(path);
      if (urlData?.publicUrl) {
        updateTweet(tweetId, { image_url: urlData.publicUrl + '?t=' + Date.now() });
      }
    } catch (err) {
      console.error('Tweet image upload error:', err);
      // Final fallback: base64
      const reader = new FileReader();
      reader.onload = () => { updateTweet(tweetId, { image_url: reader.result as string }); };
      reader.readAsDataURL(file);
    }
  }, [updateTweet, storagePrefix]);

  const addInvoice = useCallback(async () => {
    if (!supabase || !client) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const inv: BillingInvoice = {
      id: crypto.randomUUID(),
      invoice_number: `INV-${String(invoices.length + 1).padStart(3, '0')}`,
      amount: 0,
      service: client.service ?? '',
      status: 'Draft',
      date_due: '',
      date_sent: todayStr,
      date_paid: '',
      notes: '',
    };
    setInvoices(prev => [inv, ...prev]);
    await supabase.from('billing_history').insert({
      ...inv, client_id: client.id, user_id: storagePrefix,
    });
  }, [client, storagePrefix, invoices.length]);

  const updateInvoice = useCallback((id: string, patch: Partial<BillingInvoice>) => {
    const todayStr = new Date().toISOString().split('T')[0];
    // Smart auto-fill: when marking Paid, auto-set date_paid; when Sent, auto-set date_sent
    const enriched = { ...patch };
    if (enriched.status === 'Paid') {
      const current = invoices.find(i => i.id === id);
      if (current && !current.date_paid) enriched.date_paid = todayStr;
    }
    if (enriched.status === 'Sent') {
      const current = invoices.find(i => i.id === id);
      if (current && !current.date_sent) enriched.date_sent = todayStr;
    }

    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...enriched } : inv));
    // Debounce the save
    if (invoiceDebounceRef.current[id]) clearTimeout(invoiceDebounceRef.current[id]);
    invoiceDebounceRef.current[id] = setTimeout(async () => {
      if (!supabase) return;
      const dbPatch: Record<string, any> = {};
      if ('invoice_number' in enriched) dbPatch.invoice_number = enriched.invoice_number;
      if ('amount' in enriched) dbPatch.amount = enriched.amount;
      if ('service' in enriched) dbPatch.service = enriched.service;
      if ('status' in enriched) dbPatch.status = enriched.status;
      if ('date_due' in enriched) dbPatch.date_due = enriched.date_due;
      if ('date_sent' in enriched) dbPatch.date_sent = enriched.date_sent;
      if ('date_paid' in enriched) dbPatch.date_paid = enriched.date_paid;
      if ('notes' in enriched) dbPatch.notes = enriched.notes;
      await supabase.from('billing_history').update(dbPatch).eq('id', id);
    }, 600);
  }, [invoices]);

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
    <div className="flex w-full h-full overflow-hidden gap-6 p-6" style={{ background: '#131313', borderRadius: 20 }}>

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
                value={localStatus}
                onChange={(v) => {

                  setLocalStatus(v);
                  if (client && onClientUpdate) {
                    onClientUpdate(client.id, { status: v });
                  }
                }}
              />
            </CardRow>
            <CardRow label="Payment">
              <CardPaymentSelect
                value={localPayment}
                onChange={(v) => {

                  setLocalPayment(v);
                  if (client && onClientUpdate) {
                    onClientUpdate(client.id, { paymentStatus: v });
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

          {/* Auto-save runs silently in background */}
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
      <div className="flex-1 overflow-hidden flex gap-6">
        {/* Main content area */}
        <div className="overflow-y-auto" style={{ flex: activeTab === 'Content' ? '3 1 0%' : '1 1 0%' }}>
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
                    <div className="grid grid-cols-[1fr_80px_1fr_85px_90px_90px_90px_70px_36px] gap-2 px-5 py-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#444', borderBottom: '1px solid #222' }}>
                      <span>Invoice #</span>
                      <span>Amount</span>
                      <span>Service</span>
                      <span>Status</span>
                      <span>Date Sent</span>
                      <span>Due Date</span>
                      <span>Date Paid</span>
                      <span>Speed</span>
                      <span></span>
                    </div>
                    {/* Rows */}
                    {invoices.map(inv => {
                      // Calculate payment speed
                      let speedLabel = '—';
                      let speedColor = '#444';
                      if (inv.date_sent && inv.date_paid) {
                        const sent = new Date(inv.date_sent);
                        const paid = new Date(inv.date_paid);
                        const diffDays = Math.floor((paid.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24));
                        if (diffDays <= 3) { speedLabel = 'Fast'; speedColor = '#34d399'; }
                        else if (diffDays <= 7) { speedLabel = 'Moderate'; speedColor = '#fbbf24'; }
                        else { speedLabel = 'Slow'; speedColor = '#f87171'; }
                      }
                      return (
                      <div key={inv.id} className="grid grid-cols-[1fr_80px_1fr_85px_90px_90px_90px_70px_36px] gap-2 px-5 py-3 items-center transition-colors"
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
                          <span className="text-[10px] text-emerald-500/60">$</span>
                          <input
                            type="text"
                            value={inv.amount ? inv.amount.toLocaleString() : ''}
                            onChange={e => {
                              const raw = e.target.value.replace(/[^0-9.]/g, '');
                              updateInvoice(inv.id, { amount: parseFloat(raw) || 0 });
                            }}
                            className="bg-transparent text-xs font-medium text-emerald-400 focus:outline-none w-full placeholder-[#333]"
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
                          type="date" value={inv.date_due}
                          onChange={e => updateInvoice(inv.id, { date_due: e.target.value })}
                          className="bg-transparent text-[10px] text-[#ECECEC] focus:outline-none w-full"
                          style={{ colorScheme: 'dark' }}
                        />
                        <input
                          type="date" value={inv.date_paid}
                          onChange={e => updateInvoice(inv.id, { date_paid: e.target.value })}
                          className="bg-transparent text-[10px] text-[#ECECEC] focus:outline-none w-full"
                          style={{ colorScheme: 'dark' }}
                        />
                        <span className="text-xs font-medium" style={{ color: speedColor }}>{speedLabel}</span>
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
                      );
                    })}
                  </div>
                )}
              </Block>
            )}

            {/* ── CONTENT ───────────────────────────────────────────────── */}
            {activeTab === 'Content' && (() => {
              const handle = details.social_platforms?.twitter
                ? (details.social_platforms.twitter.startsWith('@') ? details.social_platforms.twitter : `@${details.social_platforms.twitter.split('/').pop() || 'handle'}`)
                : '@handle';
              const displayName = client.name || 'Client';
              const avatar = localPhoto;
              const fmtNum = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1).replace(/\.0$/, '')}K` : String(n);
              const fmtDate = (d: string) => {
                if (!d) return '';
                const dt = new Date(d);
                return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              };

              // X/Twitter SVG icons for engagement bar
              const ReplyIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.25-.893 4.306-2.394 5.82l-4.999 5.03a.75.75 0 01-1.064-.003l-4.986-5.03A8.127 8.127 0 011.75 10zM12.122 4H9.756C6.442 4 3.75 6.69 3.75 10c0 1.8.73 3.45 1.947 4.68l4.31 4.348 4.298-4.325A6.134 6.134 0 0016.252 10c0-3.38-2.742-6-6.13-6z"/></svg>;
              const RetweetIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/></svg>;
              const LikeIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"/></svg>;
              const ViewIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8.75 21V3h2v18h-2zM18.75 21V8.5h2V21h-2zM13.75 21v-9h2v9h-2zM3.75 21v-4h2v4h-2z"/></svg>;
              const ShareIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"/></svg>;
              const VerifiedIcon = () => <svg viewBox="0 0 22 22" width="16" height="16" fill="#1d9bf0"><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.271.586.702 1.084 1.24 1.438.54.354 1.167.551 1.813.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.261.272 1.894.143.634-.131 1.218-.434 1.69-.88.445-.47.75-1.055.88-1.69.13-.634.085-1.29-.138-1.898.586-.272 1.084-.703 1.438-1.244.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>;

              const tHandle = details.twitter_handle || handle;
              const tBio = details.twitter_bio || '';
              const tFollowers = details.twitter_followers || 0;
              const tFollowing = details.twitter_following || 0;
              const tBanner = details.twitter_banner_url || '';

              const uploadBanner = () => {
                const inp = document.createElement('input');
                inp.type = 'file'; inp.accept = 'image/*';
                inp.onchange = async (ev: any) => {
                  const file = ev.target.files?.[0];
                  if (!file || !supabase) return;
                  try {
                    const path = `banners/${storagePrefix}/${client.id}.jpg`;
                    await supabase.storage.from('funnel-media').remove([path]);
                    const { error } = await supabase.storage.from('funnel-media').upload(path, file, { upsert: true, contentType: file.type });
                    if (error) {
                      console.error('Banner upload error:', error);
                      // Fallback to base64
                      const reader = new FileReader();
                      reader.onload = () => setField('twitter_banner_url', reader.result as string);
                      reader.readAsDataURL(file);
                      return;
                    }
                    const { data: urlData } = supabase.storage.from('funnel-media').getPublicUrl(path);
                    if (urlData?.publicUrl) setField('twitter_banner_url', urlData.publicUrl + '?t=' + Date.now());
                  } catch {
                    const reader = new FileReader();
                    reader.onload = () => setField('twitter_banner_url', reader.result as string);
                    reader.readAsDataURL(file);
                  }
                };
                inp.click();
              };

              // Extra Twitter SVG icons
              const BookmarkIcon = () => <svg viewBox="0 0 24 24" width="18.75" height="18.75" fill="currentColor"><path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"/></svg>;
              const MoreIcon = () => <svg viewBox="0 0 24 24" width="18.75" height="18.75" fill="currentColor"><path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg>;
              const CalendarSmIcon = () => <svg viewBox="0 0 24 24" width="18.75" height="18.75" fill="currentColor"><path d="M7 4V3h2v1h6V3h2v1h1.5C19.89 4 21 5.12 21 6.5v12c0 1.38-1.11 2.5-2.5 2.5h-13C4.12 21 3 19.88 3 18.5v-12C3 5.12 4.12 4 5.5 4H7zm0 2H5.5c-.27 0-.5.22-.5.5v12c0 .28.23.5.5.5h13c.28 0 .5-.22.5-.5v-12c0-.28-.22-.5-.5-.5H17v1h-2V6H9v1H7V6zm-1 4h12v2H6v-2z"/></svg>;

              return (
              <div className="rounded-2xl overflow-hidden" style={{ background: '#000', border: '1px solid #2f3336' }}>

                {/* ── Sticky top bar ── */}
                <div className="flex items-center gap-6 px-4 py-1 sticky top-0 z-20" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)', borderRadius: '16px 16px 0 0' }}>
                  <div>
                    <h2 className="text-[17px] font-extrabold leading-6" style={{ color: '#e7e9ea' }}>{displayName}</h2>
                    <span className="text-[13px] leading-4" style={{ color: '#71767b' }}>{tweets.length} post{tweets.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* ── Banner — click to change ── */}
                <div
                  onClick={uploadBanner}
                  className="relative cursor-pointer group/banner"
                  style={{
                    height: 200,
                    background: tBanner ? `url(${tBanner}) center/cover no-repeat` : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/banner:bg-black/40 transition-colors">
                    <Camera size={28} className="text-white opacity-0 group-hover/banner:opacity-80 transition-opacity" />
                  </div>
                </div>

                {/* ── Profile info ── */}
                <div className="px-4 relative z-10" style={{ marginTop: -67 }}>
                  {/* Avatar row */}
                  <div className="flex items-end justify-between mb-3">
                    {avatar ? (
                      <img src={avatar} alt="" className="rounded-full object-cover" style={{ width: 134, height: 134, border: '4px solid #000' }} />
                    ) : (
                      <div className="rounded-full flex items-center justify-center text-4xl font-bold" style={{ width: 134, height: 134, border: '4px solid #000', background: '#333', color: '#ECECEC' }}>
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button onClick={addTweet}
                      className="flex items-center gap-2 px-5 py-2 rounded-full text-[15px] font-bold transition-colors"
                      style={{ background: '#1d9bf0', color: '#fff', marginBottom: 12 }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1a8cd8')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#1d9bf0')}
                    ><Plus size={16} /> Post</button>
                  </div>

                  {/* Name + verified */}
                  <div className="flex items-center gap-0.5">
                    <span className="text-[20px] font-extrabold leading-6" style={{ color: '#e7e9ea' }}>{displayName}</span>
                    <VerifiedIcon />
                  </div>
                  {/* Handle (editable) */}
                  <input
                    value={tHandle}
                    onChange={e => setField('twitter_handle', e.target.value)}
                    className="bg-transparent text-[15px] focus:outline-none w-full leading-5 mt-0.5"
                    style={{ color: '#71767b' }}
                    placeholder="@handle"
                  />

                  {/* Bio (editable) */}
                  <textarea
                    value={tBio}
                    onChange={e => setField('twitter_bio', e.target.value)}
                    className="w-full bg-transparent text-[15px] leading-5 focus:outline-none resize-none mt-3 placeholder-[#3e4144]"
                    style={{ color: '#e7e9ea' }}
                    placeholder="Write a bio…"
                    rows={Math.max(1, tBio.split('\n').length)}
                  />

                  {/* Joined date row */}
                  <div className="flex items-center gap-1 mt-3" style={{ color: '#71767b' }}>
                    <CalendarSmIcon />
                    <span className="text-[15px]">Joined {details.client_since ? new Date(details.client_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'recently'}</span>
                  </div>

                  {/* Followers / Following (editable) */}
                  <div className="flex items-center gap-5 mt-3 mb-4">
                    <span className="text-[14px] flex items-center gap-1 cursor-pointer hover:underline">
                      <input
                        type="text"
                        value={tFollowing || ''}
                        onChange={e => setField('twitter_following', parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                        className="bg-transparent font-bold focus:outline-none w-[45px] text-right"
                        style={{ color: '#e7e9ea' }}
                        placeholder="0"
                      />
                      <span style={{ color: '#71767b' }}>Following</span>
                    </span>
                    <span className="text-[14px] flex items-center gap-1 cursor-pointer hover:underline">
                      <input
                        type="text"
                        value={tFollowers || ''}
                        onChange={e => setField('twitter_followers', parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                        className="bg-transparent font-bold focus:outline-none w-[55px] text-right"
                        style={{ color: '#e7e9ea' }}
                        placeholder="0"
                      />
                      <span style={{ color: '#71767b' }}>Followers</span>
                    </span>
                  </div>
                </div>

                {/* ── Tab bar ── */}
                <div className="flex" style={{ borderBottom: '1px solid #2f3336' }}>
                  {(['posts', 'replies', 'highlights', 'articles', 'media', 'likes'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setXTab(tab as any)}
                      className="flex-1 text-center py-3 text-[15px] font-bold transition-colors hover:bg-[rgba(231,233,234,0.1)]"
                      style={{
                        color: xTab === tab ? '#e7e9ea' : '#71767b',
                        borderBottom: xTab === tab ? '4px solid #1d9bf0' : '4px solid transparent',
                      }}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* ── Tweet Feed ── */}
                {xTab !== 'posts' ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-1 px-8" style={{ color: '#71767b' }}>
                    <span className="text-[31px] font-extrabold" style={{ color: '#e7e9ea' }}>Nothing to see here — yet</span>
                    <span className="text-[15px] mt-1">When {displayName} posts, it'll show up here.</span>
                  </div>
                ) : tweetsLoading ? (
                  <div className="flex items-center justify-center py-12 gap-2" style={{ color: '#444' }}>
                    <Loader2 size={20} className="animate-spin" style={{ color: '#1d9bf0' }} />
                  </div>
                ) : tweets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-8" style={{ color: '#71767b' }}>
                    <span className="text-[31px] font-extrabold" style={{ color: '#e7e9ea' }}>No posts yet</span>
                    <span className="text-[15px] mt-1">When you create posts, they'll show up here.</span>
                  </div>
                ) : (
                  <div>
                    {tweets.map(tw => (
                      <div key={tw.id} className="border-b transition-colors hover:bg-[rgba(231,233,234,0.03)]" style={{ borderColor: '#2f3336' }}>
                        <div className="flex gap-3 px-4 pt-3 pb-1">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            {avatar ? (
                              <img src={avatar} alt="" className="rounded-full object-cover" style={{ width: 40, height: 40 }} />
                            ) : (
                              <div className="rounded-full flex items-center justify-center text-sm font-bold" style={{ width: 40, height: 40, background: '#333', color: '#ECECEC' }}>
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Name row */}
                            <div className="flex items-center gap-1">
                              <span className="text-[15px] font-bold truncate" style={{ color: '#e7e9ea' }}>{displayName}</span>
                              <VerifiedIcon />
                              <span className="text-[15px] truncate" style={{ color: '#71767b' }}>{tHandle}</span>
                              <span className="text-[15px] flex-shrink-0" style={{ color: '#71767b' }}>·</span>
                              <span className="text-[15px] flex-shrink-0 hover:underline cursor-pointer" style={{ color: '#71767b' }}>{fmtDate(tw.post_date) || '—'}</span>
                              {/* Schedule picker (subtle) */}
                              <input
                                type="date"
                                value={tw.post_date}
                                onChange={e => updateTweet(tw.id, { post_date: e.target.value })}
                                className="bg-transparent focus:outline-none w-4 opacity-0 hover:opacity-60 cursor-pointer flex-shrink-0"
                                style={{ colorScheme: 'dark', fontSize: 10 }}
                                title="Set post date"
                              />
                              {tw.post_date && (() => {
                                const d = new Date(tw.post_date);
                                const now = new Date(); now.setHours(0,0,0,0);
                                const diff = Math.ceil((d.getTime() - now.getTime()) / (1000*60*60*24));
                                if (diff <= 0 && diff >= -1) return null;
                                const label = diff === 1 ? 'Tomorrow' : diff > 1 ? `In ${diff}d` : `${Math.abs(diff)}d ago`;
                                const color = diff < 0 ? '#f4212e' : '#1d9bf0';
                                return <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ color, background: diff < 0 ? 'rgba(244,33,46,0.1)' : 'rgba(29,155,240,0.1)' }}>{label}</span>;
                              })()}
                              <div className="flex-1" />
                              {/* More menu (delete) */}
                              <button
                                onClick={() => deleteTweet(tw.id)}
                                className="p-1.5 -mr-1.5 rounded-full transition-colors"
                                style={{ color: '#71767b' }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#1d9bf0'; e.currentTarget.style.background = 'rgba(29,155,240,0.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#71767b'; e.currentTarget.style.background = 'transparent'; }}
                              ><MoreIcon /></button>
                            </div>

                            {/* Tweet body */}
                            <textarea
                              value={tw.text}
                              onChange={e => updateTweet(tw.id, { text: e.target.value })}
                              className="w-full bg-transparent text-[15px] leading-5 focus:outline-none resize-none placeholder-[#536471] mt-0.5"
                              style={{ color: '#e7e9ea' }}
                              placeholder="What is happening?!"
                              rows={Math.max(1, tw.text.split('\n').length)}
                            />
                            {tw.text.length > 260 && (
                              <span className="text-[12px]" style={{ color: tw.text.length > 280 ? '#f4212e' : '#71767b' }}>
                                {tw.text.length}/280
                              </span>
                            )}

                            {/* Image */}
                            {tw.image_url && (
                              <div className="mt-3 relative overflow-hidden" style={{ borderRadius: 16, border: '1px solid #2f3336' }}>
                                <img src={tw.image_url} alt="" className="w-full" style={{ objectFit: 'contain', maxHeight: 510, background: '#000' }} />
                                <button
                                  onClick={() => updateTweet(tw.id, { image_url: '' })}
                                  className="absolute top-1.5 right-1.5 p-1.5 rounded-full transition-colors"
                                  style={{ background: 'rgba(15,20,25,0.75)', color: '#e7e9ea', backdropFilter: 'blur(4px)' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(15,20,25,0.9)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(15,20,25,0.75)')}
                                ><Trash2 size={14} /></button>
                              </div>
                            )}

                            {/* Engagement bar */}
                            <div className="flex items-center justify-between mt-1.5 -ml-2 pb-1" style={{ maxWidth: 425 }}>
                              <button className="flex items-center gap-1 p-2 rounded-full transition-colors group/r" style={{ color: '#71767b' }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#1d9bf0'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#71767b'; }}
                              >
                                <div className="p-0 rounded-full group-hover/r:bg-[rgba(29,155,240,0.1)]"><ReplyIcon /></div>
                                <span className="text-[13px] min-w-[24px]">{fmtNum(tw.replies)}</span>
                              </button>
                              <button className="flex items-center gap-1 p-2 rounded-full transition-colors group/rt" style={{ color: '#71767b' }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#00ba7c'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#71767b'; }}
                              >
                                <div className="p-0 rounded-full group-hover/rt:bg-[rgba(0,186,124,0.1)]"><RetweetIcon /></div>
                                <span className="text-[13px] min-w-[24px]">{fmtNum(tw.retweets)}</span>
                              </button>
                              <button className="flex items-center gap-1 p-2 rounded-full transition-colors group/lk" style={{ color: '#71767b' }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#f91880'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#71767b'; }}
                              >
                                <div className="p-0 rounded-full group-hover/lk:bg-[rgba(249,24,128,0.1)]"><LikeIcon /></div>
                                <span className="text-[13px] min-w-[24px]">{fmtNum(tw.likes)}</span>
                              </button>
                              <button className="flex items-center gap-1 p-2 rounded-full transition-colors group/vw" style={{ color: '#71767b' }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#1d9bf0'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#71767b'; }}
                              >
                                <div className="p-0 rounded-full group-hover/vw:bg-[rgba(29,155,240,0.1)]"><ViewIcon /></div>
                                <span className="text-[13px] min-w-[24px]">{fmtNum(tw.views)}</span>
                              </button>
                              <div className="flex items-center gap-0">
                                {!tw.image_url && (
                                  <button
                                    onClick={() => {
                                      const inp = document.createElement('input');
                                      inp.type = 'file'; inp.accept = 'image/*';
                                      inp.onchange = (ev: any) => { const f = ev.target.files?.[0]; if (f) uploadTweetImage(tw.id, f); };
                                      inp.click();
                                    }}
                                    className="p-2 rounded-full transition-colors"
                                    style={{ color: '#71767b' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#1d9bf0'; e.currentTarget.style.background = 'rgba(29,155,240,0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = '#71767b'; e.currentTarget.style.background = 'transparent'; }}
                                    title="Add image"
                                  ><ImageIcon size={18} /></button>
                                )}
                                <button className="p-2 rounded-full transition-colors" style={{ color: '#71767b' }}
                                  onMouseEnter={e => { e.currentTarget.style.color = '#1d9bf0'; e.currentTarget.style.background = 'rgba(29,155,240,0.1)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.color = '#71767b'; e.currentTarget.style.background = 'transparent'; }}
                                ><BookmarkIcon /></button>
                                <button className="p-2 rounded-full transition-colors" style={{ color: '#71767b' }}
                                  onMouseEnter={e => { e.currentTarget.style.color = '#1d9bf0'; e.currentTarget.style.background = 'rgba(29,155,240,0.1)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.color = '#71767b'; e.currentTarget.style.background = 'transparent'; }}
                                ><ShareIcon /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              );
            })()}

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

            {/* ── MEMORY (for AI) ──────────────────────────────────────────── */}
            {activeTab === 'Memory' && (
              <Block title="Client Memory" action={
                <span className="text-[10px]" style={{ color: '#666' }}>
                  The Aureum Agent reads this when you ask about {client?.name || 'this client'}
                </span>
              }>
                {memoriesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={18} className="animate-spin" style={{ color: '#D4A843' }} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {MEMORY_CATEGORIES.map(cat => {
                      const items = clientMemories.filter(m => m.category === cat.id);
                      return (
                        <div key={cat.id} className="rounded-xl overflow-hidden" style={{ background: '#161616' }}>
                          <div className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Brain size={13} style={{ color: '#666' }} />
                              <span className="text-xs font-semibold" style={{ color: '#ECECEC' }}>{cat.label}</span>
                              {items.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#888' }}>
                                  {items.length}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Save all in this category */}
                              {items.length > 0 && (
                                <button
                                  onClick={async () => {
                                    if (!supabase) return;
                                    for (const mem of items) {
                                      await supabase.from('ai_memory').update({ content: mem.content, updated_at: new Date().toISOString() }).eq('id', mem.id).eq('user_id', storagePrefix);
                                    }
                                    setMemSavedId(cat.id);
                                    setTimeout(() => setMemSavedId(null), 2000);
                                  }}
                                  className="p-1 rounded-md transition-all active:scale-90"
                                  style={{ color: memSavedId === cat.id ? '#34d399' : '#555' }}
                                  onMouseEnter={e => { if (memSavedId !== cat.id) e.currentTarget.style.color = '#ccc'; }}
                                  onMouseLeave={e => { if (memSavedId !== cat.id) e.currentTarget.style.color = '#555'; }}
                                  title="Save all"
                                ><Check size={14} /></button>
                              )}
                              {/* Add new */}
                              <button
                                onClick={async () => {
                                  if (!supabase) return;
                                  const mem = { id: crypto.randomUUID(), user_id: storagePrefix, content: '', category: cat.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
                                  setClientMemories(prev => [...prev, { id: mem.id, content: '', category: cat.id }]);
                                  await supabase.from('ai_memory').insert(mem);
                                }}
                                className="p-1 rounded-md transition-colors"
                                style={{ color: '#555' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#ccc')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                              ><Plus size={14} /></button>
                            </div>
                          </div>
                          {items.length === 0 ? (
                            <div className="px-4 pb-3">
                              <button
                                onClick={async () => {
                                  if (!supabase) return;
                                  const mem = { id: crypto.randomUUID(), user_id: storagePrefix, content: '', category: cat.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
                                  setClientMemories(prev => [...prev, { id: mem.id, content: '', category: cat.id }]);
                                  await supabase.from('ai_memory').insert(mem);
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[11px] font-medium transition-colors"
                                style={{ color: '#444', border: '1px dashed #2a2a2a' }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#D4A843'; e.currentTarget.style.borderColor = '#D4A84344'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#444'; e.currentTarget.style.borderColor = '#2a2a2a'; }}
                              >
                                <Plus size={12} /> Add {cat.label.toLowerCase()}
                              </button>
                            </div>
                          ) : (
                            <div className="px-4 pb-3">
                              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #252525' }}>
                              {items.map((mem, memIdx) => {

                                return (
                                  <div key={mem.id} className="relative group/mem" style={{ borderTop: memIdx > 0 ? '1px solid #252525' : undefined }}>
                                    <textarea
                                      value={mem.content}
                                      onChange={e => {
                                        const val = e.target.value;
                                        // Check if user typed -----
                                        const sepMatch = val.match(/^([\s\S]*?)\n-{5,}\n?([\s\S]*)$/);
                                        if (sepMatch) {
                                          const above = sepMatch[1];
                                          const below = (sepMatch[2] || '').trim();
                                          setClientMemories(prev => prev.map(m => m.id === mem.id ? { ...m, content: above } : m));
                                          if (supabase) supabase.from('ai_memory').update({ content: above, updated_at: new Date().toISOString() }).eq('id', mem.id).eq('user_id', storagePrefix);
                                          const newMem = { id: crypto.randomUUID(), user_id: storagePrefix, content: below, category: cat.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
                                          setClientMemories(prev => {
                                            const idx = prev.findIndex(m => m.id === mem.id);
                                            const next = [...prev];
                                            next.splice(idx + 1, 0, { id: newMem.id, content: below, category: cat.id });
                                            return next;
                                          });
                                          if (supabase) supabase.from('ai_memory').insert(newMem);
                                          return;
                                        }
                                        setClientMemories(prev => prev.map(m => m.id === mem.id ? { ...m, content: val } : m));
                                        if (memoryDebounceRef.current[mem.id]) clearTimeout(memoryDebounceRef.current[mem.id] as unknown as number);
                                        memoryDebounceRef.current[mem.id] = setTimeout(async () => {
                                          if (supabase) {
                                            await supabase.from('ai_memory').update({ content: val, updated_at: new Date().toISOString() }).eq('id', mem.id).eq('user_id', storagePrefix);
                                          }
                                        }, 800);
                                      }}
                                      className="w-full bg-transparent text-[12px] leading-5 focus:outline-none resize-none p-3"
                                      style={{ color: '#ccc' }}
                                      placeholder={cat.placeholder}
                                      rows={Math.max(2, mem.content.split('\n').length)}
                                    />

                                    {/* Delete button */}
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setClientMemories(prev => prev.filter(m => m.id !== mem.id));
                                        if (supabase) await supabase.from('ai_memory').delete().eq('id', mem.id).eq('user_id', storagePrefix);
                                      }}
                                      className="absolute top-1 right-1 p-1 rounded-md opacity-0 group-hover/mem:opacity-100 transition-opacity z-10"
                                      style={{ color: '#555' }}
                                      onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                                      onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                                    ><X size={11} /></button>
                                  </div>
                                );
                              })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Block>
            )}

          </div>
        )}
        </div>

        {/* ── RIGHT PANEL: Journal (only on Content tab) ── */}
        {activeTab === 'Content' && (
          <div
            className="overflow-y-auto flex flex-col"
            style={{ flex: '2 1 0%', minWidth: 280, ...card }}
          >
              {/* Header */}
              <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #222' }}>
                <div>
                  <span className="text-sm font-bold" style={{ color: '#ECECEC' }}>Content Journal</span>
                  <p className="text-[11px] mt-0.5" style={{ color: '#555' }}>Brainstorm ideas, then push to posts</p>
                </div>
              </div>

              {/* Journal entries */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {(details.ad_performance_notes || '').split('\n---\n').filter(Boolean).map((entry, i, arr) => (
                  <div key={i} className="rounded-xl p-3 group/entry" style={{ background: '#161616' }}>
                    <textarea
                      value={entry}
                      onChange={e => {
                        const entries = (details.ad_performance_notes || '').split('\n---\n').filter(Boolean);
                        entries[i] = e.target.value;
                        setField('ad_performance_notes', entries.join('\n---\n'));
                      }}
                      className="w-full bg-transparent text-[13px] leading-5 focus:outline-none resize-none placeholder-[#333]"
                      style={{ color: '#ECECEC' }}
                      placeholder="Write an idea…"
                      rows={Math.max(2, entry.split('\n').length)}
                    />
                    {/* Journal entry image */}
                    {entry.match(/!\[img\]\((.*?)\)/) && (
                      <div className="mt-2 relative rounded-xl overflow-hidden" style={{ maxHeight: 160 }}>
                        <img src={entry.match(/!\[img\]\((.*?)\)/)![1]} alt="" className="w-full object-cover rounded-xl" style={{ maxHeight: 160 }} />
                        <button
                          onClick={() => {
                            const entries = (details.ad_performance_notes || '').split('\n---\n').filter(Boolean);
                            entries[i] = entries[i].replace(/!\[img\]\(.*?\)\n?/, '');
                            setField('ad_performance_notes', entries.join('\n---\n'));
                          }}
                          className="absolute top-1 right-1 p-1 rounded-full"
                          style={{ background: 'rgba(0,0,0,0.7)', color: '#ECECEC' }}
                        ><Trash2 size={10} /></button>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2 opacity-0 group-hover/entry:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const inp = document.createElement('input');
                          inp.type = 'file'; inp.accept = 'image/*';
                          inp.onchange = async (ev: any) => {
                            const file = ev.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const entries = (details.ad_performance_notes || '').split('\n---\n').filter(Boolean);
                              entries[i] = entries[i].replace(/!\[img\]\(.*?\)\n?/, '');
                              entries[i] = `![img](${reader.result})\n${entries[i]}`;
                              setField('ad_performance_notes', entries.join('\n---\n'));
                            };
                            reader.readAsDataURL(file);
                          };
                          inp.click();
                        }}
                        className="p-1.5 rounded-full transition-colors"
                        style={{ color: '#555' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#1d9bf0'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}
                        title="Add image"
                      ><ImageIcon size={13} /></button>
                      <button
                        onClick={() => {
                          if (!supabase || !client) return;
                          const imgMatch = entry.match(/!\[img\]\((.*?)\)/);
                          const imgUrl = imgMatch ? imgMatch[1] : '';
                          const text = entry.replace(/!\[img\]\(.*?\)\n?/, '').trim();
                          const eng = { likes: Math.floor(Math.random() * 800) + 5, retweets: Math.floor(Math.random() * 120) + 1, replies: Math.floor(Math.random() * 40) + 1, views: Math.floor(Math.random() * 50000) + 500 };
                          const tw = { id: crypto.randomUUID(), text, post_date: new Date().toISOString().split('T')[0], image_url: imgUrl, ...eng };
                          setTweets(prev => [tw, ...prev]);
                          supabase.from('client_tweets').insert({ ...tw, client_id: client.id, user_id: storagePrefix });
                        }}
                        className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors"
                        style={{ background: '#1d9bf0', color: '#fff' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1a8cd8')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#1d9bf0')}
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"/></svg>
                        Push to Post
                      </button>
                      </div>
                      <button
                        onClick={() => {
                          const entries = (details.ad_performance_notes || '').split('\n---\n').filter(Boolean);
                          entries.splice(i, 1);
                          setField('ad_performance_notes', entries.join('\n---\n'));
                        }}
                        className="p-1.5 rounded-full transition-colors"
                        style={{ color: '#333' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#333'; }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => {
                    const current = details.ad_performance_notes || '';
                    const newVal = current ? current + '\n---\n' : '';
                    setField('ad_performance_notes', newVal + ' ');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold transition-colors"
                  style={{ color: '#555', border: '1px dashed #2a2a2a' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ECECEC'; e.currentTarget.style.borderColor = '#444'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#2a2a2a'; }}
                >
                  <Plus size={14} /> New Idea
                </button>
              </div>
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
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const statuses = ['Happy', 'Moderate', 'Frustrated'] as const;
  const colors: Record<string, string> = {
    Happy: '#4ade80', Moderate: '#9B9B9B', Frustrated: '#f87171',
  };
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Position dropdown relative to button
  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.right - 120 });
    }
  }, [open]);

  // Close on any click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Use click (not mousedown) so option clicks fire first
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [open]);

  return (
    <div className="flex justify-end">
      <button ref={btnRef} onClick={() => setOpen(o => !o)}
        className="text-xs font-medium flex items-center gap-1 cursor-pointer"
        style={{ color: colors[value] ?? '#ECECEC' }}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colors[value] ?? '#ECECEC' }} />
        {value}
      </button>
      {open && createPortal(
        <div ref={dropRef} className="fixed py-1 min-w-[120px] shadow-xl"
          style={{ background: '#222', borderRadius: 10, zIndex: 99999, top: pos.top, left: pos.left }}>
          {statuses.map(s => (
            <button key={s}
              onClick={() => { onChange(s); setOpen(false); }}
              className={`flex items-center gap-2 w-full text-left text-xs px-3 py-2 transition-colors hover:bg-[#2a2a2a] ${s === value ? 'font-semibold' : ''}`}
              style={{ color: colors[s] }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colors[s] }} />
              {s}
            </button>
          ))}
        </div>,
        document.body
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
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const statuses = ['Missing Invoice', 'Pending', 'Paid', 'Late'] as const;
  const colors: Record<string, string> = {
    'Missing Invoice': '#f87171', Pending: '#9B9B9B', Paid: '#4ade80', Late: '#f97316',
  };
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.right - 140 });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [open]);

  return (
    <div className="flex justify-end">
      <button ref={btnRef} onClick={() => setOpen(o => !o)}
        className="text-xs font-medium flex items-center gap-1 cursor-pointer"
        style={{ color: colors[value] ?? '#ECECEC' }}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colors[value] ?? '#ECECEC' }} />
        {value}
      </button>
      {open && createPortal(
        <div ref={dropRef} className="fixed py-1 min-w-[140px] shadow-xl"
          style={{ background: '#222', borderRadius: 10, zIndex: 99999, top: pos.top, left: pos.left }}>
          {statuses.map(s => (
            <button key={s}
              onClick={() => { onChange(s); setOpen(false); }}
              className={`flex items-center gap-2 w-full text-left text-xs px-3 py-2 transition-colors hover:bg-[#2a2a2a] ${s === value ? 'font-semibold' : ''}`}
              style={{ color: colors[s] }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colors[s] }} />
              {s}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

function InvoiceStatusSelect({ value, onChange }: { value: BillingInvoice['status']; onChange: (v: BillingInvoice['status']) => void }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 4, left: r.left });
    }
    setOpen(o => !o);
  };

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        className="text-xs font-medium flex items-center gap-1.5 cursor-pointer"
        style={{ color: invoiceStatusColors[value] ?? '#ECECEC' }}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: invoiceStatusColors[value] ?? '#ECECEC' }} />
        {value}
      </button>
      {open && createPortal(
        <div onClick={e => e.stopPropagation()}
          className="fixed z-[9999] py-1 min-w-[120px] shadow-2xl border"
          style={{ top: coords.top, left: coords.left, background: '#1c1c1c', borderColor: '#2f2f2f', borderRadius: 10 }}>
          {INVOICE_STATUSES.map(s => (
            <button key={s} onClick={() => { onChange(s); setOpen(false); }}
              className={`flex items-center gap-2 w-full text-left text-xs px-3 py-2 transition-colors hover:bg-[#2a2a2a] ${s === value ? 'font-semibold' : ''}`}
              style={{ color: invoiceStatusColors[s] }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: invoiceStatusColors[s] }} />
              {s}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

export default ClientPanel;
