import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Target, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronRight,
  DollarSign, Users, Megaphone, Globe, Phone, Mail, Zap,
  GripVertical, MoreHorizontal, Flag, Clock, CheckCircle2,
  AlertCircle, ArrowRight, Layers, BarChart3, Eye
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  inbound: { label: 'Inbound', icon: <Megaphone size={18} />, color: '#10b981', gradient: 'rgba(16,185,129,0.12)' },
  outbound: { label: 'Outbound', icon: <Phone size={18} />, color: '#3b82f6', gradient: 'rgba(59,130,246,0.12)' },
  paid_traffic: { label: 'Paid Traffic', icon: <Zap size={18} />, color: '#f59e0b', gradient: 'rgba(245,158,11,0.12)' },
  social_media: { label: 'Social Media', icon: <Globe size={18} />, color: '#8b5cf6', gradient: 'rgba(139,92,246,0.12)' },
  referrals: { label: 'Referrals', icon: <Users size={18} />, color: '#ec4899', gradient: 'rgba(236,72,153,0.12)' },
  partnerships: { label: 'Partnerships', icon: <Layers size={18} />, color: '#06b6d4', gradient: 'rgba(6,182,212,0.12)' },
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
}

const GeneralRoom: React.FC<GeneralRoomProps> = ({ storagePrefix }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>(DEFAULT_MILESTONES);
  const [weeklyLogs, setWeeklyLogs] = useState<WeeklyLog[]>([]);
  const [goalAmount] = useState(100000);
  const [editingStrategy, setEditingStrategy] = useState<string | null>(null);
  const [editStrategyText, setEditStrategyText] = useState('');
  const [addingToChannel, setAddingToChannel] = useState<string | null>(null);
  const [newStrategyText, setNewStrategyText] = useState('');
  const [showLogForm, setShowLogForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'blueprint' | 'pipeline' | 'log'>('blueprint');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Persistence ---
  const STORAGE_KEY = `aureum_general_room_${storagePrefix}`;
  const MILESTONES_KEY = `aureum_milestones_${storagePrefix}`;
  const LOGS_KEY = `aureum_weekly_logs_${storagePrefix}`;

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

    // Also try Supabase
    if (supabase) {
      supabase.from('general_room').select('*').eq('user_id', storagePrefix).single()
        .then(({ data }) => {
          if (data) {
            if (data.channels) { try { setChannels(JSON.parse(data.channels)); } catch {} }
            if (data.milestones) { try { setMilestones(JSON.parse(data.milestones)); } catch {} }
            if (data.weekly_logs) { try { setWeeklyLogs(JSON.parse(data.weekly_logs)); } catch {} }
          }
        });
    }
  }, [storagePrefix]);

  // Save
  const persistData = useCallback((ch: Channel[], ms: Milestone[], logs: WeeklyLog[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ch));
    localStorage.setItem(MILESTONES_KEY, JSON.stringify(ms));
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (supabase) {
        supabase.from('general_room').upsert({
          user_id: storagePrefix,
          channels: JSON.stringify(ch),
          milestones: JSON.stringify(ms),
          weekly_logs: JSON.stringify(logs),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
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

  // --- Computed ---
  const totalCurrent = useMemo(() => channels.reduce((sum, ch) => sum + ch.current, 0), [channels]);
  const totalTarget = useMemo(() => channels.reduce((sum, ch) => sum + ch.target, 0), [channels]);
  const progressPercent = goalAmount > 0 ? Math.min((totalCurrent / goalAmount) * 100, 100) : 0;

  const totalStrategies = useMemo(() => channels.reduce((sum, ch) => sum + ch.strategies.length, 0), [channels]);
  const completedStrategies = useMemo(() => channels.reduce((sum, ch) => sum + ch.strategies.filter(s => s.status === 'done').length, 0), [channels]);
  const inProgressStrategies = useMemo(() => channels.reduce((sum, ch) => sum + ch.strategies.filter(s => s.status === 'in_progress').length, 0), [channels]);

  // Pipeline chart data
  const pipelineData = useMemo(() => {
    return channels.map(ch => ({
      name: CHANNEL_CONFIG[ch.type].label,
      target: ch.target,
      current: ch.current,
      color: CHANNEL_CONFIG[ch.type].color,
    }));
  }, [channels]);

  // Weekly trend data
  const trendData = useMemo(() => {
    return [...weeklyLogs].sort((a, b) => a.week_start.localeCompare(b.week_start)).map(log => ({
      week: new Date(log.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: log.revenue,
      leads: log.leads,
      calls: log.calls_booked,
      deals: log.deals_closed,
    }));
  }, [weeklyLogs]);

  // --- Actions ---
  const toggleChannel = (channelId: string) => {
    updateChannels(channels.map(ch => ch.id === channelId ? { ...ch, expanded: !ch.expanded } : ch));
  };

  const updateChannelTarget = (channelId: string, target: number) => {
    updateChannels(channels.map(ch => ch.id === channelId ? { ...ch, target } : ch));
  };

  const updateChannelCurrent = (channelId: string, current: number) => {
    updateChannels(channels.map(ch => ch.id === channelId ? { ...ch, current } : ch));
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

  const addWeeklyLog = (log: Omit<WeeklyLog, 'id'>) => {
    const newLog: WeeklyLog = { ...log, id: `log-${Date.now()}` };
    updateLogs([...weeklyLogs, newLog]);
    setShowLogForm(false);
  };

  const deleteLog = (logId: string) => {
    updateLogs(weeklyLogs.filter(l => l.id !== logId));
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
      case 'high': return 'text-red-400';
      case 'medium': return 'text-amber-400';
      default: return 'text-[#666]';
    }
  };

  const formatCurrency = (n: number) => {
    if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* --- HERO: $100K Goal Progress --- */}
      <div className="bg-[#181818] rounded-2xl  p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-2xl font-medium text-[#e0e0e0]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Road to $100K<span className="text-[#555] text-lg font-normal">/mo</span>
              </h2>
              <p className="text-xs text-[#666] mt-1">Your command center for scaling revenue</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-emerald-400">{formatCurrency(totalCurrent)}</div>
              <div className="text-xs text-[#666]">of {formatCurrency(goalAmount)} goal</div>
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
              {milestones.map(ms => (
                <div
                  key={ms.id}
                  className="absolute text-[9px] font-medium -translate-x-1/2"
                  style={{
                    left: `${(ms.amount / goalAmount) * 100}%`,
                    color: ms.status === 'reached' ? '#10b981' : ms.status === 'current' ? '#ECECEC' : '#555',
                  }}
                >
                  {ms.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- Stat Cards --- */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#181818] rounded-2xl  p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-[#666] font-semibold">CHANNELS ACTIVE</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <BarChart3 size={16} className="text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-medium text-[#e0e0e0]">{channels.length}</div>
          <div className="text-xs text-[#666] mt-1">Revenue channels</div>
        </div>

        <div className="bg-[#181818] rounded-2xl  p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-[#666] font-semibold">STRATEGIES</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Target size={16} className="text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-medium text-[#e0e0e0]">{completedStrategies}<span className="text-sm text-[#666] font-normal">/{totalStrategies}</span></div>
          <div className="text-xs text-[#666] mt-1">{inProgressStrategies} in progress</div>
        </div>

        <div className="bg-[#181818] rounded-2xl  p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-[#666] font-semibold">TARGET TOTAL</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <DollarSign size={16} className="text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-medium text-[#e0e0e0]">{formatCurrency(totalTarget)}</div>
          <div className="text-xs text-[#666] mt-1">Across all channels</div>
        </div>

        <div className="bg-[#181818] rounded-2xl  p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-[#666] font-semibold">WEEKLY LOGS</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <FileLogIcon size={16} />
            </div>
          </div>
          <div className="text-2xl font-medium text-[#e0e0e0]">{weeklyLogs.length}</div>
          <div className="text-xs text-[#666] mt-1">Weeks tracked</div>
        </div>
      </div>

      {/* --- Tabs --- */}
      <div className="flex gap-1 bg-[#181818] rounded-xl p-1  w-fit">
        {(['blueprint', 'pipeline', 'log'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-xs font-semibold transition-none ${
              activeTab === tab
                ? 'bg-[#2a2a2a] text-[#e0e0e0]'
                : 'text-[#666] hover:text-[#999]'
            }`}
          >
            {tab === 'blueprint' ? '🗺️ Blueprint' : tab === 'pipeline' ? '📊 Pipeline' : '📋 Weekly Log'}
          </button>
        ))}
      </div>

      {/* === BLUEPRINT TAB === */}
      {activeTab === 'blueprint' && (
        <div className="space-y-3">
          {channels.map(ch => {
            const cfg = CHANNEL_CONFIG[ch.type];
            const doneCount = ch.strategies.filter(s => s.status === 'done').length;
            const totalCount = ch.strategies.length;
            const channelProgress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

            return (
              <div key={ch.id} className="bg-[#181818] rounded-2xl  overflow-hidden">
                {/* Channel header */}
                <button
                  onClick={() => toggleChannel(ch.id)}
                  className="w-full flex items-center gap-4 p-5 hover:bg-[rgba(255,255,255,0.02)] transition-none"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: cfg.gradient }}>
                    <span style={{ color: cfg.color }}>{cfg.icon}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-[#e0e0e0]">{ch.name}</span>
                      <span className="text-[10px] text-[#666] bg-[#2a2a2a] px-2 py-0.5 rounded-full">
                        {doneCount}/{totalCount} done
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex-1 max-w-[200px] h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${channelProgress}%`, background: cfg.color }} />
                      </div>
                      <span className="text-[10px] text-[#666]">{formatCurrency(ch.current)} / {formatCurrency(ch.target)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={ch.current}
                        onClick={e => e.stopPropagation()}
                        onChange={e => { e.stopPropagation(); updateChannelCurrent(ch.id, Number(e.target.value) || 0); }}
                        className="w-20 bg-[#2a2a2a] border border-[#333] rounded-lg px-2 py-1 text-xs text-emerald-400 text-right focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                        placeholder="Current $"
                      />
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
                  <div className="border-t border-[#1f1f1f] px-5 pb-4">
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
                              className="flex-1 bg-[#2a2a2a] border border-[#444] rounded-lg px-3 py-1.5 text-xs text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
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
                          className="flex-1 bg-[#2a2a2a] border border-[#333] rounded-lg px-3 py-2 text-xs text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
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

      {/* === PIPELINE TAB === */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* Channel breakdown bars */}
          <div className="bg-[#181818] rounded-2xl  p-6">
            <h3 className="text-sm font-medium text-[#e0e0e0] mb-4">Revenue by Channel</h3>
            <div className="space-y-4">
              {channels.map(ch => {
                const cfg = CHANNEL_CONFIG[ch.type];
                const pct = ch.target > 0 ? Math.min((ch.current / ch.target) * 100, 100) : 0;
                return (
                  <div key={ch.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span style={{ color: cfg.color }}>{cfg.icon}</span>
                        <span className="text-xs font-medium text-[#ccc]">{ch.name}</span>
                      </div>
                      <span className="text-xs text-[#666]">
                        <span style={{ color: cfg.color }}>{formatCurrency(ch.current)}</span> / {formatCurrency(ch.target)}
                      </span>
                    </div>
                    <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cfg.color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="mt-6 pt-4 border-t border-[#1f1f1f]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-[#e0e0e0]">Total</span>
                <span className="text-xs font-semibold">
                  <span className="text-emerald-400">{formatCurrency(totalCurrent)}</span>
                  <span className="text-[#666]"> / {formatCurrency(totalTarget)}</span>
                </span>
              </div>
              <div className="h-3 bg-[#2a2a2a] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Weekly trend chart */}
          {trendData.length > 0 && (
            <div className="bg-[#181818] rounded-2xl  p-6">
              <h3 className="text-sm font-medium text-[#e0e0e0] mb-4">Weekly Revenue Trend</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="week" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: '#666', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      contentStyle={{ background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 12, fontSize: 11 }}
                      labelStyle={{ color: '#999' }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#trendGradient)" dot={{ r: 3, fill: '#10b981' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === WEEKLY LOG TAB === */}
      {activeTab === 'log' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#e0e0e0]">Weekly Performance Log</h3>
            <button
              onClick={() => setShowLogForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-semibold hover:bg-emerald-500/20 transition-none"
            >
              <Plus size={14} /> Log This Week
            </button>
          </div>

          {/* Log form */}
          {showLogForm && <WeeklyLogForm onSave={addWeeklyLog} onCancel={() => setShowLogForm(false)} />}

          {/* Log entries */}
          {weeklyLogs.length === 0 && !showLogForm ? (
            <div className="bg-[#181818] rounded-2xl  p-12 text-center">
              <div className="text-[#444] mb-2"><BarChart3 size={32} className="mx-auto" /></div>
              <p className="text-sm text-[#666]">No weekly logs yet</p>
              <p className="text-xs text-[#555] mt-1">Start tracking your weekly performance to see trends</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...weeklyLogs].sort((a, b) => b.week_start.localeCompare(a.week_start)).map(log => (
                <div key={log.id} className="bg-[#181818] rounded-2xl  p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-[#e0e0e0]">
                        Week of {new Date(log.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-lg font-bold text-emerald-400">{formatCurrency(log.revenue)}</span>
                    </div>
                    <button onClick={() => deleteLog(log.id)} className="text-[#555] hover:text-red-400 transition-none">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-[10px] text-[#666] uppercase tracking-wider">Leads</div>
                      <div className="text-sm font-semibold text-[#ccc]">{log.leads}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#666] uppercase tracking-wider">Calls Booked</div>
                      <div className="text-sm font-semibold text-[#ccc]">{log.calls_booked}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#666] uppercase tracking-wider">Calls Showed</div>
                      <div className="text-sm font-semibold text-[#ccc]">{log.calls_showed}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#666] uppercase tracking-wider">Deals Closed</div>
                      <div className="text-sm font-semibold text-[#ccc]">{log.deals_closed}</div>
                    </div>
                  </div>
                  {log.notes && (
                    <div className="mt-3 pt-3 border-t border-[#1f1f1f]">
                      <p className="text-xs text-[#888]">{log.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Weekly Log Form ---
const WeeklyLogForm: React.FC<{ onSave: (log: Omit<WeeklyLog, 'id'>) => void; onCancel: () => void }> = ({ onSave, onCancel }) => {
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // Monday
    return d.toISOString().slice(0, 10);
  });
  const [revenue, setRevenue] = useState(0);
  const [leads, setLeads] = useState(0);
  const [callsBooked, setCallsBooked] = useState(0);
  const [callsShowed, setCallsShowed] = useState(0);
  const [dealsClosed, setDealsClosed] = useState(0);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onSave({
      week_start: weekStart,
      revenue,
      leads,
      calls_booked: callsBooked,
      calls_showed: callsShowed,
      deals_closed: dealsClosed,
      notes,
    });
  };

  const inputClass = "w-full bg-[#2a2a2a] border border-[#333] rounded-lg px-3 py-2 text-xs text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-emerald-500/30";

  return (
    <div className="bg-[#181818] rounded-2xl  p-5">
      <h4 className="text-xs font-medium text-[#e0e0e0] mb-4">Log Weekly Performance</h4>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#666] font-medium block mb-1">Week Starting</label>
          <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#666] font-medium block mb-1">Revenue ($)</label>
          <input type="number" value={revenue || ''} onChange={e => setRevenue(Number(e.target.value))} placeholder="0" className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#666] font-medium block mb-1">Leads Generated</label>
          <input type="number" value={leads || ''} onChange={e => setLeads(Number(e.target.value))} placeholder="0" className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#666] font-medium block mb-1">Calls Booked</label>
          <input type="number" value={callsBooked || ''} onChange={e => setCallsBooked(Number(e.target.value))} placeholder="0" className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#666] font-medium block mb-1">Calls Showed</label>
          <input type="number" value={callsShowed || ''} onChange={e => setCallsShowed(Number(e.target.value))} placeholder="0" className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#666] font-medium block mb-1">Deals Closed</label>
          <input type="number" value={dealsClosed || ''} onChange={e => setDealsClosed(Number(e.target.value))} placeholder="0" className={inputClass} />
        </div>
      </div>
      <div className="mb-4">
        <label className="text-[10px] uppercase tracking-wider text-[#666] font-medium block mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="What happened this week..."
          className={`${inputClass} resize-none`}
        />
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 bg-[#2a2a2a] text-[#999] rounded-lg text-xs font-medium hover:bg-[#333] transition-none">Cancel</button>
        <button onClick={handleSubmit} className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-500/20 transition-none">Save Log</button>
      </div>
    </div>
  );
};

// Small icon helper
const FileLogIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#a855f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
    <path d="M10 9H8" />
  </svg>
);

export default GeneralRoom;
