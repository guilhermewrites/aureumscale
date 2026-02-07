import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  Line,
  LineChart,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from 'recharts';
import { ChartViewType, RevenueDataPoint, ContentDataPoint, Platform } from '../types';
import { CONTENT_DATA, TEAM_SPEND_DATA } from '../constants';

// Shared colors
const CHART_PRIMARY = '#10b981';   // emerald – actual content
const CHART_SECONDARY = '#6366f1'; // indigo – fallback

// Platform brand colors
const PLATFORM_COLORS: Record<string, string> = {
  [Platform.YOUTUBE]: '#ef4444',
  [Platform.INSTAGRAM]: '#c026d3',
  [Platform.TIKTOK]: '#06b6d4',
  [Platform.LINKEDIN]: '#3b82f6',
};

// Platform icons as small SVG paths for chart labels
const PLATFORM_ICONS: Record<string, { path: string; viewBox: string }> = {
  [Platform.YOUTUBE]: {
    path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
    viewBox: '0 0 24 24',
  },
  [Platform.INSTAGRAM]: {
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z',
    viewBox: '0 0 24 24',
  },
  [Platform.TIKTOK]: {
    path: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
    viewBox: '0 0 24 24',
  },
  [Platform.LINKEDIN]: {
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
    viewBox: '0 0 24 24',
  },
};

export interface ContentItemForTooltip {
  title: string;
  platform: string;
}

interface AnalyticsChartProps {
  view: ChartViewType;
  onChangeView: (view: ChartViewType) => void;
  revenueData?: RevenueDataPoint[];
  contentData?: ContentDataPoint[];
  contentItemsByDate?: Record<string, ContentItemForTooltip[]>;
  visiblePlatforms?: Platform[];
}

const isCurrencySeries = (name: string) => ['Monthly Goal', 'Cumulative Revenue', 'Spend', 'Budget'].includes(name);

// Custom label that renders a platform icon on a line
const PlatformIconLabel = ({ viewBox, platform }: any) => {
  if (!viewBox || !platform) return null;
  const icon = PLATFORM_ICONS[platform];
  const color = PLATFORM_COLORS[platform] || '#9B9B9B';
  if (!icon) return null;
  const size = 16;
  const x = viewBox.x - size / 2;
  const y = viewBox.y - size / 2 - 2;
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={size / 2} cy={size / 2} r={size / 2 + 3} fill="#2f2f2f" />
      <svg width={size} height={size} viewBox={icon.viewBox}>
        <path d={icon.path} fill={color} />
      </svg>
    </g>
  );
};

const CustomTooltip = ({ active, payload, label, contentItemsByDate }: any) => {
  if (active && payload && payload.length) {
    const items = contentItemsByDate && label ? (contentItemsByDate[label] || []) : [];
    // Filter out zero-value expected platform lines from tooltip
    const filteredPayload = payload.filter((entry: any) => {
      if (entry.name?.startsWith('Expected') && entry.value === 0) return false;
      return true;
    });
    return (
      <div className="bg-[#2f2f2f] border border-[#3a3a3a] p-3 rounded-lg shadow-xl backdrop-blur-md bg-opacity-90 max-w-xs">
        <p className="text-[#9B9B9B] text-xs mb-1">{label}</p>
        {filteredPayload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' && isCurrencySeries(entry.name) ? `$${entry.value.toLocaleString()}` : entry.value}
          </p>
        ))}
        {items.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#3a3a3a]">
            <p className="text-[#9B9B9B] text-[10px] uppercase tracking-wider mb-1">Scheduled</p>
            <ul className="text-xs text-[#ECECEC] space-y-0.5 max-h-32 overflow-y-auto">
              {items.map((item: ContentItemForTooltip, i: number) => (
                <li key={i} className="truncate" title={item.title}>
                  <span className="text-[#9B9B9B]">{item.platform}</span> — {item.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Custom dot that renders the platform icon at a specific data point
const PlatformDot = ({ cx, cy, index, dataLength, platform }: any) => {
  // Only show icon at the last data point of the line
  if (index !== dataLength - 1) return null;
  const icon = PLATFORM_ICONS[platform];
  const color = PLATFORM_COLORS[platform] || '#9B9B9B';
  if (!icon || cx == null || cy == null) return null;
  const size = 14;
  return (
    <g>
      <circle cx={cx} cy={cy} r={size / 2 + 4} fill="#2f2f2f" stroke="none" />
      <foreignObject x={cx - size / 2} y={cy - size / 2} width={size} height={size}>
        <svg viewBox={icon.viewBox} width={size} height={size} xmlns="http://www.w3.org/2000/svg">
          <path d={icon.path} fill={color} />
        </svg>
      </foreignObject>
    </g>
  );
};

const PLATFORM_EXPECTED_KEYS: { platform: Platform; dataKey: string; name: string }[] = [
  { platform: Platform.YOUTUBE, dataKey: 'expectedYouTube', name: 'Expected YouTube' },
  { platform: Platform.INSTAGRAM, dataKey: 'expectedInstagram', name: 'Expected Instagram' },
  { platform: Platform.TIKTOK, dataKey: 'expectedTikTok', name: 'Expected TikTok' },
  { platform: Platform.LINKEDIN, dataKey: 'expectedLinkedIn', name: 'Expected LinkedIn' },
];

const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ view, onChangeView, revenueData, contentData, contentItemsByDate, visiblePlatforms }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const renderChart = () => {
    switch (view) {
      case ChartViewType.REVENUE:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorGoal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_SECONDARY} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={CHART_SECONDARY} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#666666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
                minTickGap={30}
              />
              <YAxis
                stroke="#666666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value/1000}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#374151', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="goal"
                name="Monthly Goal"
                stroke={CHART_SECONDARY}
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#colorGoal)"
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Cumulative Revenue"
                stroke={CHART_PRIMARY}
                strokeWidth={3}
                fill="url(#colorRevenue)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case ChartViewType.CONTENT_SCHEDULE: {
        const chartData = (contentData && contentData.length > 0) ? contentData : CONTENT_DATA;
        const activePlatformLines = PLATFORM_EXPECTED_KEYS.filter(({ platform, dataKey }) => {
          if (visiblePlatforms && !visiblePlatforms.includes(platform)) return false;
          return chartData.some((d: any) => d[dataKey] != null && d[dataKey] > 0);
        });

        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 40, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorContentActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#666666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="#666666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, 'auto']}
                allowDecimals={false}
                tickCount={8}
              />
              <Tooltip content={<CustomTooltip contentItemsByDate={contentItemsByDate} />} cursor={{ stroke: '#374151', strokeWidth: 1, strokeDasharray: '4 4' }} />
              {/* Per-platform expected lines */}
              {activePlatformLines.map(({ platform, dataKey, name }) => {
                const color = PLATFORM_COLORS[platform];
                return (
                  <Line
                    key={dataKey}
                    type="stepAfter"
                    dataKey={dataKey}
                    name={name}
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={(props: any) => (
                      <PlatformDot
                        {...props}
                        platform={platform}
                        dataLength={chartData.length}
                      />
                    )}
                    activeDot={false}
                  />
                );
              })}
              {/* Actual content area */}
              <Area
                type="monotone"
                dataKey="daysAhead"
                name="Actual"
                stroke={CHART_PRIMARY}
                strokeWidth={3}
                fill="url(#colorContentActual)"
                animationDuration={1500}
              />
            </ComposedChart>
          </ResponsiveContainer>
        );
      }

      case ChartViewType.TEAM_SPEND:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={TEAM_SPEND_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_SECONDARY} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={CHART_SECONDARY} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#666666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="#666666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="budget"
                name="Budget"
                stroke={CHART_SECONDARY}
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#colorBudget)"
              />
              <Area
                type="monotone"
                dataKey="spend"
                name="Spend"
                stroke={CHART_PRIMARY}
                strokeWidth={3}
                fill="url(#colorSpend)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl p-6 shadow-sm relative overflow-hidden">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 relative z-10">
        <div>
          <h2 className="text-lg font-semibold text-[#ECECEC]">Performance Overview</h2>
          <p className="text-sm text-[#9B9B9B]">Track your key performance indicators over time.</p>
        </div>

        <div className="bg-[#212121] p-1 rounded-xl border border-[#3a3a3a] flex items-center">
          <button
            onClick={() => onChangeView(ChartViewType.REVENUE)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-none ${
              view === ChartViewType.REVENUE
                ? 'bg-[#3a3a3a] text-[#ECECEC] shadow-sm'
                : 'text-[#9B9B9B] hover:text-[#ECECEC]'
            }`}
          >
            Revenue
          </button>
          <button
            onClick={() => onChangeView(ChartViewType.CONTENT_SCHEDULE)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-none ${
              view === ChartViewType.CONTENT_SCHEDULE
                ? 'bg-[#3a3a3a] text-[#ECECEC] shadow-sm'
                : 'text-[#9B9B9B] hover:text-[#ECECEC]'
            }`}
          >
            Content
          </button>
          <button
            onClick={() => onChangeView(ChartViewType.TEAM_SPEND)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-none ${
              view === ChartViewType.TEAM_SPEND
                ? 'bg-[#3a3a3a] text-[#ECECEC] shadow-sm'
                : 'text-[#9B9B9B] hover:text-[#ECECEC]'
            }`}
          >
            Team
          </button>
        </div>
      </div>

      <div className="h-[350px] w-full relative z-10">
        {renderChart()}
      </div>
    </div>
  );
};

export default AnalyticsChart;
