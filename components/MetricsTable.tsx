import React, { useState } from 'react';
import { AdMetric } from '../types';
import { MoreHorizontal, ArrowUpRight, ArrowDownRight, Sparkles, Loader2, Pencil, Trash2, Plus, X } from 'lucide-react';
import { generateAdInsights } from '../services/geminiService';

const PLATFORMS: AdMetric['platform'][] = ['Facebook', 'Google', 'LinkedIn', 'TikTok'];
const STATUSES: AdMetric['status'][] = ['Active', 'Paused', 'Learning'];

interface MetricsTableProps {
  data: AdMetric[];
  onUpdate?: (metric: AdMetric) => void;
  onDelete?: (id: string) => void;
  onAdd?: (metric: Omit<AdMetric, 'id'>) => void;
}

const emptyForm = (): Omit<AdMetric, 'id'> => ({
  campaignName: '',
  platform: 'Facebook',
  status: 'Active',
  cpc: 0,
  cpm: 0,
  ctr: 0,
  costPerBookedCall: 0,
  costPerShowedCall: 0,
  spend: 0,
});

const MetricsTable: React.FC<MetricsTableProps> = ({ data, onUpdate, onDelete, onAdd }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuRowId, setMenuRowId] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{ type: 'add' } | { type: 'edit'; row: AdMetric } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<AdMetric, 'id'> | AdMetric>(emptyForm());

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

  const openAdd = () => {
    setForm(emptyForm());
    setEditModal({ type: 'add' });
    setMenuRowId(null);
  };

  const openEdit = (row: AdMetric) => {
    setForm({ ...row });
    setEditModal({ type: 'edit', row });
    setMenuRowId(null);
  };

  const saveEdit = () => {
    if (editModal?.type === 'add') {
      const f = form as Omit<AdMetric, 'id'>;
      if (f.campaignName.trim() && onAdd) {
        onAdd(f);
        setEditModal(null);
      }
    } else if (editModal?.type === 'edit' && 'id' in form && onUpdate) {
      onUpdate(form as AdMetric);
      setEditModal(null);
    }
  };

  const handleDelete = (id: string) => {
    onDelete?.(id);
    setConfirmDeleteId(null);
    setMenuRowId(null);
  };

  const canEdit = !!onUpdate || !!onDelete || !!onAdd;

  return (
    <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl overflow-hidden shadow-sm flex flex-col">
      <div className="p-6 border-b border-[#3a3a3a] flex justify-between items-center bg-[#2f2f2f] backdrop-blur-sm">
        <div>
          <h2 className="text-lg font-semibold text-[#ECECEC]">Campaign Performance</h2>
          <p className="text-sm text-[#9B9B9B]">Real-time tracking across all platforms.</p>
        </div>
        <div className="flex items-center gap-2">
          {onAdd && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-[#ECECEC] rounded-lg text-sm font-medium transition-none"
            >
              <Plus size={16} />
              <span>Add Campaign</span>
            </button>
          )}
          <button
            onClick={handleGenerateInsights}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-lg text-sm font-medium transition-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16} />}
            <span>{loading ? 'Analyzing...' : 'Ask AI Analyst'}</span>
          </button>
        </div>
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
              {canEdit && <th className="px-6 py-4 w-12"></th>}
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
                {canEdit && (
                  <td className="px-6 py-4 text-right">
                    <div className="relative flex items-center justify-end">
                      <button
                        onClick={() => setMenuRowId(menuRowId === row.id ? null : row.id)}
                        className="p-1.5 text-[#9B9B9B] hover:text-white hover:bg-[rgba(255,255,255,0.08)] rounded transition-none"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {menuRowId === row.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMenuRowId(null)} />
                          <div className="absolute right-0 top-full mt-1 z-50 py-1 min-w-[120px] bg-[#2f2f2f] border border-[#3a3a3a] rounded-lg shadow-xl">
                            {onUpdate && (
                              <button
                                onClick={() => openEdit(row)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#ECECEC] hover:bg-[rgba(255,255,255,0.08)] transition-none text-left"
                              >
                                <Pencil size={14} /> Edit
                              </button>
                            )}
                            {onDelete && (
                              <button
                                onClick={() => { setConfirmDeleteId(row.id); setMenuRowId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-none text-left"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="p-4 border-t border-[#3a3a3a] bg-[#212121] flex justify-center">
          {onAdd && (
            <button onClick={openAdd} className="text-sm text-[#9B9B9B] hover:text-white transition-none flex items-center gap-2">
              <Plus size={14} /> Add campaign
            </button>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-[#ECECEC] font-medium mb-4">Delete this campaign?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-sm text-[#9B9B9B] hover:text-white transition-none">Cancel</button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="px-4 py-2 text-sm bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-none">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setEditModal(null)}>
          <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#2f2f2f] border-b border-[#3a3a3a] px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#ECECEC]">{editModal.type === 'add' ? 'Add Campaign' : 'Edit Campaign'}</h3>
              <button onClick={() => setEditModal(null)} className="p-2 text-[#9B9B9B] hover:text-white rounded-lg transition-none"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-[#9B9B9B] font-medium mb-1">Campaign name</label>
                <input
                  type="text"
                  value={'campaignName' in form ? form.campaignName : ''}
                  onChange={e => setForm(f => ({ ...f, campaignName: e.target.value }))}
                  className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]"
                  placeholder="e.g. Q3_Scale_Cold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#9B9B9B] font-medium mb-1">Platform</label>
                  <select
                    value={'platform' in form ? form.platform : 'Facebook'}
                    onChange={e => setForm(f => ({ ...f, platform: e.target.value as AdMetric['platform'] }))}
                    className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]"
                  >
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#9B9B9B] font-medium mb-1">Status</label>
                  <select
                    value={'status' in form ? form.status : 'Active'}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as AdMetric['status'] }))}
                    className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[#9B9B9B] font-medium mb-1">CPC ($)</label>
                  <input type="number" step="0.01" min="0" value={'cpc' in form ? form.cpc : 0} onChange={e => setForm(f => ({ ...f, cpc: parseFloat(e.target.value) || 0 }))} className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]" />
                </div>
                <div>
                  <label className="block text-xs text-[#9B9B9B] font-medium mb-1">CPM ($)</label>
                  <input type="number" step="0.01" min="0" value={'cpm' in form ? form.cpm : 0} onChange={e => setForm(f => ({ ...f, cpm: parseFloat(e.target.value) || 0 }))} className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]" />
                </div>
                <div>
                  <label className="block text-xs text-[#9B9B9B] font-medium mb-1">CTR (%)</label>
                  <input type="number" step="0.1" min="0" value={'ctr' in form ? form.ctr : 0} onChange={e => setForm(f => ({ ...f, ctr: parseFloat(e.target.value) || 0 }))} className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[#9B9B9B] font-medium mb-1">Cost/Booked ($)</label>
                  <input type="number" min="0" value={'costPerBookedCall' in form ? form.costPerBookedCall : 0} onChange={e => setForm(f => ({ ...f, costPerBookedCall: parseFloat(e.target.value) || 0 }))} className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]" />
                </div>
                <div>
                  <label className="block text-xs text-[#9B9B9B] font-medium mb-1">Cost/Showed ($)</label>
                  <input type="number" min="0" value={'costPerShowedCall' in form ? form.costPerShowedCall : 0} onChange={e => setForm(f => ({ ...f, costPerShowedCall: parseFloat(e.target.value) || 0 }))} className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]" />
                </div>
                <div>
                  <label className="block text-xs text-[#9B9B9B] font-medium mb-1">Spend ($)</label>
                  <input type="number" min="0" value={'spend' in form ? form.spend : 0} onChange={e => setForm(f => ({ ...f, spend: parseFloat(e.target.value) || 0 }))} className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]" />
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-[#2f2f2f] border-t border-[#3a3a3a] px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setEditModal(null)} className="px-4 py-2 text-sm text-[#9B9B9B] hover:text-white transition-none">Cancel</button>
              <button onClick={saveEdit} className="px-4 py-2 text-sm bg-white hover:bg-[#e5e5e5] text-[#212121] font-medium rounded-lg transition-none">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricsTable;
