import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine
} from 'recharts';
import { ChartViewType, RevenueDataPoint, ContentDataPoint } from '../types';
import { CONTENT_DATA, TEAM_SPEND_DATA } from '../constants';

interface AnalyticsChartProps {
  view: ChartViewType;
  onChangeView: (view: ChartViewType) => void;
  revenueData?: RevenueDataPoint[];
  contentData?: ContentDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#2f2f2f] border border-[#3a3a3a] p-3 rounded-lg shadow-xl backdrop-blur-md bg-opacity-90">
        <p className="text-[#9B9B9B] text-xs mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' && entry.name !== 'Days Ahead' ? `$${entry.value.toLocaleString()}` : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ view, onChangeView, revenueData, contentData }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const renderChart = () => {
    switch (view) {
      case ChartViewType.REVENUE:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorGoal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
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
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#colorGoal)"
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Cumulative Revenue"
                stroke="#10b981"
                strokeWidth={3}
                fill="url(#colorRevenue)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case ChartViewType.CONTENT_SCHEDULE: {
        const chartData = (contentData && contentData.length > 0) ? contentData : CONTENT_DATA;
        const barLabel = (contentData && contentData.length > 0) ? 'Pieces' : 'Days Ahead';
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1f2937', opacity: 0.4 }} />
              <ReferenceLine y={7} stroke="#eab308" strokeDasharray="3 3" label={{ value: 'Target Buffer', position: 'right', fill: '#eab308', fontSize: 10 }} />
              <Bar
                dataKey="daysAhead"
                name={barLabel}
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case ChartViewType.TEAM_SPEND:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={TEAM_SPEND_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
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
                dataKey="spend"
                name="Spend"
                stroke="#f43f5e"
                strokeWidth={3}
                fill="url(#colorSpend)"
              />
              <Area
                type="monotone"
                dataKey="budget"
                name="Budget Limit"
                stroke="#9ca3af"
                strokeWidth={1}
                strokeDasharray="4 4"
                fill="transparent"
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
