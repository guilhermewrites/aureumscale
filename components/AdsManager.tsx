import React, { useState, useRef, useEffect } from 'react';
import {
  Trash2, ExternalLink, Folder,
  Clock, FileText, Video, CheckCircle2,
  Eye, Radio, Pause, AlertTriangle,
  RefreshCcw, Ban, X, Save, ChevronDown,
  Filter, Megaphone, Target, RotateCcw,
  Plus, GripVertical, Check
} from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';

// --- Types ---
type AdStatus = 'Unassigned' | 'Pending' | 'Scripted' | 'Recorded' | 'Edited' | 'Needs Review' | 'Live' | 'Paused';

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
  order: number;
}

// We read funnels from localStorage to get the funnel list
interface SimpleFunnel { id: string; name: string }

const AD_STATUSES: { value: AdStatus; label: string; color: string; bgColor: string; icon: React.ElementType }[] = [
  { value: 'Unassigned', label: 'Select status', color: 'text-gray-500', bgColor: 'bg-[rgba(255,255,255,0.03)] border-gray-600/30', icon: AlertTriangle },
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

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<'name' | 'driveLink' | null>(null);
  const [editValue, setEditValue] = useState('');

  // Status dropdown
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusDropdownId && statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownId(null);
      }
    };
    if (statusDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [statusDropdownId]);

  // Drag and drop
  const [draggedAdId, setDraggedAdId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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
  }).sort((a, b) => {
    const aOrder = a.order ?? 0;
    const bOrder = b.order ?? 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const isEmptyDraft = (ad: AdItem) => (
    ad.status === 'Unassigned' &&
    !ad.name?.trim() &&
    !ad.driveLink?.trim() &&
    !ad.description?.trim() &&
    !ad.script?.trim()
  );

  const visibleAds = (() => {
    let draftSeen = false;
    return filtered.filter(ad => {
      if (isEmptyDraft(ad)) {
        if (draftSeen) return false;
        draftSeen = true;
      }
      return true;
    });
  })();

  useEffect(() => {
    const emptyDrafts = ads.filter(isEmptyDraft);
    if (emptyDrafts.length === 0) return;
    const keepId = editingId && emptyDrafts.some(d => d.id === editingId) ? editingId : null;
    const cleaned = ads.filter(ad => !isEmptyDraft(ad) || (keepId && ad.id === keepId));
    if (cleaned.length !== ads.length) {
      setAds(cleaned);
    }
  }, [ads, editingId, setAds]);

  useEffect(() => {
    const needsOrder = ads.some(ad => ad.order === undefined);
    if (!needsOrder) return;
    const sorted = [...ads].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const withOrder = sorted.map((ad, index) => ({ ...ad, order: ad.order ?? index }));
    setAds(withOrder);
  }, [ads, setAds]);

  // --- Handlers ---
  const handleAddInline = () => {
    const existingDraft = filtered.find(isEmptyDraft);
    if (existingDraft) {
      setSelectedAdId(existingDraft.id);
      setEditingId(existingDraft.id);
      setEditField('name');
      setEditValue(existingDraft.name || '');
      return;
    }
    const maxOrder = ads.reduce((max, ad) => Math.max(max, ad.order ?? 0), -1);
    const ad: AdItem = {
      id: Date.now().toString(), name: '', status: 'Unassigned',
      driveLink: '', script: '', description: '',
      funnelId: selectedFunnelId === 'all' ? '' : selectedFunnelId,
      adType: adTypeTab, createdAt: new Date().toISOString(), order: maxOrder + 1,
    };
    setAds(prev => [ad, ...prev]);
    setSelectedAdId(ad.id);
    setEditingId(ad.id);
    setEditField('name');
    setEditValue('');
  };

  const handleDragStart = (e: React.DragEvent, adId: string) => {
    setDraggedAdId(adId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', adId);
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, adId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedAdId && draggedAdId !== adId) {
      setDragOverId(adId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedAdId || draggedAdId === targetId) {
      setDraggedAdId(null);
      setDragOverId(null);
      return;
    }

    const list = filtered;
    const draggedIndex = list.findIndex(ad => ad.id === draggedAdId);
    const targetIndex = list.findIndex(ad => ad.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedAdId(null);
      setDragOverId(null);
      return;
    }

    const newList = [...list];
    const [removed] = newList.splice(draggedIndex, 1);
    newList.splice(targetIndex, 0, removed);

    const updatedAds = newList.map((ad, index) => ({ ...ad, order: index }));
    setAds(prev => {
      const updated = prev.map(ad => {
        const found = updatedAds.find(a => a.id === ad.id);
        return found || ad;
      });
      return updated;
    });

    setDraggedAdId(null);
    setDragOverId(null);
  };

  const handleUpdateAd = (id: string, updates: Partial<AdItem>) => {
    setAds(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const toggleStatusDropdown = (id: string) => {
    setStatusDropdownId(statusDropdownId === id ? null : id);
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
          <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl w-full max-w-sm shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-[#3a3a3a] rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={24} className="text-amber-500" /></div>
              <h3 className="text-lg font-bold text-[#ECECEC] mb-2">{confirmState.title}</h3>
              <p className="text-[#9B9B9B] text-sm mb-6">{confirmState.message}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 bg-[#3a3a3a] hover:bg-[#3a3a3a] text-[#ECECEC] rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handleConfirmAction} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-[#ECECEC] rounded-lg text-sm font-medium">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalAd && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-[#3a3a3a]">
              <h3 className="text-lg font-bold text-[#ECECEC]">Edit Ad</h3>
              <button onClick={() => setEditModalAd(null)} className="p-1 text-[#9B9B9B] hover:text-[#ECECEC]"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs text-[#9B9B9B] font-medium">Ad Name</label>
                <input value={editModalName} onChange={e => setEditModalName(e.target.value)}
                  className="w-full mt-1 bg-[#3a3a3a] border border-[#3a3a3a] rounded-lg px-4 py-2.5 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]" />
              </div>
              <div>
                <label className="text-xs text-[#9B9B9B] font-medium">Description</label>
                <input value={editModalDesc} onChange={e => setEditModalDesc(e.target.value)} placeholder="Brief description..."
                  className="w-full mt-1 bg-[#3a3a3a] border border-[#3a3a3a] rounded-lg px-4 py-2.5 text-sm text-[#ECECEC] placeholder-[#666666] focus:outline-none focus:ring-1 focus:ring-[#555555]" />
              </div>
              <div>
                <label className="text-xs text-[#9B9B9B] font-medium">Google Drive Link</label>
                <input value={editModalDrive} onChange={e => setEditModalDrive(e.target.value)} placeholder="https://drive.google.com/..."
                  className="w-full mt-1 bg-[#3a3a3a] border border-[#3a3a3a] rounded-lg px-4 py-2.5 text-sm text-[#ECECEC] placeholder-[#666666] focus:outline-none focus:ring-1 focus:ring-[#555555]" />
              </div>
              <div>
                <label className="text-xs text-[#9B9B9B] font-medium">Ad Script</label>
                <textarea value={editModalScript} onChange={e => setEditModalScript(e.target.value)}
                  placeholder="Write your ad script here..."
                  rows={12}
                  className="w-full mt-1 bg-[#3a3a3a] border border-[#3a3a3a] rounded-lg px-4 py-3 text-sm text-[#ECECEC] placeholder-[#666666] focus:outline-none focus:ring-1 focus:ring-[#555555] font-mono leading-relaxed resize-y" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-[#3a3a3a]">
              <button onClick={() => setEditModalAd(null)} className="px-4 py-2 bg-[#3a3a3a] hover:bg-[#3a3a3a] text-[#b4b4b4] rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={saveEditModal} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-lg text-sm font-medium"><Save size={14} /> Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#ECECEC]">Ads</h2>
          <p className="text-sm text-[#9B9B9B]">Manage your ad creatives and production pipeline</p>
        </div>
        <div />
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* View mode */}
        <div className="flex bg-[#2f2f2f] rounded-lg border border-[#3a3a3a] p-1">
          <button onClick={() => setViewMode('library')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-none ${viewMode === 'library' ? 'bg-[#3a3a3a] text-[#ECECEC] shadow-sm' : 'text-[#9B9B9B] hover:text-[#ECECEC]'}`}>
            <Folder size={16} /> Library
          </button>
          <button onClick={() => setViewMode('trash')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-none ${viewMode === 'trash' ? 'bg-rose-900/20 text-rose-400 shadow-sm' : 'text-[#9B9B9B] hover:text-rose-400 hover:bg-rose-900/10'}`}>
            <Trash2 size={16} /> Trash
          </button>
        </div>

        {viewMode === 'library' && (
          <>
            {/* Funnel selector */}
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-[#9B9B9B]" />
              <select value={selectedFunnelId} onChange={e => setSelectedFunnelId(e.target.value)}
                className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]">
                <option value="all">All Funnels</option>
                {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            {/* Marketing / Remarketing tabs */}
            <div className="flex bg-[#2f2f2f] rounded-lg border border-[#3a3a3a] p-1">
              <button onClick={() => setAdTypeTab('marketing')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-none ${adTypeTab === 'marketing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-[#9B9B9B] hover:text-[#ECECEC]'}`}>
                <Megaphone size={14} /> Marketing
              </button>
              <button onClick={() => setAdTypeTab('remarketing')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-none ${adTypeTab === 'remarketing' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'text-[#9B9B9B] hover:text-[#ECECEC]'}`}>
                <Target size={14} /> Remarketing
              </button>
            </div>

            <div className="ml-auto flex items-center gap-4">
              <span className="text-sm text-[#9B9B9B]">{visibleAds.length} ad{visibleAds.length !== 1 ? 's' : ''}</span>
              <button
                onClick={handleAddInline}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-[#212121] rounded-lg text-sm font-semibold hover:bg-[#e5e5e5] transition-none"
              >
                <Plus size={16} />
                <span>New Ad</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Library Table */}
      {viewMode === 'library' && (
        <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl shadow-sm overflow-visible">
          <div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#212121] text-xs uppercase tracking-wider text-[#9B9B9B] font-medium">
                  <th className="px-6 py-4 w-8"></th>
                  <th className="px-6 py-4">Ad Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Google Drive</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3a3a3a]">
                {visibleAds.map(ad => {
                  const statusCfg = getStatusConfig(ad.status);
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={ad.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, ad.id)}
                      onDragOver={(e) => handleDragOver(e, ad.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, ad.id)}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button, a, input')) return;
                        setSelectedAdId(ad.id);
                      }}
                      className={`group transition-none ${
                        draggedAdId === ad.id ? 'opacity-50' : ''
                      } ${
                        dragOverId === ad.id ? 'border-t-2 border-[#4a4a4a]' : ''
                      } ${
                        selectedAdId === ad.id ? 'bg-[rgba(255,255,255,0.05)]' : 'hover:bg-[rgba(255,255,255,0.05)]'
                      }`}>
                      {/* Drag Handle */}
                      <td className="px-2 py-4 w-8 cursor-move"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}>
                        <GripVertical size={16} className="text-[#666666] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </td>
                      {/* Name */}
                      <td className="px-6 py-4">
                        {editingId === ad.id && editField === 'name' ? (
                          <input value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingId(null); setEditField(null); } }}
                            className="bg-[#3a3a3a] border border-[#4a4a4a] rounded px-2 py-1 text-sm text-[#ECECEC] focus:outline-none w-full max-w-xs" autoFocus />
                        ) : (
                          <p className="font-medium text-[#ECECEC] text-sm cursor-text hover:text-[#ECECEC] transition-none"
                            onClick={(e) => { e.stopPropagation(); startEdit(ad.id, 'name', ad.name); }}>{ad.name}</p>
                        )}
                        {ad.description && <p className="text-xs text-[#9B9B9B] mt-0.5 truncate max-w-xs">{ad.description}</p>}
                      </td>

                      {/* Status dropdown */}
                      <td className="px-6 py-4 relative">
                        <div className="relative inline-block" ref={statusDropdownId === ad.id ? statusDropdownRef : null}>
                          <button onClick={(e) => { e.stopPropagation(); toggleStatusDropdown(ad.id); }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-none ${statusCfg.bgColor} ${statusCfg.color}`}>
                            <StatusIcon size={12} /> {ad.status === 'Unassigned' ? 'Select status' : ad.status} <ChevronDown size={10} />
                          </button>
                          {statusDropdownId === ad.id && (
                            <div className="absolute top-full left-0 mt-2 w-40 bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                              {AD_STATUSES.map(s => {
                                const SIcon = s.icon;
                                return (
                                  <button key={s.value}
                                    onClick={(e) => { e.stopPropagation(); handleUpdateAd(ad.id, { status: s.value }); setStatusDropdownId(null); }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[rgba(255,255,255,0.05)] transition-none ${
                                      ad.status === s.value ? 'bg-[rgba(255,255,255,0.05)]' : ''
                                    }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${s.color.replace('text-', 'bg-')}`}></div>
                                    <span className={s.color}>{s.label}</span>
                                    {ad.status === s.value && <Check size={12} className="ml-auto text-[#ECECEC]" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Drive Link */}
                      <td className="px-6 py-4">
                        {editingId === ad.id && editField === 'driveLink' ? (
                          <input value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingId(null); setEditField(null); } }}
                            placeholder="Paste Drive link..." className="bg-[#3a3a3a] border border-[#4a4a4a] rounded px-2 py-1 text-sm text-[#ECECEC] placeholder-[#666666] focus:outline-none w-full max-w-xs" autoFocus />
                        ) : ad.driveLink ? (
                          <div className="flex items-center gap-2">
                            <a href={ad.driveLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-none">
                              <Folder size={14} /><span className="truncate max-w-[180px]">Open in Drive</span><ExternalLink size={12} />
                            </a>
                            <button onClick={() => startEdit(ad.id, 'driveLink', ad.driveLink)} className="text-[#666666] hover:text-[#9B9B9B] opacity-0 group-hover:opacity-100"><FileText size={12} /></button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(ad.id, 'driveLink', '')} className="text-xs text-[#666666] hover:text-[#9B9B9B]">+ Add Drive link</button>
                        )}
                      </td>

                      {/* Created */}
                      <td className="px-6 py-4 text-sm text-[#9B9B9B]">
                        {new Date(ad.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className={`flex items-center gap-2 justify-end ${selectedAdId === ad.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                          <button onClick={(e) => { e.stopPropagation(); openEditModal(ad); }} className="text-[#9B9B9B] hover:text-[#ECECEC]"><FileText size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); requestDelete(ad.id); }} className="text-[#666666] hover:text-rose-400"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleAds.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-[#9B9B9B]">
                        <Video size={32} className="text-[#666666]" />
                        <p>No ads yet.</p>
                        <button onClick={handleAddInline} className="text-sm text-[#ECECEC] hover:text-[#ECECEC] font-medium">Create your first ad</button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trash View */}
      {viewMode === 'trash' && (
        <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl overflow-hidden shadow-sm">
          {trash.length > 0 && (
            <div className="p-4 border-b border-[#3a3a3a] flex items-center justify-between">
              <p className="text-sm text-[#9B9B9B]">{trash.length} item{trash.length !== 1 ? 's' : ''} in trash</p>
              <button onClick={requestEmptyTrash} className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"><Ban size={12} /> Empty Trash</button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-[#212121] text-xs uppercase tracking-wider text-[#9B9B9B] font-medium">
                <th className="px-6 py-4">Ad Name</th><th className="px-6 py-4">Status</th><th className="px-6 py-4"></th>
              </tr></thead>
              <tbody className="divide-y divide-[#3a3a3a]">
                {trash.length === 0 && <tr><td colSpan={3} className="px-6 py-12 text-center text-[#9B9B9B] text-sm">Trash is empty</td></tr>}
                {trash.map(ad => {
                  const sc = getStatusConfig(ad.status);
                  return (
                    <tr key={ad.id} className="group hover:bg-[rgba(255,255,255,0.05)] transition-none">
                      <td className="px-6 py-4"><p className="font-medium text-[#9B9B9B] text-sm line-through">{ad.name}</p></td>
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

    </div>
  );
};

export default AdsManager;
