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
import { Bell, Search, Calendar, Save, Check, Loader2 } from 'lucide-react';
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

  // Content chart: platform filter and expected per day
  const [contentChartPlatformFilter, setContentChartPlatformFilter] = useState<'All' | Platform>('All');
  const [contentExpectedPerDay, setContentExpectedPerDay] = useLocalStorage<number>(`${storagePrefix}_content_expected_per_day`, 1);

  // Content from localStorage for dashboard chart (filtered by platform, with expected)
  const contentChartData: ContentDataPoint[] = useMemo(() => {
    try {
      const raw = localStorage.getItem(`${storagePrefix}_content`);
      if (!raw) return [];
      let items: ContentItem[] = JSON.parse(raw);
      if (contentChartPlatformFilter !== 'All') {
        items = items.filter(item => item.platform === contentChartPlatformFilter);
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayKey = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const countsByDay: Record<string, { total: number; published: number }> = {};
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        countsByDay[dayKey(d)] = { total: 0, published: 0 };
      }
      items.forEach(item => {
        const date = new Date(item.postDate);
        if (isNaN(date.getTime())) return;
        const key = dayKey(date);
        if (countsByDay[key] == null) return;
        countsByDay[key].total += 1;
        if (item.status === ContentStatus.DONE || item.status === ContentStatus.LIVE) {
          countsByDay[key].published += 1;
        }
      });
      return Object.keys(countsByDay)
        .sort()
        .map(key => ({
          date: new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          daysAhead: countsByDay[key].total,
          published: countsByDay[key].published,
          expected: contentExpectedPerDay,
        }));
    } catch {
      return [];
    }
  }, [storagePrefix, activeNav, contentChartPlatformFilter, contentExpectedPerDay]);

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
                          const platformLabel = contentChartPlatformFilter === 'All' ? '' : `${contentChartPlatformFilter} `;
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
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="text-sm text-[#9B9B9B]">Platform:</span>
                  <select
                    value={contentChartPlatformFilter}
                    onChange={e => setContentChartPlatformFilter(e.target.value as 'All' | Platform)}
                    className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-lg px-3 py-1.5 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]"
                  >
                    <option value="All">All</option>
                    <option value={Platform.YOUTUBE}>YouTube</option>
                    <option value={Platform.INSTAGRAM}>Instagram</option>
                    <option value={Platform.TIKTOK}>TikTok</option>
                    <option value={Platform.LINKEDIN}>LinkedIn</option>
                  </select>
                  <span className="text-sm text-[#9B9B9B]">Expected per day:</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={contentExpectedPerDay}
                    onChange={e => setContentExpectedPerDay(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-16 bg-[#2f2f2f] border border-[#3a3a3a] rounded-lg px-2 py-1.5 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]"
                  />
                </div>
              )}
              <AnalyticsChart
                view={activeChart}
                onChangeView={setActiveChart}
                revenueData={revenueChartData}
                contentData={contentChartData}
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
