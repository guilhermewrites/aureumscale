import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import AnalyticsChart from './components/AnalyticsChart';
import MetricsTable from './components/MetricsTable';
import ContentManager from './components/ContentManager';
import FinanceManager from './components/FinanceManager';
import SwipefileManager from './components/SwipefileManager';
import TeamManager from './components/TeamManager';
import FunnelManager from './components/FunnelManager';
import AdsManager from './components/AdsManager';
import PlannerManager from './components/PlannerManager';
import ClientsManager from './components/ClientsManager';
import BrandingManager from './components/BrandingManager';
import GeneralRoom from './components/GeneralRoom';
import AIBubble from './components/AIBubble';
import { ChartViewType, NavigationItem, FinanceItem, InvoiceStatus, RevenueDataPoint, ContentDataPoint, ContentItem, AdMetric, ContentStatus, Platform } from './types';
import { AD_METRICS } from './constants';
import { Bell, Search, Calendar, Save, Check, Loader2, Settings, Filter, TrendingUp, TrendingDown, Users, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useLocalStorage from './hooks/useLocalStorage';
import useAuth from './hooks/useAuth';
import { syncLocalDataToSupabase } from './services/syncLocalToSupabase';
import { supabase } from './services/supabaseClient';

// Map route paths to NavigationItem labels for the header
const routeToNav: Record<string, NavigationItem> = {
  '/dashboard': NavigationItem.DASHBOARD,
  '/clients': NavigationItem.CLIENTS,
  '/swipefile': NavigationItem.SWIPEFILE,
  '/team': NavigationItem.TEAM,
  '/contracts': NavigationItem.CONTRACTS,
  '/finance': NavigationItem.FINANCE,
  '/branding': NavigationItem.BRANDING,
  '/general-room': NavigationItem.GENERAL_ROOM,
};

const App: React.FC = () => {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#131313',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Loader2 size={32} style={{ color: '#555', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSignIn={signIn} onSignUp={signUp} />;
  }

  return <AuthenticatedApp user={user} signOut={signOut} />;
};

// Wrapper that passes current client context to AIBubble based on URL
const AIBubbleWithClient: React.FC<{ storagePrefix: string }> = ({ storagePrefix }) => {
  const location = useLocation();
  const [clientInfo, setClientInfo] = React.useState<{ id: string; name: string; service: string; handle: string; bio: string } | null>(null);

  React.useEffect(() => {
    const match = location.pathname.match(/^\/clients\/(.+)$/);
    if (!match) { setClientInfo(null); return; }
    const clientId = match[1];
    if (!supabase) return;
    supabase.from('clients').select('id, name, service').eq('id', clientId).eq('user_id', storagePrefix).single()
      .then(({ data }) => {
        if (data) {
          supabase!.from('client_details').select('social_platforms').eq('client_id', clientId).eq('user_id', storagePrefix).single()
            .then(({ data: det }) => {
              const socials = det?.social_platforms as any;
              setClientInfo({
                id: data.id,
                name: data.name || '',
                service: data.service || '',
                handle: socials?.twitter || '',
                bio: '',
              });
            });
        } else {
          setClientInfo(null);
        }
      });
  }, [location.pathname, storagePrefix]);

  return (
    <AIBubble
      storagePrefix={storagePrefix}
      clientId={clientInfo?.id}
      clientName={clientInfo?.name}
      clientService={clientInfo?.service}
      clientHandle={clientInfo?.handle}
    />
  );
};

const AuthenticatedApp: React.FC<{ user: User; signOut: () => Promise<void> }> = ({ user, signOut }) => {
  const location = useLocation();
  // Derive the active nav label from the current route
  const activeNav = useMemo(() => {
    const path = location.pathname;
    // Check for /clients/:id pattern
    if (path.startsWith('/clients')) return NavigationItem.CLIENTS;
    return routeToNav[path] || NavigationItem.DASHBOARD;
  }, [location.pathname]);

  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage<boolean>('aureum_sidebar_collapsed', false);
  const [activeChart, setActiveChart] = useState<ChartViewType>(ChartViewType.REVENUE);

  // Use authenticated user ID as storage prefix
  const storagePrefix = user.id;

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

  // --- Finance State Management (Supabase) ---
  const [financeItems, setFinanceItems] = useState<FinanceItem[]>([]);

  // Map DB row -> FinanceItem
  const financeFromRow = (row: any): FinanceItem => ({
    id: row.id,
    amount: Number(row.amount),
    clientName: row.label,
    invoiceDate: row.date,
    status: row.status as InvoiceStatus,
  });

  // Map FinanceItem -> DB row
  const financeToRow = (item: FinanceItem, userId: string) => ({
    id: item.id,
    user_id: userId,
    label: item.clientName,
    amount: item.amount,
    type: 'income',
    status: item.status,
    date: item.invoiceDate,
  });

  // Load finance items from Supabase on mount / when storagePrefix changes
  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('finance_items')
          .select('*')
          .eq('user_id', storagePrefix)
          .order('created_at', { ascending: false });
        if (error) { console.error('Finance load error:', error); return; }
        setFinanceItems((data ?? []).map(financeFromRow));
      } catch (err) {
        console.error('Finance load error:', err);
      }
    };
    load();
  }, [storagePrefix]);

  // Load billing invoices for projected revenue — refreshes every time you switch to Dashboard
  const [billingInvoices, setBillingInvoices] = useState<{ id: string; amount: number; status: string; date_due: string; date_paid: string; date_sent: string; client_id: string; service: string; invoice_number: string }[]>([]);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data } = await supabase
        .from('billing_history')
        .select('id, amount, status, date_due, date_paid, date_sent, client_id, service, invoice_number')
        .eq('user_id', storagePrefix)
        .order('created_at', { ascending: false });
      if (data) setBillingInvoices(data);
    })();
  }, [storagePrefix, activeNav]);

  // Load all clients for dashboard
  const [dashClients, setDashClients] = useState<{ id: string; name: string; service: string; amount: number; payment_status: string; status: string; active: boolean; photo_url: string }[]>([]);
  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name, service, amount, payment_status, status, active, photo_url')
        .eq('user_id', storagePrefix);
      if (data) setDashClients(data);
    })();
  }, [storagePrefix, activeNav]);

  const isThisMonth = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  // Paid this month — invoices with status 'Paid' where date_paid falls this month
  const paidThisMonth = useMemo(() => {
    return billingInvoices
      .filter(inv => inv.status === 'Paid')
      .filter(inv => isThisMonth(inv.date_paid))
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [billingInvoices]);

  // Pending this month — NOT Paid/Cancelled, due date OR sent date this month (includes Scheduled)
  const pendingThisMonth = useMemo(() => {
    return billingInvoices
      .filter(inv => inv.status !== 'Paid' && inv.status !== 'Cancelled')
      .filter(inv => isThisMonth(inv.date_due) || (!inv.date_due && isThisMonth(inv.date_sent)))
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [billingInvoices]);

  // Overdue — past due date and not paid
  const overdueAmount = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return billingInvoices
      .filter(inv => inv.status !== 'Paid' && inv.status !== 'Cancelled' && inv.date_due)
      .filter(inv => {
        const due = new Date(inv.date_due);
        return !isNaN(due.getTime()) && due < now;
      })
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [billingInvoices]);

  const projectedMonthlyRevenue = paidThisMonth + pendingThisMonth;

  // Dashboard view toggle
  const [dashView, setDashView] = useState<'today' | 'week' | 'month' | 'year'>('month');

  // Active clients count
  const activeClients = useMemo(() => dashClients.filter(c => c.active !== false).length, [dashClients]);

  // Average monthly revenue from billing (last 3 months of paid invoices)
  const avgMonthlyRevenue = useMemo(() => {
    const now = new Date();
    let total = 0;
    let monthsWithData = 0;
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthPaid = billingInvoices
        .filter(inv => inv.status === 'Paid')
        .filter(inv => {
          const pd = new Date(inv.date_paid);
          return !isNaN(pd.getTime()) && pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        })
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);
      if (monthPaid > 0) { total += monthPaid; monthsWithData++; }
    }
    return monthsWithData > 0 ? Math.round(total / monthsWithData) : 0;
  }, [billingInvoices]);

  // Outstanding (unpaid/pending invoices total)
  const outstandingAmount = useMemo(() => {
    return billingInvoices
      .filter(inv => inv.status !== 'Paid' && inv.status !== 'Cancelled')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [billingInvoices]);

  // Helper: get invoice date
  const getInvDate = (inv: { date_paid: string; date_due: string; date_sent: string }) => {
    const dateStr = inv.date_paid || inv.date_due || inv.date_sent;
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Chart data for each view
  const chartData = useMemo(() => {
    const now = new Date();

    if (dashView === 'today') {
      // Hourly buckets for today (group by hour, show cumulative)
      const buckets: { label: string; paid: number }[] = [];
      for (let h = 0; h <= now.getHours(); h++) {
        buckets.push({ label: `${h}:00`, paid: 0 });
      }
      billingInvoices.forEach(inv => {
        if (inv.status !== 'Paid') return;
        const d = getInvDate(inv);
        if (!d) return;
        if (d.toDateString() === now.toDateString()) {
          const h = d.getHours();
          if (buckets[h]) buckets[h].paid += inv.amount || 0;
        }
      });
      let cum = 0;
      return buckets.map(b => { cum += b.paid; return { name: b.label, revenue: cum }; });
    }

    if (dashView === 'week') {
      // Daily buckets for this week (Mon-Sun)
      const dayOfWeek = now.getDay() || 7; // 1=Mon...7=Sun
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
      const days: { label: string; date: Date; paid: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), date: d, paid: 0 });
      }
      billingInvoices.forEach(inv => {
        if (inv.status !== 'Paid') return;
        const d = getInvDate(inv);
        if (!d) return;
        const entry = days.find(day => d.toDateString() === day.date.toDateString());
        if (entry) entry.paid += inv.amount || 0;
      });
      let cum = 0;
      return days.map(d => { cum += d.paid; return { name: d.label, revenue: cum }; });
    }

    if (dashView === 'month') {
      // Daily buckets for this month
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const days: { label: string; day: number; paid: number }[] = [];
      for (let i = 1; i <= daysInMonth; i++) {
        days.push({ label: `${i}`, day: i, paid: 0 });
      }
      billingInvoices.forEach(inv => {
        if (inv.status !== 'Paid') return;
        const d = getInvDate(inv);
        if (!d) return;
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          const entry = days[d.getDate() - 1];
          if (entry) entry.paid += inv.amount || 0;
        }
      });
      let cum = 0;
      return days.map(d => { cum += d.paid; return { name: d.label, revenue: cum }; });
    }

    // year — monthly buckets Jan-Dec
    const months: { label: string; month: number; paid: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), i, 1);
      months.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), month: i, paid: 0 });
    }
    billingInvoices.forEach(inv => {
      if (inv.status !== 'Paid') return;
      const d = getInvDate(inv);
      if (!d) return;
      if (d.getFullYear() === now.getFullYear()) {
        months[d.getMonth()].paid += inv.amount || 0;
      }
    });
    let cum = 0;
    return months.map(m => { cum += m.paid; return { name: m.label, revenue: cum }; });
  }, [billingInvoices, dashView]);

  // Month-over-month growth
  const momGrowth = useMemo(() => {
    const now = new Date();
    const thisMonthPaid = billingInvoices
      .filter(inv => inv.status === 'Paid')
      .filter(inv => { const d = getInvDate(inv); return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthPaid = billingInvoices
      .filter(inv => inv.status === 'Paid')
      .filter(inv => { const d = getInvDate(inv); return d && d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear(); })
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    if (lastMonthPaid === 0) return thisMonthPaid > 0 ? 100 : 0;
    return Math.round(((thisMonthPaid - lastMonthPaid) / lastMonthPaid) * 100);
  }, [billingInvoices]);

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

  const totalRevenue = billingInvoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);

  // --- Finance Handlers ---
  const handleAddFinanceItem = useCallback(async (item: FinanceItem) => {
    setFinanceItems(prev => [...prev, item]);
    if (!supabase) return;
    try {
      const { error } = await supabase.from('finance_items').insert(financeToRow(item, storagePrefix));
      if (error) console.error('Finance insert error:', error);
    } catch (err) { console.error('Finance insert error:', err); }
  }, [storagePrefix]);

  const handleUpdateFinanceItem = useCallback(async (item: FinanceItem) => {
    setFinanceItems(prev => prev.map(i => i.id === item.id ? item : i));
    if (!supabase) return;
    try {
      const row = financeToRow(item, storagePrefix);
      const { error } = await supabase
        .from('finance_items')
        .update({ label: row.label, amount: row.amount, status: row.status, date: row.date })
        .eq('id', item.id)
        .eq('user_id', storagePrefix);
      if (error) console.error('Finance update error:', error);
    } catch (err) { console.error('Finance update error:', err); }
  }, [storagePrefix]);

  const handleDeleteFinanceItem = useCallback(async (id: string) => {
    setFinanceItems(prev => prev.filter(i => i.id !== id));
    if (!supabase) return;
    try {
      const { error } = await supabase.from('finance_items').delete().eq('id', id).eq('user_id', storagePrefix);
      if (error) console.error('Finance delete error:', error);
    } catch (err) { console.error('Finance delete error:', err); }
  }, [storagePrefix]);

  return (
    <div className="flex min-h-screen bg-[#212121] text-[#ECECEC] font-sans selection:bg-[#444444]">
      <Sidebar
        activeUserId={user.id}
        onUserChange={() => {}}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        onSignOut={signOut}
        userEmail={user.email}
      />

      <main key={user.id} className={`flex-1 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} p-8 overflow-y-auto`}>
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

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* ── Top Stat Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {/* Monthly Revenue */}
               <div className="bg-[#1c1c1c] p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[#666] text-xs font-medium uppercase tracking-wider">This Month</p>
                    <div className="p-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)' }}><DollarSign size={14} className="text-emerald-400" /></div>
                  </div>
                  <h3 className="text-2xl font-bold text-[#ECECEC] mb-1">${projectedMonthlyRevenue.toLocaleString()}</h3>
                  <div className="flex items-center gap-2 text-xs">
                     <span className="text-emerald-400 font-medium">${paidThisMonth.toLocaleString()} collected</span>
                     {pendingThisMonth > 0 && <span className="text-[#555]">· ${pendingThisMonth.toLocaleString()} pending</span>}
                  </div>
               </div>

               {/* Total Revenue */}
               <div className="bg-[#1c1c1c] p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[#666] text-xs font-medium uppercase tracking-wider">Total Revenue</p>
                    <div className="p-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)' }}><TrendingUp size={14} className="text-emerald-400" /></div>
                  </div>
                  <h3 className="text-2xl font-bold text-[#ECECEC] mb-1">${totalRevenue.toLocaleString()}</h3>
                  <div className="flex items-center gap-1.5 text-xs">
                    {momGrowth !== 0 && (
                      <span className={`flex items-center gap-0.5 font-medium ${momGrowth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {momGrowth > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(momGrowth)}%
                      </span>
                    )}
                    <span className="text-[#555]">vs last month</span>
                  </div>
               </div>

               {/* Outstanding */}
               <div className="bg-[#1c1c1c] p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[#666] text-xs font-medium uppercase tracking-wider">Outstanding</p>
                    <div className="p-1.5 rounded-lg" style={{ background: outstandingAmount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)' }}>
                      <DollarSign size={14} className={outstandingAmount > 0 ? 'text-red-400' : 'text-[#555]'} />
                    </div>
                  </div>
                  <h3 className={`text-2xl font-bold mb-1 ${outstandingAmount > 0 ? 'text-red-400' : 'text-[#ECECEC]'}`}>${outstandingAmount.toLocaleString()}</h3>
                  <div className="flex items-center gap-2 text-xs">
                    {overdueAmount > 0 && <span className="text-red-400 font-medium">${overdueAmount.toLocaleString()} overdue</span>}
                    {overdueAmount === 0 && outstandingAmount > 0 && <span className="text-[#555]">All within due dates</span>}
                    {outstandingAmount === 0 && <span className="text-emerald-400 font-medium">All paid</span>}
                  </div>
               </div>

               {/* Active Clients */}
               <div className="bg-[#1c1c1c] p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[#666] text-xs font-medium uppercase tracking-wider">Clients</p>
                    <div className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}><Users size={14} className="text-[#888]" /></div>
                  </div>
                  <h3 className="text-2xl font-bold text-[#ECECEC] mb-1">{activeClients}</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#555]">Avg/mo: ${avgMonthlyRevenue.toLocaleString()}</span>
                  </div>
               </div>
            </div>

            {/* ── Revenue Growth Chart ── */}
            <div className="bg-[#1c1c1c] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-sm font-bold text-[#ECECEC]">Revenue Growth</h2>
                  <p className="text-[11px] text-[#555] mt-0.5">
                    {dashView === 'today' ? "Today's revenue" : dashView === 'week' ? 'This week' : dashView === 'month' ? 'This month' : new Date().getFullYear() + ' progress'}
                  </p>
                </div>
                <div className="flex bg-[#161616] rounded-lg p-0.5 border border-[#252525]">
                  {(['today', 'week', 'month', 'year'] as const).map(v => (
                    <button key={v} onClick={() => setDashView(v)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${dashView === v ? 'bg-[#252525] text-[#ECECEC]' : 'text-[#555] hover:text-[#888]'}`}>
                      {v === 'today' ? 'Today' : v === 'week' ? 'Week' : v === 'month' ? 'Month' : 'Year'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#252525" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100000]} tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} ticks={[0, 25000, 50000, 75000, 100000]} />
                    <Tooltip
                      contentStyle={{ background: '#1c1c1c', border: '1px solid #252525', borderRadius: 12, fontSize: 12, color: '#ECECEC' }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                      labelStyle={{ color: '#888' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={1.5}
                      fill="url(#revenueGradient)"
                      dot={false}
                      activeDot={{ r: 3, fill: '#10b981', stroke: '#1c1c1c', strokeWidth: 1.5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Billing History ── */}
            <div className="bg-[#1c1c1c] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-[#ECECEC]">Billing History</h2>
                  <p className="text-[11px] text-[#555] mt-0.5">Individual invoices across all clients</p>
                </div>
                <span className="text-[11px] text-[#555]">{billingInvoices.length} invoices</span>
              </div>
              {billingInvoices.length === 0 ? (
                <p className="text-center text-[#444] text-sm py-8">No invoices yet. Create invoices in client billing tabs.</p>
              ) : (
                <div className="space-y-1">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[#555]">
                    <div className="col-span-3">Client</div>
                    <div className="col-span-2">Service</div>
                    <div className="col-span-2 text-right">Amount</div>
                    <div className="col-span-2 text-center">Status</div>
                    <div className="col-span-3 text-right">Date</div>
                  </div>
                  {[...billingInvoices].sort((a, b) => {
                    const da = new Date(a.date_paid || a.date_due || a.date_sent || '');
                    const db = new Date(b.date_paid || b.date_due || b.date_sent || '');
                    return db.getTime() - da.getTime();
                  }).map(inv => {
                    const cl = dashClients.find(c => c.id === inv.client_id);
                    const isOverdue = inv.status === 'Overdue';
                    const statusColor = inv.status === 'Paid' ? 'text-emerald-400' : inv.status === 'Cancelled' ? 'text-[#555]' : isOverdue ? 'text-[#e8a838]' : 'text-[#b0b0b0]';
                    const statusBg = inv.status === 'Paid' ? 'rgba(16,185,129,0.1)' : inv.status === 'Cancelled' ? 'rgba(255,255,255,0.04)' : isOverdue ? 'rgba(232,168,56,0.1)' : 'rgba(255,255,255,0.06)';
                    const dateStr = inv.date_paid || inv.date_due || inv.date_sent || '';
                    const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—';
                    return (
                      <div key={inv.id} className="grid grid-cols-12 gap-3 items-center px-3 py-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                        <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                          {cl?.photo_url ? (
                            <img src={cl.photo_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#252525] flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-[#888]">{cl?.name?.charAt(0) || '?'}</div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[#ECECEC] truncate">{cl?.name || 'Unknown'}</p>
                            {inv.invoice_number && <p className="text-[10px] text-[#444] truncate">#{inv.invoice_number}</p>}
                          </div>
                        </div>
                        <div className="col-span-2 text-[12px] text-[#888] truncate">{inv.service || cl?.service || '—'}</div>
                        <div className="col-span-2 text-right text-[13px] font-semibold text-[#ECECEC]">${(inv.amount || 0).toLocaleString()}</div>
                        <div className="col-span-2 text-center">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor}`} style={{ background: statusBg }}>{inv.status}</span>
                        </div>
                        <div className="col-span-3 text-right text-[12px] text-[#666]">{formattedDate}</div>
                      </div>
                    );
                  })}
                  {/* Totals row */}
                  <div className="grid grid-cols-12 gap-3 px-3 py-2.5 mt-1" style={{ borderTop: '1px solid #252525' }}>
                    <div className="col-span-5 text-[12px] font-semibold text-[#888]">Total</div>
                    <div className="col-span-2 text-right text-[13px] font-bold text-[#ECECEC]">
                      ${billingInvoices.filter(i => i.status !== 'Cancelled').reduce((s, i) => s + (i.amount || 0), 0).toLocaleString()}
                    </div>
                    <div className="col-span-2 text-center text-[11px] text-[#555]">
                      {billingInvoices.filter(i => i.status === 'Paid').length} paid
                    </div>
                    <div className="col-span-3" />
                  </div>
                </div>
              )}
            </div>

            {/* ── Growth & Client Status Summary ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Payment Status Breakdown */}
              <div className="bg-[#1c1c1c] rounded-2xl p-6">
                <h2 className="text-sm font-bold text-[#ECECEC] mb-4">Payment Status</h2>
                <div className="space-y-3">
                  {(['Paid', 'Pending', 'Late', 'Missing Invoice'] as const).map(status => {
                    const count = dashClients.filter(c => c.active !== false && c.payment_status === status).length;
                    const pct = activeClients > 0 ? Math.round((count / activeClients) * 100) : 0;
                    const color = status === 'Paid' ? '#10b981' : status === 'Pending' ? '#eab308' : status === 'Late' ? '#ef4444' : '#666';
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-[#ECECEC]">{status}</span>
                          <span className="text-xs text-[#666]">{count} clients · {pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#161616] overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Client Satisfaction */}
              <div className="bg-[#1c1c1c] rounded-2xl p-6">
                <h2 className="text-sm font-bold text-[#ECECEC] mb-4">Client Satisfaction</h2>
                <div className="space-y-3">
                  {(['Happy', 'Moderate', 'Frustrated'] as const).map(status => {
                    const count = dashClients.filter(c => c.active !== false && c.status === status).length;
                    const pct = activeClients > 0 ? Math.round((count / activeClients) * 100) : 0;
                    const color = status === 'Happy' ? '#10b981' : status === 'Moderate' ? '#eab308' : '#ef4444';
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-[#ECECEC]">{status}</span>
                          <span className="text-xs text-[#666]">{count} clients · {pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#161616] overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
          } />

          <Route path="/clients/:id" element={<ClientsManager storagePrefix={storagePrefix} />} />
          <Route path="/clients" element={<ClientsManager storagePrefix={storagePrefix} />} />
          <Route path="/swipefile" element={<SwipefileManager storagePrefix={storagePrefix} />} />
          <Route path="/team" element={<TeamManager storagePrefix={storagePrefix} />} />
          <Route path="/finance" element={
            <FinanceManager
              items={financeItems}
              onAdd={handleAddFinanceItem}
              onUpdate={handleUpdateFinanceItem}
              onDelete={handleDeleteFinanceItem}
              revenueChartData={revenueChartData}
            />
          } />
          <Route path="/branding" element={<BrandingManager storagePrefix={storagePrefix} />} />
          <Route path="/general-room" element={<GeneralRoom storagePrefix={storagePrefix} />} />
          <Route path="/contracts" element={
            <div className="h-96 flex flex-col items-center justify-center text-[#666666] border-2 border-dashed border-[#3a3a3a] rounded-xl">
              <p className="text-lg font-medium mb-2">Work in Progress</p>
              <p className="text-sm max-w-md text-center">
                The contracts view is currently under development. Please return to the Dashboard.
              </p>
            </div>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      {/* Floating AI bubble — always visible, passes current client context from URL */}
      <AIBubbleWithClient storagePrefix={storagePrefix} />
    </div>
  );
};

export default App;
