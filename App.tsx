import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import CRMBoard, { Prospect } from './components/CRMBoard';
import BrandingManager from './components/BrandingManager';
import GeneralRoom from './components/GeneralRoom';
import ArnasGintalasFunnel from './components/ArnasGintalasFunnel';
import AureumWebinarsFunnel from './components/AureumWebinarsFunnel';
import LukeAlexanderFunnel from './components/LukeAlexanderFunnel';
import LukeDataTab from './components/LukeDataTab';
import TheresaTheReaderFunnel from './components/TheresaTheReaderFunnel';
import TheresaDataTab from './components/TheresaDataTab';
import CalendarManager from './components/CalendarManager';
import MentorManager from './components/MentorManager';
import StudyManager from './components/StudyManager';
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
  '/crm': NavigationItem.CRM,
  '/clients': NavigationItem.CLIENTS,
  '/swipefile': NavigationItem.SWIPEFILE,
  '/team': NavigationItem.TEAM,
  '/contracts': NavigationItem.CONTRACTS,
  '/finance': NavigationItem.FINANCE,
  '/branding': NavigationItem.BRANDING,
  '/general-room': NavigationItem.GENERAL_ROOM,
  '/arnas-gintalas': NavigationItem.ARNAS_GINTALAS,
  '/aureum-webinars': NavigationItem.AUREUM_WEBINARS,
  '/luke-alexander': NavigationItem.LUKE_ALEXANDER,
  '/luke-alexander/data': NavigationItem.LUKE_ALEXANDER_DATA,
  '/theresa-the-reader': NavigationItem.THERESA_THE_READER,
  '/theresa-the-reader/data': NavigationItem.THERESA_THE_READER_DATA,
  '/calendar': NavigationItem.CALENDAR,
  '/mentor': NavigationItem.MENTOR,
  '/study': NavigationItem.STUDY,
};

const App: React.FC = () => {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Loader2 size={32} style={{ color: 'var(--au-text-3)', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSignIn={signIn} onSignUp={signUp} />;
  }

  return <AuthenticatedApp user={user} signOut={signOut} />;
};

// Standalone CRM page — converting a prospect creates a recurring client and navigates to /clients
const CRMPage: React.FC<{ storagePrefix: string }> = ({ storagePrefix }) => {
  const navigate = useNavigate();
  const handleConvert = async (prospect: Prospect) => {
    if (!supabase) return;
    try {
      await supabase.from('clients').insert({
        id: crypto.randomUUID(),
        user_id: storagePrefix,
        name: prospect.name || 'New client',
        photo_url: prospect.photo_url ?? null,
        payment_status: 'Pending',
        amount: prospect.deal_value || 0,
        cadence: '1x/month',
        service: 'Ghostwriting',
        leader: 'Guilherme Writes',
        status: 'Happy',
        acquisition: prospect.source || 'Inbound — DMs',
        client_type: 'recurring',
        order_num: 0,
        active: true,
      });
      await supabase.from('prospects').delete().eq('id', prospect.id);
      navigate('/clients');
    } catch (err) {
      console.error('Convert prospect error:', err);
    }
  };
  return <CRMBoard storagePrefix={storagePrefix} onConvert={handleConvert} />;
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

  // Mono uppercase date for the topbar (e.g. "SUN, MAY 3, 2026")
  const topbarDate = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#000', color: 'var(--au-text)', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar
        activeUserId={user.id}
        onUserChange={() => {}}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        onSignOut={signOut}
        userEmail={user.email}
        storagePrefix={storagePrefix}
      />

      <main
        key={user.id}
        className="flex-1 flex flex-col overflow-hidden"
        style={{ marginLeft: sidebarCollapsed ? 56 : 220 }}
      >
        {/* Topbar — slim, monospace breadcrumb + date + ghost actions */}
        <header
          className="flex-shrink-0 flex items-center"
          style={{ height: 48, padding: '0 22px', borderBottom: '1px solid var(--au-line)', gap: 14, background: '#000', position: 'relative' }}
        >
          <span className="au-eyebrow">— {activeNav}</span>
          <span className="au-eyebrow" style={{ color: 'var(--au-text-4)' }}>{topbarDate}</span>
          <div style={{ flex: 1 }} />

          {/* Search */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'transparent',
              border: '1px solid var(--au-line-2)',
              borderRadius: 0,
              padding: '6px 12px',
              color: 'var(--au-text-3)',
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '0.06em',
              minWidth: 220,
            }}
          >
            <Search size={12} />
            <input
              type="text"
              placeholder="SEARCH"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--au-text)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            />
          </div>

          <button
            onClick={handleSyncToCloud}
            disabled={isSyncing}
            title="Save data to cloud"
            className="au-btn-ghost"
            style={{ opacity: isSyncing ? 0.5 : 1 }}
          >
            {isSyncing ? (
              <Loader2 size={11} className="animate-spin" />
            ) : syncResult?.success ? (
              <Check size={11} style={{ color: 'var(--au-good)' }} />
            ) : (
              <Save size={11} />
            )}
            <span>{isSyncing ? 'Saving' : syncResult?.success ? 'Saved' : 'Save'}</span>
          </button>

          {syncResult && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 22,
                marginTop: 6,
                padding: '8px 12px',
                background: '#000',
                border: '1px solid ' + (syncResult.success ? 'rgba(109,212,154,0.4)' : 'rgba(212,109,109,0.4)'),
                color: syncResult.success ? 'var(--au-good)' : 'var(--au-bad)',
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
                zIndex: 50,
                borderRadius: 0,
              }}
            >
              {syncResult.success ? 'SAVED' : syncResult.message.toUpperCase()}
            </div>
          )}

          <button
            className="au-btn-ghost"
            style={{ padding: '6px 8px' }}
            title="Notifications"
          >
            <Bell size={11} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-8 pb-8 min-h-0" style={{ background: '#000' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={
          <div style={{ paddingTop: 36, paddingBottom: 80, maxWidth: 1280, margin: '0 auto' }}>

            {/* ── Page header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 32, paddingBottom: 22, borderBottom: '1px solid var(--au-line)' }}>
              <div style={{ flex: 1 }}>
                <div className="au-eyebrow" style={{ marginBottom: 10 }}>— Index · 001 · Subject · Operations</div>
                <h1 style={{ margin: 0, fontSize: 38, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--au-text)', lineHeight: 1 }}>The dashboard.</h1>
                <p style={{ margin: '10px 0 0', fontSize: 13.5, color: 'var(--au-text-2)', maxWidth: 460 }}>Revenue, invoices, clients. The numbers that matter today.</p>
              </div>
            </div>

            {/* ── Top Stat Cards (hairline grid) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid var(--au-line)', borderRight: 'none', marginBottom: 36 }}>
              {/* This Month */}
              <div style={{ padding: '20px 22px', borderRight: '1px solid var(--au-line)' }}>
                <div className="au-label" style={{ marginBottom: 12 }}>— This month</div>
                <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--au-text)', letterSpacing: '-0.025em', lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>${projectedMonthlyRevenue.toLocaleString()}</div>
                <div style={{ fontSize: 11.5, color: 'var(--au-text-3)', marginTop: 8, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>
                  <span style={{ color: 'var(--au-good)' }}>${paidThisMonth.toLocaleString()} COLLECTED</span>
                  {pendingThisMonth > 0 && <span> · ${pendingThisMonth.toLocaleString()} PENDING</span>}
                </div>
              </div>

              {/* Total Revenue */}
              <div style={{ padding: '20px 22px', borderRight: '1px solid var(--au-line)' }}>
                <div className="au-label" style={{ marginBottom: 12 }}>— Total revenue</div>
                <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--au-text)', letterSpacing: '-0.025em', lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>${totalRevenue.toLocaleString()}</div>
                <div style={{ fontSize: 11.5, color: 'var(--au-text-3)', marginTop: 8, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {momGrowth !== 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: momGrowth > 0 ? 'var(--au-good)' : 'var(--au-bad)' }}>
                      {momGrowth > 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                      {Math.abs(momGrowth)}%
                    </span>
                  )}
                  <span>VS LAST MONTH</span>
                </div>
              </div>

              {/* Outstanding */}
              <div style={{ padding: '20px 22px', borderRight: '1px solid var(--au-line)' }}>
                <div className="au-label" style={{ marginBottom: 12 }}>— Outstanding</div>
                <div style={{ fontSize: 28, fontWeight: 600, color: outstandingAmount > 0 ? 'var(--au-bad)' : 'var(--au-text)', letterSpacing: '-0.025em', lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>${outstandingAmount.toLocaleString()}</div>
                <div style={{ fontSize: 11.5, color: 'var(--au-text-3)', marginTop: 8, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>
                  {overdueAmount > 0 && <span style={{ color: 'var(--au-bad)' }}>${overdueAmount.toLocaleString()} OVERDUE</span>}
                  {overdueAmount === 0 && outstandingAmount > 0 && <span>WITHIN DUE DATES</span>}
                  {outstandingAmount === 0 && <span style={{ color: 'var(--au-good)' }}>ALL PAID</span>}
                </div>
              </div>

              {/* Clients */}
              <div style={{ padding: '20px 22px', borderRight: '1px solid var(--au-line)' }}>
                <div className="au-label" style={{ marginBottom: 12 }}>— Clients</div>
                <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--au-text)', letterSpacing: '-0.025em', lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>{String(activeClients).padStart(2, '0')}</div>
                <div style={{ fontSize: 11.5, color: 'var(--au-text-3)', marginTop: 8, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>AVG/MO ${avgMonthlyRevenue.toLocaleString()}</div>
              </div>
            </div>

            {/* ── Revenue Growth Chart ── */}
            <div style={{ border: '1px solid var(--au-line)', padding: 24, marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22, gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div className="au-label" style={{ marginBottom: 6 }}>— Revenue growth</div>
                  <div style={{ fontSize: 13, color: 'var(--au-text-2)' }}>
                    {dashView === 'today' ? "Today's revenue" : dashView === 'week' ? 'This week' : dashView === 'month' ? 'This month' : new Date().getFullYear() + ' progress'}
                  </div>
                </div>
                <div style={{ display: 'flex', border: '1px solid var(--au-line-2)' }}>
                  {(['today', 'week', 'month', 'year'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setDashView(v)}
                      style={{
                        padding: '6px 12px',
                        background: dashView === v ? 'var(--au-text)' : 'transparent',
                        color: dashView === v ? '#000' : 'var(--au-text-3)',
                        border: 'none',
                        borderRight: '1px solid var(--au-line-2)',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6dd49a" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#6dd49a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="#1a1a1a" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#5a5a5a', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100000]} tick={{ fill: '#5a5a5a', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`} ticks={[0, 25000, 50000, 75000, 100000]} />
                    <Tooltip
                      contentStyle={{ background: '#000', border: '1px solid #242424', borderRadius: 0, fontSize: 11, color: '#f4f4f4', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'REVENUE']}
                      labelStyle={{ color: '#909090' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#6dd49a"
                      strokeWidth={1.25}
                      fill="url(#revenueGradient)"
                      dot={false}
                      activeDot={{ r: 3, fill: '#6dd49a', stroke: '#000', strokeWidth: 1.5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Billing History ── */}
            <div style={{ marginBottom: 36 }}>
              <div className="au-label" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span>— Billing history</span>
                <span style={{ flex: 1, height: 1, background: 'var(--au-line)' }} />
                <span>{String(billingInvoices.length).padStart(2, '0')} INVOICES</span>
              </div>
              <div style={{ border: '1px solid var(--au-line)' }}>
                {billingInvoices.length === 0 ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--au-text-3)', fontSize: 13 }}>
                    No invoices yet. Create invoices in client billing tabs.
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 2fr 2fr 3fr', gap: 14, padding: '14px 18px', background: '#060606', borderBottom: '1px solid var(--au-line)', fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, fontWeight: 500, color: 'var(--au-text-3)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
                      <div>Client</div>
                      <div>Service</div>
                      <div style={{ textAlign: 'right' }}>Amount</div>
                      <div style={{ textAlign: 'center' }}>Status</div>
                      <div style={{ textAlign: 'right' }}>Date</div>
                    </div>
                    {[...billingInvoices].sort((a, b) => {
                      const da = new Date(a.date_paid || a.date_due || a.date_sent || '');
                      const db = new Date(b.date_paid || b.date_due || b.date_sent || '');
                      return db.getTime() - da.getTime();
                    }).map(inv => {
                      const cl = dashClients.find(c => c.id === inv.client_id);
                      const isOverdue = inv.status === 'Overdue';
                      const statusColor = inv.status === 'Paid' ? 'var(--au-good)' : inv.status === 'Cancelled' ? 'var(--au-text-3)' : isOverdue ? 'var(--au-bad)' : 'var(--au-text-2)';
                      const dateStr = inv.date_paid || inv.date_due || inv.date_sent || '';
                      const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }).toUpperCase() : '—';
                      return (
                        <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 2fr 2fr 3fr', gap: 14, padding: '14px 18px', borderBottom: '1px solid var(--au-line)', alignItems: 'center', fontSize: 13 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            {cl?.photo_url ? (
                              <img src={cl.photo_url} alt="" style={{ width: 24, height: 24, objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 24, height: 24, background: '#0a0a0a', border: '1px solid var(--au-line-2)', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 10, fontWeight: 600, color: 'var(--au-text-2)', fontFamily: 'JetBrains Mono, monospace' }}>{cl?.name?.charAt(0) || '?'}</div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ color: 'var(--au-text)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cl?.name || 'Unknown'}</div>
                              {inv.invoice_number && <div style={{ color: 'var(--au-text-4)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>#{inv.invoice_number}</div>}
                            </div>
                          </div>
                          <div style={{ color: 'var(--au-text-2)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.service || cl?.service || '—'}</div>
                          <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--au-text)', fontFamily: 'JetBrains Mono, monospace' }}>${(inv.amount || 0).toLocaleString()}</div>
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: statusColor, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                              {inv.status}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--au-text-3)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>{formattedDate}</div>
                        </div>
                      );
                    })}
                    {/* Totals row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 2fr 2fr 3fr', gap: 14, padding: '14px 18px', background: '#060606' }}>
                      <div style={{ gridColumn: '1 / 3', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--au-text-3)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>— Total</div>
                      <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--au-text)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>${billingInvoices.filter(i => i.status !== 'Cancelled').reduce((s, i) => s + (i.amount || 0), 0).toLocaleString()}</div>
                      <div style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--au-text-3)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{billingInvoices.filter(i => i.status === 'Paid').length} PAID</div>
                      <div />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Status grids ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid var(--au-line)', borderRight: 'none' }}>
              {/* Payment Status Breakdown */}
              <div style={{ padding: 24, borderRight: '1px solid var(--au-line)' }}>
                <div className="au-label" style={{ marginBottom: 18 }}>— Payment status</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {(['Paid', 'Pending', 'Late', 'Missing Invoice'] as const).map(status => {
                    const count = dashClients.filter(c => c.active !== false && c.payment_status === status).length;
                    const pct = activeClients > 0 ? Math.round((count / activeClients) * 100) : 0;
                    const color = status === 'Paid' ? 'var(--au-good)' : status === 'Pending' ? '#e0c870' : status === 'Late' ? 'var(--au-bad)' : 'var(--au-text-3)';
                    return (
                      <div key={status}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: 'var(--au-text)' }}>{status}</span>
                          <span style={{ fontSize: 10.5, color: 'var(--au-text-3)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>{String(count).padStart(2, '0')} · {pct}%</span>
                        </div>
                        <div style={{ height: 1, background: 'var(--au-line-2)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Client Satisfaction */}
              <div style={{ padding: 24, borderRight: '1px solid var(--au-line)' }}>
                <div className="au-label" style={{ marginBottom: 18 }}>— Client satisfaction</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {(['Happy', 'Moderate', 'Frustrated'] as const).map(status => {
                    const count = dashClients.filter(c => c.active !== false && c.status === status).length;
                    const pct = activeClients > 0 ? Math.round((count / activeClients) * 100) : 0;
                    const color = status === 'Happy' ? 'var(--au-good)' : status === 'Moderate' ? '#e0c870' : 'var(--au-bad)';
                    return (
                      <div key={status}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: 'var(--au-text)' }}>{status}</span>
                          <span style={{ fontSize: 10.5, color: 'var(--au-text-3)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>{String(count).padStart(2, '0')} · {pct}%</span>
                        </div>
                        <div style={{ height: 1, background: 'var(--au-line-2)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
          } />

          <Route path="/crm" element={<CRMPage storagePrefix={storagePrefix} />} />
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
          <Route path="/general-room" element={<GeneralRoom storagePrefix={storagePrefix} projectedRevenue={projectedMonthlyRevenue} avgRevenue={avgMonthlyRevenue} />} />
          <Route path="/contracts" element={
            <div className="h-96 flex flex-col items-center justify-center text-[#666666] border-2 border-dashed border-[#242424] rounded-none">
              <p className="text-lg font-medium mb-2">Work in Progress</p>
              <p className="text-sm max-w-md text-center">
                The contracts view is currently under development. Please return to the Dashboard.
              </p>
            </div>
          } />
          <Route path="/arnas-gintalas" element={<ArnasGintalasFunnel storagePrefix={storagePrefix} />} />
          <Route path="/aureum-webinars" element={<AureumWebinarsFunnel storagePrefix={storagePrefix} />} />
          <Route path="/luke-alexander" element={<LukeAlexanderFunnel storagePrefix={storagePrefix} />} />
          <Route path="/luke-alexander/data" element={
            <div className="h-full flex flex-col">
              <div className="mb-3 flex-shrink-0">
                <h1 className="text-lg font-semibold text-[#f4f4f4]">Luke Alexander — Data</h1>
                <p className="text-xs text-[#5a5a5a] mt-0.5">Leads, buyers, attendance, Calendly, profit & failed payments</p>
              </div>
              <LukeDataTab />
            </div>
          } />
          <Route path="/theresa-the-reader" element={<TheresaTheReaderFunnel storagePrefix={storagePrefix} />} />
          <Route path="/theresa-the-reader/data" element={
            <div className="h-full flex flex-col">
              <div className="mb-3 flex-shrink-0">
                <h1 className="text-lg font-semibold text-[#f4f4f4]">Theresa The Reader — Data</h1>
                <p className="text-xs text-[#5a5a5a] mt-0.5">Quiz starts, completions, reveals, offer views & purchases</p>
              </div>
              <TheresaDataTab />
            </div>
          } />
          <Route path="/calendar" element={<CalendarManager storagePrefix={storagePrefix} />} />
          <Route path="/mentor" element={<MentorManager storagePrefix={storagePrefix} />} />
          <Route path="/study" element={<StudyManager />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </div>
      </main>
    </div>
  );
};

export default App;
