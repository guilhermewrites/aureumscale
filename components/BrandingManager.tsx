import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Plus, Trash2, Edit3, Check, X, Eye, Users, FileText, Heart, MessageCircle, Repeat2, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../services/supabaseClient';

// --- Types ---
type PlatformType = 'x' | 'instagram' | 'youtube';

interface BrandingSnapshot {
  id: string;
  platform: PlatformType;
  followers: number;
  following: number;
  total_views: number;
  total_posts: number;
  subscribers: number;
  snapshot_date: string;
}

interface BrandingAccount {
  id: string;
  platform: PlatformType;
  username: string;
  connected: boolean;
}

// --- Platform config ---
const PLATFORMS: { id: PlatformType; label: string; icon: string; color: string; gradient: string }[] = [
  { id: 'x', label: 'X (Twitter)', icon: '𝕏', color: '#ECECEC', gradient: 'rgba(236,236,236,0.12)' },
  { id: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C', gradient: 'rgba(225,48,108,0.12)' },
  { id: 'youtube', label: 'YouTube', icon: '▶️', color: '#FF0000', gradient: 'rgba(255,0,0,0.12)' },
];

const platformStrokeColors: Record<PlatformType, string> = {
  x: '#ECECEC',
  instagram: '#E1306C',
  youtube: '#FF0000',
};

interface BrandingManagerProps {
  storagePrefix: string;
}

const BrandingManager: React.FC<BrandingManagerProps> = ({ storagePrefix }) => {
  const [accounts, setAccounts] = useState<BrandingAccount[]>([]);
  const [snapshots, setSnapshots] = useState<BrandingSnapshot[]>([]);
  const [chartView, setChartView] = useState<'week' | 'month' | '3months' | 'year' | 'all'>('month');
  const [chartMetric, setChartMetric] = useState<'followers' | 'views'>('followers');
  const [chartPlatform, setChartPlatform] = useState<PlatformType | 'all'>('all');
  const [editingAccount, setEditingAccount] = useState<PlatformType | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [addSnapshotModal, setAddSnapshotModal] = useState<PlatformType | null>(null);
  const [snapshotForm, setSnapshotForm] = useState({ followers: '', following: '', total_views: '', total_posts: '', subscribers: '', snapshot_date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  // --- Load data ---
  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data: accts } = await supabase
        .from('branding_accounts')
        .select('*')
        .eq('user_id', storagePrefix);
      if (accts) setAccounts(accts);

      const { data: snaps } = await supabase
        .from('branding_snapshots')
        .select('*')
        .eq('user_id', storagePrefix)
        .order('snapshot_date', { ascending: true });
      if (snaps) setSnapshots(snaps);
    })();
  }, [storagePrefix]);

  // --- Account management ---
  const saveAccount = useCallback(async (platform: PlatformType, username: string) => {
    if (!supabase) return;
    const existing = accounts.find(a => a.platform === platform);
    if (existing) {
      await supabase.from('branding_accounts').update({ username, connected: true }).eq('id', existing.id).eq('user_id', storagePrefix);
      setAccounts(prev => prev.map(a => a.id === existing.id ? { ...a, username, connected: true } : a));
    } else {
      const id = crypto.randomUUID();
      await supabase.from('branding_accounts').insert({ id, user_id: storagePrefix, platform, username, connected: true });
      setAccounts(prev => [...prev, { id, platform, username, connected: true }]);
    }
    setEditingAccount(null);
    setUsernameInput('');
  }, [accounts, storagePrefix]);

  const removeAccount = useCallback(async (platform: PlatformType) => {
    if (!supabase) return;
    const existing = accounts.find(a => a.platform === platform);
    if (existing) {
      await supabase.from('branding_accounts').delete().eq('id', existing.id).eq('user_id', storagePrefix);
      setAccounts(prev => prev.filter(a => a.id !== existing.id));
    }
  }, [accounts, storagePrefix]);

  // --- Snapshot management ---
  const saveSnapshot = useCallback(async () => {
    if (!supabase || !addSnapshotModal) return;
    setSaving(true);
    const id = crypto.randomUUID();
    const row = {
      id,
      user_id: storagePrefix,
      platform: addSnapshotModal,
      followers: parseInt(snapshotForm.followers) || 0,
      following: parseInt(snapshotForm.following) || 0,
      total_views: parseInt(snapshotForm.total_views) || 0,
      total_posts: parseInt(snapshotForm.total_posts) || 0,
      subscribers: parseInt(snapshotForm.subscribers) || 0,
      snapshot_date: snapshotForm.snapshot_date,
    };
    const { error } = await supabase.from('branding_snapshots').insert(row);
    if (!error) {
      setSnapshots(prev => [...prev, row as BrandingSnapshot].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date)));
    }
    setSaving(false);
    setAddSnapshotModal(null);
    setSnapshotForm({ followers: '', following: '', total_views: '', total_posts: '', subscribers: '', snapshot_date: new Date().toISOString().split('T')[0] });
  }, [addSnapshotModal, snapshotForm, storagePrefix]);

  const deleteSnapshot = useCallback(async (id: string) => {
    if (!supabase) return;
    await supabase.from('branding_snapshots').delete().eq('id', id).eq('user_id', storagePrefix);
    setSnapshots(prev => prev.filter(s => s.id !== id));
  }, [storagePrefix]);

  // --- Computed: latest snapshot per platform ---
  const latestByPlatform = useMemo(() => {
    const result: Record<PlatformType, BrandingSnapshot | null> = { x: null, instagram: null, youtube: null };
    snapshots.forEach(s => {
      if (!result[s.platform] || s.snapshot_date > result[s.platform]!.snapshot_date) {
        result[s.platform] = s;
      }
    });
    return result;
  }, [snapshots]);

  // --- Computed: previous snapshot per platform (for growth) ---
  const previousByPlatform = useMemo(() => {
    const result: Record<PlatformType, BrandingSnapshot | null> = { x: null, instagram: null, youtube: null };
    const sorted = [...snapshots].sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date));
    (['x', 'instagram', 'youtube'] as PlatformType[]).forEach(p => {
      const platformSnaps = sorted.filter(s => s.platform === p);
      if (platformSnaps.length >= 2) result[p] = platformSnaps[1];
    });
    return result;
  }, [snapshots]);

  // --- Chart data ---
  const chartData = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (chartView) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(2020, 0, 1);
    }

    const filtered = snapshots.filter(s => {
      const d = new Date(s.snapshot_date);
      if (d < startDate) return false;
      if (chartPlatform !== 'all' && s.platform !== chartPlatform) return false;
      return true;
    });

    // Group by date
    const byDate: Record<string, { followers: number; views: number }> = {};
    filtered.forEach(s => {
      if (!byDate[s.snapshot_date]) byDate[s.snapshot_date] = { followers: 0, views: 0 };
      byDate[s.snapshot_date].followers += s.platform === 'youtube' ? s.subscribers : s.followers;
      byDate[s.snapshot_date].views += s.total_views;
    });

    return Object.keys(byDate).sort().map(date => ({
      name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      followers: byDate[date].followers,
      views: byDate[date].views,
    }));
  }, [snapshots, chartView, chartPlatform]);

  // --- Total followers across all platforms ---
  const totalFollowers = useMemo(() => {
    return (['x', 'instagram', 'youtube'] as PlatformType[]).reduce((sum, p) => {
      const latest = latestByPlatform[p];
      if (!latest) return sum;
      return sum + (p === 'youtube' ? latest.subscribers : latest.followers);
    }, 0);
  }, [latestByPlatform]);

  const totalViews = useMemo(() => {
    return (['x', 'instagram', 'youtube'] as PlatformType[]).reduce((sum, p) => {
      const latest = latestByPlatform[p];
      return sum + (latest?.total_views || 0);
    }, 0);
  }, [latestByPlatform]);

  // --- Format number ---
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const growthBadge = (current: number, previous: number | undefined) => {
    if (!previous || previous === 0) return null;
    const diff = current - previous;
    const pct = Math.round((diff / previous) * 100);
    if (diff === 0) return null;
    return (
      <span className={`flex items-center gap-0.5 text-[11px] font-medium ${diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {diff > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {diff > 0 ? '+' : ''}{fmt(diff)} ({pct > 0 ? '+' : ''}{pct}%)
      </span>
    );
  };

  const activeStrokeColor = chartPlatform === 'all' ? '#10b981' : platformStrokeColors[chartPlatform];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Overview Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Audience */}
        <div className="bg-[#1c1c1c] p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[#666] text-xs font-medium uppercase tracking-wider">Total Audience</p>
            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <Users size={14} className="text-emerald-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#ECECEC] mb-1">{fmt(totalFollowers)}</h3>
          <p className="text-[11px] text-[#555]">Across all platforms</p>
        </div>

        {/* Total Views */}
        <div className="bg-[#1c1c1c] p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[#666] text-xs font-medium uppercase tracking-wider">Total Views</p>
            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <Eye size={14} className="text-emerald-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#ECECEC] mb-1">{fmt(totalViews)}</h3>
          <p className="text-[11px] text-[#555]">Lifetime impressions</p>
        </div>

        {/* Total Posts */}
        <div className="bg-[#1c1c1c] p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[#666] text-xs font-medium uppercase tracking-wider">Total Posts</p>
            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <FileText size={14} className="text-[#888]" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#ECECEC] mb-1">
            {fmt((['x', 'instagram', 'youtube'] as PlatformType[]).reduce((sum, p) => sum + (latestByPlatform[p]?.total_posts || 0), 0))}
          </h3>
          <p className="text-[11px] text-[#555]">Across all platforms</p>
        </div>

        {/* Platforms Connected */}
        <div className="bg-[#1c1c1c] p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[#666] text-xs font-medium uppercase tracking-wider">Platforms</p>
            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <TrendingUp size={14} className="text-[#888]" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#ECECEC] mb-1">{accounts.filter(a => a.connected).length}/3</h3>
          <p className="text-[11px] text-[#555]">Connected</p>
        </div>
      </div>

      {/* ── Platform Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {PLATFORMS.map(p => {
          const account = accounts.find(a => a.platform === p.id);
          const latest = latestByPlatform[p.id];
          const prev = previousByPlatform[p.id];
          const isEditing = editingAccount === p.id;
          const followerLabel = p.id === 'youtube' ? 'Subscribers' : 'Followers';
          const followerCount = latest ? (p.id === 'youtube' ? latest.subscribers : latest.followers) : 0;
          const prevFollowerCount = prev ? (p.id === 'youtube' ? prev.subscribers : prev.followers) : undefined;

          return (
            <div key={p.id} className="bg-[#1c1c1c] rounded-2xl p-5 border border-[#252525] hover:border-[#333] transition-colors">
              {/* Platform Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: p.gradient }}>
                    {p.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#ECECEC]">{p.label}</h3>
                    {account ? (
                      <p className="text-[11px] text-[#555]">@{account.username}</p>
                    ) : (
                      <p className="text-[11px] text-[#555]">Not connected</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {account && (
                    <button
                      onClick={() => setAddSnapshotModal(p.id)}
                      className="p-1.5 rounded-lg text-[#555] hover:text-[#ECECEC] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                      title="Add snapshot"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (isEditing) {
                        setEditingAccount(null);
                      } else {
                        setEditingAccount(p.id);
                        setUsernameInput(account?.username || '');
                      }
                    }}
                    className="p-1.5 rounded-lg text-[#555] hover:text-[#ECECEC] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                    title={account ? 'Edit username' : 'Connect account'}
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              </div>

              {/* Username Editor */}
              {isEditing && (
                <div className="flex items-center gap-2 mb-4 bg-[#161616] rounded-xl p-2.5 border border-[#252525]">
                  <span className="text-[#555] text-sm">@</span>
                  <input
                    value={usernameInput}
                    onChange={e => setUsernameInput(e.target.value)}
                    placeholder="username"
                    className="flex-1 bg-transparent text-sm text-[#ECECEC] outline-none placeholder-[#444]"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && usernameInput.trim() && saveAccount(p.id, usernameInput.trim())}
                  />
                  <button
                    onClick={() => usernameInput.trim() && saveAccount(p.id, usernameInput.trim())}
                    className="p-1 rounded-lg text-emerald-400 hover:bg-[rgba(16,185,129,0.1)]"
                  >
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingAccount(null)} className="p-1 rounded-lg text-[#555] hover:text-[#888]">
                    <X size={14} />
                  </button>
                  {account && (
                    <button onClick={() => { removeAccount(p.id); setEditingAccount(null); }} className="p-1 rounded-lg text-red-400 hover:bg-[rgba(239,68,68,0.1)]" title="Disconnect">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}

              {/* Metrics */}
              {latest ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#555] uppercase tracking-wider">{followerLabel}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-[#ECECEC]">{fmt(followerCount)}</span>
                    </div>
                  </div>
                  {growthBadge(followerCount, prevFollowerCount) && (
                    <div className="flex justify-end -mt-1">{growthBadge(followerCount, prevFollowerCount)}</div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2" style={{ borderTop: '1px solid #252525' }}>
                    <div>
                      <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Views</p>
                      <p className="text-sm font-semibold text-[#ECECEC]">{fmt(latest.total_views)}</p>
                      {growthBadge(latest.total_views, prev?.total_views)}
                    </div>
                    <div>
                      <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Posts</p>
                      <p className="text-sm font-semibold text-[#ECECEC]">{fmt(latest.total_posts)}</p>
                      {growthBadge(latest.total_posts, prev?.total_posts)}
                    </div>
                    {p.id !== 'youtube' && (
                      <div>
                        <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Following</p>
                        <p className="text-sm font-semibold text-[#ECECEC]">{fmt(latest.following)}</p>
                      </div>
                    )}
                    {p.id === 'youtube' && (
                      <div>
                        <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Videos</p>
                        <p className="text-sm font-semibold text-[#ECECEC]">{fmt(latest.total_posts)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-[#444] text-sm mb-2">No data yet</p>
                  {account ? (
                    <button
                      onClick={() => setAddSnapshotModal(p.id)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      + Add first snapshot
                    </button>
                  ) : (
                    <p className="text-[11px] text-[#444]">Connect your account first</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Audience Growth Chart ── */}
      <div className="bg-[#1c1c1c] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#ECECEC]">Audience Growth</h2>
            <p className="text-[11px] text-[#555] mt-0.5">
              {chartMetric === 'followers' ? 'Follower / subscriber count over time' : 'Total views / impressions over time'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Metric toggle */}
            <div className="flex bg-[#161616] rounded-lg p-0.5 border border-[#252525]">
              {(['followers', 'views'] as const).map(m => (
                <button key={m} onClick={() => setChartMetric(m)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${chartMetric === m ? 'bg-[#252525] text-[#ECECEC]' : 'text-[#555] hover:text-[#888]'}`}>
                  {m === 'followers' ? 'Followers' : 'Views'}
                </button>
              ))}
            </div>

            {/* Platform filter */}
            <div className="flex bg-[#161616] rounded-lg p-0.5 border border-[#252525]">
              <button onClick={() => setChartPlatform('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${chartPlatform === 'all' ? 'bg-[#252525] text-[#ECECEC]' : 'text-[#555] hover:text-[#888]'}`}>
                All
              </button>
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setChartPlatform(p.id)}
                  className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${chartPlatform === p.id ? 'bg-[#252525]' : 'text-[#555] hover:text-[#888]'}`}>
                  {p.icon}
                </button>
              ))}
            </div>

            {/* Time range */}
            <div className="flex bg-[#161616] rounded-lg p-0.5 border border-[#252525]">
              {(['week', 'month', '3months', 'year', 'all'] as const).map(v => (
                <button key={v} onClick={() => setChartView(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${chartView === v ? 'bg-[#252525] text-[#ECECEC]' : 'text-[#555] hover:text-[#888]'}`}>
                  {v === 'week' ? '1W' : v === 'month' ? '1M' : v === '3months' ? '3M' : v === 'year' ? '1Y' : 'All'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ height: 300 }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="brandingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={activeStrokeColor} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={activeStrokeColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#252525" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#555', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => fmt(v)}
                />
                <Tooltip
                  contentStyle={{ background: '#1c1c1c', border: '1px solid #252525', borderRadius: 12, fontSize: 12, color: '#ECECEC' }}
                  formatter={(value: number) => [fmt(value), chartMetric === 'followers' ? 'Followers' : 'Views']}
                  labelStyle={{ color: '#888' }}
                />
                <Area
                  type="monotone"
                  dataKey={chartMetric}
                  stroke={activeStrokeColor}
                  strokeWidth={2.5}
                  fill="url(#brandingGradient)"
                  dot={{ r: 4, fill: activeStrokeColor, stroke: '#1c1c1c', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: activeStrokeColor, stroke: '#1c1c1c', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[#444]">
              <TrendingUp size={32} className="mb-3 text-[#333]" />
              <p className="text-sm font-medium mb-1">No data yet</p>
              <p className="text-xs text-[#444]">Add snapshots to your platforms to see growth over time</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Snapshot History ── */}
      <div className="bg-[#1c1c1c] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#ECECEC]">Snapshot History</h2>
            <p className="text-[11px] text-[#555] mt-0.5">Daily metrics log — add a snapshot whenever you check your stats</p>
          </div>
          <span className="text-[11px] text-[#555]">{snapshots.length} snapshots</span>
        </div>

        {snapshots.length === 0 ? (
          <p className="text-center text-[#444] text-sm py-8">No snapshots yet. Connect a platform and add your first snapshot.</p>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[#555]">
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Platform</div>
              <div className="col-span-2 text-right">Followers</div>
              <div className="col-span-2 text-right">Views</div>
              <div className="col-span-2 text-right">Posts</div>
              <div className="col-span-2 text-right">Following</div>
            </div>
            {[...snapshots].reverse().map(snap => {
              const pConfig = PLATFORMS.find(p => p.id === snap.platform);
              return (
                <div key={snap.id} className="grid grid-cols-12 gap-3 items-center px-3 py-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.03)] transition-colors group">
                  <div className="col-span-2 text-[12px] text-[#888]">
                    {new Date(snap.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-sm">{pConfig?.icon}</span>
                    <span className="text-[12px] text-[#ECECEC]">{pConfig?.label}</span>
                  </div>
                  <div className="col-span-2 text-right text-[13px] font-semibold text-[#ECECEC]">
                    {fmt(snap.platform === 'youtube' ? snap.subscribers : snap.followers)}
                  </div>
                  <div className="col-span-2 text-right text-[12px] text-[#888]">{fmt(snap.total_views)}</div>
                  <div className="col-span-2 text-right text-[12px] text-[#888]">{fmt(snap.total_posts)}</div>
                  <div className="col-span-2 text-right flex items-center justify-end gap-2">
                    <span className="text-[12px] text-[#888]">{snap.platform !== 'youtube' ? fmt(snap.following) : '—'}</span>
                    <button
                      onClick={() => deleteSnapshot(snap.id)}
                      className="p-1 rounded text-[#333] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete snapshot"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add Snapshot Modal ── */}
      {addSnapshotModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1c1c1c] border border-[#252525] rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-[#252525]">
              <h3 className="text-sm font-semibold text-[#ECECEC]">
                Add Snapshot — {PLATFORMS.find(p => p.id === addSnapshotModal)?.label}
              </h3>
              <p className="text-xs text-[#555] mt-1">Enter your current stats from the platform</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Date */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">Date</label>
                <input
                  type="date"
                  value={snapshotForm.snapshot_date}
                  onChange={e => setSnapshotForm(prev => ({ ...prev, snapshot_date: e.target.value }))}
                  className="w-full mt-1 bg-[#161616] border border-[#252525] rounded-xl px-3 py-2.5 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">
                    {addSnapshotModal === 'youtube' ? 'Subscribers' : 'Followers'}
                  </label>
                  <input
                    type="number"
                    value={addSnapshotModal === 'youtube' ? snapshotForm.subscribers : snapshotForm.followers}
                    onChange={e => setSnapshotForm(prev => ({
                      ...prev,
                      [addSnapshotModal === 'youtube' ? 'subscribers' : 'followers']: e.target.value
                    }))}
                    placeholder="0"
                    className="w-full mt-1 bg-[#161616] border border-[#252525] rounded-xl px-3 py-2.5 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555] placeholder-[#444]"
                  />
                </div>
                {addSnapshotModal !== 'youtube' && (
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">Following</label>
                    <input
                      type="number"
                      value={snapshotForm.following}
                      onChange={e => setSnapshotForm(prev => ({ ...prev, following: e.target.value }))}
                      placeholder="0"
                      className="w-full mt-1 bg-[#161616] border border-[#252525] rounded-xl px-3 py-2.5 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555] placeholder-[#444]"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">Total Views</label>
                  <input
                    type="number"
                    value={snapshotForm.total_views}
                    onChange={e => setSnapshotForm(prev => ({ ...prev, total_views: e.target.value }))}
                    placeholder="0"
                    className="w-full mt-1 bg-[#161616] border border-[#252525] rounded-xl px-3 py-2.5 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555] placeholder-[#444]"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">
                    {addSnapshotModal === 'youtube' ? 'Total Videos' : 'Total Posts'}
                  </label>
                  <input
                    type="number"
                    value={snapshotForm.total_posts}
                    onChange={e => setSnapshotForm(prev => ({ ...prev, total_posts: e.target.value }))}
                    placeholder="0"
                    className="w-full mt-1 bg-[#161616] border border-[#252525] rounded-xl px-3 py-2.5 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555] placeholder-[#444]"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-[#252525]">
              <button
                onClick={() => { setAddSnapshotModal(null); setSnapshotForm({ followers: '', following: '', total_views: '', total_posts: '', subscribers: '', snapshot_date: new Date().toISOString().split('T')[0] }); }}
                className="px-4 py-2 bg-[#252525] hover:bg-[#333] text-[#ECECEC] rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSnapshot}
                disabled={saving}
                className="px-4 py-2 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Snapshot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandingManager;
