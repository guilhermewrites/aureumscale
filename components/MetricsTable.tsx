import React, { useState } from 'react';
import { AdMetric } from '../types';
import { MoreHorizontal, ArrowUpRight, ArrowDownRight, Sparkles, Loader2 } from 'lucide-react';
import { generateAdInsights } from '../services/geminiService';

interface MetricsTableProps {
  data: AdMetric[];
}

const MetricsTable: React.FC<MetricsTableProps> = ({ data }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateInsights = async () => {
    setLoading(true);
    setInsight(null);
    try {
      const result = await generateAdInsights(data);
      setInsight(result);
    } catch (e) {
      setInsight("Could not generate insights at this time.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl overflow-hidden shadow-sm flex flex-col">
      <div className="p-6 border-b border-[#3a3a3a] flex justify-between items-center bg-[#2f2f2f] backdrop-blur-sm">
        <div>
          <h2 className="text-lg font-semibold text-[#ECECEC]">Campaign Performance</h2>
          <p className="text-sm text-[#9B9B9B]">Real-time tracking across all platforms.</p>
        </div>
        <button
          onClick={handleGenerateInsights}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-lg text-sm font-medium transition-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16} />}
          <span>{loading ? 'Analyzing...' : 'Ask AI Analyst'}</span>
        </button>
      </div>

      {insight && (
        <div className="bg-[rgba(255,255,255,0.05)] border-b border-[#3a3a3a] p-6 animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="flex items-start gap-3">
             <div className="p-2 bg-[rgba(255,255,255,0.08)] rounded-lg">
                <Sparkles size={18} className="text-[#ECECEC]" />
             </div>
             <div>
                <h3 className="text-sm font-semibold text-[#ECECEC] mb-2">Gemini Analysis</h3>
                <div className="text-sm text-[#b4b4b4] whitespace-pre-line leading-relaxed">
                  {insight}
                </div>
             </div>
           </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#212121] text-xs uppercase tracking-wider text-[#9B9B9B] font-medium">
              <th className="px-6 py-4">Campaign</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">CPC</th>
              <th className="px-6 py-4 text-right">CPM</th>
              <th className="px-6 py-4 text-right">CTR</th>
              <th className="px-6 py-4 text-right">Cost/Booked</th>
              <th className="px-6 py-4 text-right">Cost/Showed</th>
              <th className="px-6 py-4 text-right">Spend</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3a3a3a]">
            {data.map((row) => (
              <tr key={row.id} className="group hover:bg-[rgba(255,255,255,0.05)] transition-none">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      row.platform === 'Facebook' ? 'bg-blue-500' :
                      row.platform === 'Google' ? 'bg-red-500' :
                      row.platform === 'TikTok' ? 'bg-pink-500' : 'bg-blue-700'
                    }`} />
                    <div>
                      <p className="font-medium text-[#ECECEC] text-sm">{row.campaignName}</p>
                      <p className="text-xs text-[#9B9B9B]">{row.platform}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    row.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    row.status === 'Paused' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm text-[#b4b4b4] font-mono">
                  ${row.cpc.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right text-sm text-[#b4b4b4] font-mono">
                  ${row.cpm.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 text-sm font-mono">
                    <span className={row.ctr > 1.5 ? 'text-emerald-400' : 'text-[#b4b4b4]'}>
                      {row.ctr}%
                    </span>
                    {row.ctr > 1.5 ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownRight size={14} className="text-[#9B9B9B]" />}
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm text-[#b4b4b4] font-mono">
                  ${row.costPerBookedCall}
                </td>
                <td className="px-6 py-4 text-right text-sm text-[#b4b4b4] font-mono">
                  ${row.costPerShowedCall}
                </td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-[#ECECEC] font-mono">
                  ${row.spend.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-[#9B9B9B] hover:text-white transition-none">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-[#3a3a3a] bg-[#212121] flex justify-center">
        <button className="text-sm text-[#9B9B9B] hover:text-white transition-none">View All Campaigns &rarr;</button>
      </div>
    </div>
  );
};

export default MetricsTable;
