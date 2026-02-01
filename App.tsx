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
import { ChartViewType, NavigationItem, FinanceItem, InvoiceStatus, RevenueDataPoint } from './types';
import { AD_METRICS } from './constants';
import { Bell, Search, Calendar } from 'lucide-react';
import useLocalStorage from './hooks/useLocalStorage';

const App: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavigationItem>(NavigationItem.DASHBOARD);
  const [activeChart, setActiveChart] = useState<ChartViewType>(ChartViewType.REVENUE);
  const [activeUserId, setActiveUserId] = useLocalStorage<string>('writestakeover_active_user', 'guilherme');

  // Storage prefix per user - "guilherme" user keeps existing 'writestakeover' prefix so all existing data stays
  const storagePrefix = activeUserId === 'guilherme' ? 'writestakeover' : `writestakeover_${activeUserId}`;

  // Mock date
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

  // --- Finance State Management ---
  const [financeItems, setFinanceItems] = useLocalStorage<FinanceItem[]>(`${storagePrefix}_finance`, []);

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

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" size={16} />
              <input
                type="text"
                placeholder="Search analytics..."
                className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-full pl-10 pr-4 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555] w-64 placeholder-[#666666]"
              />
            </div>
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
                  <h3 className="text-3xl font-bold text-[#ECECEC] mb-1">12 Days</h3>
                  <div className="flex items-center gap-2 text-xs">
                     <span className="text-[#ECECEC] font-medium">+3 days</span>
                     <span className="text-[#666666]">vs target</span>
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
              <AnalyticsChart
                view={activeChart}
                onChangeView={setActiveChart}
                revenueData={revenueChartData}
              />
            </section>

            {/* Table */}
            <section>
              <MetricsTable data={AD_METRICS} />
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
