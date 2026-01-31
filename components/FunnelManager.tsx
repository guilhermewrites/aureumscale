import React, { useState, useRef, useCallback } from 'react';
import {
  Plus, Trash2, ExternalLink, Eye, DollarSign, MousePointerClick,
  Globe, Play, Mail, ShoppingCart, Gift, FileText,
  Check, X, Megaphone, ZoomIn, ZoomOut, Maximize2,
  ArrowLeft, Package, BookOpen, MonitorPlay, Download, Box
} from 'lucide-react';
import { Funnel, FunnelStep, FunnelStepType, FunnelStepAd } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';

// ─── Step type config ───────────────────────────────────────────
const STEP_TYPES: { value: FunnelStepType; label: string; icon: React.ElementType; color: string; glow: string }[] = [
  { value: 'registration', label: 'Registration', icon: FileText, color: '#3b82f6', glow: '0 0 20px rgba(59,130,246,0.3)' },
  { value: 'thank_you', label: 'Thank You', icon: Check, color: '#10b981', glow: '0 0 20px rgba(16,185,129,0.3)' },
  { value: 'video', label: 'Video Page', icon: Play, color: '#8b5cf6', glow: '0 0 20px rgba(139,92,246,0.3)' },
  { value: 'email', label: 'Email', icon: Mail, color: '#f59e0b', glow: '0 0 20px rgba(245,158,11,0.3)' },
  { value: 'sales_page', label: 'Sales Page', icon: ShoppingCart, color: '#ef4444', glow: '0 0 20px rgba(239,68,68,0.3)' },
  { value: 'checkout', label: 'Checkout', icon: ShoppingCart, color: '#f97316', glow: '0 0 20px rgba(249,115,22,0.3)' },
  { value: 'upsell', label: 'Upsell', icon: Gift, color: '#ec4899', glow: '0 0 20px rgba(236,72,153,0.3)' },
  { value: 'ad', label: 'Ad', icon: Megaphone, color: '#06b6d4', glow: '0 0 20px rgba(6,182,212,0.3)' },
  { value: 'product', label: 'Product', icon: Package, color: '#a855f7', glow: '0 0 20px rgba(168,85,247,0.3)' },
  { value: 'blog', label: 'Blog Post', icon: BookOpen, color: '#14b8a6', glow: '0 0 20px rgba(20,184,166,0.3)' },
  { value: 'webinar', label: 'Webinar', icon: MonitorPlay, color: '#6366f1', glow: '0 0 20px rgba(99,102,241,0.3)' },
  { value: 'download', label: 'Download', icon: Download, color: '#22c55e', glow: '0 0 20px rgba(34,197,94,0.3)' },
  { value: 'custom', label: 'Custom', icon: Globe, color: '#6b7280', glow: '0 0 20px rgba(107,114,128,0.3)' },
];

const getStepConfig = (type: FunnelStepType) => STEP_TYPES.find(s => s.value === type) || STEP_TYPES[12];

interface Position { x: number; y: number }

interface CanvasStep extends FunnelStep {
  position: Position;
}

interface CanvasFunnel extends Omit<Funnel, 'steps'> {
  steps: CanvasStep[];
  connections: { from: string; to: string }[];
}

interface FunnelManagerProps {
  storagePrefix: string;
}

// ─── Neon styles (injected once) ─────────────────────────────
const NEON_STYLE_ID = 'funnel-neon-styles';
if (typeof document !== 'undefined' && !document.getElementById(NEON_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = NEON_STYLE_ID;
  style.textContent = `
    .neon-line-subtle {
      filter: drop-shadow(0 0 2px rgba(52,211,153,0.25));
    }
  `;
  document.head.appendChild(style);
}

const FunnelManager: React.FC<FunnelManagerProps> = ({ storagePrefix }) => {
  const [funnels, setFunnels] = useLocalStorage<CanvasFunnel[]>(`${storagePrefix}_funnels`, []);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');

  // Canvas
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasOffset, setCanvasOffset] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 });
  const [panOffsetStart, setPanOffsetStart] = useState<Position>({ x: 0, y: 0 });

  // Dragging
  const [draggingStepId, setDraggingStepId] = useState<string | null>(null);
  const [dragStartMouse, setDragStartMouse] = useState<Position>({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState<Position>({ x: 0, y: 0 });

  // Connecting (drag from handle)
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectMouse, setConnectMouse] = useState<Position>({ x: 0, y: 0 });
  const [selectedConnection, setSelectedConnection] = useState<{ from: string; to: string } | null>(null);

  // Step editing
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Ads on step
  const [addingAdToStep, setAddingAdToStep] = useState<string | null>(null);
  const [newAdName, setNewAdName] = useState('');
  const [newAdPlatform, setNewAdPlatform] = useState<'Facebook' | 'Google' | 'LinkedIn' | 'TikTok'>('Facebook');
  const [newAdType, setNewAdType] = useState<'marketing' | 'remarketing'>('marketing');
  const [newAdSpend, setNewAdSpend] = useState('');
  const [newAdClicks, setNewAdClicks] = useState('');

  // Side panel
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const selectedFunnel = funnels.find(f => f.id === selectedFunnelId);
  const selectedStep = selectedFunnel?.steps.find(s => s.id === selectedStepId);

  // ─── Funnel CRUD ────────────────────────────────────────────
  const handleCreateFunnel = () => {
    if (!newFunnelName.trim()) return;
    const funnel: CanvasFunnel = {
      id: Date.now().toString(), name: newFunnelName.trim(),
      steps: [], connections: [], createdAt: new Date().toISOString(),
    };
    setFunnels(prev => [...prev, funnel]);
    setSelectedFunnelId(funnel.id);
    setNewFunnelName(''); setIsCreating(false);
    setCanvasOffset({ x: 0, y: 0 }); setZoom(1);
  };

  const handleDeleteFunnel = (id: string) => {
    setFunnels(prev => prev.filter(f => f.id !== id));
    if (selectedFunnelId === id) { setSelectedFunnelId(null); setSelectedStepId(null); }
  };

  // ─── Canvas step ops ───────────────────────────────────────
  const addStepToCanvas = (type: FunnelStepType) => {
    if (!selectedFunnel) return;
    const el = canvasRef.current;
    const cx = el ? (el.clientWidth / 2 - canvasOffset.x) / zoom : 400;
    const cy = el ? (el.clientHeight / 2 - canvasOffset.y) / zoom : 300;
    const off = selectedFunnel.steps.length * 40;
    const step: CanvasStep = {
      id: Date.now().toString(), name: getStepConfig(type).label, type,
      views: 0, ads: [], order: selectedFunnel.steps.length,
      position: { x: cx + off - CARD_W / 2, y: cy + (off % 80) - CARD_H / 2 },
    };
    setFunnels(prev => prev.map(f => f.id === selectedFunnel.id ? { ...f, steps: [...f.steps, step] } : f));
    setPaletteOpen(false);
  };

  const updateStep = (stepId: string, updates: Partial<CanvasStep>) => {
    if (!selectedFunnel) return;
    setFunnels(prev => prev.map(f =>
      f.id === selectedFunnel.id ? { ...f, steps: f.steps.map(s => s.id === stepId ? { ...s, ...updates } : s) } : f
    ));
  };

  const deleteStep = (stepId: string) => {
    if (!selectedFunnel) return;
    setFunnels(prev => prev.map(f =>
      f.id === selectedFunnel.id ? { ...f, steps: f.steps.filter(s => s.id !== stepId), connections: f.connections.filter(c => c.from !== stepId && c.to !== stepId) } : f
    ));
    if (selectedStepId === stepId) setSelectedStepId(null);
  };

  const addConnection = (from: string, to: string) => {
    if (!selectedFunnel || from === to) return;
    if (selectedFunnel.connections.some(c => c.from === from && c.to === to)) return;
    setFunnels(prev => prev.map(f =>
      f.id === selectedFunnel.id ? { ...f, connections: [...f.connections, { from, to }] } : f
    ));
  };

  const deleteConnection = (from: string, to: string) => {
    if (!selectedFunnel) return;
    setFunnels(prev => prev.map(f =>
      f.id === selectedFunnel.id ? { ...f, connections: f.connections.filter(c => !(c.from === from && c.to === to)) } : f
    ));
    if (selectedConnection?.from === from && selectedConnection?.to === to) {
      setSelectedConnection(null);
    }
  };

  // ─── Mouse handlers ────────────────────────────────────────
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && (e.target as HTMLElement).classList.contains('canvas-bg'))) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanOffsetStart({ ...canvasOffset });
    }
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setCanvasOffset({ x: panOffsetStart.x + (e.clientX - panStart.x), y: panOffsetStart.y + (e.clientY - panStart.y) });
    }
    if (draggingStepId) {
      const dx = (e.clientX - dragStartMouse.x) / zoom;
      const dy = (e.clientY - dragStartMouse.y) / zoom;
      updateStep(draggingStepId, { position: { x: dragStartPos.x + dx, y: dragStartPos.y + dy } });
    }
    if (connecting) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setConnectMouse({ x: (e.clientX - rect.left - canvasOffset.x) / zoom, y: (e.clientY - rect.top - canvasOffset.y) / zoom });
      }
    }
  }, [isPanning, panStart, panOffsetStart, draggingStepId, dragStartMouse, dragStartPos, zoom, connecting, canvasOffset]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false); setDraggingStepId(null);
    // If connecting and released on empty space, cancel
    if (connecting) setConnecting(null);
  }, [connecting]);

  const handleStepMouseDown = (e: React.MouseEvent, stepId: string) => {
    e.stopPropagation();
    const step = selectedFunnel?.steps.find(s => s.id === stepId);
    if (!step) return;
    setDraggingStepId(stepId);
    setDragStartMouse({ x: e.clientX, y: e.clientY });
    setDragStartPos({ x: step.position.x, y: step.position.y });
  };

  const handleStepMouseUp = (e: React.MouseEvent, stepId: string) => {
    if (connecting && connecting !== stepId) {
      addConnection(connecting, stepId);
      setConnecting(null);
      e.stopPropagation();
    }
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom(prev => Math.max(0.2, Math.min(3, prev + delta)));
  }, []);

  const handleZoom = (delta: number) => setZoom(prev => Math.max(0.2, Math.min(3, prev + delta)));
  const resetView = () => { setCanvasOffset({ x: 0, y: 0 }); setZoom(1); };

  // ─── Inline edit ───────────────────────────────────────────
  const startEdit = (stepId: string, field: string, value: string) => { setEditingStepId(stepId); setEditField(field); setEditValue(value); };
  const saveEdit = () => {
    if (!editingStepId || !editField) return;
    if (editField === 'views') updateStep(editingStepId, { views: parseInt(editValue) || 0 });
    else if (editField === 'url') updateStep(editingStepId, { url: editValue || undefined });
    else if (editField === 'name') updateStep(editingStepId, { name: editValue });
    setEditingStepId(null); setEditField(null);
  };

  // ─── Ad ops ────────────────────────────────────────────────
  const handleAddAd = () => {
    if (!selectedFunnel || !addingAdToStep || !newAdName.trim()) return;
    const ad: FunnelStepAd = { id: Date.now().toString(), campaignName: newAdName.trim(), platform: newAdPlatform, type: newAdType, spend: parseFloat(newAdSpend) || 0, clicks: parseInt(newAdClicks) || 0, impressions: 0 };
    setFunnels(prev => prev.map(f =>
      f.id === selectedFunnel.id ? { ...f, steps: f.steps.map(s => s.id === addingAdToStep ? { ...s, ads: [...s.ads, ad] } : s) } : f
    ));
    setNewAdName(''); setNewAdSpend(''); setNewAdClicks(''); setAddingAdToStep(null);
  };

  const deleteAd = (stepId: string, adId: string) => {
    if (!selectedFunnel) return;
    setFunnels(prev => prev.map(f =>
      f.id === selectedFunnel.id ? { ...f, steps: f.steps.map(s => s.id === stepId ? { ...s, ads: s.ads.filter(a => a.id !== adId) } : s) } : f
    ));
  };

  // ─── Arrow path ────────────────────────────────────────────
  const CARD_W = 220, CARD_H = 150;
  const HANDLE_SIZE = 14;
  const HANDLE_OFFSET = HANDLE_SIZE / 2;

  const getConnectionPoints = (from: CanvasStep, to: CanvasStep) => {
    const x1 = from.position.x + CARD_W + HANDLE_OFFSET;
    const y1 = from.position.y + CARD_H / 2;
    const x2 = to.position.x - HANDLE_OFFSET;
    const y2 = to.position.y + CARD_H / 2;
    const mx = (x1 + x2) / 2;
    return { x1, y1, x2, y2, mx };
  };

  const getArrowPath = (from: CanvasStep, to: CanvasStep) => {
    const { x1, y1, x2, y2, mx } = getConnectionPoints(from, to);
    return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
  };

  const getTempArrowPath = (fromStep: CanvasStep, mouse: Position) => {
    const x1 = fromStep.position.x + CARD_W + HANDLE_OFFSET;
    const y1 = fromStep.position.y + CARD_H / 2;
    const mx = (x1 + mouse.x) / 2;
    return `M${x1},${y1} C${mx},${y1} ${mx},${mouse.y} ${mouse.x},${mouse.y}`;
  };

  const getBezierMidpoint = (x1: number, y1: number, cx1: number, cy1: number, cx2: number, cy2: number, x2: number, y2: number) => {
    const t = 0.5;
    const mt = 1 - t;
    const x = (mt ** 3) * x1 + 3 * (mt ** 2) * t * cx1 + 3 * mt * (t ** 2) * cx2 + (t ** 3) * x2;
    const y = (mt ** 3) * y1 + 3 * (mt ** 2) * t * cy1 + 3 * mt * (t ** 2) * cy2 + (t ** 3) * y2;
    return { x, y };
  };

  // ─── Totals ────────────────────────────────────────────────
  const getFunnelTotals = (f: CanvasFunnel) => {
    let v = 0, s = 0, c = 0;
    f.steps.forEach(st => { v += st.views; st.ads.forEach(a => { s += a.spend; c += a.clicks; }); });
    return { totalViews: v, totalSpend: s, totalClicks: c };
  };

  const getUrlDomain = (url: string) => { try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname; } catch { return null; } };

  // ═══════════════════════ FUNNEL LIST VIEW ═══════════════════
  if (!selectedFunnelId) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Funnels</h2>
            <p className="text-sm text-gray-500">Build and visualize your marketing funnels</p>
          </div>
          <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> New Funnel
          </button>
        </div>

        {isCreating && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-in slide-in-from-top-2">
            <h3 className="text-sm font-semibold text-white mb-3">Create New Funnel</h3>
            <div className="flex gap-3">
              <input value={newFunnelName} onChange={e => setNewFunnelName(e.target.value)} placeholder="Funnel name..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                onKeyDown={e => { if (e.key === 'Enter') handleCreateFunnel(); if (e.key === 'Escape') setIsCreating(false); }} autoFocus />
              <button onClick={handleCreateFunnel} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium">Create</button>
              <button onClick={() => setIsCreating(false)} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium">Cancel</button>
            </div>
          </div>
        )}

        {funnels.length === 0 && !isCreating ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-4"><Plus size={24} className="text-gray-600" /></div>
            <p className="text-gray-400 font-medium mb-1">No funnels yet</p>
            <p className="text-gray-600 text-sm mb-4">Create your first funnel to start mapping your customer journey</p>
            <button onClick={() => setIsCreating(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium">Create First Funnel</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {funnels.map(funnel => {
              const { totalViews, totalSpend } = getFunnelTotals(funnel);
              return (
                <button key={funnel.id} onClick={() => { setSelectedFunnelId(funnel.id); setCanvasOffset({ x: 0, y: 0 }); setZoom(1); }}
                  className="text-left bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">{funnel.name}</h3>
                    <button onClick={e => { e.stopPropagation(); handleDeleteFunnel(funnel.id); }} className="p-1 text-gray-700 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                  </div>
                  <div className="flex items-center gap-1.5 mb-3 overflow-hidden">
                    {funnel.steps.slice(0, 6).map((step, i) => {
                      const cfg = getStepConfig(step.type);
                      return (
                        <React.Fragment key={step.id}>
                          {i > 0 && <div className="w-4 h-px flex-shrink-0" style={{ backgroundColor: cfg.color + '40' }} />}
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.color + '15', border: `1px solid ${cfg.color}25` }}>
                            <cfg.icon size={11} style={{ color: cfg.color }} />
                          </div>
                        </React.Fragment>
                      );
                    })}
                    {funnel.steps.length > 6 && <span className="text-[10px] text-gray-500 ml-1">+{funnel.steps.length - 6}</span>}
                    {funnel.steps.length === 0 && <span className="text-xs text-gray-600">Empty funnel</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{funnel.steps.length} steps</span>
                    <span>{totalViews.toLocaleString()} views</span>
                    <span>${totalSpend.toLocaleString()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════ CANVAS VIEW ════════════════════════
  if (!selectedFunnel) return null;
  const { totalViews, totalSpend, totalClicks } = getFunnelTotals(selectedFunnel);
  const gridSize = 24 * zoom;
  const gridMajor = 120 * zoom;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-300">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedFunnelId(null); setSelectedStepId(null); }} className="p-2 text-gray-400 hover:text-white hover:bg-gray-900 rounded-lg transition-colors"><ArrowLeft size={18} /></button>
          <div>
            <h2 className="text-lg font-bold text-white">{selectedFunnel.name}</h2>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{selectedFunnel.steps.length} steps</span>
              <span>{totalViews.toLocaleString()} views</span>
              <span>${totalSpend.toLocaleString()} spend</span>
              <span>{totalClicks.toLocaleString()} clicks</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-900/80 backdrop-blur border border-gray-800 rounded-lg px-2 py-1">
            <button onClick={() => handleZoom(-0.15)} className="p-1 text-gray-400 hover:text-white"><ZoomOut size={14} /></button>
            <span className="text-[10px] text-gray-400 w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
            <button onClick={() => handleZoom(0.15)} className="p-1 text-gray-400 hover:text-white"><ZoomIn size={14} /></button>
            <div className="w-px h-4 bg-gray-800 mx-0.5" />
            <button onClick={resetView} className="p-1 text-gray-400 hover:text-white"><Maximize2 size={14} /></button>
          </div>
          <div className="relative">
            <button onClick={() => setPaletteOpen(!paletteOpen)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-900/20">
              <Plus size={16} /> Add Element
            </button>
            {paletteOpen && (
              <div className="absolute right-0 top-full mt-2 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-2 w-72 z-50 animate-in fade-in slide-in-from-top-2 duration-200 grid grid-cols-3 gap-1">
                {STEP_TYPES.map(st => (
                  <button key={st.value} onClick={() => addStepToCanvas(st.value)}
                    className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg text-[10px] font-medium text-gray-400 hover:text-white transition-all hover:bg-gray-800 group">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all group-hover:scale-110" style={{ backgroundColor: st.color + '15', border: `1px solid ${st.color}30`, boxShadow: `0 0 0px ${st.color}00` }}>
                      <st.icon size={14} style={{ color: st.color }} />
                    </div>
                    {st.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Canvas + Side panel */}
      <div className="flex flex-1 gap-3 min-h-0">
        <div ref={canvasRef}
          className="flex-1 rounded-xl overflow-hidden relative select-none"
          style={{ cursor: isPanning ? 'grabbing' : connecting ? 'crosshair' : 'default', background: 'linear-gradient(180deg, #0a0f1a 0%, #060b14 100%)' }}
          onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp}
          onWheel={handleWheel}
          onClick={() => { if (paletteOpen) setPaletteOpen(false); setSelectedConnection(null); }}>

          {/* Alignment grid */}
          <div className="canvas-bg absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(to right, rgba(52,211,153,0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(52,211,153,0.08) 1px, transparent 1px),
              linear-gradient(to right, rgba(52,211,153,0.16) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(52,211,153,0.16) 1px, transparent 1px)
            `,
            backgroundSize: `${gridSize}px ${gridSize}px, ${gridSize}px ${gridSize}px, ${gridMajor}px ${gridMajor}px, ${gridMajor}px ${gridMajor}px`,
            backgroundPosition: `
              ${canvasOffset.x % gridSize}px ${canvasOffset.y % gridSize}px,
              ${canvasOffset.x % gridSize}px ${canvasOffset.y % gridSize}px,
              ${canvasOffset.x % gridMajor}px ${canvasOffset.y % gridMajor}px,
              ${canvasOffset.x % gridMajor}px ${canvasOffset.y % gridMajor}px
            `,
          }} />

          {/* Border glow */}
          <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: 'inset 0 0 60px rgba(52,211,153,0.03)' }} />

          {/* SVG connections */}
          <svg className="absolute inset-0 w-full h-full neon-line-subtle" style={{ overflow: 'visible' }}>
            <g transform={`translate(${canvasOffset.x}, ${canvasOffset.y}) scale(${zoom})`}>
              {selectedFunnel.connections.map(conn => {
                const fromStep = selectedFunnel.steps.find(s => s.id === conn.from);
                const toStep = selectedFunnel.steps.find(s => s.id === conn.to);
                if (!fromStep || !toStep) return null;
                const { x1, y1, x2, y2, mx } = getConnectionPoints(fromStep, toStep);
                const path = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
                const isSelected = selectedConnection?.from === conn.from && selectedConnection?.to === conn.to;
                const mid = getBezierMidpoint(x1, y1, mx, y1, mx, y2, x2, y2);
                return (
                  <g key={`${conn.from}-${conn.to}`}>
                    {/* Single clean neon green line */}
                    <path d={path} fill="none" stroke={isSelected ? 'rgba(52,211,153,0.7)' : 'rgba(52,211,153,0.35)'} strokeWidth="1.6" strokeLinecap="round" />
                    {/* Small arrowhead dot */}
                    <circle cx={x2} cy={y2} r="2.5" fill="rgba(52,211,153,0.55)" />
                    {/* Invisible click target to select */}
                    <path d={path} fill="none" stroke="transparent" strokeWidth="16" style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                      onMouseDown={e => { e.stopPropagation(); setSelectedConnection({ from: conn.from, to: conn.to }); }} />
                    {isSelected && (
                      <g transform={`translate(${mid.x}, ${mid.y})`} style={{ pointerEvents: 'all', cursor: 'pointer' }}
                        onMouseDown={e => { e.stopPropagation(); deleteConnection(conn.from, conn.to); }}>
                        <circle r="10" fill="rgba(15,23,42,0.9)" stroke="rgba(244,63,94,0.7)" strokeWidth="1" />
                        <line x1="-4" y1="-4" x2="4" y2="4" stroke="rgba(244,63,94,0.9)" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="-4" y1="4" x2="4" y2="-4" stroke="rgba(244,63,94,0.9)" strokeWidth="1.5" strokeLinecap="round" />
                      </g>
                    )}
                  </g>
                );
              })}
              {/* Temporary line while dragging from handle */}
              {connecting && (() => {
                const fromStep = selectedFunnel.steps.find(s => s.id === connecting);
                if (!fromStep) return null;
                const path = getTempArrowPath(fromStep, connectMouse);
                return <path d={path} fill="none" stroke="rgba(52,211,153,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="6 4" />;
              })()}
            </g>
          </svg>

          {/* Steps */}
          <div className="absolute inset-0" style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
            {selectedFunnel.steps.map(step => {
              const cfg = getStepConfig(step.type);
              const Icon = cfg.icon;
              const totalAdSpend = step.ads.reduce((s, a) => s + a.spend, 0);
              const isSelected = selectedStepId === step.id;
              const domain = step.url ? getUrlDomain(step.url) : null;

              return (
                <div key={step.id} className="canvas-step absolute"
                  style={{ left: step.position.x, top: step.position.y, width: CARD_W, cursor: draggingStepId === step.id ? 'grabbing' : 'grab' }}
                  onMouseDown={e => handleStepMouseDown(e, step.id)}
                  onMouseUp={e => handleStepMouseUp(e, step.id)}
                  onClick={e => { e.stopPropagation(); setSelectedStepId(step.id); }}>

                  {/* Card */}
                  <div className="rounded-xl overflow-hidden transition-all duration-200" style={{
                    height: CARD_H,
                    background: 'linear-gradient(135deg, rgba(17,24,39,0.97) 0%, rgba(10,15,25,0.98) 100%)',
                    border: `1.5px solid ${isSelected ? cfg.color : 'rgba(55,65,81,0.4)'}`,
                    boxShadow: isSelected ? `0 0 24px ${cfg.color}20, 0 4px 20px rgba(0,0,0,0.4)` : '0 4px 16px rgba(0,0,0,0.3)',
                  }}>
                    {/* Top color accent */}
                    <div className="h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}60, transparent)` }} />

                    {/* Header */}
                    <div className="px-4 pt-3.5 pb-2 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.color + '12', border: `1px solid ${cfg.color}25` }}>
                        <Icon size={16} style={{ color: cfg.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        {editingStepId === step.id && editField === 'name' ? (
                          <input value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingStepId(null); setEditField(null); } }}
                            className="w-full bg-gray-800/80 border border-gray-600 rounded px-2 py-0.5 text-xs text-white focus:outline-none" autoFocus onMouseDown={e => e.stopPropagation()} />
                        ) : (
                          <p className="text-xs font-semibold text-white truncate cursor-text hover:text-emerald-300 transition-colors"
                            onDoubleClick={e => { e.stopPropagation(); startEdit(step.id, 'name', step.name); }}>{step.name}</p>
                        )}
                        <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: cfg.color + '80' }}>{cfg.label}</p>
                      </div>
                    </div>

                    {/* URL */}
                    {step.url && domain && (
                      <a href={step.url.startsWith('http') ? step.url : `https://${step.url}`} target="_blank" rel="noreferrer"
                        className="mx-4 mb-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800/40 rounded-md text-[9px] text-gray-500 hover:text-gray-300 transition-colors border border-gray-800/50"
                        onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                        <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`} alt="" className="w-3.5 h-3.5 rounded-sm" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <span className="truncate flex-1">{domain}</span>
                        <ExternalLink size={8} className="flex-shrink-0 opacity-50" />
                      </a>
                    )}

                    {/* Stats */}
                    <div className="px-4 pb-3 flex items-center gap-4 text-[10px]">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Eye size={10} />
                        <span className="cursor-text hover:text-white transition-colors" onDoubleClick={e => { e.stopPropagation(); startEdit(step.id, 'views', step.views.toString()); }}>
                          {editingStepId === step.id && editField === 'views' ? (
                            <input value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit}
                              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingStepId(null); setEditField(null); } }}
                              className="w-12 bg-gray-800 border border-gray-600 rounded px-1 text-[10px] text-white focus:outline-none" autoFocus onMouseDown={e => e.stopPropagation()} />
                          ) : step.views.toLocaleString()}
                        </span>
                      </div>
                      {totalAdSpend > 0 && <div className="flex items-center gap-1 text-gray-500"><DollarSign size={9} />{totalAdSpend.toLocaleString()}</div>}
                      {step.ads.length > 0 && <div className="flex items-center gap-1 text-gray-500"><Megaphone size={9} />{step.ads.length}</div>}
                    </div>
                  </div>

                  {/* Connection handles */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 transition-all cursor-crosshair z-10 hover:scale-150 hover:border-emerald-400"
                    style={{ backgroundColor: 'rgba(52,211,153,0.25)', borderColor: 'rgba(52,211,153,0.45)' }}
                    onMouseDown={e => {
                      e.stopPropagation();
                      setConnecting(step.id);
                      const rect = canvasRef.current?.getBoundingClientRect();
                      if (rect) {
                        setConnectMouse({ x: (e.clientX - rect.left - canvasOffset.x) / zoom, y: (e.clientY - rect.top - canvasOffset.y) / zoom });
                      }
                    }} />
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 transition-all z-10 ${connecting && connecting !== step.id ? 'scale-150 border-emerald-400' : ''}`}
                    style={{ backgroundColor: connecting && connecting !== step.id ? 'rgba(52,211,153,0.5)' : 'rgba(55,65,81,0.4)', borderColor: connecting && connecting !== step.id ? 'rgba(52,211,153,0.7)' : 'rgba(55,65,81,0.25)' }} />
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {selectedFunnel.steps.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-14 h-14 rounded-2xl bg-gray-900/50 border border-gray-800 flex items-center justify-center mb-3"><Plus size={20} className="text-gray-600" /></div>
              <p className="text-gray-500 text-sm">Empty canvas</p>
              <p className="text-gray-600 text-xs">Click "Add Element" to build your funnel</p>
            </div>
          )}

          {/* Connecting indicator */}
          {connecting && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900/90 backdrop-blur border border-emerald-500/30 rounded-full text-xs text-emerald-400 font-medium z-50 shadow-lg shadow-emerald-500/10">
              Drop on a step to connect · Release to cancel
            </div>
          )}
        </div>

        {/* Side panel */}
        {selectedStep && (
          <div className="w-72 flex-shrink-0 bg-gray-900/80 backdrop-blur border border-gray-800 rounded-xl p-4 overflow-y-auto animate-in slide-in-from-right-4 duration-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => { const cfg = getStepConfig(selectedStep.type); return (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: cfg.color + '15', border: `1px solid ${cfg.color}25` }}>
                    <cfg.icon size={14} style={{ color: cfg.color }} />
                  </div>
                ); })()}
                <h3 className="text-sm font-semibold text-white">{selectedStep.name}</h3>
              </div>
              <div className="flex gap-1">
                <button onClick={() => deleteStep(selectedStep.id)} className="p-1 text-gray-500 hover:text-rose-400"><Trash2 size={14} /></button>
                <button onClick={() => setSelectedStepId(null)} className="p-1 text-gray-500 hover:text-white"><X size={14} /></button>
              </div>
            </div>

            <div><label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Type</label>
              <select value={selectedStep.type} onChange={e => updateStep(selectedStep.id, { type: e.target.value as FunnelStepType })}
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                {STEP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div><label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Page URL</label>
              <input value={selectedStep.url || ''} onChange={e => updateStep(selectedStep.id, { url: e.target.value || undefined })} placeholder="https://..."
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              {selectedStep.url && getUrlDomain(selectedStep.url) && (
                <a href={selectedStep.url.startsWith('http') ? selectedStep.url : `https://${selectedStep.url}`} target="_blank" rel="noreferrer"
                  className="mt-2 flex items-center gap-2 px-3 py-2 bg-gray-800/60 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-colors">
                  <img src={`https://www.google.com/s2/favicons?domain=${getUrlDomain(selectedStep.url)}&sz=32`} alt="" className="w-4 h-4 rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span className="truncate flex-1">{getUrlDomain(selectedStep.url)}</span><ExternalLink size={12} />
                </a>
              )}
            </div>

            <div><label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Page Views</label>
              <input type="number" value={selectedStep.views} onChange={e => updateStep(selectedStep.id, { views: parseInt(e.target.value) || 0 })}
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Ads ({selectedStep.ads.length})</label>
                <button onClick={() => setAddingAdToStep(selectedStep.id)} className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"><Plus size={10} /> Add</button>
              </div>
              {selectedStep.ads.length === 0 && addingAdToStep !== selectedStep.id && <p className="text-xs text-gray-600 text-center py-3">No ads attached</p>}
              <div className="space-y-2">
                {selectedStep.ads.map(ad => (
                  <div key={ad.id} className="bg-gray-800/50 rounded-lg p-2.5 flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-gray-200 truncate">{ad.campaignName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${ad.type === 'marketing' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>{ad.type}</span>
                        <span className="text-[9px] text-gray-500">{ad.platform}</span>
                      </div>
                      <div className="flex gap-3 mt-1 text-[9px] text-gray-400"><span>${ad.spend.toLocaleString()}</span><span>{ad.clicks} clicks</span></div>
                    </div>
                    <button onClick={() => deleteAd(selectedStep.id, ad.id)} className="p-0.5 text-gray-600 hover:text-rose-400"><Trash2 size={10} /></button>
                  </div>
                ))}
              </div>
              {addingAdToStep === selectedStep.id && (
                <div className="bg-gray-800/50 rounded-lg p-2.5 space-y-2 mt-2">
                  <input value={newAdName} onChange={e => setNewAdName(e.target.value)} placeholder="Campaign name..." className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-[11px] text-white placeholder-gray-500 focus:outline-none" autoFocus />
                  <div className="flex gap-1">
                    <select value={newAdPlatform} onChange={e => setNewAdPlatform(e.target.value as any)} className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-[10px] text-white focus:outline-none">
                      <option value="Facebook">Facebook</option><option value="Google">Google</option><option value="LinkedIn">LinkedIn</option><option value="TikTok">TikTok</option>
                    </select>
                    <select value={newAdType} onChange={e => setNewAdType(e.target.value as any)} className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-[10px] text-white focus:outline-none">
                      <option value="marketing">Marketing</option><option value="remarketing">Remarketing</option>
                    </select>
                  </div>
                  <div className="flex gap-1">
                    <input value={newAdSpend} onChange={e => setNewAdSpend(e.target.value)} placeholder="Spend $" type="number" className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-[10px] text-white placeholder-gray-500 focus:outline-none" />
                    <input value={newAdClicks} onChange={e => setNewAdClicks(e.target.value)} placeholder="Clicks" type="number" className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-[10px] text-white placeholder-gray-500 focus:outline-none" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={handleAddAd} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px]">Add</button>
                    <button onClick={() => setAddingAdToStep(null)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-[10px]">Cancel</button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default FunnelManager;
