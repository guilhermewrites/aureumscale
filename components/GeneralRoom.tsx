import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Target, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronRight,
  DollarSign, Users, Megaphone, Globe, Phone, Mail, Zap,
  GripVertical, MoreHorizontal, Flag, Clock, CheckCircle2,
  AlertCircle, ArrowRight, Layers, BarChart3
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

// --- Types ---
type ChannelType = 'inbound' | 'outbound' | 'paid_traffic' | 'social_media' | 'referrals' | 'partnerships';
type TaskStatus = 'todo' | 'in_progress' | 'done';
type MilestoneStatus = 'locked' | 'current' | 'reached';

interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  target: number;
  current: number;
  strategies: Strategy[];
  expanded: boolean;
}

interface Strategy {
  id: string;
  title: string;
  status: TaskStatus;
  notes: string;
  priority: 'high' | 'medium' | 'low';
}

interface Milestone {
  id: string;
  amount: number;
  label: string;
  status: MilestoneStatus;
  date_reached?: string;
}

interface WeeklyLog {
  id: string;
  week_start: string;
  revenue: number;
  leads: number;
  calls_booked: number;
  calls_showed: number;
  deals_closed: number;
  notes: string;
}

// --- Channel config ---
const CHANNEL_CONFIG: Record<ChannelType, { label: string; icon: React.ReactNode; color: string; gradient: string }> = {
  inbound: { label: 'Inbound', icon: <Megaphone size={16} strokeWidth={1.75} />, color: '#999', gradient: 'transparent' },
  outbound: { label: 'Outbound', icon: <Phone size={16} strokeWidth={1.75} />, color: '#999', gradient: 'transparent' },
  paid_traffic: { label: 'Paid Traffic', icon: <Zap size={16} strokeWidth={1.75} />, color: '#999', gradient: 'transparent' },
  social_media: { label: 'Social Media', icon: <Globe size={16} strokeWidth={1.75} />, color: '#999', gradient: 'transparent' },
  referrals: { label: 'Referrals', icon: <Users size={16} strokeWidth={1.75} />, color: '#999', gradient: 'transparent' },
  partnerships: { label: 'Partnerships', icon: <Layers size={16} strokeWidth={1.75} />, color: '#999', gradient: 'transparent' },
};

const DEFAULT_MILESTONES: Milestone[] = [
  { id: '1', amount: 10000, label: '$10K/mo', status: 'current' },
  { id: '2', amount: 25000, label: '$25K/mo', status: 'locked' },
  { id: '3', amount: 50000, label: '$50K/mo', status: 'locked' },
  { id: '4', amount: 75000, label: '$75K/mo', status: 'locked' },
  { id: '5', amount: 100000, label: '$100K/mo', status: 'locked' },
];

const DEFAULT_CHANNELS: Channel[] = [
  {
    id: 'ch-inbound', type: 'inbound', name: 'Inbound', target: 30000, current: 0, expanded: false,
    strategies: [
      { id: 's1', title: 'Content funnel → YouTube/IG → Lead magnet → VSL → Call', status: 'todo', notes: '', priority: 'high' },
      { id: 's2', title: 'SEO blog posts targeting buyer-intent keywords', status: 'todo', notes: '', priority: 'medium' },
      { id: 's3', title: 'Newsletter sequence for nurture → booking', status: 'todo', notes: '', priority: 'medium' },
    ]
  },
  {
    id: 'ch-outbound', type: 'outbound', name: 'Outbound', target: 25000, current: 0, expanded: false,
    strategies: [
      { id: 's4', title: 'Cold DM system — X, Instagram, LinkedIn', status: 'todo', notes: '', priority: 'high' },
      { id: 's5', title: 'Cold email campaigns (Apollo / Instantly)', status: 'todo', notes: '', priority: 'high' },
      { id: 's6', title: 'Loom audit outreach to ideal prospects', status: 'todo', notes: '', priority: 'medium' },
    ]
  },
  {
    id: 'ch-paid', type: 'paid_traffic', name: 'Paid Traffic', target: 20000, current: 0, expanded: false,
    strategies: [
      { id: 's7', title: 'Meta Ads → VSL funnel → Booking page', status: 'todo', notes: '', priority: 'high' },
      { id: 's8', title: 'YouTube Ads → Lead magnet → Email sequence', status: 'todo', notes: '', priority: 'medium' },
      { id: 's9', title: 'Retargeting warm audiences across platforms', status: 'todo', notes: '', priority: 'medium' },
    ]
  },
  {
    id: 'ch-social', type: 'social_media', name: 'Social Media', target: 15000, current: 0, expanded: false,
    strategies: [
      { id: 's10', title: 'Daily X threads + engagement strategy', status: 'todo', notes: '', priority: 'high' },
      { id: 's11', title: 'YouTube long-form (2x/week) + Shorts', status: 'todo', notes: '', priority: 'high' },
      { id: 's12', title: 'Instagram Reels repurposing pipeline', status: 'todo', notes: '', priority: 'medium' },
    ]
  },
  {
    id: 'ch-referrals', type: 'referrals', name: 'Referrals', target: 5000, current: 0, expanded: false,
    strategies: [
      { id: 's13', title: 'Client referral program — 10% kickback', status: 'todo', notes: '', priority: 'high' },
      { id: 's14', title: 'Case study → social proof → warm leads', status: 'todo', notes: '', priority: 'medium' },
    ]
  },
  {
    id: 'ch-partnerships', type: 'partnerships', name: 'Partnerships', target: 5000, current: 0, expanded: false,
    strategies: [
      { id: 's15', title: 'Joint ventures with complementary service providers', status: 'todo', notes: '', priority: 'medium' },
      { id: 's16', title: 'Affiliate/revenue-share deals', status: 'todo', notes: '', priority: 'low' },
    ]
  },
];

interface GeneralRoomProps {
  storagePrefix: string;
  projectedRevenue?: number;
  avgRevenue?: number;
}

// Map client acquisition values to channel types
const ACQUISITION_TO_CHANNEL: Record<string, ChannelType> = {
  'Inbound — DMs': 'inbound',
  'Inbound — Organic': 'inbound',
  'Inbound — Funnel': 'inbound',
  'Outbound — DMs': 'outbound',
  'Outbound — Cold Email': 'outbound',
  'Paid Traffic — Ads': 'paid_traffic',
  'Social Media': 'social_media',
  'Referral': 'referrals',
  'Partnership': 'partnerships',
};

const GeneralRoom: React.FC<GeneralRoomProps> = ({ storagePrefix, projectedRevenue = 0, avgRevenue = 0 }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>(DEFAULT_MILESTONES);
  const [weeklyLogs, setWeeklyLogs] = useState<WeeklyLog[]>([]);
  const [goalAmount] = useState(100000);
  const [editingStrategy, setEditingStrategy] = useState<string | null>(null);
  const [editStrategyText, setEditStrategyText] = useState('');
  const [addingToChannel, setAddingToChannel] = useState<string | null>(null);
  const [newStrategyText, setNewStrategyText] = useState('');
  const [gameplan, setGameplan] = useState('');
  const [editingGameplan, setEditingGameplan] = useState(false);
  const gameplanRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [channelRevenue, setChannelRevenue] = useState<Record<ChannelType, number>>({
    inbound: 0, outbound: 0, paid_traffic: 0, social_media: 0, referrals: 0, partnerships: 0,
  });

  // --- Persistence ---
  const STORAGE_KEY = `aureum_general_room_${storagePrefix}`;
  const MILESTONES_KEY = `aureum_milestones_${storagePrefix}`;
  const LOGS_KEY = `aureum_weekly_logs_${storagePrefix}`;
  const GAMEPLAN_KEY = `aureum_gameplan_${storagePrefix}`;

  // Load
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setChannels(JSON.parse(saved)); } catch { setChannels(DEFAULT_CHANNELS); }
    } else {
      setChannels(DEFAULT_CHANNELS);
    }

    const savedMilestones = localStorage.getItem(MILESTONES_KEY);
    if (savedMilestones) {
      try { setMilestones(JSON.parse(savedMilestones)); } catch { setMilestones(DEFAULT_MILESTONES); }
    }

    const savedLogs = localStorage.getItem(LOGS_KEY);
    if (savedLogs) {
      try { setWeeklyLogs(JSON.parse(savedLogs)); } catch { setWeeklyLogs([]); }
    }

    const savedGameplan = localStorage.getItem(GAMEPLAN_KEY);
    if (savedGameplan) setGameplan(savedGameplan);

    // Also try Supabase
    if (supabase) {
      supabase.from('general_room').select('*').eq('user_id', storagePrefix).single()
        .then(({ data }) => {
          if (data) {
            if (data.channels) { try { setChannels(JSON.parse(data.channels)); } catch {} }
            if (data.milestones) { try { setMilestones(JSON.parse(data.milestones)); } catch {} }
            if (data.weekly_logs) { try { setWeeklyLogs(JSON.parse(data.weekly_logs)); } catch {} }
            if (data.gameplan) setGameplan(data.gameplan);
          }
        });
    }
  }, [storagePrefix]);

  // Fetch client acquisition data → compute channel revenue from real clients
  useEffect(() => {
    if (!supabase) return;
    supabase.from('clients').select('amount, acquisition, active')
      .eq('user_id', storagePrefix)
      .then(({ data }) => {
        if (!data) return;
        const sums: Record<ChannelType, number> = {
          inbound: 0, outbound: 0, paid_traffic: 0, social_media: 0, referrals: 0, partnerships: 0,
        };
        data.filter(c => c.active !== false).forEach(c => {
          const channelType = ACQUISITION_TO_CHANNEL[c.acquisition];
          if (channelType) {
            sums[channelType] += (c.amount || 0);
          }
        });
        setChannelRevenue(sums);
      });
  }, [storagePrefix]);

  // Save
  const persistData = useCallback((ch: Channel[], ms: Milestone[], logs: WeeklyLog[], gp?: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ch));
    localStorage.setItem(MILESTONES_KEY, JSON.stringify(ms));
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    if (gp !== undefined) localStorage.setItem(GAMEPLAN_KEY, gp);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (supabase) {
        const payload: any = {
          user_id: storagePrefix,
          channels: JSON.stringify(ch),
          milestones: JSON.stringify(ms),
          weekly_logs: JSON.stringify(logs),
          updated_at: new Date().toISOString(),
        };
        if (gp !== undefined) payload.gameplan = gp;
        supabase.from('general_room').upsert(payload, { onConflict: 'user_id' });
      }
    }, 1000);
  }, [storagePrefix]);

  const updateChannels = useCallback((next: Channel[]) => {
    setChannels(next);
    persistData(next, milestones, weeklyLogs);
  }, [milestones, weeklyLogs, persistData]);

  const updateMilestones = useCallback((next: Milestone[]) => {
    setMilestones(next);
    persistData(channels, next, weeklyLogs);
  }, [channels, weeklyLogs, persistData]);

  const updateLogs = useCallback((next: WeeklyLog[]) => {
    setWeeklyLogs(next);
    persistData(channels, milestones, next);
  }, [channels, milestones, persistData]);

  const saveGameplan = useCallback((text: string) => {
    setGameplan(text);
    localStorage.setItem(GAMEPLAN_KEY, text);
    persistData(channels, milestones, weeklyLogs, text);
  }, [channels, milestones, weeklyLogs, persistData]);

  // --- Computed ---
  // Total revenue from client acquisitions (sum of all channel revenue from real clients)
  const totalFromClients = useMemo(() => (Object.values(channelRevenue) as number[]).reduce((sum, v) => sum + v, 0), [channelRevenue]);
  const totalTarget = useMemo(() => channels.reduce((sum, ch) => sum + ch.target, 0), [channels]);
  // Use client acquisition revenue as primary, fall back to projected/avg from dashboard
  const displayRevenue = totalFromClients > 0 ? totalFromClients : projectedRevenue > 0 ? projectedRevenue : avgRevenue;
  const revenueSource = totalFromClients > 0 ? 'clients' : projectedRevenue > 0 ? 'projected' : avgRevenue > 0 ? 'avg' : 'manual';
  const progressPercent = goalAmount > 0 ? Math.min((displayRevenue / goalAmount) * 100, 100) : 0;

  // Get channel current from real client data
  const getChannelCurrent = (type: ChannelType) => channelRevenue[type] || 0;

  const totalStrategies = useMemo(() => channels.reduce((sum, ch) => sum + ch.strategies.length, 0), [channels]);
  const completedStrategies = useMemo(() => channels.reduce((sum, ch) => sum + ch.strategies.filter(s => s.status === 'done').length, 0), [channels]);
  const inProgressStrategies = useMemo(() => channels.reduce((sum, ch) => sum + ch.strategies.filter(s => s.status === 'in_progress').length, 0), [channels]);


  // --- Actions ---
  const toggleChannel = (channelId: string) => {
    updateChannels(channels.map(ch => ch.id === channelId ? { ...ch, expanded: !ch.expanded } : ch));
  };

  const updateChannelTarget = (channelId: string, target: number) => {
    updateChannels(channels.map(ch => ch.id === channelId ? { ...ch, target } : ch));
  };


  const cycleStatus = (channelId: string, strategyId: string) => {
    const order: TaskStatus[] = ['todo', 'in_progress', 'done'];
    updateChannels(channels.map(ch => {
      if (ch.id !== channelId) return ch;
      return {
        ...ch,
        strategies: ch.strategies.map(s => {
          if (s.id !== strategyId) return s;
          const idx = order.indexOf(s.status);
          return { ...s, status: order[(idx + 1) % order.length] };
        })
      };
    }));
  };

  const cyclePriority = (channelId: string, strategyId: string) => {
    const order: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low'];
    updateChannels(channels.map(ch => {
      if (ch.id !== channelId) return ch;
      return {
        ...ch,
        strategies: ch.strategies.map(s => {
          if (s.id !== strategyId) return s;
          const idx = order.indexOf(s.priority);
          return { ...s, priority: order[(idx + 1) % order.length] };
        })
      };
    }));
  };

  const deleteStrategy = (channelId: string, strategyId: string) => {
    updateChannels(channels.map(ch => {
      if (ch.id !== channelId) return ch;
      return { ...ch, strategies: ch.strategies.filter(s => s.id !== strategyId) };
    }));
  };

  const addStrategy = (channelId: string) => {
    if (!newStrategyText.trim()) return;
    const newS: Strategy = {
      id: `s-${Date.now()}`,
      title: newStrategyText.trim(),
      status: 'todo',
      notes: '',
      priority: 'medium',
    };
    updateChannels(channels.map(ch => {
      if (ch.id !== channelId) return ch;
      return { ...ch, strategies: [...ch.strategies, newS] };
    }));
    setNewStrategyText('');
    setAddingToChannel(null);
  };

  const saveStrategyEdit = (channelId: string, strategyId: string) => {
    if (!editStrategyText.trim()) return;
    updateChannels(channels.map(ch => {
      if (ch.id !== channelId) return ch;
      return {
        ...ch,
        strategies: ch.strategies.map(s => s.id === strategyId ? { ...s, title: editStrategyText.trim() } : s)
      };
    }));
    setEditingStrategy(null);
    setEditStrategyText('');
  };


  // --- Status helpers ---
  const statusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'done': return <CheckCircle2 size={13} style={{ color: 'var(--au-good)' }} />;
      case 'in_progress': return <Clock size={13} style={{ color: '#e0c870' }} />;
      default: return <div style={{ width: 12, height: 12, border: '1px solid var(--au-text-3)' }} />;
    }
  };

  const statusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'done': return 'Done';
      case 'in_progress': return 'In Progress';
      default: return 'To Do';
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'var(--au-text)';
      case 'medium': return 'var(--au-text-2)';
      default: return 'var(--au-text-3)';
    }
  };

  const formatCurrency = (n: number) => {
    if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <div style={{ paddingTop: 36, paddingBottom: 80, maxWidth: 1280, margin: '0 auto' }}>
      {/* === Page header === */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 28, paddingBottom: 22, borderBottom: '1px solid var(--au-line)' }}>
        <div style={{ flex: 1 }}>
          <div className="au-eyebrow" style={{ marginBottom: 10 }}>— Index · 002 · Subject · General Room</div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--au-text)', lineHeight: 1 }}>
            The plan to <span style={{ color: 'var(--au-good)' }}>$100K/mo</span>.
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: 13.5, color: 'var(--au-text-2)', maxWidth: 520 }}>Channels, strategies, milestones. The command center for scaling revenue.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="au-label" style={{ marginBottom: 6 }}>— Current</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--au-good)', letterSpacing: '-0.02em', lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(displayRevenue)}</div>
          <div style={{ fontSize: 10.5, color: 'var(--au-text-3)', marginTop: 6, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            OF {formatCurrency(goalAmount)}
            {revenueSource === 'clients' && ' · CLIENTS'}
            {revenueSource === 'projected' && ' · MONTH'}
            {revenueSource === 'avg' && ' · AVG'}
          </div>
        </div>
      </div>

      {/* === Milestone progress === */}
      <div style={{ marginBottom: 36, border: '1px solid var(--au-line)', padding: 24 }}>
        <div className="au-label" style={{ marginBottom: 18 }}>— Milestones · {String(Math.round(progressPercent)).padStart(2, '0')}% complete</div>
        <div style={{ position: 'relative', height: 1, background: 'var(--au-line-2)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: 'var(--au-good)', width: `${progressPercent}%`, transition: 'width 0.7s' }} />
          {milestones.map(ms => (
            <div
              key={ms.id}
              style={{
                position: 'absolute',
                top: -3,
                left: `${(ms.amount / goalAmount) * 100}%`,
                width: 1, height: 7,
                background: ms.status === 'reached' ? 'var(--au-good)' : 'var(--au-text-3)',
              }}
            />
          ))}
        </div>
        <div style={{ position: 'relative', height: 18, marginTop: 10 }}>
          {milestones.map((ms, idx) => {
            const pct = (ms.amount / goalAmount) * 100;
            const isLast = idx === milestones.length - 1;
            const isFirst = idx === 0;
            return (
              <div
                key={ms.id}
                style={{
                  position: 'absolute',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9.5,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  ...(isLast ? { right: 0 } : isFirst ? { left: 0 } : { left: `${pct}%`, transform: 'translateX(-50%)' }),
                  color: ms.status === 'reached' ? 'var(--au-good)' : ms.status === 'current' ? 'var(--au-text)' : 'var(--au-text-3)',
                }}
              >
                {ms.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* === Gameplan note === */}
      <div style={{ marginBottom: 36, border: '1px solid var(--au-line)', padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="au-label">— The gameplan</div>
          {!editingGameplan && (
            <button
              onClick={() => { setEditingGameplan(true); setTimeout(() => gameplanRef.current?.focus(), 50); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--au-text-3)', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
            >
              {gameplan ? 'Edit' : 'Write mission'}
            </button>
          )}
        </div>
        {editingGameplan ? (
          <>
            <textarea
              ref={gameplanRef}
              value={gameplan}
              onChange={e => setGameplan(e.target.value)}
              placeholder="Write your mission, your gameplan, the strategy to hit $100K/mo..."
              rows={6}
              style={{
                width: '100%',
                background: '#0a0a0a',
                border: '1px solid var(--au-line-2)',
                borderRadius: 0,
                padding: '12px 14px',
                fontSize: 13,
                color: 'var(--au-text-2)',
                outline: 'none',
                resize: 'none',
                lineHeight: 1.6,
                fontFamily: 'Inter, sans-serif',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                onClick={() => { setEditingGameplan(false); saveGameplan(gameplan); }}
                className="au-btn-primary"
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <div onClick={() => { setEditingGameplan(true); setTimeout(() => gameplanRef.current?.focus(), 50); }} style={{ cursor: 'pointer' }}>
            {gameplan ? (
              <p style={{ fontSize: 13.5, color: 'var(--au-text-2)', whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0 }}>{gameplan}</p>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--au-text-4)', fontStyle: 'italic', margin: 0 }}>Click to write your mission and gameplan...</p>
            )}
          </div>
        )}
      </div>

      {/* === Stat cards === */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid var(--au-line)', borderRight: 'none', marginBottom: 36 }}>
        {[
          { label: 'Channels active', value: String(channels.length).padStart(2, '0'), hint: 'REVENUE CHANNELS' },
          { label: 'Strategies', value: `${completedStrategies}/${totalStrategies}`, hint: `${inProgressStrategies} IN PROGRESS` },
          { label: 'Target total', value: formatCurrency(totalTarget), hint: 'ACROSS ALL CHANNELS' },
          { label: 'From clients', value: formatCurrency(totalFromClients), hint: 'MONTHLY REVENUE', accent: true },
        ].map((s, i) => (
          <div key={i} style={{ padding: '20px 22px', borderRight: '1px solid var(--au-line)' }}>
            <div className="au-label" style={{ marginBottom: 12 }}>— {s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 600, color: s.accent ? 'var(--au-good)' : 'var(--au-text)', letterSpacing: '-0.025em', lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--au-text-3)', marginTop: 8, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>{s.hint}</div>
          </div>
        ))}
      </div>

      {/* === Channel grid === */}
      <div className="au-label" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span>— Channels</span>
        <span style={{ flex: 1, height: 1, background: 'var(--au-line)' }} />
        <span>{String(channels.length).padStart(2, '0')} / {String(channels.length).padStart(2, '0')}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', border: '1px solid var(--au-line)', borderRight: 'none', borderBottom: 'none' }}>
        {channels.map((ch, idx) => {
          const cfg = CHANNEL_CONFIG[ch.type];
          const current = getChannelCurrent(ch.type);
          const doneCount = ch.strategies.filter(s => s.status === 'done').length;
          const totalCount = ch.strategies.length;
          const pct = ch.target > 0 ? Math.min((current / ch.target) * 100, 100) : 0;

          return (
            <div key={ch.id} style={{ borderRight: '1px solid var(--au-line)', borderBottom: '1px solid var(--au-line)', display: 'flex', flexDirection: 'column' }}>
              {/* Card top — clickable to expand */}
              <div
                style={{ padding: '20px 22px 16px', cursor: 'pointer', transition: 'background 0.15s' }}
                onClick={() => toggleChannel(ch.id)}
                onMouseEnter={e => e.currentTarget.style.background = '#080808'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: 'var(--au-text-3)', letterSpacing: '0.18em' }}>
                  <span>FILE / {String(idx + 1).padStart(3, '0')}</span>
                  <span style={{ flex: 1, height: 1, background: 'var(--au-line)' }} />
                  <span>{String(doneCount).padStart(2, '0')}/{String(totalCount).padStart(2, '0')}</span>
                  {ch.expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ color: 'var(--au-text-2)' }}>{cfg.icon}</span>
                  <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--au-text)', letterSpacing: '-0.015em' }}>{ch.name}</span>
                </div>

                {/* Revenue */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--au-text)', letterSpacing: '-0.02em', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(current)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--au-text-3)', letterSpacing: '0.06em' }}>
                    <span>OF</span>
                    <input
                      type="number"
                      value={ch.target}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); updateChannelTarget(ch.id, Number(e.target.value) || 0); }}
                      style={{
                        width: 64, background: 'transparent', border: 'none', outline: 'none',
                        color: 'var(--au-text-3)', fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 10, letterSpacing: '0.06em',
                      }}
                      placeholder="target"
                    />
                    <span>TARGET</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--au-line-2)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--au-good)', transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--au-text-2)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em', minWidth: 32, textAlign: 'right' }}>{String(Math.round(pct)).padStart(2, '0')}%</span>
                </div>
              </div>

              {/* Strategies (expanded) */}
              {ch.expanded && (
                <div style={{ borderTop: '1px solid var(--au-line)', padding: '4px 22px 16px', flex: 1 }}>
                  {ch.strategies.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--au-line)' }} className="group">
                      <button
                        onClick={() => cycleStatus(ch.id, s.id)}
                        title={statusLabel(s.status)}
                        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', flexShrink: 0 }}
                      >
                        {statusIcon(s.status)}
                      </button>

                      {editingStrategy === s.id ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            autoFocus
                            value={editStrategyText}
                            onChange={e => setEditStrategyText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveStrategyEdit(ch.id, s.id); if (e.key === 'Escape') setEditingStrategy(null); }}
                            style={{ flex: 1, background: '#0a0a0a', border: '1px solid var(--au-line-2)', padding: '4px 8px', fontSize: 12, color: 'var(--au-text)', outline: 'none', borderRadius: 0, fontFamily: 'Inter, sans-serif' }}
                          />
                          <button onClick={() => saveStrategyEdit(ch.id, s.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--au-good)', display: 'inline-flex' }}><Check size={12} /></button>
                          <button onClick={() => setEditingStrategy(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--au-text-3)', display: 'inline-flex' }}><X size={12} /></button>
                        </div>
                      ) : (
                        <span style={{ flex: 1, fontSize: 12, lineHeight: 1.5, color: s.status === 'done' ? 'var(--au-text-3)' : 'var(--au-text-2)', textDecoration: s.status === 'done' ? 'line-through' : 'none' }}>
                          {s.title}
                        </span>
                      )}

                      <button
                        onClick={() => cyclePriority(ch.id, s.id)}
                        title={`Priority: ${s.priority}`}
                        style={{
                          background: 'transparent', border: '1px solid var(--au-line-2)', padding: '2px 6px',
                          color: priorityColor(s.priority), cursor: 'pointer',
                          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 600,
                          letterSpacing: '0.18em', textTransform: 'uppercase', borderRadius: 0,
                        }}
                      >
                        {s.priority}
                      </button>

                      <div className="group-hover:opacity-100" style={{ display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.15s' }}>
                        <button onClick={() => { setEditingStrategy(s.id); setEditStrategyText(s.title); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--au-text-3)', display: 'inline-flex' }}><Edit3 size={11} /></button>
                        <button onClick={() => deleteStrategy(ch.id, s.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--au-text-3)', display: 'inline-flex' }}><Trash2 size={11} /></button>
                      </div>
                    </div>
                  ))}

                  {addingToChannel === ch.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                      <input
                        autoFocus
                        value={newStrategyText}
                        onChange={e => setNewStrategyText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addStrategy(ch.id); if (e.key === 'Escape') { setAddingToChannel(null); setNewStrategyText(''); } }}
                        placeholder="New strategy..."
                        style={{ flex: 1, background: '#0a0a0a', border: '1px solid var(--au-line-2)', padding: '6px 10px', fontSize: 12, color: 'var(--au-text)', outline: 'none', borderRadius: 0, fontFamily: 'Inter, sans-serif' }}
                      />
                      <button onClick={() => addStrategy(ch.id)} className="au-btn-primary" style={{ padding: '6px 12px' }}>Add</button>
                      <button onClick={() => { setAddingToChannel(null); setNewStrategyText(''); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--au-text-3)', display: 'inline-flex' }}><X size={12} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingToChannel(ch.id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'var(--au-text-3)', padding: 0,
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                        letterSpacing: '0.14em', textTransform: 'uppercase',
                      }}
                    >
                      <Plus size={11} /> Add strategy
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GeneralRoom;
