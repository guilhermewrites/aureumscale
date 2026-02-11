import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Plus, Trash2, ExternalLink,
  Globe, Play, Mail, ShoppingCart, Gift, FileText,
  Check, X, Megaphone, ZoomIn, ZoomOut, Maximize2,
  ArrowLeft, Package, BookOpen, MonitorPlay, Download, Box,
  MessageCircle, Phone, GitBranch, Database, Users,
  ChevronsLeft, ChevronsRight, ChevronDown,
  Clock, Video, CheckCircle2, Eye, Radio, Pause, AlertTriangle, Send,
  Upload, Image,
} from 'lucide-react';
import { Funnel, FunnelStep, FunnelStepType, FunnelAdStatus } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { supabase } from '../services/supabaseClient';

// ─── Step type config ───────────────────────────────────────────
const STEP_TYPES: { value: FunnelStepType; label: string; icon: React.ElementType; color: string; glow: string }[] = [
  { value: 'registration', label: 'Registration', icon: FileText, color: '#3b82f6', glow: '0 0 20px rgba(59,130,246,0.3)' },
  { value: 'thank_you', label: 'Thank You', icon: Check, color: '#10b981', glow: '0 0 20px rgba(16,185,129,0.3)' },
  { value: 'video', label: 'Video Page', icon: Play, color: '#8b5cf6', glow: '0 0 20px rgba(139,92,246,0.3)' },
  { value: 'email', label: 'Email', icon: Mail, color: '#f59e0b', glow: '0 0 20px rgba(245,158,11,0.3)' },
  { value: 'sms', label: 'SMS', icon: MessageCircle, color: '#0ea5e9', glow: '0 0 20px rgba(14,165,233,0.3)' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: '#25d366', glow: '0 0 20px rgba(37,211,102,0.3)' },
  { value: 'call', label: 'Call', icon: Phone, color: '#84cc16', glow: '0 0 20px rgba(132,204,22,0.3)' },
  { value: 'sales_page', label: 'Sales Page', icon: ShoppingCart, color: '#ef4444', glow: '0 0 20px rgba(239,68,68,0.3)' },
  { value: 'checkout', label: 'Checkout', icon: ShoppingCart, color: '#f97316', glow: '0 0 20px rgba(249,115,22,0.3)' },
  { value: 'upsell', label: 'Upsell', icon: Gift, color: '#ec4899', glow: '0 0 20px rgba(236,72,153,0.3)' },
  { value: 'ad', label: 'Ad', icon: Megaphone, color: '#06b6d4', glow: '0 0 20px rgba(6,182,212,0.3)' },
  { value: 'pipeline', label: 'Pipeline', icon: GitBranch, color: '#64748b', glow: '0 0 20px rgba(100,116,139,0.3)' },
  { value: 'crm', label: 'CRM', icon: Database, color: '#0d9488', glow: '0 0 20px rgba(13,148,136,0.3)' },
  { value: 'group_chat', label: 'Group Chat', icon: Users, color: '#a855f7', glow: '0 0 20px rgba(168,85,247,0.3)' },
  { value: 'product', label: 'Product', icon: Package, color: '#a855f7', glow: '0 0 20px rgba(168,85,247,0.3)' },
  { value: 'blog', label: 'Blog Post', icon: BookOpen, color: '#14b8a6', glow: '0 0 20px rgba(20,184,166,0.3)' },
  { value: 'webinar', label: 'Webinar', icon: MonitorPlay, color: '#6366f1', glow: '0 0 20px rgba(99,102,241,0.3)' },
  { value: 'download', label: 'Download', icon: Download, color: '#22c55e', glow: '0 0 20px rgba(34,197,94,0.3)' },
  { value: 'custom', label: 'Custom', icon: Globe, color: '#6b7280', glow: '0 0 20px rgba(107,114,128,0.3)' },
];

const getStepConfig = (type: FunnelStepType) => STEP_TYPES.find(s => s.value === type) || STEP_TYPES.find(s => s.value === 'custom')!;

// ─── Ad status config (mirrors AdsManager) ──────────────────────
const AD_STATUSES: { value: FunnelAdStatus; label: string; color: string; bgColor: string; icon: React.ElementType }[] = [
  { value: 'Unassigned', label: 'Select status', color: 'text-gray-500', bgColor: 'bg-[rgba(255,255,255,0.03)] border-gray-600/30', icon: AlertTriangle },
  { value: 'Pending', label: 'Pending', color: 'text-gray-400', bgColor: 'bg-gray-500/10 border-gray-500/20', icon: Clock },
  { value: 'Scripted', label: 'Scripted', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20', icon: FileText },
  { value: 'Recorded', label: 'Recorded', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20', icon: Video },
  { value: 'Edited', label: 'Edited', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20', icon: CheckCircle2 },
  { value: 'Needs Review', label: 'Needs Review', color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20', icon: Eye },
  { value: 'Sent', label: 'Sent', color: 'text-sky-400', bgColor: 'bg-sky-500/10 border-sky-500/20', icon: Send },
  { value: 'Live', label: 'Live', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20', icon: Radio },
  { value: 'Paused', label: 'Paused', color: 'text-rose-400', bgColor: 'bg-rose-500/10 border-rose-500/20', icon: Pause },
];
const getAdStatusConfig = (status?: FunnelAdStatus) => AD_STATUSES.find(s => s.value === status) || AD_STATUSES[0];

function getMetricColor(actual: number, expected?: number): 'green' | 'yellow' | 'red' | null {
  if (expected == null || expected <= 0) return null;
  const pct = actual / expected;
  if (pct >= 1) return 'green';
  if (pct >= 0.8) return 'yellow';
  return 'red';
}

function MetricBadge({ label, actual, expected }: { label: string; actual: number; expected?: number }) {
  const color = getMetricColor(actual, expected);
  const cls = color === 'green' ? 'text-emerald-400' : color === 'yellow' ? 'text-amber-400' : color === 'red' ? 'text-rose-400' : 'text-[#9B9B9B]';
  return (
    <span className={cls} title={expected != null ? `Expected: ${expected.toLocaleString()}` : undefined}>
      {label}: {actual.toLocaleString()}{expected != null ? ` / ${expected.toLocaleString()}` : ''}
    </span>
  );
}

function ExpectedMetricsEditor({ funnel, onUpdate }: { funnel: CanvasFunnel; onUpdate: (u: Partial<CanvasFunnel['expectedMetrics']>) => void }) {
  const [open, setOpen] = useState(false);
  const exp = funnel.expectedMetrics || {};
  const [v, setV] = useState(String(exp.views ?? ''));
  const [c, setC] = useState(String(exp.clicks ?? ''));
  const [cv, setCv] = useState(String(exp.conversions ?? ''));
  const apply = () => {
    onUpdate({
      views: v === '' ? undefined : parseInt(v, 10) || 0,
      clicks: c === '' ? undefined : parseInt(c, 10) || 0,
      conversions: cv === '' ? undefined : parseInt(cv, 10) || 0,
    });
    setOpen(false);
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-2 bg-[#2f2f2f] border border-[#3a3a3a] rounded-lg text-xs text-[#9B9B9B] hover:text-white transition-none">
        Set expected
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl p-4 shadow-xl min-w-[200px]">
            <p className="text-[10px] uppercase tracking-wider text-[#9B9B9B] font-medium mb-2">Expected metrics</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#b4b4b4]">Views</span>
                <input type="number" min={0} value={v} onChange={e => setV(e.target.value)} placeholder="—"
                  className="w-20 bg-[#212121] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#b4b4b4]">Clicks</span>
                <input type="number" min={0} value={c} onChange={e => setC(e.target.value)} placeholder="—"
                  className="w-20 bg-[#212121] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#b4b4b4]">Conversions</span>
                <input type="number" min={0} value={cv} onChange={e => setCv(e.target.value)} placeholder="—"
                  className="w-20 bg-[#212121] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]" />
              </div>
            </div>
            <div className="flex justify-end gap-1 mt-3">
              <button onClick={() => setOpen(false)} className="px-2 py-1 text-xs text-[#9B9B9B] hover:text-white">Cancel</button>
              <button onClick={apply} className="px-2 py-1 text-xs bg-white text-[#212121] rounded hover:bg-[#e5e5e5]">Apply</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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
      filter: drop-shadow(0 0 2px rgba(180,180,180,0.25));
    }
  `;
  document.head.appendChild(style);
}

const FunnelManager: React.FC<FunnelManagerProps> = ({ storagePrefix }) => {
  const [funnels, setFunnels] = useLocalStorage<CanvasFunnel[]>(`${storagePrefix}_funnels`, []);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [editingFunnelId, setEditingFunnelId] = useState<string | null>(null);
  const [editingFunnelName, setEditingFunnelName] = useState('');

  // Supabase sync
  const hasLoadedFromSupabase = useRef(false);

  const syncFunnelToSupabase = useCallback(async (funnel: CanvasFunnel, action: 'upsert' | 'delete') => {
    if (!supabase) return;
    try {
      if (action === 'upsert') {
        // Store steps + connections together in the steps JSON column
        const stepsPayload = { items: funnel.steps, connections: funnel.connections };
        const { error } = await supabase.from('funnels').upsert({
          id: funnel.id,
          user_id: storagePrefix,
          name: funnel.name,
          description: funnel.description,
          steps: stepsPayload,
          expected_metrics: funnel.expectedMetrics ?? null,
        });
        if (error) {
          console.error('Supabase upsert error:', error.message);
        }
      } else {
        const { error } = await supabase.from('funnels').delete().eq('id', funnel.id);
        if (error) {
          console.error('Supabase delete error:', error.message);
        }
      }
    } catch (err) {
      console.error('Supabase sync error:', err);
    }
  }, [storagePrefix]);

  // Load from Supabase on mount (once only)
  useEffect(() => {
    if (hasLoadedFromSupabase.current || !supabase) return;
    hasLoadedFromSupabase.current = true;

    const loadFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('funnels')
          .select('*')
          .eq('user_id', storagePrefix);

        if (error) {
          console.error('Failed to load funnels from Supabase:', error);
          return;
        }

        if (data && data.length > 0) {
          const supabaseFunnels: CanvasFunnel[] = data.map(row => {
            // Handle both old format (plain array of steps) and new format ({ items, connections })
            const rawSteps = row.steps || [];
            let steps: CanvasStep[] = [];
            let connections: { from: string; to: string }[] = [];
            if (Array.isArray(rawSteps)) {
              // Old format: steps is a plain array
              steps = rawSteps as CanvasStep[];
            } else if (rawSteps && typeof rawSteps === 'object') {
              // New format: { items: [...], connections: [...] }
              steps = (rawSteps.items || []) as CanvasStep[];
              connections = (rawSteps.connections || []) as { from: string; to: string }[];
            }
            return {
              id: row.id,
              name: row.name,
              description: row.description || undefined,
              steps,
              connections,
              expectedMetrics: row.expected_metrics ?? undefined,
              createdAt: row.created_at,
            };
          });
          // Replace with Supabase data - Supabase is the source of truth
          setFunnels(supabaseFunnels);
        }
      } catch (err) {
        console.error('Supabase load error:', err);
      }
    };
    loadFromSupabase();
  }, [storagePrefix, setFunnels]);

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
  const [alignmentGuides, setAlignmentGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [playingAdStepId, setPlayingAdStepId] = useState<string | null>(null);

  // Step editing
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Side panel
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmDeleteStepId, setConfirmDeleteStepId] = useState<string | null>(null);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [adStatusDropdownOpen, setAdStatusDropdownOpen] = useState(false);
  const adStatusDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedFunnel = funnels.find(f => f.id === selectedFunnelId);
  const selectedStep = selectedFunnel?.steps.find(s => s.id === selectedStepId);

  // Global mouseup to prevent sticky drag when mouse leaves canvas or releases outside
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setDraggingStepId(null);
      setIsPanning(false);
      setConnecting(null);
      setAlignmentGuides({ x: [], y: [] });
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('blur', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('blur', handleGlobalMouseUp);
    };
  }, []);

  // Close ad status dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adStatusDropdownOpen && adStatusDropdownRef.current && !adStatusDropdownRef.current.contains(e.target as Node)) {
        setAdStatusDropdownOpen(false);
      }
    };
    if (adStatusDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [adStatusDropdownOpen]);

  // ─── Funnel CRUD ────────────────────────────────────────────
  const handleCreateFunnel = () => {
    if (!newFunnelName.trim()) return;
    const funnel: CanvasFunnel = {
      id: Date.now().toString(), name: newFunnelName.trim(),
      steps: [], connections: [], createdAt: new Date().toISOString(),
    };
    setFunnels(prev => [...prev, funnel]);
    syncFunnelToSupabase(funnel, 'upsert');
    setSelectedFunnelId(funnel.id);
    setNewFunnelName(''); setIsCreating(false);
    setCanvasOffset({ x: 0, y: 0 }); setZoom(1);
  };

  const handleDeleteFunnel = (id: string) => {
    const funnel = funnels.find(f => f.id === id);
    if (funnel) {
      syncFunnelToSupabase(funnel, 'delete');
    }
    setFunnels(prev => prev.filter(f => f.id !== id));
    if (selectedFunnelId === id) { setSelectedFunnelId(null); setSelectedStepId(null); }
  };

  const startEditFunnel = (funnelId: string, name: string) => {
    setEditingFunnelId(funnelId);
    setEditingFunnelName(name);
  };

  const saveEditFunnel = () => {
    if (!editingFunnelId) return;
    const nextName = editingFunnelName.trim();
    if (nextName) {
      setFunnels(prev => {
        const updated = prev.map(f => f.id === editingFunnelId ? { ...f, name: nextName } : f);
        const updatedFunnel = updated.find(f => f.id === editingFunnelId);
        if (updatedFunnel) syncFunnelToSupabase(updatedFunnel, 'upsert');
        return updated;
      });
    }
    setEditingFunnelId(null);
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
      views: 0, clicks: 0, conversions: 0, ads: [], order: selectedFunnel.steps.length,
      position: { x: cx + off - CARD_W / 2, y: cy + (off % 80) - CARD_H / 2 },
    };
    setFunnels(prev => {
      const updated = prev.map(f => f.id === selectedFunnel.id ? { ...f, steps: [...f.steps, step] } : f);
      const updatedFunnel = updated.find(f => f.id === selectedFunnel.id);
      if (updatedFunnel) syncFunnelToSupabase(updatedFunnel, 'upsert');
      return updated;
    });
    setPaletteOpen(false);
  };

  const updateStep = (stepId: string, updates: Partial<CanvasStep>) => {
    if (!selectedFunnel) return;
    setFunnels(prev => {
      const updated = prev.map(f =>
        f.id === selectedFunnel.id ? { ...f, steps: f.steps.map(s => s.id === stepId ? { ...s, ...updates } : s) } : f
      );
      const updatedFunnel = updated.find(f => f.id === selectedFunnel.id);
      if (updatedFunnel) syncFunnelToSupabase(updatedFunnel, 'upsert');
      return updated;
    });
  };

  const deleteStep = (stepId: string) => {
    if (!selectedFunnel) return;
    setFunnels(prev => {
      const updated = prev.map(f =>
        f.id === selectedFunnel.id ? { ...f, steps: f.steps.filter(s => s.id !== stepId), connections: f.connections.filter(c => c.from !== stepId && c.to !== stepId) } : f
      );
      const updatedFunnel = updated.find(f => f.id === selectedFunnel.id);
      if (updatedFunnel) syncFunnelToSupabase(updatedFunnel, 'upsert');
      return updated;
    });
    if (selectedStepId === stepId) setSelectedStepId(null);
  };

  const addConnection = (from: string, to: string) => {
    if (!selectedFunnel || from === to) return;
    if (selectedFunnel.connections.some(c => c.from === from && c.to === to)) return;
    setFunnels(prev => {
      const updated = prev.map(f =>
        f.id === selectedFunnel.id ? { ...f, connections: [...f.connections, { from, to }] } : f
      );
      const updatedFunnel = updated.find(f => f.id === selectedFunnel.id);
      if (updatedFunnel) syncFunnelToSupabase(updatedFunnel, 'upsert');
      return updated;
    });
  };

  const deleteConnection = (from: string, to: string) => {
    if (!selectedFunnel) return;
    setFunnels(prev => {
      const updated = prev.map(f =>
        f.id === selectedFunnel.id ? { ...f, connections: f.connections.filter(c => !(c.from === from && c.to === to)) } : f
      );
      const updatedFunnel = updated.find(f => f.id === selectedFunnel.id);
      if (updatedFunnel) syncFunnelToSupabase(updatedFunnel, 'upsert');
      return updated;
    });
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
      const nextPos = { x: dragStartPos.x + dx, y: dragStartPos.y + dy };
      const snapThreshold = 6;
      const xOffsets = [0, CARD_W / 2, CARD_W];
      const yOffsets = [0, CARD_H / 2, CARD_H];
      let snappedX = nextPos.x;
      let snappedY = nextPos.y;
      let bestX = { diff: Infinity, guide: null as number | null };
      let bestY = { diff: Infinity, guide: null as number | null };

      const others = selectedFunnel?.steps.filter(s => s.id !== draggingStepId) || [];
      others.forEach(step => {
        xOffsets.forEach(offset => {
          const candidate = nextPos.x + offset;
          xOffsets.forEach(otherOffset => {
            const target = step.position.x + otherOffset;
            const diff = Math.abs(candidate - target);
            if (diff < snapThreshold && diff < bestX.diff) {
              bestX = { diff, guide: target };
              snappedX = target - offset;
            }
          });
        });
        yOffsets.forEach(offset => {
          const candidate = nextPos.y + offset;
          yOffsets.forEach(otherOffset => {
            const target = step.position.y + otherOffset;
            const diff = Math.abs(candidate - target);
            if (diff < snapThreshold && diff < bestY.diff) {
              bestY = { diff, guide: target };
              snappedY = target - offset;
            }
          });
        });
      });

      setAlignmentGuides({
        x: bestX.guide !== null ? [bestX.guide] : [],
        y: bestY.guide !== null ? [bestY.guide] : [],
      });
      updateStep(draggingStepId, { position: { x: snappedX, y: snappedY } });
    }
    if (connecting) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setConnectMouse({ x: (e.clientX - rect.left - canvasOffset.x) / zoom, y: (e.clientY - rect.top - canvasOffset.y) / zoom });
      }
    }
  }, [isPanning, panStart, panOffsetStart, draggingStepId, dragStartMouse, dragStartPos, zoom, connecting, canvasOffset, selectedFunnel]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false); setDraggingStepId(null);
    setAlignmentGuides({ x: [], y: [] });
    // If connecting and released on empty space, cancel
    if (connecting) setConnecting(null);
  }, [connecting]);

  const handleStepMouseDown = (e: React.MouseEvent, stepId: string) => {
    e.stopPropagation();
    const step = selectedFunnel?.steps.find(s => s.id === stepId);
    if (!step) return;
    setSelectedStepId(stepId);
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
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? -0.03 : 0.03;
      setZoom(prev => Math.max(0.25, Math.min(2.5, prev + delta)));
    } else {
      setCanvasOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  }, []);

  const handleZoom = (delta: number) => setZoom(prev => Math.max(0.25, Math.min(2.5, prev + 0.1 * Math.sign(delta))));
  const resetView = () => { setCanvasOffset({ x: 0, y: 0 }); setZoom(1); };

  // ─── Inline edit ───────────────────────────────────────────
  const startEdit = (stepId: string, field: string, value: string) => { setEditingStepId(stepId); setEditField(field); setEditValue(value); };
  const saveEdit = () => {
    if (!editingStepId || !editField) return;
    if (editField === 'views') updateStep(editingStepId, { views: parseInt(editValue) || 0 });
    else if (editField === 'clicks') updateStep(editingStepId, { clicks: parseInt(editValue) || 0 });
    else if (editField === 'conversions') updateStep(editingStepId, { conversions: parseInt(editValue) || 0 });
    else if (editField === 'url') updateStep(editingStepId, { url: editValue || undefined });
    else if (editField === 'name') updateStep(editingStepId, { name: editValue });
    setEditingStepId(null); setEditField(null);
  };

  // ─── Media upload handler ─────────────────────────────────
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const stepId = selectedStepId;
    if (!file || !stepId) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) return;
    const objectUrl = URL.createObjectURL(file);
    updateStep(stepId, { previewMedia: objectUrl, previewMediaType: isVideo ? 'video' : 'image' });
    e.target.value = '';
  };

  // ─── Arrow path ────────────────────────────────────────────
  const CARD_W = 210, CARD_H = 260;
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
    let v = 0, c = 0, cv = 0;
    f.steps.forEach(st => { v += st.views; c += (st.clicks || 0); cv += (st.conversions || 0); });
    return { totalViews: v, totalSpend: 0, totalClicks: c, totalConversions: cv };
  };

  const updateExpectedMetrics = (updates: Partial<CanvasFunnel['expectedMetrics']>) => {
    if (!selectedFunnel) return;
    const next = { ...(selectedFunnel.expectedMetrics || {}), ...updates };
    setFunnels(prev => {
      const updated = prev.map(f => f.id === selectedFunnel.id ? { ...f, expectedMetrics: next } : f);
      const updatedFunnel = updated.find(f => f.id === selectedFunnel.id);
      if (updatedFunnel) syncFunnelToSupabase(updatedFunnel, 'upsert');
      return updated;
    });
  };

  const getNormalizedUrl = (url: string) => (url.startsWith('http') ? url : `https://${url}`);
  const getUrlDomain = (url: string) => { try { return new URL(getNormalizedUrl(url)).hostname; } catch { return null; } };
  const isDirectVideoUrl = (url: string) => /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);

  // ═══════════════════════ FUNNEL LIST VIEW ═══════════════════
  if (!selectedFunnelId) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#ECECEC]">Funnels</h2>
            <p className="text-sm text-[#9B9B9B]">Build and visualize your marketing funnels</p>
          </div>
          <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-lg text-sm font-medium transition-none">
            <Plus size={16} /> New Funnel
          </button>
        </div>

        {isCreating && (
          <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl p-6 animate-in slide-in-from-top-2">
            <h3 className="text-sm font-semibold text-[#ECECEC] mb-3">Create New Funnel</h3>
            <div className="flex gap-3">
              <input value={newFunnelName} onChange={e => setNewFunnelName(e.target.value)} placeholder="Funnel name..."
                className="flex-1 bg-[#3a3a3a] border border-[#3a3a3a] rounded-lg px-4 py-2.5 text-sm text-[#ECECEC] placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#555555]"
                onKeyDown={e => { if (e.key === 'Enter') handleCreateFunnel(); if (e.key === 'Escape') setIsCreating(false); }} autoFocus />
              <button onClick={handleCreateFunnel} className="px-5 py-2.5 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-lg text-sm font-medium">Create</button>
              <button onClick={() => setIsCreating(false)} className="px-5 py-2.5 bg-[#3a3a3a] hover:bg-[#3a3a3a] text-[#b4b4b4] rounded-lg text-sm font-medium">Cancel</button>
            </div>
          </div>
        )}

        {funnels.length === 0 && !isCreating ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-xl bg-[#2f2f2f] border border-[#3a3a3a] flex items-center justify-center mb-4"><Plus size={24} className="text-[#666666]" /></div>
            <p className="text-[#9B9B9B] font-medium mb-1">No funnels yet</p>
            <p className="text-[#666666] text-sm mb-4">Create your first funnel to start mapping your customer journey</p>
            <button onClick={() => setIsCreating(true)} className="px-4 py-2 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-lg text-sm font-medium">Create First Funnel</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {funnels.map(funnel => {
              const { totalViews, totalSpend } = getFunnelTotals(funnel);
              return (
                <button key={funnel.id} onClick={() => { setSelectedFunnelId(funnel.id); setCanvasOffset({ x: 0, y: 0 }); setZoom(1); }}
                  className="text-left bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl p-5 hover:border-[#4a4a4a] transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    {editingFunnelId === funnel.id ? (
                      <input
                        value={editingFunnelName}
                        onChange={e => setEditingFunnelName(e.target.value)}
                        onBlur={saveEditFunnel}
                        onKeyDown={e => { if (e.key === 'Enter') saveEditFunnel(); if (e.key === 'Escape') setEditingFunnelId(null); }}
                        className="w-full bg-[#3a3a3a] border border-[#3a3a3a] rounded px-2 py-1 text-sm text-[#ECECEC] focus:outline-none"
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <h3 className="font-semibold text-[#ECECEC] group-hover:text-[#ECECEC] transition-none cursor-text"
                        onClick={e => { e.stopPropagation(); startEditFunnel(funnel.id, funnel.name); }}>
                        {funnel.name}
                      </h3>
                    )}
                    <button onClick={e => { e.stopPropagation(); handleDeleteFunnel(funnel.id); }} className="p-1 text-[#666666] hover:text-rose-400 transition-none opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
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
                    {funnel.steps.length > 6 && <span className="text-[10px] text-[#9B9B9B] ml-1">+{funnel.steps.length - 6}</span>}
                    {funnel.steps.length === 0 && <span className="text-xs text-[#666666]">Empty funnel</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#9B9B9B]">
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
  const { totalViews, totalSpend, totalClicks, totalConversions } = getFunnelTotals(selectedFunnel);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-300">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedFunnelId(null); setSelectedStepId(null); }} className="p-2 text-[#9B9B9B] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-none"><ArrowLeft size={18} /></button>
          <div>
            {editingFunnelId === selectedFunnel.id ? (
              <input
                value={editingFunnelName}
                onChange={e => setEditingFunnelName(e.target.value)}
                onBlur={saveEditFunnel}
                onKeyDown={e => { if (e.key === 'Enter') saveEditFunnel(); if (e.key === 'Escape') setEditingFunnelId(null); }}
                className="bg-[#3a3a3a] border border-[#3a3a3a] rounded px-2 py-1 text-sm text-[#ECECEC] focus:outline-none"
                autoFocus
              />
            ) : (
              <h2 className="text-lg font-bold text-[#ECECEC] cursor-text"
                onClick={() => startEditFunnel(selectedFunnel.id, selectedFunnel.name)}>
                {selectedFunnel.name}
              </h2>
            )}
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <span className="text-[#9B9B9B]">{selectedFunnel.steps.length} steps</span>
              <span className="text-[#9B9B9B]">${totalSpend.toLocaleString()} spend</span>
              <MetricBadge label="Views" actual={totalViews} expected={selectedFunnel.expectedMetrics?.views} />
              <MetricBadge label="Clicks" actual={totalClicks} expected={selectedFunnel.expectedMetrics?.clicks} />
              <MetricBadge label="Conversions" actual={totalConversions} expected={selectedFunnel.expectedMetrics?.conversions} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExpectedMetricsEditor funnel={selectedFunnel} onUpdate={updateExpectedMetrics} />
          <div className="flex items-center gap-1 bg-[#2f2f2f] backdrop-blur border border-[#3a3a3a] rounded-lg px-2 py-1">
            <button onClick={() => handleZoom(-0.15)} className="p-1 text-[#9B9B9B] hover:text-white"><ZoomOut size={14} /></button>
            <span className="text-[10px] text-[#9B9B9B] w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
            <button onClick={() => handleZoom(0.15)} className="p-1 text-[#9B9B9B] hover:text-white"><ZoomIn size={14} /></button>
            <div className="w-px h-4 bg-[#3a3a3a] mx-0.5" />
            <button onClick={resetView} className="p-1 text-[#9B9B9B] hover:text-white" title="Reset view"><Maximize2 size={14} /></button>
            <span className="text-[9px] text-[#666666] ml-1 hidden sm:inline">Scroll: wheel · Zoom: Ctrl+wheel</span>
          </div>
          <div className="relative">
            <button onClick={() => setPaletteOpen(!paletteOpen)} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-lg text-sm font-medium transition-none">
              <Plus size={16} /> Add Element
            </button>
            {paletteOpen && (
              <div className="absolute right-0 top-full mt-2 bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl shadow-2xl p-2 w-72 z-50 animate-in fade-in slide-in-from-top-2 duration-200 grid grid-cols-3 gap-1">
                {STEP_TYPES.map(st => (
                  <button key={st.value} onClick={() => addStepToCanvas(st.value)}
                    className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg text-[10px] font-medium text-[#9B9B9B] hover:text-white transition-none hover:bg-[rgba(255,255,255,0.05)] group">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110" style={{ backgroundColor: st.color + '15', border: `1px solid ${st.color}30`, boxShadow: `0 0 0px ${st.color}00` }}>
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
          style={{ cursor: isPanning ? 'grabbing' : connecting ? 'crosshair' : 'default', background: 'linear-gradient(180deg, #1a1a1a 0%, #171717 100%)' }}
          onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp}
          onWheel={handleWheel}
          onClick={() => { if (paletteOpen) setPaletteOpen(false); setSelectedConnection(null); setSelectedStepId(null); }}>

          {/* Dot grid */}
          <div className="canvas-bg absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${canvasOffset.x % (24 * zoom)}px ${canvasOffset.y % (24 * zoom)}px`,
          }} />

          {/* Border glow */}
          <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: 'inset 0 0 60px rgba(255,255,255,0.02)' }} />

          {/* SVG connections + alignment guides */}
          <svg className="absolute inset-0 w-full h-full neon-line-subtle" style={{ overflow: 'visible' }}>
            <g transform={`translate(${canvasOffset.x}, ${canvasOffset.y}) scale(${zoom})`}>
              {alignmentGuides.x.map(x => (
                <line key={`guide-x-${x}`} x1={x} y1={-10000} x2={x} y2={10000} stroke="rgba(180,180,180,0.6)" strokeWidth="1" strokeDasharray="4 4" />
              ))}
              {alignmentGuides.y.map(y => (
                <line key={`guide-y-${y}`} x1={-10000} y1={y} x2={10000} y2={y} stroke="rgba(180,180,180,0.6)" strokeWidth="1" strokeDasharray="4 4" />
              ))}
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
                    <path d={path} fill="none" stroke={isSelected ? 'rgba(180,180,180,0.7)' : 'rgba(180,180,180,0.35)'} strokeWidth="1.6" strokeLinecap="round" />
                    {/* Small arrowhead dot */}
                    <circle cx={x2} cy={y2} r="2.5" fill="rgba(180,180,180,0.55)" />
                    {/* Invisible click target to select */}
                    <path d={path} fill="none" stroke="transparent" strokeWidth="16" style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                      onMouseDown={e => { e.stopPropagation(); }}
                      onClick={e => { e.stopPropagation(); setSelectedConnection({ from: conn.from, to: conn.to }); }} />
                    {isSelected && (
                      <g transform={`translate(${mid.x}, ${mid.y})`} style={{ pointerEvents: 'all', cursor: 'pointer' }}
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
                        onClick={e => { e.stopPropagation(); deleteConnection(conn.from, conn.to); }}>
                        <circle r="12" fill="rgba(15,23,42,0.95)" stroke="rgba(244,63,94,0.8)" strokeWidth="1.5" />
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
                return <path d={path} fill="none" stroke="rgba(180,180,180,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="6 4" />;
              })()}
            </g>
          </svg>

          {/* Steps */}
          <div className="absolute inset-0" style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
            {selectedFunnel.steps.map(step => {
              const cfg = getStepConfig(step.type);
              const isSelected = selectedStepId === step.id;
              const normalizedUrl = step.url ? getNormalizedUrl(step.url) : null;

              return (
                <div key={step.id} className="canvas-step absolute"
                  style={{ left: step.position.x, top: step.position.y, width: CARD_W, cursor: draggingStepId === step.id ? 'grabbing' : 'grab' }}
                  onMouseDown={e => handleStepMouseDown(e, step.id)}
                  onMouseUp={e => handleStepMouseUp(e, step.id)}
                  onClick={e => { e.stopPropagation(); setSelectedStepId(step.id); }}>

                  {/* Top stats (outside card) */}
                  <div className="absolute -top-7 left-0 w-full flex items-center justify-between px-1 text-[10px] text-[#9B9B9B]">
                    <div className="min-w-0 flex items-center gap-2">
                      {editingStepId === step.id && editField === 'name' ? (
                        <input value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingStepId(null); setEditField(null); } }}
                          className="w-28 bg-[rgba(255,255,255,0.05)] border border-[#4a4a4a] rounded px-2 py-0.5 text-[10px] text-[#ECECEC] focus:outline-none" autoFocus onMouseDown={e => e.stopPropagation()} />
                      ) : (
                        <span className="font-semibold text-[#ECECEC] truncate cursor-text"
                          onDoubleClick={e => { e.stopPropagation(); startEdit(step.id, 'name', step.name); }}>{step.name}</span>
                      )}
                      <span className="text-[9px] uppercase tracking-wider text-[#666666]">{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="cursor-text hover:text-white transition-none" onDoubleClick={e => { e.stopPropagation(); startEdit(step.id, 'views', (step.views || 0).toString()); }}>
                        V:{editingStepId === step.id && editField === 'views' ? (
                          <input value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingStepId(null); setEditField(null); } }}
                            className="w-10 bg-[#3a3a3a] border border-[#4a4a4a] rounded px-1 text-[10px] text-[#ECECEC] focus:outline-none" autoFocus onMouseDown={e => e.stopPropagation()} />
                        ) : (step.views || 0).toLocaleString()}
                      </span>
                      <span className="cursor-text hover:text-white transition-none" onDoubleClick={e => { e.stopPropagation(); startEdit(step.id, 'clicks', (step.clicks || 0).toString()); }}>
                        C:{editingStepId === step.id && editField === 'clicks' ? (
                          <input value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingStepId(null); setEditField(null); } }}
                            className="w-10 bg-[#3a3a3a] border border-[#4a4a4a] rounded px-1 text-[10px] text-[#ECECEC] focus:outline-none" autoFocus onMouseDown={e => e.stopPropagation()} />
                        ) : (step.clicks || 0).toLocaleString()}
                      </span>
                      <span className="cursor-text hover:text-white transition-none" onDoubleClick={e => { e.stopPropagation(); startEdit(step.id, 'conversions', (step.conversions || 0).toString()); }}>
                        CV:{editingStepId === step.id && editField === 'conversions' ? (
                          <input value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={saveEdit}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingStepId(null); setEditField(null); } }}
                            className="w-10 bg-[#3a3a3a] border border-[#4a4a4a] rounded px-1 text-[10px] text-[#ECECEC] focus:outline-none" autoFocus onMouseDown={e => e.stopPropagation()} />
                        ) : (step.conversions || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Card */}
                  <div className="rounded-xl overflow-hidden transition-all duration-200" style={{
                    height: CARD_H,
                    background: 'linear-gradient(135deg, rgba(47,47,47,0.97) 0%, rgba(33,33,33,0.98) 100%)',
                    border: `1.5px solid ${isSelected ? 'rgba(236,236,236,0.9)' : 'rgba(58,58,58,0.6)'}`,
                    boxShadow: isSelected ? '0 0 24px rgba(255,255,255,0.1), 0 4px 20px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.3)',
                  }}>
                    {step.previewMedia && step.previewMediaType ? (
                      <div className="w-full h-full relative">
                        {step.previewMediaType === 'video' ? (
                          <video src={step.previewMedia} className="absolute inset-0 w-full h-full object-cover" controls />
                        ) : (
                          <img src={step.previewMedia} alt={step.name} className="absolute inset-0 w-full h-full object-cover" />
                        )}
                      </div>
                    ) : normalizedUrl ? (
                      <div className="w-full h-full relative">
                        {step.type === 'ad' ? (
                          <>
                            {playingAdStepId === step.id ? (
                              isDirectVideoUrl(normalizedUrl) ? (
                                <video src={normalizedUrl} className="absolute inset-0 w-full h-full object-cover" controls autoPlay />
                              ) : (
                                <iframe title={`${step.name}-ad`} src={normalizedUrl} className="absolute inset-0 w-full h-full"
                                  allow="autoplay; encrypted-media; picture-in-picture" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" />
                              )
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 text-xs text-[#212121] hover:bg-white"
                                  onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setPlayingAdStepId(step.id); }}>
                                  <Play size={12} /> Play ad
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <iframe title={`${step.name}-preview`} src={normalizedUrl} className="absolute inset-0 w-full h-full pointer-events-none"
                            sandbox="allow-same-origin allow-scripts allow-forms allow-popups" />
                        )}
                      </div>
                    ) : step.type === 'ad' && (step.transcript || step.adTitle) ? (
                      <div className="w-full h-full flex flex-col p-3 overflow-hidden">
                        {/* Status badge */}
                        {step.adStatus && step.adStatus !== 'Unassigned' && (() => {
                          const sc = getAdStatusConfig(step.adStatus);
                          const SIcon = sc.icon;
                          return (
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border self-start mb-1.5 ${sc.bgColor} ${sc.color}`}>
                              <SIcon size={9} /> {step.adStatus}
                            </div>
                          );
                        })()}
                        {/* Ad title */}
                        {step.adTitle && (
                          <p className="text-[11px] font-semibold text-[#ECECEC] mb-1.5 leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{step.adTitle}</p>
                        )}
                        {/* Transcript preview */}
                        {step.transcript && (
                          <p className="text-[9px] text-[#9B9B9B] leading-relaxed whitespace-pre-wrap overflow-hidden flex-1" style={{ display: '-webkit-box', WebkitLineClamp: step.adTitle ? 9 : 12, WebkitBoxOrient: 'vertical' }}>{step.transcript}</p>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-[#666666]">
                        Paste a URL to see a preview
                      </div>
                    )}
                  </div>

                  {/* Connection handles */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 transition-all cursor-crosshair z-10 hover:scale-150 hover:border-[#4a4a4a]"
                    style={{ backgroundColor: 'rgba(180,180,180,0.25)', borderColor: 'rgba(180,180,180,0.45)' }}
                    onMouseDown={e => {
                      e.stopPropagation();
                      setConnecting(step.id);
                      const rect = canvasRef.current?.getBoundingClientRect();
                      if (rect) {
                        setConnectMouse({ x: (e.clientX - rect.left - canvasOffset.x) / zoom, y: (e.clientY - rect.top - canvasOffset.y) / zoom });
                      }
                    }} />
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 transition-all z-10 ${connecting && connecting !== step.id ? 'scale-150 border-[#4a4a4a]' : ''}`}
                    style={{ backgroundColor: connecting && connecting !== step.id ? 'rgba(180,180,180,0.5)' : 'rgba(58,58,58,0.4)', borderColor: connecting && connecting !== step.id ? 'rgba(180,180,180,0.8)' : 'rgba(58,58,58,0.25)' }} />
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {selectedFunnel.steps.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-14 h-14 rounded-xl bg-[#212121] border border-[#3a3a3a] flex items-center justify-center mb-3"><Plus size={20} className="text-[#666666]" /></div>
              <p className="text-[#9B9B9B] text-sm">Empty canvas</p>
              <p className="text-[#666666] text-xs">Click "Add Element" to build your funnel</p>
            </div>
          )}

          {/* Connecting indicator */}
          {connecting && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#2f2f2f] backdrop-blur border border-[#3a3a3a] rounded-full text-xs text-[#ECECEC] font-medium z-50">
              Drop on a step to connect · Release to cancel
            </div>
          )}

          {/* Delete step confirmation */}
          {confirmDeleteStepId && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 rounded-xl" onClick={() => setConfirmDeleteStepId(null)}>
              <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl p-6 max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
                <p className="text-[#ECECEC] font-medium mb-1">Delete this step?</p>
                <p className="text-sm text-[#9B9B9B] mb-4">Connections to and from it will be removed.</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setConfirmDeleteStepId(null)} className="px-4 py-2 text-sm text-[#9B9B9B] hover:text-white transition-none">Cancel</button>
                  <button onClick={() => { deleteStep(confirmDeleteStepId); setConfirmDeleteStepId(null); }} className="px-4 py-2 text-sm bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-none">Delete</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        {selectedStep && (
          <div className={`${panelExpanded ? 'w-[480px]' : 'w-72'} flex-shrink-0 bg-[#2f2f2f] backdrop-blur border border-[#3a3a3a] rounded-xl p-4 overflow-y-auto animate-in slide-in-from-right-4 duration-200 space-y-4 transition-[width] duration-200`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {(() => { const cfg = getStepConfig(selectedStep.type); return (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.color + '15', border: `1px solid ${cfg.color}25` }}>
                    <cfg.icon size={14} style={{ color: cfg.color }} />
                  </div>
                ); })()}
                <h3 className="text-sm font-semibold text-[#ECECEC] truncate">{selectedStep.name}</h3>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {selectedStep.type === 'ad' && (
                  <button onClick={() => setPanelExpanded(!panelExpanded)} className="p-1 text-[#9B9B9B] hover:text-white" title={panelExpanded ? 'Collapse panel' : 'Expand panel'}>
                    {panelExpanded ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
                  </button>
                )}
                <button onClick={() => setConfirmDeleteStepId(selectedStep.id)} className="p-1 text-[#9B9B9B] hover:text-rose-400" title="Delete step"><Trash2 size={14} /></button>
                <button onClick={() => { setSelectedStepId(null); setPanelExpanded(false); }} className="p-1 text-[#9B9B9B] hover:text-white"><X size={14} /></button>
              </div>
            </div>

            <div><label className="text-[10px] uppercase tracking-wider text-[#9B9B9B] font-medium">Type</label>
              <select value={selectedStep.type} onChange={e => updateStep(selectedStep.id, { type: e.target.value as FunnelStepType })}
                className="w-full mt-1 bg-[#3a3a3a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none">
                {STEP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {selectedStep.type === 'ad' && (
              <>
                <div><label className="text-[10px] uppercase tracking-wider text-[#9B9B9B] font-medium">Ad Title</label>
                  <input value={selectedStep.adTitle || ''} onChange={e => updateStep(selectedStep.id, { adTitle: e.target.value })} placeholder="Give this ad a title..."
                    className="w-full mt-1 bg-[#3a3a3a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#555555]" />
                </div>

                <div><label className="text-[10px] uppercase tracking-wider text-[#9B9B9B] font-medium">Status</label>
                  <div className="relative mt-1" ref={adStatusDropdownRef}>
                    {(() => { const sc = getAdStatusConfig(selectedStep.adStatus); const StatusIcon = sc.icon; return (
                      <button onClick={() => setAdStatusDropdownOpen(!adStatusDropdownOpen)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium border cursor-pointer transition-none ${sc.bgColor} ${sc.color}`}>
                        <div className="flex items-center gap-1.5">
                          <StatusIcon size={14} />
                          <span>{selectedStep.adStatus && selectedStep.adStatus !== 'Unassigned' ? selectedStep.adStatus : 'Select status'}</span>
                        </div>
                        <ChevronDown size={12} />
                      </button>
                    ); })()}
                    {adStatusDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        {AD_STATUSES.map(s => {
                          const SIcon = s.icon;
                          return (
                            <button key={s.value}
                              onClick={() => { updateStep(selectedStep.id, { adStatus: s.value }); setAdStatusDropdownOpen(false); }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[rgba(255,255,255,0.05)] transition-none ${
                                selectedStep.adStatus === s.value ? 'bg-[rgba(255,255,255,0.05)]' : ''
                              }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${s.color.replace('text-', 'bg-')}`} />
                              <span className={s.color}>{s.label}</span>
                              {selectedStep.adStatus === s.value && <Check size={12} className="ml-auto text-[#ECECEC]" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div><label className="text-[10px] uppercase tracking-wider text-[#9B9B9B] font-medium">Page URL</label>
              <input value={selectedStep.url || ''} onChange={e => updateStep(selectedStep.id, { url: e.target.value || undefined })} placeholder="https://..."
                className="w-full mt-1 bg-[#3a3a3a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#555555]" />
              {selectedStep.url && getUrlDomain(selectedStep.url) && (
                <a href={selectedStep.url.startsWith('http') ? selectedStep.url : `https://${selectedStep.url}`} target="_blank" rel="noreferrer"
                  className="mt-2 flex items-center gap-2 px-3 py-2 bg-[rgba(255,255,255,0.05)] rounded-lg text-xs text-[#9B9B9B] hover:text-[#ECECEC] transition-none">
                  <img src={`https://www.google.com/s2/favicons?domain=${getUrlDomain(selectedStep.url)}&sz=32`} alt="" className="w-4 h-4 rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span className="truncate flex-1">{getUrlDomain(selectedStep.url)}</span><ExternalLink size={12} />
                </a>
              )}
            </div>

            <div><label className="text-[10px] uppercase tracking-wider text-[#9B9B9B] font-medium">Preview Media</label>
              <input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={handleMediaUpload} />
              {selectedStep.previewMedia ? (
                <div className="mt-1 space-y-2">
                  <div className="relative rounded-lg overflow-hidden border border-[#3a3a3a]" style={{ height: 100 }}>
                    {selectedStep.previewMediaType === 'video' ? (
                      <video src={selectedStep.previewMedia} className="w-full h-full object-cover" />
                    ) : (
                      <img src={selectedStep.previewMedia} alt="Preview" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] text-[#9B9B9B] hover:text-white bg-[#3a3a3a] rounded-lg transition-none">
                      <Upload size={10} /> Replace
                    </button>
                    <button onClick={() => updateStep(selectedStep.id, { previewMedia: undefined, previewMediaType: undefined })}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] text-[#9B9B9B] hover:text-rose-400 bg-[#3a3a3a] rounded-lg transition-none">
                      <Trash2 size={10} /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-3 border border-dashed border-[#4a4a4a] rounded-lg text-xs text-[#666666] hover:text-[#9B9B9B] hover:border-[#666666] transition-none">
                  <Image size={14} /> Upload image or MP4
                </button>
              )}
              <p className="text-[9px] text-[#555555] mt-1">Overrides URL preview when set</p>
            </div>

            <div><label className="text-[10px] uppercase tracking-wider text-[#9B9B9B] font-medium">Page Views</label>
              <input type="number" value={selectedStep.views} onChange={e => updateStep(selectedStep.id, { views: parseInt(e.target.value) || 0 })}
                className="w-full mt-1 bg-[#3a3a3a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-[#555555]" />
            </div>

            <div><label className="text-[10px] uppercase tracking-wider text-[#9B9B9B] font-medium">Clicks</label>
              <input type="number" value={selectedStep.clicks || 0} onChange={e => updateStep(selectedStep.id, { clicks: parseInt(e.target.value) || 0 })}
                className="w-full mt-1 bg-[#3a3a3a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-[#555555]" />
            </div>

            <div><label className="text-[10px] uppercase tracking-wider text-[#9B9B9B] font-medium">Conversions</label>
              <input type="number" value={selectedStep.conversions || 0} onChange={e => updateStep(selectedStep.id, { conversions: parseInt(e.target.value) || 0 })}
                className="w-full mt-1 bg-[#3a3a3a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-[#555555]" />
            </div>

            {selectedStep.type === 'ad' && (
              <div className="flex flex-col flex-1 min-h-0">
                <label className="text-[10px] uppercase tracking-wider text-[#9B9B9B] font-medium mb-1">Transcript</label>
                <textarea
                  value={selectedStep.transcript || ''}
                  onChange={e => updateStep(selectedStep.id, { transcript: e.target.value })}
                  placeholder="Write your ad transcript here..."
                  rows={panelExpanded ? 16 : 8}
                  className="w-full bg-[#3a3a3a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#555555] font-mono leading-relaxed resize-y"
                />
                {selectedStep.transcript && (
                  <p className="text-[10px] text-[#666666] mt-1">{selectedStep.transcript.split(/\s+/).filter(Boolean).length} words</p>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default FunnelManager;
