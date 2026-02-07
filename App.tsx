import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import AnalyticsChart from './components/AnalyticsChart';
import MetricsTable from './components/MetricsTable';
import ContentManager from './components/ContentManager';
import FinanceManager from './components/FinanceManager';
import SwipefileManager from './components/SwipefileManager';
import TeamManager from './components/TeamManager';
import FunnelManager from './components/FunnelManager';
import AdsManager from './components/AdsManager';
import { ChartViewType, NavigationItem, FinanceItem, InvoiceStatus, RevenueDataPoint, ContentDataPoint, ContentItem, AdMetric, ContentStatus, Platform } from './types';
import { AD_METRICS } from './constants';
import { Bell, Search, Calendar, Save, Check, Loader2, Settings, Filter } from 'lucide-react';
import useLocalStorage from './hooks/useLocalStorage';
import { syncLocalDataToSupabase } from './services/syncLocalToSupabase';

const App: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavigationItem>(NavigationItem.DASHBOARD);
  const [activeChart, setActiveChart] = useState<ChartViewType>(ChartViewType.REVENUE);
  const [activeUserId, setActiveUserId] = useLocalStorage<string>('writestakeover_active_user', 'guilherme');

  // Storage prefix per user - "guilherme" user keeps existing 'writestakeover' prefix so all existing data stays
  const storagePrefix = activeUserId === 'guilherme' ? 'writestakeover' : `writestakeover_${activeUserId}`;

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncLocalDataToSupabase(storagePrefix);
      if (result.success) {
        setSyncResult({
          success: true,
          message: `Synced ${result.contentCount} content, ${result.adsCount} ads, ${result.funnelsCount} funnels`
        });
      } else {
        setSyncResult({
          success: false,
          message: `Errors: ${result.errors.join(', ')}`
        });
      }
      // Clear message after 5 seconds
      setTimeout(() => setSyncResult(null), 5000);
    } catch (err) {
      setSyncResult({ success: false, message: 'Sync failed' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Mock date
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

  // --- Finance State Management ---
  const [financeItems, setFinanceItems] = useLocalStorage<FinanceItem[]>(`${storagePrefix}_finance`, []);

  // Content chart: multi-select platforms (empty = all)
  const [contentChartSelectedPlatforms, setContentChartSelectedPlatforms] = useState<Platform[]>([]);
  const toggleContentPlatform = (p: Platform) => {
    setContentChartSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };
  const allPlatformsList: Platform[] = [Platform.YOUTUBE, Platform.INSTAGRAM, Platform.TIKTOK, Platform.LINKEDIN];
  const contentChartPlatforms = contentChartSelectedPlatforms.length === 0 ? allPlatformsList : contentChartSelectedPlatforms;

  // Per-platform expected posting config
  // mode: 'daily' = same count every day, 'weekly' = pick days + count per day
  interface PlatformExpectedConfig {
    mode: 'daily' | 'weekly';
    postsPerDay: number;       // used in daily mode
    weeklyDays: number[];      // days of week (0=Sun..6=Sat) in weekly mode
    postsPerPostDay: number;   // how many posts on each selected day in weekly mode
  }
  const DAYS_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const defaultExpectedConfig: Record<Platform, PlatformExpectedConfig> = {
    [Platform.YOUTUBE]: { mode: 'weekly', postsPerDay: 0, weeklyDays: [1, 3, 5], postsPerPostDay: 1 },
    [Platform.INSTAGRAM]: { mode: 'daily', postsPerDay: 0, weeklyDays: [], postsPerPostDay: 1 },
    [Platform.TIKTOK]: { mode: 'daily', postsPerDay: 0, weeklyDays: [], postsPerPostDay: 1 },
    [Platform.LINKEDIN]: { mode: 'daily', postsPerDay: 0, weeklyDays: [], postsPerPostDay: 1 },
  };
  const [contentExpectedByPlatform, setContentExpectedByPlatform] = useLocalStorage<Record<Platform, PlatformExpectedConfig>>(
    `${storagePrefix}_content_expected_v2`,
    defaultExpectedConfig
  );
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [settingsPopoverOpen, setSettingsPopoverOpen] = useState(false);

  const updatePlatformConfig = (platform: Platform, updates: Partial<PlatformExpectedConfig>) => {
    setContentExpectedByPlatform(prev => ({
      ...prev,
      [platform]: { ...prev[platform], ...updates },
    }));
  };

  const expectedForPlatformOnDate = (date: Date, platform: Platform): number => {
    const cfg = contentExpectedByPlatform[platform];
    if (!cfg) return 0;
    if (cfg.mode === 'daily') return cfg.postsPerDay;
    // weekly mode
    const dayOfWeek = date.getDay();
    return cfg.weeklyDays.includes(dayOfWeek) ? cfg.postsPerPostDay : 0;
  };

  const expectedForDate = (date: Date, platforms: Platform[]): number => {
    return platforms.reduce((sum, p) => sum + expectedForPlatformOnDate(date, p), 0);
  };

  // Content from localStorage for dashboard chart (filtered by selected platforms, expected by day of week) + items by date for tooltip
  const { contentChartData, contentItemsByDate } = useMemo(() => {
    const empty = { contentChartData: [] as ContentDataPoint[], contentItemsByDate: {} as Record<string, { title: string; platform: string }[]> };
    try {
      const raw = localStorage.getItem(`${storagePrefix}_content`);
      if (!raw) return empty;
      let items: ContentItem[] = JSON.parse(raw);
      const filteredItems = contentChartPlatforms.length === 0
        ? items
        : items.filter(item => contentChartPlatforms.includes(item.platform));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayKey = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const dateLabel = (key: string) => new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const countsByDay: Record<string, { total: number; published: number }> = {};
      const itemsByDay: Record<string, { title: string; platform: string }[]> = {};
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const key = dayKey(d);
        countsByDay[key] = { total: 0, published: 0 };
        itemsByDay[key] = [];
      }
      filteredItems.forEach(item => {
        const date = new Date(item.postDate);
        if (isNaN(date.getTime())) return;
        const key = dayKey(date);
        if (countsByDay[key] == null) return;
        countsByDay[key].total += 1;
        if (item.status === ContentStatus.DONE || item.status === ContentStatus.LIVE) {
          countsByDay[key].published += 1;
        }
        itemsByDay[key].push({ title: item.title || 'Untitled', platform: item.platform });
      });
      const contentChartData: ContentDataPoint[] = Object.keys(countsByDay)
        .sort()
        .map(key => {
          const d = new Date(key);
          const eYT = contentChartPlatforms.includes(Platform.YOUTUBE) ? expectedForPlatformOnDate(d, Platform.YOUTUBE) : 0;
          const eIG = contentChartPlatforms.includes(Platform.INSTAGRAM) ? expectedForPlatformOnDate(d, Platform.INSTAGRAM) : 0;
          const eTT = contentChartPlatforms.includes(Platform.TIKTOK) ? expectedForPlatformOnDate(d, Platform.TIKTOK) : 0;
          const eLI = contentChartPlatforms.includes(Platform.LINKEDIN) ? expectedForPlatformOnDate(d, Platform.LINKEDIN) : 0;
          return {
            date: dateLabel(key),
            daysAhead: countsByDay[key].total,
            published: countsByDay[key].published,
            expected: eYT + eIG + eTT + eLI,
            expectedYouTube: eYT,
            expectedInstagram: eIG,
            expectedTikTok: eTT,
            expectedLinkedIn: eLI,
          };
        });
      const contentItemsByDate: Record<string, { title: string; platform: string }[]> = {};
      Object.keys(itemsByDay).sort().forEach(key => {
        contentItemsByDate[dateLabel(key)] = itemsByDay[key];
      });
      return { contentChartData, contentItemsByDate };
    } catch {
      return empty;
    }
  }, [storagePrefix, activeNav, contentChartPlatforms, contentExpectedByPlatform]);

  // Campaign metrics (editable, persisted)
  const [campaignMetrics, setCampaignMetrics] = useLocalStorage<AdMetric[]>(`${storagePrefix}_campaign_metrics`, AD_METRICS);

  const handleUpdateMetric = (metric: AdMetric) => {
    setCampaignMetrics(prev => prev.map(m => m.id === metric.id ? metric : m));
  };
  const handleDeleteMetric = (id: string) => {
    setCampaignMetrics(prev => prev.filter(m => m.id !== id));
  };
  const handleAddMetric = (metric: Omit<AdMetric, 'id'>) => {
    setCampaignMetrics(prev => [...prev, { ...metric, id: Date.now().toString() }]);
  };

  // Calculate Chart Data for Revenue
  const revenueChartData: RevenueDataPoint[] = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const goal = 100000;

    const monthItems = financeItems.filter(item => {
        const d = new Date(item.invoiceDate);
        return d.getMonth() === currentMonth &&
               d.getFullYear() === currentYear &&
               item.status === InvoiceStatus.PAID;
    });

    const data: RevenueDataPoint[] = [];
    let cumulativeRevenue = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const dayRevenue = monthItems
            .filter(item => new Date(item.invoiceDate).getDate() === day)
            .reduce((sum, item) => sum + item.amount, 0);

        cumulativeRevenue += dayRevenue;

        if (day <= now.getDate()) {
             data.push({
                date: new Date(currentYear, currentMonth, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                revenue: cumulativeRevenue,
                goal: goal
            });
        }
    }

    if (data.length === 0) {
        return [{ date: new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue: 0, goal: goal }];
    }

    return data;
  }, [financeItems]);

  const totalRevenue = financeItems
    .filter(i => i.status === InvoiceStatus.PAID)
    .reduce((acc, curr) => acc + curr.amount, 0);

  // --- Finance Handlers ---
  const handleAddFinanceItem = (item: FinanceItem) => {
    setFinanceItems(prev => [...prev, item]);
  };
  const handleUpdateFinanceItem = (item: FinanceItem) => {
    setFinanceItems(prev => prev.map(i => i.id === item.id ? item : i));
  };
  const handleDeleteFinanceItem = (id: string) => {
    setFinanceItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="flex min-h-screen bg-[#212121] text-[#ECECEC] font-sans selection:bg-[#444444]">
      <Sidebar
        activeItem={activeNav}
        onNavigate={setActiveNav}
        activeUserId={activeUserId}
        onUserChange={setActiveUserId}
      />

      <main key={activeUserId} className="flex-1 ml-64 p-8 overflow-y-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-2xl font-bold text-[#ECECEC] mb-1">{activeNav}</h1>
            <p className="text-[#9B9B9B] text-sm flex items-center gap-2">
               <Calendar size={14} /> {today}
            </p>
          </div>

          <div className="relative flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" size={16} />
              <input
                type="text"
                placeholder="Search analytics..."
                className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-full pl-10 pr-4 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555] w-64 placeholder-[#666666]"
              />
            </div>
            <button
              onClick={handleSyncToCloud}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#9B9B9B] hover:text-[#ECECEC] transition-none rounded-lg hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-50"
              title="Save data to cloud"
            >
              {isSyncing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : syncResult?.success ? (
                <Check size={16} className="text-emerald-400" />
              ) : (
                <Save size={16} />
              )}
              <span className="hidden lg:inline">
                {isSyncing ? 'Saving...' : syncResult?.success ? 'Saved!' : 'Save'}
              </span>
            </button>
            {/* Save notification toast */}
            {syncResult && (
              <div className={`absolute top-full right-0 mt-2 px-4 py-2 rounded-lg text-sm font-medium shadow-lg border whitespace-nowrap z-50 ${
                syncResult.success
                  ? 'bg-[#2f2f2f] border-emerald-500/30 text-emerald-400'
                  : 'bg-[#2f2f2f] border-rose-500/30 text-rose-400'
              }`}>
                {syncResult.success ? 'Saved successfully!' : syncResult.message}
              </div>
            )}
            <button className="relative p-2 text-[#9B9B9B] hover:text-[#ECECEC] transition-none rounded-full hover:bg-[rgba(255,255,255,0.05)]">
              <Bell size={20} />
            </button>
          </div>
        </header>

        {activeNav === NavigationItem.DASHBOARD && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-[#2f2f2f] border border-[#3a3a3a] p-6 rounded-xl">
                  <p className="text-[#9B9B9B] text-sm font-medium mb-2">Total Revenue</p>
                  <h3 className="text-3xl font-bold text-[#ECECEC] mb-1">${totalRevenue.toLocaleString()}</h3>
                  <div className="flex items-center gap-2 text-xs">
                     <span className="text-[#ECECEC] font-medium">Live</span>
                     <span className="text-[#666666]">updates from Finance</span>
                  </div>
               </div>

               <div className="bg-[#2f2f2f] border border-[#3a3a3a] p-6 rounded-xl">
                  <p className="text-[#9B9B9B] text-sm font-medium mb-2">Content Buffer</p>
                  <h3 className="text-3xl font-bold text-[#ECECEC] mb-1">
                    {contentChartData.length > 0
                      ? (() => {
                          const totalPieces = contentChartData.reduce((s, d) => s + d.daysAhead, 0);
                          const daysWithContent = contentChartData.filter(d => d.daysAhead > 0).length;
                          const videoWord = totalPieces === 1 ? 'video' : 'videos';
                          const platformLabel = contentChartSelectedPlatforms.length === 0 ? '' : contentChartSelectedPlatforms.length === 1 ? `${contentChartSelectedPlatforms[0]} ` : `${contentChartSelectedPlatforms.length} platforms `;
                          return `${totalPieces} ${platformLabel}${videoWord} · ${daysWithContent} days`;
                        })()
                      : '—'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                     <span className="text-[#666666]">Next 14 days from your content</span>
                  </div>
               </div>

               <div className="bg-[#2f2f2f] border border-[#3a3a3a] p-6 rounded-xl">
                  <p className="text-[#9B9B9B] text-sm font-medium mb-2">Team Spend (MTD)</p>
                  <h3 className="text-3xl font-bold text-[#ECECEC] mb-1">$9,600.00</h3>
                  <div className="flex items-center gap-2 text-xs">
                     <span className="text-[#b4b4b4] font-medium">96%</span>
                     <span className="text-[#666666]">of budget utilized</span>
                  </div>
               </div>
            </div>

            {/* Main Charts */}
            <section>
              {activeChart === ChartViewType.CONTENT_SCHEDULE && (
                <div className="flex items-center gap-2 mb-3">
                  {/* Button 1: Filter */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setFilterPopoverOpen(!filterPopoverOpen); setSettingsPopoverOpen(false); }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2f2f2f] border border-[#3a3a3a] rounded-lg text-sm font-medium text-[#ECECEC] hover:border-[#4a4a4a] transition-none"
                    >
                      <Filter size={16} />
                      <span>Filter</span>
                      {contentChartSelectedPlatforms.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#ECECEC] text-[#212121] text-[10px] font-bold leading-none">{contentChartSelectedPlatforms.length}</span>
                      )}
                    </button>
                    {filterPopoverOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setFilterPopoverOpen(false)} />
                        <div className="absolute left-0 top-full mt-1 z-50 bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl p-4 shadow-xl min-w-[200px]">
                          <p className="text-xs font-semibold text-[#ECECEC] mb-3">Show Platforms</p>
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setContentChartSelectedPlatforms([])}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-none ${contentChartSelectedPlatforms.length === 0 ? 'bg-[rgba(255,255,255,0.08)] text-[#ECECEC]' : 'text-[#9B9B9B] hover:bg-[rgba(255,255,255,0.05)]'}`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${contentChartSelectedPlatforms.length === 0 ? 'bg-[#ECECEC] border-[#ECECEC]' : 'border-[#666666]'}`}>
                                {contentChartSelectedPlatforms.length === 0 && <Check size={10} className="text-[#212121]" />}
                              </div>
                              All Platforms
                            </button>
                            {allPlatformsList.map(p => {
                              const on = contentChartSelectedPlatforms.includes(p);
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => toggleContentPlatform(p)}
                                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-none ${on ? 'bg-[rgba(255,255,255,0.08)] text-[#ECECEC]' : 'text-[#9B9B9B] hover:bg-[rgba(255,255,255,0.05)]'}`}
                                >
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${on ? 'bg-[#ECECEC] border-[#ECECEC]' : 'border-[#666666]'}`}>
                                    {on && <Check size={10} className="text-[#212121]" />}
                                  </div>
                                  {p}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Button 2: Settings */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setSettingsPopoverOpen(!settingsPopoverOpen); setFilterPopoverOpen(false); }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2f2f2f] border border-[#3a3a3a] rounded-lg text-sm font-medium text-[#ECECEC] hover:border-[#4a4a4a] transition-none"
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>
                    {settingsPopoverOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setSettingsPopoverOpen(false)} />
                        <div className="absolute left-0 top-full mt-1 z-50 bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl p-5 shadow-xl min-w-[340px] max-h-[70vh] overflow-y-auto">
                          <p className="text-xs font-semibold text-[#ECECEC] mb-4">Expected Posting Schedule</p>
                          <div className="space-y-5">
                            {allPlatformsList.map(p => {
                              const cfg = contentExpectedByPlatform[p] || defaultExpectedConfig[p];
                              const platformColor = p === Platform.YOUTUBE ? '#ef4444' : p === Platform.INSTAGRAM ? '#c026d3' : p === Platform.TIKTOK ? '#06b6d4' : '#3b82f6';
                              return (
                                <div key={p} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium" style={{ color: platformColor }}>{p}</span>
                                    {/* Mode toggle */}
                                    <div className="flex bg-[#212121] rounded-lg p-0.5 border border-[#3a3a3a]">
                                      <button
                                        type="button"
                                        onClick={() => updatePlatformConfig(p, { mode: 'daily' })}
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-none ${cfg.mode === 'daily' ? 'bg-[#3a3a3a] text-[#ECECEC]' : 'text-[#666666] hover:text-[#9B9B9B]'}`}
                                      >
                                        Daily
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => updatePlatformConfig(p, { mode: 'weekly' })}
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-none ${cfg.mode === 'weekly' ? 'bg-[#3a3a3a] text-[#ECECEC]' : 'text-[#666666] hover:text-[#9B9B9B]'}`}
                                      >
                                        Weekly
                                      </button>
                                    </div>
                                  </div>

                                  {cfg.mode === 'daily' ? (
                                    <div className="flex items-center justify-between bg-[#212121] rounded-lg px-3 py-2 border border-[#3a3a3a]">
                                      <span className="text-xs text-[#9B9B9B]">Posts per day</span>
                                      <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => updatePlatformConfig(p, { postsPerDay: Math.max(0, cfg.postsPerDay - 1) })}
                                          className="w-6 h-6 rounded bg-[#2f2f2f] border border-[#3a3a3a] text-[#9B9B9B] hover:text-[#ECECEC] flex items-center justify-center text-xs font-medium transition-none">−</button>
                                        <span className="w-5 text-center text-sm font-medium text-[#ECECEC]">{cfg.postsPerDay}</span>
                                        <button type="button" onClick={() => updatePlatformConfig(p, { postsPerDay: cfg.postsPerDay + 1 })}
                                          className="w-6 h-6 rounded bg-[#2f2f2f] border border-[#3a3a3a] text-[#9B9B9B] hover:text-[#ECECEC] flex items-center justify-center text-xs font-medium transition-none">+</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {/* Day-of-week picker */}
                                      <div className="flex gap-1">
                                        {DAYS_LABELS.map((label, i) => {
                                          const on = cfg.weeklyDays.includes(i);
                                          return (
                                            <button
                                              key={i}
                                              type="button"
                                              onClick={() => {
                                                const next = on ? cfg.weeklyDays.filter(d => d !== i) : [...cfg.weeklyDays, i].sort((a, b) => a - b);
                                                updatePlatformConfig(p, { weeklyDays: next });
                                              }}
                                              className={`flex-1 h-7 rounded text-[10px] font-medium transition-none ${on ? 'text-[#212121]' : 'bg-[#212121] text-[#666666] hover:text-[#9B9B9B]'}`}
                                              style={on ? { backgroundColor: platformColor } : undefined}
                                            >
                                              {label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      {/* Posts per posting day */}
                                      <div className="flex items-center justify-between bg-[#212121] rounded-lg px-3 py-2 border border-[#3a3a3a]">
                                        <span className="text-xs text-[#9B9B9B]">Posts per posting day</span>
                                        <div className="flex items-center gap-2">
                                          <button type="button" onClick={() => updatePlatformConfig(p, { postsPerPostDay: Math.max(1, cfg.postsPerPostDay - 1) })}
                                            className="w-6 h-6 rounded bg-[#2f2f2f] border border-[#3a3a3a] text-[#9B9B9B] hover:text-[#ECECEC] flex items-center justify-center text-xs font-medium transition-none">−</button>
                                          <span className="w-5 text-center text-sm font-medium text-[#ECECEC]">{cfg.postsPerPostDay}</span>
                                          <button type="button" onClick={() => updatePlatformConfig(p, { postsPerPostDay: cfg.postsPerPostDay + 1 })}
                                            className="w-6 h-6 rounded bg-[#2f2f2f] border border-[#3a3a3a] text-[#9B9B9B] hover:text-[#ECECEC] flex items-center justify-center text-xs font-medium transition-none">+</button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              <AnalyticsChart
                view={activeChart}
                onChangeView={setActiveChart}
                revenueData={revenueChartData}
                contentData={contentChartData}
                contentItemsByDate={contentItemsByDate}
                visiblePlatforms={contentChartPlatforms}
              />
            </section>

            {/* Table */}
            <section>
              <MetricsTable
                data={campaignMetrics}
                onUpdate={handleUpdateMetric}
                onDelete={handleDeleteMetric}
                onAdd={handleAddMetric}
              />
            </section>
          </div>
        )}

        {activeNav === NavigationItem.CONTENT && (
           <ContentManager storagePrefix={storagePrefix} />
        )}

        {activeNav === NavigationItem.ADS && (
           <AdsManager storagePrefix={storagePrefix} />
        )}

        {activeNav === NavigationItem.FUNNELS && (
           <FunnelManager storagePrefix={storagePrefix} />
        )}

        {activeNav === NavigationItem.FINANCE && (
           <FinanceManager
              items={financeItems}
              onAdd={handleAddFinanceItem}
              onUpdate={handleUpdateFinanceItem}
              onDelete={handleDeleteFinanceItem}
              revenueChartData={revenueChartData}
           />
        )}

        {activeNav === NavigationItem.SWIPEFILE && (
            <SwipefileManager storagePrefix={storagePrefix} />
        )}

        {activeNav === NavigationItem.TEAM && (
            <TeamManager storagePrefix={storagePrefix} />
        )}

        {activeNav !== NavigationItem.DASHBOARD && activeNav !== NavigationItem.CONTENT && activeNav !== NavigationItem.FINANCE && activeNav !== NavigationItem.SWIPEFILE && activeNav !== NavigationItem.TEAM && activeNav !== NavigationItem.ADS && activeNav !== NavigationItem.FUNNELS && (
          <div className="h-96 flex flex-col items-center justify-center text-[#666666] border-2 border-dashed border-[#3a3a3a] rounded-xl">
            <p className="text-lg font-medium mb-2">Work in Progress</p>
            <p className="text-sm max-w-md text-center">
              The {activeNav.toLowerCase()} view is currently under development. Please return to the Dashboard.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
