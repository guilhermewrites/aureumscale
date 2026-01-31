import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, Trash2, ExternalLink, Folder,
  Clock, FileText, Video, CheckCircle2,
  Eye, Radio, Pause, AlertTriangle,
  RefreshCcw, Ban, X, Save, ChevronDown,
  Filter, Megaphone, Target, RotateCcw
} from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';

// --- Types ---
type AdStatus = 'Pending' | 'Scripted' | 'Recorded' | 'Edited' | 'Needs Review' | 'Live' | 'Paused';

interface AdItem {
  id: string;
  name: string;
  status: AdStatus;
  driveLink: string;
  script: string;
  description: string;
  funnelId: string;
  adType: 'marketing' | 'remarketing';
  createdAt: string;
}

// We read funnels from localStorage to get the funnel list
interface SimpleFunnel { id: string; name: string }

const AD_STATUSES: { value: AdStatus; label: string; color: string; bgColor: string; icon: React.ElementType }[] = [
  { value: 'Pending', label: 'Pending', color: 'text-gray-400', bgColor: 'bg-gray-500/10 border-gray-500/20', icon: Clock },
  { value: 'Scripted', label: 'Scripted', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20', icon: FileText },
  { value: 'Recorded', label: 'Recorded', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20', icon: Video },
  { value: 'Edited', label: 'Edited', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20', icon: CheckCircle2 },
  { value: 'Needs Review', label: 'Needs Review', color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20', icon: Eye },
  { value: 'Live', label: 'Live', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20', icon: Radio },
  { value: 'Paused', label: 'Paused', color: 'text-rose-400', bgColor: 'bg-rose-500/10 border-rose-500/20', icon: Pause },
];

const getStatusConfig = (status: AdStatus) => AD_STATUSES.find(s => s.value === status) || AD_STATUSES[0];

type ConfirmType = 'delete_ad' | 'delete_forever' | 'empty_trash' | 'restore_ad';

interface AdsManagerProps {
  storagePrefix: string;
}

const AdsManager: React.FC<AdsManagerProps> = ({ storagePrefix }) => {
  const [ads, setAds] = useLocalStorage<AdItem[]>(`${storagePrefix}_ad_items`, []);
  const [trash, setTrash] = useLocalStorage<AdItem[]>(`${storagePrefix}_ad_items_trash`, []);

  // Read funnels for the selector
  const getFunnels = (): SimpleFunnel[] => {
    try {
      const stored = localStorage.getItem(`${storagePrefix}_funnels`);
      if (stored) return JSON.parse(stored).map((f: any) => ({ id: f.id, name: f.name }));
    } catch {}
    return [];
  };
  const funnels = getFunnels();

  const [viewMode, setViewMode] = useState<'library' | 'trash'>('library');
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('all');
  const [adTypeTab, setAdTypeTab] = useState<'marketing' | 'remarketing'>('marketing');
  const [isAdding, setIsAdding] = useState(false);

  // New ad form
  const [newName, setNewName] = useState('');
  const [newStatus, setNewStatus] = useState<AdStatus>('Pending');
  const [newDriveLink, setNewDriveLink] = useState('');

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<'name' | 'driveLink' | null>(null);
  const [editValue, setEditValue] = useState('');

  // Status dropdown
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);

  // Edit modal (script editor)
  const [editModalAd, setEditModalAd] = useState<AdItem | null>(null);
  const [editModalScript, setEditModalScript] = useState('');
  const [editModalDesc, setEditModalDesc] = useState('');
  const [editModalName, setEditModalName] = useState('');
  const [editModalDrive, setEditModalDrive] = useState('');

  // Confirmation
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; type: ConfirmType; itemId?: string; title: string; message: string }>({
    isOpen: false, type: 'delete_ad', title: '', message: ''
  });

  // Filter
  const filtered = ads.filter(ad => {
    if (selectedFunnelId !== 'all' && ad.funnelId !== selectedFunnelId) return false;
    if (ad.adType !== adTypeTab) return false;
    return true;
  });

  // --- Handlers ---
  const handleAdd = () => {
    if (!newName.trim()) return;
    const ad: AdItem = {
      id: Date.now().toString(), name: newName.trim(), status: newStatus,
      driveLink: newDriveLink.trim(), script: '', description: '',
      funnelId: selectedFunnelId === 'all' ? '' : selectedFunnelId,
      adType: adTypeTab, createdAt: new Date().toISOString(),
    };
    setAds(prev => [...prev, ad]);
    setNewName(''); setNewStatus('Pending'); setNewDriveLink(''); setIsAdding(false);
  };

  const handleUpdateAd = (id: string, updates: Partial<AdItem>) => {
    setAds(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const requestDelete = (id: string) => setConfirmState({ isOpen: true, type: 'delete_ad', itemId: id, title: 'Move to Trash?', message: 'This ad will be moved to the trash.' });
  const requestDeleteForever = (id: string) => setConfirmState({ isOpen: true, type: 'delete_forever', itemId: id, title: 'Delete Forever?', message: 'This cannot be undone.' });
  const requestRestore = (id: string) => setConfirmState({ isOpen: true, type: 'restore_ad', itemId: id, title: 'Restore Ad?', message: 'This ad will be moved back.' });
  const requestEmptyTrash = () => setConfirmState({ isOpen: true, type: 'empty_trash', title: 'Empty Trash?', message: `Delete all ${trash.length} items permanently?` });

  const handleConfirmAction = () => {
    const { type, itemId } = confirmState;
    if (type === 'delete_ad' && itemId) { const item = ads.find(a => a.id === itemId); if (item) { setTrash(prev => [item, ...prev]); setAds(prev => prev.filter(a => a.id !== itemId)); } }
    else if (type === 'delete_forever' && itemId) setTrash(prev => prev.filter(a => a.id !== itemId));
    else if (type === 'empty_trash') setTrash([]);
    else if (type === 'restore_ad' && itemId) { const item = trash.find(a => a.id === itemId); if (item) { setAds(prev => [...prev, item]); setTrash(prev => prev.filter(a => a.id !== itemId)); } }
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  const startEdit = (id: string, field: 'name' | 'driveLink', value: string) => { setEditingId(id); setEditField(field); setEditValue(value); };
  const saveEdit = () => { if (!editingId || !editField) return; handleUpdateAd(editingId, { [editField]: editValue }); setEditingId(null); setEditField(null); };

  const openEditModal = (ad: AdItem) => {
    setEditModalAd(ad); setEditModalName(ad.name); setEditModalDesc(ad.description);
    setEditModalScript(ad.script); setEditModalDrive(ad.driveLink);
  };

  const saveEditModal = () => {
    if (!editModalAd) return;
    handleUpdateAd(editModalAd.id, { name: editModalName, description: editModalDesc, script: editModalScript, driveLink: editModalDrive });
    setEditModalAd(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Confirm Dialog */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={24} className="text-amber-500" /></div>
              <h3 className="text-lg font-bold text-white mb-2">{confirmState.title}</h3>
              <p className="text-gray-400 text-sm mb-6">{confirmState.message}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handleConfirmAction} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-medium">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalAd && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">Edit Ad</h3>
              <button onClick={() => setEditModalAd(null)} className="p-1 text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs text-gray-500 font-medium">Ad Name</label>
                <input value={editModalName} onChange={e => setEditModalName(e.target.value)}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Description</label>
                <input value={editModalDesc} onChange={e => setEditModalDesc(e.target.value)} placeholder="Brief description..."
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Google Drive Link</label>
                <input value={editModalDrive} onChange={e => setEditModalDrive(e.target.value)} placeholder="https://drive.google.com/..."
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Ad Script</label>
                <textarea value={editModalScript} onChange={e => setEditModalScript(e.target.value)}
                  placeholder="Write your ad script here..."
                  rows={12}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono leading-relaxed resize-y" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-800">
              <button onClick={() => setEditModalAd(null)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={saveEditModal} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium"><Save size={14} /> Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Ads</h2>
          <p className="text-sm text-gray-500">Manage your ad creatives and production pipeline</p>
        </div>
        {viewMode === 'library' && (
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> New Ad
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* View mode */}
        <div className="flex bg-gray-900 rounded-lg border border-gray-800 p-1">
          <button onClick={() => setViewMode('library')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'library' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
            <Folder size={16} /> Library
          </button>
          <button onClick={() => setViewMode('trash')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'trash' ? 'bg-rose-900/20 text-rose-400 shadow-sm' : 'text-gray-500 hover:text-rose-400 hover:bg-rose-900/10'}`}>
            <Trash2 size={16} /> Trash
          </button>
        </div>

        {viewMode === 'library' && (
          <>
            {/* Funnel selector */}
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-500" />
              <select value={selectedFunnelId} onChange={e => setSelectedFunnelId(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                <option value="all">All Funnels</option>
                {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            {/* Marketing / Remarketing tabs */}
            <div className="flex bg-gray-900 rounded-lg border border-gray-800 p-1">
              <button onClick={() => setAdTypeTab('marketing')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${adTypeTab === 'marketing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-gray-500 hover:text-gray-300'}`}>
                <Megaphone size={14} /> Marketing
              </button>
              <button onClick={() => setAdTypeTab('remarketing')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${adTypeTab === 'remarketing' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'text-gray-500 hover:text-gray-300'}`}>
                <Target size={14} /> Remarketing
              </button>
            </div>

            <div className="ml-auto text-sm text-gray-500">
              {filtered.length} ad{filtered.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>

      {/* Add Form */}
      {isAdding && viewMode === 'library' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-in slide-in-from-top-2 space-y-4">
          <h3 className="text-sm font-semibold text-white">New {adTypeTab === 'marketing' ? 'Marketing' : 'Remarketing'} Ad</h3>
          <div className="space-y-3">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ad name..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setIsAdding(false); }} autoFocus />
            <div className="flex gap-3">
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as AdStatus)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none">
                {AD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <input value={newDriveLink} onChange={e => setNewDriveLink(e.target.value)} placeholder="Google Drive link..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium">Add Ad</button>
              <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Library Table */}
      {viewMode === 'library' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-950/50 text-xs uppercase tracking-wider text-gray-500 font-medium">
                  <th className="px-6 py-4">Ad Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Google Drive</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm">
                    No {adTypeTab} ads{selectedFunnelId !== 'all' ? ' for this funnel' : ''}. Click "New Ad" to create one.
                  </td></tr>
                )}
                {filtered.map(ad => {
                  const statusCfg = getStatusConfig(ad.status);
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={ad.id} className="group hover:bg-gray-800/30 transition-colors">
                      {/* Name */}
                      <td className="px-6 py-4">
                        {editingId === ad.id && editField === 'name' ? (
                          <input value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingId(null); setEditField(null); } }}
                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none w-full max-w-xs" autoFocus />
                        ) : (
                          <p className="font-medium text-gray-200 text-sm cursor-pointer hover:text-emerald-300 transition-colors"
                            onClick={() => openEditModal(ad)}>{ad.name}</p>
                        )}
                        {ad.description && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{ad.description}</p>}
                      </td>

                      {/* Status dropdown */}
                      <td className="px-6 py-4 relative" style={{ zIndex: statusDropdownId === ad.id ? 50 : 'auto' }}>
                        <button onClick={(e) => { e.stopPropagation(); setStatusDropdownId(statusDropdownId === ad.id ? null : ad.id); }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors hover:opacity-80 ${statusCfg.bgColor} ${statusCfg.color}`}>
                          <StatusIcon size={12} /> {ad.status} <ChevronDown size={10} />
                        </button>
                        {statusDropdownId === ad.id && (
                          <div className="absolute top-full left-6 mt-1 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-1.5 z-[55] w-44 animate-in fade-in slide-in-from-top-2 duration-150"
                            onClick={e => e.stopPropagation()}>
                            {AD_STATUSES.map(s => {
                              const SIcon = s.icon;
                              return (
                                <button key={s.value}
                                  onClick={(e) => { e.stopPropagation(); handleUpdateAd(ad.id, { status: s.value }); setStatusDropdownId(null); }}
                                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                    ad.status === s.value ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                                  }`}>
                                  <SIcon size={12} className={s.color} /> {s.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Drive Link */}
                      <td className="px-6 py-4">
                        {editingId === ad.id && editField === 'driveLink' ? (
                          <input value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingId(null); setEditField(null); } }}
                            placeholder="Paste Drive link..." className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white placeholder-gray-500 focus:outline-none w-full max-w-xs" autoFocus />
                        ) : ad.driveLink ? (
                          <div className="flex items-center gap-2">
                            <a href={ad.driveLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                              <Folder size={14} /><span className="truncate max-w-[180px]">Open in Drive</span><ExternalLink size={12} />
                            </a>
                            <button onClick={() => startEdit(ad.id, 'driveLink', ad.driveLink)} className="text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100"><FileText size={12} /></button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(ad.id, 'driveLink', '')} className="text-xs text-gray-600 hover:text-gray-400">+ Add Drive link</button>
                        )}
                      </td>

                      {/* Created */}
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(ad.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(ad)} className="text-gray-500 hover:text-emerald-400"><FileText size={16} /></button>
                          <button onClick={() => requestDelete(ad.id)} className="text-gray-600 hover:text-rose-400"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trash View */}
      {viewMode === 'trash' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          {trash.length > 0 && (
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <p className="text-sm text-gray-400">{trash.length} item{trash.length !== 1 ? 's' : ''} in trash</p>
              <button onClick={requestEmptyTrash} className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"><Ban size={12} /> Empty Trash</button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-gray-950/50 text-xs uppercase tracking-wider text-gray-500 font-medium">
                <th className="px-6 py-4">Ad Name</th><th className="px-6 py-4">Status</th><th className="px-6 py-4"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-800">
                {trash.length === 0 && <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-500 text-sm">Trash is empty</td></tr>}
                {trash.map(ad => {
                  const sc = getStatusConfig(ad.status);
                  return (
                    <tr key={ad.id} className="group hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4"><p className="font-medium text-gray-400 text-sm line-through">{ad.name}</p></td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border opacity-50 ${sc.bgColor} ${sc.color}`}><sc.icon size={12} /> {ad.status}</span></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => requestRestore(ad.id)} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"><RefreshCcw size={12} /> Restore</button>
                          <button onClick={() => requestDeleteForever(ad.id)} className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"><Trash2 size={12} /> Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Click outside to close status dropdown */}
      {statusDropdownId && <div className="fixed inset-0 z-[45]" onClick={() => setStatusDropdownId(null)} />}
    </div>
  );
};

export default AdsManager;
