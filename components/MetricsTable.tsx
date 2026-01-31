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
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-sm">
        <div>
          <h2 className="text-lg font-semibold text-white">Campaign Performance</h2>
          <p className="text-sm text-gray-500">Real-time tracking across all platforms.</p>
        </div>
        <button 
          onClick={handleGenerateInsights}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16} />}
          <span>{loading ? 'Analyzing...' : 'Ask AI Analyst'}</span>
        </button>
      </div>

      {insight && (
        <div className="bg-gray-800/50 border-b border-gray-700 p-6 animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="flex items-start gap-3">
             <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Sparkles size={18} className="text-emerald-400" />
             </div>
             <div>
                <h3 className="text-sm font-semibold text-emerald-400 mb-2">Gemini Analysis</h3>
                <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                  {insight}
                </div>
             </div>
           </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-950/50 text-xs uppercase tracking-wider text-gray-500 font-medium">
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
          <tbody className="divide-y divide-gray-800">
            {data.map((row) => (
              <tr key={row.id} className="group hover:bg-gray-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      row.platform === 'Facebook' ? 'bg-blue-500' :
                      row.platform === 'Google' ? 'bg-red-500' :
                      row.platform === 'TikTok' ? 'bg-pink-500' : 'bg-blue-700'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-200 text-sm">{row.campaignName}</p>
                      <p className="text-xs text-gray-500">{row.platform}</p>
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
                <td className="px-6 py-4 text-right text-sm text-gray-300 font-mono">
                  ${row.cpc.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-300 font-mono">
                  ${row.cpm.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 text-sm font-mono">
                    <span className={row.ctr > 1.5 ? 'text-emerald-400' : 'text-gray-300'}>
                      {row.ctr}%
                    </span>
                    {row.ctr > 1.5 ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownRight size={14} className="text-gray-500" />}
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-300 font-mono">
                  ${row.costPerBookedCall}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-300 font-mono">
                  ${row.costPerShowedCall}
                </td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-white font-mono">
                  ${row.spend.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-gray-500 hover:text-white transition-colors">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-gray-800 bg-gray-950/30 flex justify-center">
        <button className="text-sm text-gray-400 hover:text-white transition-colors">View All Campaigns &rarr;</button>
      </div>
    </div>
  );
};

export default MetricsTable;
