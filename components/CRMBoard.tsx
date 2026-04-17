import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, X, GripVertical, DollarSign, Mail, Phone, Building2, Trash2, Pencil, Check, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export interface Prospect {
  id: string;
  user_id: string;
  name: string;
  photo_url?: string | null;
  email: string;
  phone: string;
  company: string;
  source: string;
  stage: string;
  deal_value: number;
  notes: string;
  next_action: string;
  order_num: number;
}

interface CRMBoardProps {
  storagePrefix: string;
  onConvert?: (prospect: Prospect) => void;
}

const STAGES = ['Interested', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

const STAGE_COLORS: Record<string, string> = {
  'Interested': '#d4d4d8',
  'Contacted': '#ddd6fe',
  'Qualified': '#bfdbfe',
  'Proposal': '#fde68a',
  'Negotiation': '#fbcfe8',
  'Closed Won': '#86efac',
  'Closed Lost': '#a8a29e',
};

function newProspect(userId: string, stage: string, orderNum: number): Prospect {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    name: '',
    photo_url: null,
    email: '',
    phone: '',
    company: '',
    source: 'Inbound — DMs',
    stage,
    deal_value: 0,
    notes: '',
    next_action: '',
    order_num: orderNum,
  };
}

function formatMoney(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `$${n.toLocaleString()}`;
}

const CRMBoard: React.FC<CRMBoardProps> = ({ storagePrefix, onConvert }) => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) { setLoaded(true); return; }
    (async () => {
      const { data } = await supabase
        .from('prospects')
        .select('*')
        .eq('user_id', storagePrefix)
        .order('order_num', { ascending: true });
      if (data) setProspects(data as Prospect[]);
      setLoaded(true);
    })();
  }, [storagePrefix]);

  const upsertOne = useCallback(async (p: Prospect) => {
    if (!supabase) return;
    await supabase.from('prospects').upsert(p, { onConflict: 'id' });
  }, []);

  const addProspect = useCallback((stage: string) => {
    const colProspects = prospects.filter(p => p.stage === stage);
    const prospect = newProspect(storagePrefix, stage, colProspects.length);
    setProspects(prev => [...prev, prospect]);
    upsertOne(prospect);
    setEditingId(prospect.id);
    setTimeout(() => titleRef.current?.focus(), 50);
  }, [prospects, storagePrefix, upsertOne]);

  const updateProspect = useCallback((id: string, patch: Partial<Prospect>) => {
    setProspects(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...patch } : p);
      const updated = next.find(p => p.id === id);
      if (updated) upsertOne(updated);
      return next;
    });
  }, [upsertOne]);

  const deleteProspect = useCallback(async (id: string) => {
    setProspects(prev => prev.filter(p => p.id !== id));
    if (supabase) await supabase.from('prospects').delete().eq('id', id);
    if (editingId === id) setEditingId(null);
  }, [editingId]);

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const hoveredCard = dragOverCardId;
    setDragOverCardId(null);
    if (!dragId) return;

    const dragged = prospects.find(p => p.id === dragId);
    if (!dragged) { setDragId(null); return; }

    const colProspects = prospects
      .filter(p => p.stage === targetStage && p.id !== dragId)
      .sort((a, b) => a.order_num - b.order_num);

    let insertIdx = colProspects.length;
    if (hoveredCard && hoveredCard !== dragId) {
      const hoverIdx = colProspects.findIndex(p => p.id === hoveredCard);
      if (hoverIdx >= 0) insertIdx = hoverIdx;
    }

    colProspects.splice(insertIdx, 0, { ...dragged, stage: targetStage });
    const reordered = colProspects.map((p, i) => ({ ...p, order_num: i }));
    const others = prospects.filter(p => p.stage !== targetStage && p.id !== dragId);
    const next = [...others, ...reordered];
    setProspects(next);
    // Persist all reordered
    reordered.forEach(upsertOne);
    setDragId(null);
  };

  const totalPipeline = prospects
    .filter(p => p.stage !== 'Closed Lost' && p.stage !== 'Closed Won')
    .reduce((sum, p) => sum + (p.deal_value || 0), 0);
  const wonRevenue = prospects
    .filter(p => p.stage === 'Closed Won')
    .reduce((sum, p) => sum + (p.deal_value || 0), 0);

  const stageCount = (s: string) => prospects.filter(p => p.stage === s).length;
  const stageValue = (s: string) =>
    prospects.filter(p => p.stage === s).reduce((sum, p) => sum + (p.deal_value || 0), 0);

  if (!loaded) {
    return <div className="text-xs text-[#666] py-8 text-center">Loading prospects...</div>;
  }

  return (
    <div>
      {/* Pipeline summary */}
      <div className="flex items-center gap-6 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#555]">Total Pipeline</span>
          <span className="text-lg font-bold" style={{ color: '#fde68a' }}>{formatMoney(totalPipeline)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#555]">Closed Won</span>
          <span className="text-lg font-bold" style={{ color: '#86efac' }}>{formatMoney(wonRevenue)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#555]">Active Prospects</span>
          <span className="text-lg font-bold text-[#ECECEC]">
            {prospects.filter(p => p.stage !== 'Closed Lost' && p.stage !== 'Closed Won').length}
          </span>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ minHeight: 220 }}>
        {STAGES.map(stage => {
          const items = prospects.filter(p => p.stage === stage).sort((a, b) => a.order_num - b.order_num);
          const isDragOver = dragOverCol === stage;
          const val = stageValue(stage);
          return (
            <div
              key={stage}
              className="flex-shrink-0 rounded-xl flex flex-col"
              style={{
                width: 240,
                background: isDragOver ? '#252525' : '#1c1c1c',
                border: isDragOver ? '1px dashed #444' : '1px solid #2a2a2a',
              }}
              onDragOver={e => { e.preventDefault(); setDragOverCol(stage); }}
              onDragLeave={() => { setDragOverCol(null); setDragOverCardId(null); }}
              onDrop={e => handleDrop(e, stage)}
            >
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STAGE_COLORS[stage] }} />
                  <span className="text-xs font-semibold truncate" style={{ color: '#ECECEC' }}>{stage}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: '#2a2a2a', color: '#777' }}>
                    {stageCount(stage)}
                  </span>
                </div>
                {val > 0 && (
                  <span className="text-[10px] font-medium" style={{ color: stage === 'Closed Won' ? '#86efac' : '#fde68a' }}>
                    {formatMoney(val)}
                  </span>
                )}
              </div>

              <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto" style={{ maxHeight: 520 }}>
                {items.map(p => (
                  <ProspectCard
                    key={p.id}
                    prospect={p}
                    isEditing={editingId === p.id}
                    isDragging={dragId === p.id}
                    isDragOver={dragOverCardId === p.id && dragId !== p.id}
                    titleRef={editingId === p.id ? titleRef : undefined}
                    onEdit={() => setEditingId(p.id)}
                    onUpdate={patch => updateProspect(p.id, patch)}
                    onDelete={() => deleteProspect(p.id)}
                    onClose={() => setEditingId(null)}
                    onConvert={onConvert ? () => onConvert(p) : undefined}
                    onDragStart={e => { setDragId(p.id); e.dataTransfer.effectAllowed = 'move'; }}
                    onCardDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverCol(stage); setDragOverCardId(p.id); }}
                    onDragEnd={() => { setDragId(null); setDragOverCol(null); setDragOverCardId(null); }}
                  />
                ))}
              </div>

              <button
                onClick={() => addProspect(stage)}
                className="flex items-center gap-1 px-3 py-2 text-[11px] font-medium rounded-b-xl transition-colors"
                style={{ color: '#666' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#999')}
                onMouseLeave={e => (e.currentTarget.style.color = '#666')}
              >
                <Plus size={12} /> Add prospect
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface ProspectCardProps {
  prospect: Prospect;
  isEditing: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  titleRef?: React.RefObject<HTMLInputElement | null>;
  onEdit: () => void;
  onUpdate: (patch: Partial<Prospect>) => void;
  onDelete: () => void;
  onClose: () => void;
  onConvert?: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onCardDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

const ProspectCard: React.FC<ProspectCardProps> = ({
  prospect, isEditing, isDragging, isDragOver, titleRef,
  onEdit, onUpdate, onDelete, onClose, onConvert, onDragStart, onCardDragOver, onDragEnd,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isEditing) {
    return (
      <div className="rounded-lg p-3 space-y-2" style={{ background: '#232323', border: '1px solid #3a3a3a' }}>
        <input
          ref={titleRef}
          value={prospect.name}
          onChange={e => onUpdate({ name: e.target.value })}
          placeholder="Prospect name..."
          className="w-full bg-transparent text-xs font-semibold outline-none"
          style={{ color: '#ECECEC' }}
          onKeyDown={e => { if (e.key === 'Enter') onClose(); }}
        />
        <input
          value={prospect.company}
          onChange={e => onUpdate({ company: e.target.value })}
          placeholder="Company"
          className="w-full bg-transparent text-[11px] outline-none"
          style={{ color: '#aaa' }}
        />
        <input
          value={prospect.email}
          onChange={e => onUpdate({ email: e.target.value })}
          placeholder="Email"
          className="w-full bg-transparent text-[11px] outline-none"
          style={{ color: '#aaa' }}
        />
        <input
          value={prospect.phone}
          onChange={e => onUpdate({ phone: e.target.value })}
          placeholder="Phone"
          className="w-full bg-transparent text-[11px] outline-none"
          style={{ color: '#aaa' }}
        />
        <div className="flex items-center gap-1">
          <DollarSign size={11} style={{ color: '#86efac' }} />
          <input
            type="number"
            value={prospect.deal_value || ''}
            onChange={e => onUpdate({ deal_value: parseFloat(e.target.value) || 0 })}
            placeholder="Deal value"
            className="w-24 bg-transparent text-[11px] outline-none"
            style={{ color: '#86efac' }}
          />
        </div>
        <textarea
          value={prospect.notes}
          onChange={e => onUpdate({ notes: e.target.value })}
          placeholder="Notes..."
          rows={2}
          className="w-full bg-transparent text-[11px] outline-none resize-none"
          style={{ color: '#aaa' }}
        />
        <input
          value={prospect.next_action}
          onChange={e => onUpdate({ next_action: e.target.value })}
          placeholder="Next action..."
          className="w-full bg-transparent text-[11px] outline-none"
          style={{ color: '#aaa' }}
        />

        <div className="flex items-center justify-between pt-1 gap-2">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-[10px] px-2 py-1 rounded-md transition-colors"
              style={{ color: '#fca5a5' }}
            >
              Delete
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={onDelete}
                className="text-[10px] px-2 py-1 rounded-md"
                style={{ background: '#3a1a1a', color: '#fca5a5' }}
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[10px] px-2 py-1 rounded-md"
                style={{ color: '#888' }}
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex gap-1">
            {onConvert && prospect.stage === 'Closed Won' && (
              <button
                onClick={onConvert}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors"
                style={{ background: '#86efac22', color: '#86efac' }}
                title="Convert to client"
              >
                <ArrowRight size={10} /> Convert
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[10px] px-2 py-1 rounded-md transition-colors"
              style={{ background: '#2a2a2a', color: '#ECECEC' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onCardDragOver}
      onDragEnd={onDragEnd}
      onClick={onEdit}
      className="rounded-lg p-2.5 cursor-grab active:cursor-grabbing group transition-all"
      style={{
        background: '#232323',
        border: isDragOver ? '1px solid #555' : '1px solid #2a2a2a',
        borderTop: isDragOver ? '2px solid #888' : undefined,
        opacity: isDragging ? 0.4 : 1,
      }}
      onMouseEnter={e => { if (!isDragOver) e.currentTarget.style.borderColor = '#3a3a3a'; }}
      onMouseLeave={e => { if (!isDragOver) e.currentTarget.style.borderColor = '#2a2a2a'; }}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical size={12} className="mt-0.5 opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0" style={{ color: '#888' }} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold truncate" style={{ color: prospect.name ? '#ECECEC' : '#666' }}>
            {prospect.name || 'Unnamed prospect'}
          </p>
          {prospect.company && (
            <p className="text-[10px] mt-0.5 truncate flex items-center gap-1" style={{ color: '#888' }}>
              <Building2 size={9} /> {prospect.company}
            </p>
          )}
          {prospect.email && (
            <p className="text-[10px] mt-0.5 truncate flex items-center gap-1" style={{ color: '#888' }}>
              <Mail size={9} /> {prospect.email}
            </p>
          )}
          {prospect.phone && (
            <p className="text-[10px] mt-0.5 truncate flex items-center gap-1" style={{ color: '#888' }}>
              <Phone size={9} /> {prospect.phone}
            </p>
          )}
          {prospect.deal_value > 0 && (
            <p className="text-[10px] mt-1 font-medium" style={{ color: '#86efac' }}>
              {formatMoney(prospect.deal_value)}
            </p>
          )}
          {prospect.next_action && (
            <p className="text-[10px] mt-1 italic truncate" style={{ color: '#9ca3af' }}>
              → {prospect.next_action}
            </p>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
        >
          <X size={12} style={{ color: '#888' }} />
        </button>
      </div>
    </div>
  );
};

export default CRMBoard;
