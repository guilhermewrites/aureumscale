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
    <div className="flex min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-emerald-500/30">
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
            <h1 className="text-2xl font-bold text-white mb-1">{activeNav}</h1>
            <p className="text-gray-500 text-sm flex items-center gap-2">
               <Calendar size={14} /> {today}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                placeholder="Search analytics..."
                className="bg-gray-900 border border-gray-800 rounded-full pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-64 placeholder-gray-600"
              />
            </div>
            <button className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-900">
              <Bell size={20} />
            </button>
          </div>
        </header>

        {activeNav === NavigationItem.DASHBOARD && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all duration-500"></div>
                  <p className="text-gray-500 text-sm font-medium mb-2">Total Revenue</p>
                  <h3 className="text-3xl font-bold text-white mb-1">${totalRevenue.toLocaleString()}</h3>
                  <div className="flex items-center gap-2 text-xs">
                     <span className="text-emerald-400 font-medium">Live</span>
                     <span className="text-gray-600">updates from Finance</span>
                  </div>
               </div>

               <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-all duration-500"></div>
                  <p className="text-gray-500 text-sm font-medium mb-2">Content Buffer</p>
                  <h3 className="text-3xl font-bold text-white mb-1">12 Days</h3>
                  <div className="flex items-center gap-2 text-xs">
                     <span className="text-emerald-400 font-medium">+3 days</span>
                     <span className="text-gray-600">vs target</span>
                  </div>
               </div>

               <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-rose-500/20 transition-all duration-500"></div>
                  <p className="text-gray-500 text-sm font-medium mb-2">Team Spend (MTD)</p>
                  <h3 className="text-3xl font-bold text-white mb-1">$9,600.00</h3>
                  <div className="flex items-center gap-2 text-xs">
                     <span className="text-gray-400 font-medium">96%</span>
                     <span className="text-gray-600">of budget utilized</span>
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
          <div className="h-96 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-3xl">
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
