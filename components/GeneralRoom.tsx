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
      case 'done': return <CheckCircle2 size={14} className="text-emerald-400" />;
      case 'in_progress': return <Clock size={14} className="text-amber-400" />;
      default: return <div className="w-3.5 h-3.5 rounded-full border-2 border-[#555]" />;
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
      case 'high': return 'text-[#ccc]';
      case 'medium': return 'text-[#777]';
      default: return 'text-[#555]';
    }
  };

  const formatCurrency = (n: number) => {
    if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* --- HERO: $100K Goal Progress --- */}
      <div className="bg-[#1c1c1c] rounded-2xl border border-[#2a2a2a] p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-2xl font-bold text-[#ECECEC]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Road to $100K<span className="text-[#555] text-lg font-normal">/mo</span>
              </h2>
              <p className="text-xs text-[#666] mt-1">Your command center for scaling revenue</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-emerald-400">{formatCurrency(displayRevenue)}</div>
              <div className="text-xs text-[#666]">
                of {formatCurrency(goalAmount)} goal
                {revenueSource === 'clients' && ' · from clients'}
                {revenueSource === 'projected' && ' · this month'}
                {revenueSource === 'avg' && ' · monthly avg'}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 mb-2">
            <div className="h-3 bg-[#2a2a2a] rounded-full overflow-hidden relative">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700 relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10" />
              </div>
              {/* Milestone markers */}
              {milestones.map(ms => (
                <div
                  key={ms.id}
                  className="absolute top-0 h-full flex items-center"
                  style={{ left: `${(ms.amount / goalAmount) * 100}%` }}
                >
                  <div className={`w-0.5 h-full ${ms.status === 'reached' ? 'bg-emerald-400' : 'bg-[#444]'}`} />
                </div>
              ))}
            </div>
            {/* Milestone labels */}
            <div className="relative h-5 mt-1">
              {milestones.map((ms, idx) => {
                const pct = (ms.amount / goalAmount) * 100;
                const isLast = idx === milestones.length - 1;
                const isFirst = idx === 0;
                return (
                  <div
                    key={ms.id}
                    className={`absolute text-[9px] font-medium ${isLast ? '' : isFirst ? '' : '-translate-x-1/2'}`}
                    style={{
                      ...(isLast
                        ? { right: 0 }
                        : isFirst
                          ? { left: 0 }
                          : { left: `${pct}%` }),
                      color: ms.status === 'reached' ? '#10b981' : ms.status === 'current' ? '#ECECEC' : '#555',
                    }}
                  >
                    {ms.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* --- Gameplan Note --- */}
      <div className="bg-[#1c1c1c] rounded-2xl border border-[#2a2a2a] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Edit3 size={14} className="text-[#666]" />
            <span className="text-xs font-semibold text-[#ECECEC]">The Gameplan</span>
          </div>
          {!editingGameplan && (
            <button
              onClick={() => { setEditingGameplan(true); setTimeout(() => gameplanRef.current?.focus(), 50); }}
              className="text-[10px] text-[#555] hover:text-[#999] transition-none"
            >
              {gameplan ? 'Edit' : 'Write your mission'}
            </button>
          )}
        </div>
        {editingGameplan ? (
          <div>
            <textarea
              ref={gameplanRef}
              value={gameplan}
              onChange={e => setGameplan(e.target.value)}
              placeholder="Write your mission, your gameplan, the strategy to hit $100K/mo...&#10;&#10;Example:&#10;→ Build audience on X + YouTube to drive inbound leads&#10;→ Launch cold outreach system doing 100 DMs/day&#10;→ Run Meta Ads to VSL funnel once offer is validated&#10;→ Close 10 clients at $10K/mo average"
              rows={6}
              className="w-full bg-[#161616] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-[#ccc] placeholder-[#444] focus:outline-none focus:ring-1 focus:ring-[#3a3a3a] resize-none leading-relaxed"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => { setEditingGameplan(false); saveGameplan(gameplan); }}
                className="px-3 py-1.5 bg-[#2a2a2a] text-[#ECECEC] rounded-lg text-xs font-medium hover:bg-[#333] transition-none"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => { setEditingGameplan(true); setTimeout(() => gameplanRef.current?.focus(), 50); }}
            className="cursor-pointer"
          >
            {gameplan ? (
              <p className="text-sm text-[#999] whitespace-pre-wrap leading-relaxed">{gameplan}</p>
            ) : (
              <p className="text-sm text-[#444] italic">Click to write your mission and gameplan...</p>
            )}
          </div>
        )}
      </div>

      {/* --- Stat Cards --- */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#1c1c1c] rounded-2xl border border-[#2a2a2a] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-[#666] font-semibold">CHANNELS ACTIVE</span>
            <BarChart3 size={16} className="text-[#555]" />
          </div>
          <div className="text-2xl font-bold text-[#ECECEC]">{channels.length}</div>
          <div className="text-xs text-[#666] mt-1">Revenue channels</div>
        </div>

        <div className="bg-[#1c1c1c] rounded-2xl border border-[#2a2a2a] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-[#666] font-semibold">STRATEGIES</span>
            <Target size={16} className="text-[#555]" />
          </div>
          <div className="text-2xl font-bold text-[#ECECEC]">{completedStrategies}<span className="text-sm text-[#666] font-normal">/{totalStrategies}</span></div>
          <div className="text-xs text-[#666] mt-1">{inProgressStrategies} in progress</div>
        </div>

        <div className="bg-[#1c1c1c] rounded-2xl border border-[#2a2a2a] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-[#666] font-semibold">TARGET TOTAL</span>
            <DollarSign size={16} className="text-[#555]" />
          </div>
          <div className="text-2xl font-bold text-[#ECECEC]">{formatCurrency(totalTarget)}</div>
          <div className="text-xs text-[#666] mt-1">Across all channels</div>
        </div>

        <div className="bg-[#1c1c1c] rounded-2xl border border-[#2a2a2a] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-[#666] font-semibold">FROM CLIENTS</span>
            <DollarSign size={16} className="text-[#555]" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{formatCurrency(totalFromClients)}</div>
          <div className="text-xs text-[#666] mt-1">Monthly revenue</div>
        </div>
      </div>

      {/* === Channels & Strategies === */}
      {(
        <div className="space-y-3">
          {channels.map(ch => {
            const cfg = CHANNEL_CONFIG[ch.type];
            const doneCount = ch.strategies.filter(s => s.status === 'done').length;
            const totalCount = ch.strategies.length;
            const channelProgress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

            return (
              <div key={ch.id} className="bg-[#1c1c1c] rounded-2xl border border-[#2a2a2a] overflow-hidden">
                {/* Channel header */}
                <button
                  onClick={() => toggleChannel(ch.id)}
                  className="w-full flex items-center gap-4 p-5 hover:bg-[rgba(255,255,255,0.02)] transition-none"
                >
                  <span className="text-[#888]">{cfg.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-[#ECECEC]">{ch.name}</span>
                      <span className="text-[10px] text-[#666] bg-[#2a2a2a] px-2 py-0.5 rounded-full">
                        {doneCount}/{totalCount} done
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex-1 max-w-[200px] h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all bg-emerald-500/60" style={{ width: `${ch.target > 0 ? Math.min((getChannelCurrent(ch.type) / ch.target) * 100, 100) : 0}%` }} />
                      </div>
                      <span className="text-[10px] text-[#666]">
                        <span className="text-emerald-400">{formatCurrency(getChannelCurrent(ch.type))}</span> / {formatCurrency(ch.target)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-emerald-400 font-medium w-16 text-right">{formatCurrency(getChannelCurrent(ch.type))}</span>
                      <span className="text-[10px] text-[#555]">/</span>
                      <input
                        type="number"
                        value={ch.target}
                        onClick={e => e.stopPropagation()}
                        onChange={e => { e.stopPropagation(); updateChannelTarget(ch.id, Number(e.target.value) || 0); }}
                        className="w-20 bg-[#2a2a2a] border border-[#333] rounded-lg px-2 py-1 text-xs text-[#999] text-right focus:outline-none focus:ring-1 focus:ring-[#555]"
                        placeholder="Target $"
                      />
                    </div>
                    {ch.expanded ? <ChevronDown size={16} className="text-[#666]" /> : <ChevronRight size={16} className="text-[#666]" />}
                  </div>
                </button>

                {/* Strategies */}
                {ch.expanded && (
                  <div className="border-t border-[#2a2a2a] px-5 pb-4">
                    {ch.strategies.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-3 py-3 border-b border-[#222] last:border-0 group">
                        {/* Status toggle */}
                        <button onClick={() => cycleStatus(ch.id, s.id)} title={statusLabel(s.status)} className="flex-shrink-0">
                          {statusIcon(s.status)}
                        </button>

                        {/* Title */}
                        {editingStrategy === s.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              autoFocus
                              value={editStrategyText}
                              onChange={e => setEditStrategyText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveStrategyEdit(ch.id, s.id); if (e.key === 'Escape') setEditingStrategy(null); }}
                              className="flex-1 bg-[#2a2a2a] border border-[#444] rounded-lg px-3 py-1.5 text-xs text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                            />
                            <button onClick={() => saveStrategyEdit(ch.id, s.id)} className="text-emerald-400 hover:text-emerald-300"><Check size={14} /></button>
                            <button onClick={() => setEditingStrategy(null)} className="text-[#666] hover:text-[#999]"><X size={14} /></button>
                          </div>
                        ) : (
                          <span
                            className={`flex-1 text-xs ${s.status === 'done' ? 'text-[#666] line-through' : 'text-[#ccc]'}`}
                          >
                            {s.title}
                          </span>
                        )}

                        {/* Priority */}
                        <button
                          onClick={() => cyclePriority(ch.id, s.id)}
                          title={`Priority: ${s.priority}`}
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${priorityColor(s.priority)} opacity-60 hover:opacity-100`}
                        >
                          {s.priority}
                        </button>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingStrategy(s.id); setEditStrategyText(s.title); }}
                            className="text-[#666] hover:text-[#ccc]"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button onClick={() => deleteStrategy(ch.id, s.id)} className="text-[#666] hover:text-red-400">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add strategy */}
                    {addingToChannel === ch.id ? (
                      <div className="flex items-center gap-2 mt-3">
                        <input
                          autoFocus
                          value={newStrategyText}
                          onChange={e => setNewStrategyText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') addStrategy(ch.id); if (e.key === 'Escape') { setAddingToChannel(null); setNewStrategyText(''); } }}
                          placeholder="New strategy..."
                          className="flex-1 bg-[#2a2a2a] border border-[#333] rounded-lg px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                        />
                        <button onClick={() => addStrategy(ch.id)} className="px-3 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20">Add</button>
                        <button onClick={() => { setAddingToChannel(null); setNewStrategyText(''); }} className="text-[#666] hover:text-[#999]"><X size={14} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingToChannel(ch.id)}
                        className="flex items-center gap-2 mt-3 text-xs text-[#555] hover:text-[#999] transition-none"
                      >
                        <Plus size={14} /> Add strategy
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GeneralRoom;
