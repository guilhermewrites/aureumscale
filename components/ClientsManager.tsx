import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ChevronDown, Camera, Loader2, Archive, RotateCcw, GripVertical, Pencil, X, Check, ArrowRightLeft } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import ClientPanel from './ClientPanel';
import TaskBoard from './TaskBoard';

type ClientType = 'recurring' | 'one-time' | 'profit-share';

interface Client {
  id: string;
  name: string;
  photoUrl?: string;
  paymentStatus: string;
  amount: number;
  cadence: string;
  service: string;
  leader: string;
  status: string;
  acquisition: string;
  clientType: ClientType;
  orderNum: number;
  active: boolean;
}

const DEFAULT_PAYMENT_STATUSES = ['Missing Invoice', 'Pending', 'Paid', 'Late'];
const DEFAULT_CADENCES = ['Weekly', 'Bi-weekly', '1x/month', '2x/month', '3x/month', 'On-demand', 'One-time-only'];
const DEFAULT_SERVICES = ['Full-on-marketing', 'Ghostwriting', 'Social Media Management', 'Webinar', 'Design', 'Video-Editing'];
const DEFAULT_LEADERS = ['Guilherme Writes', 'Jhacson Mossman'];
const DEFAULT_CLIENT_STATUSES = ['Happy', 'Moderate', 'Frustrated'];
const DEFAULT_ACQUISITIONS = ['Inbound — DMs', 'Inbound — Organic', 'Inbound — Funnel', 'Outbound — DMs', 'Outbound — Cold Email', 'Paid Traffic — Ads', 'Social Media', 'Referral', 'Partnership'];

const paymentColors: Record<string, string> = {
  'Missing Invoice': 'text-red-400',
  'Pending': 'text-[#9B9B9B]',
  'Paid': 'text-emerald-400',
  'Late': 'text-orange-400',
};

const statusColors: Record<string, string> = {
  'Happy': 'text-emerald-400',
  'Moderate': 'text-[#9B9B9B]',
  'Frustrated': 'text-red-400',
};

const acquisitionColors: Record<string, string> = {
  'Inbound — DMs': 'text-[#8bb0d0]',
  'Inbound — Organic': 'text-[#8bb0d0]',
  'Inbound — Funnel': 'text-[#8bb0d0]',
  'Outbound — DMs': 'text-[#c0a0d8]',
  'Outbound — Cold Email': 'text-[#c0a0d8]',
  'Paid Traffic — Ads': 'text-[#e0a870]',
  'Social Media': 'text-[#7dd8a8]',
  'Referral': 'text-[#d4b896]',
  'Partnership': 'text-[#d4b896]',
};

function getInitials(name: string) {
  return name.trim().split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function newClient(orderNum: number, clientType: ClientType = 'recurring'): Client {
  return {
    id: crypto.randomUUID(),
    name: '',
    photoUrl: undefined,
    paymentStatus: 'Pending',
    amount: 0,
    cadence: '1x/month',
    service: 'Ghostwriting',
    leader: 'Guilherme Writes',
    status: 'Happy',
    acquisition: 'Inbound — DMs',
    clientType,
    orderNum,
    active: true,
  };
}

function toDbRow(client: Client, userId: string) {
  return {
    id: client.id,
    user_id: userId,
    name: client.name,
    photo_url: client.photoUrl ?? null,
    payment_status: client.paymentStatus,
    amount: client.amount,
    cadence: client.cadence ?? '1x/month',
    service: client.service,
    leader: client.leader,
    status: client.status,
    acquisition: client.acquisition ?? 'Inbound — DMs',
    client_type: client.clientType,
    order_num: client.orderNum,
    active: client.active,
  };
}

function fromDbRow(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    photoUrl: row.photo_url ?? undefined,
    paymentStatus: row.payment_status ?? 'Pending',
    amount: row.amount ?? 0,
    cadence: row.cadence ?? '1x/month',
    service: row.service ?? 'Ghostwriting',
    leader: row.leader ?? 'Guilherme Writes',
    status: row.status ?? 'Happy',
    acquisition: row.acquisition ?? 'Inbound — DMs',
    clientType: row.client_type ?? 'recurring',
    orderNum: row.order_num ?? 0,
    active: row.active ?? true,
  };
}

function compressImage(file: File): Promise<string> {
  return new Promise(resolve => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = 80;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = url;
  });
}

interface SelectCellProps {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  colorMap?: Record<string, string>;
  onAddOption?: (v: string) => void;
  onEditOption?: (oldVal: string, newVal: string) => void;
  onDeleteOption?: (v: string) => void;
}

function SelectCell({ value, options, onChange, colorMap, onAddOption, onEditOption, onDeleteOption }: SelectCellProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [editingMode, setEditingMode] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = () => { setOpen(false); setEditingMode(false); setAddingNew(false); setEditingItem(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (addingNew && newInputRef.current) newInputRef.current.focus();
  }, [addingNew]);

  useEffect(() => {
    if (editingItem && editInputRef.current) editInputRef.current.focus();
  }, [editingItem]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 4, left: r.left });
    }
    setOpen(o => !o);
    setEditingMode(false);
    setAddingNew(false);
    setEditingItem(null);
  };

  const handleAdd = () => {
    const trimmed = newValue.trim();
    if (trimmed && !options.includes(trimmed) && onAddOption) {
      onAddOption(trimmed);
    }
    setNewValue('');
    setAddingNew(false);
  };

  const handleEditSave = (oldVal: string) => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== oldVal && onEditOption) {
      onEditOption(oldVal, trimmed);
    }
    setEditingItem(null);
    setEditValue('');
  };

  const textColor = colorMap?.[value] ?? 'text-[#ECECEC]';
  const editable = !!(onAddOption || onEditOption || onDeleteOption);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className={`flex items-center gap-1 text-xs font-medium cursor-pointer whitespace-nowrap w-full ${textColor}`}
      >
        <span className="truncate flex-1 text-left">{value}</span>
        <ChevronDown size={10} className="flex-shrink-0 opacity-40" />
      </button>

      {open && createPortal(
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 9999 }}
          className="min-w-[180px] bg-[#1e1e1e] border border-[#3a3a3a] rounded-xl shadow-2xl overflow-hidden py-1"
        >
          {options.map(o => (
            <div key={o} className="flex items-center group/opt">
              {editingItem === o ? (
                <div className="flex items-center gap-1 w-full px-2 py-1.5" onMouseDown={e => e.stopPropagation()}>
                  <input
                    ref={editInputRef}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleEditSave(o); if (e.key === 'Escape') setEditingItem(null); }}
                    className="flex-1 text-xs bg-[#161616] text-[#ECECEC] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#444]"
                  />
                  <button onClick={() => handleEditSave(o)} className="text-emerald-400 p-1 hover:bg-[#2a2a2a] rounded-lg"><Check size={12} /></button>
                  <button onClick={() => setEditingItem(null)} className="text-[#555] p-1 hover:bg-[#2a2a2a] rounded-lg"><X size={12} /></button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => { if (!editingMode) { onChange(o); setOpen(false); setEditingMode(false); } }}
                    className={`flex items-center justify-between flex-1 text-left text-xs px-3 py-2.5 transition-colors hover:bg-[#2a2a2a] ${
                      o === value ? 'text-white font-semibold' : 'text-[#9B9B9B]'
                    }`}
                  >
                    {o}
                    {o === value && !editingMode && <span className="text-[#ECECEC] opacity-60">✓</span>}
                  </button>
                  {editingMode && (
                    <div className="flex items-center gap-0.5 pr-2 flex-shrink-0">
                      <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => { setEditingItem(o); setEditValue(o); }}
                        className="text-[#555] hover:text-[#ECECEC] p-1 rounded-lg transition-colors"
                        title="Edit"
                      ><Pencil size={11} /></button>
                      {onDeleteOption && (
                        <button
                          onMouseDown={e => e.stopPropagation()}
                          onClick={() => { onDeleteOption(o); }}
                          className="text-[#555] hover:text-red-400 p-1 rounded-lg transition-colors"
                          title="Delete"
                        ><Trash2 size={11} /></button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Add new option */}
          {addingNew && (
            <div className="flex items-center gap-1 px-2 py-1.5 border-t border-[#2a2a2a]" onMouseDown={e => e.stopPropagation()}>
              <input
                ref={newInputRef}
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAddingNew(false); }}
                className="flex-1 text-xs bg-[#161616] text-[#ECECEC] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#444] placeholder-[#444]"
                placeholder="New option…"
              />
              <button onClick={handleAdd} className="text-emerald-400 p-1 hover:bg-[#2a2a2a] rounded-lg"><Check size={12} /></button>
              <button onClick={() => setAddingNew(false)} className="text-[#555] p-1 hover:bg-[#2a2a2a] rounded-lg"><X size={12} /></button>
            </div>
          )}

          {/* Action buttons */}
          {editable && !addingNew && (
            <div className="flex items-center border-t border-[#2a2a2a] mt-0.5">
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setAddingNew(true)}
                className="flex items-center gap-1.5 flex-1 text-left text-[10px] font-medium px-3 py-2 transition-colors hover:bg-[#2a2a2a] text-[#555] hover:text-[#ECECEC]"
              ><Plus size={10} /> Add</button>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setEditingMode(m => !m)}
                className={`flex items-center gap-1.5 flex-1 text-left text-[10px] font-medium px-3 py-2 transition-colors hover:bg-[#2a2a2a] ${editingMode ? 'text-[#ECECEC]' : 'text-[#555] hover:text-[#ECECEC]'}`}
              ><Pencil size={10} /> {editingMode ? 'Done' : 'Edit'}</button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

interface AvatarProps {
  name: string;
  photoUrl?: string;
  onPhotoChange: (url: string) => void;
  size?: number;
}

function MoveToMenu({ currentType, onMove }: { currentType: ClientType; onMove: (t: ClientType) => void }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const allTypes: ClientType[] = ['recurring', 'one-time', 'profit-share'];
  const labels: Record<ClientType, string> = { 'recurring': 'Recurring', 'one-time': 'One-Time', 'profit-share': 'Profit Share' };

  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 4, left: r.left - 80 });
    }
    setOpen(!open);
  };

  return (
    <>
      <button ref={btnRef} onClick={toggle} className="text-[#555] hover:text-[#ECECEC] transition-colors p-1" title="Move to section">
        <ArrowRightLeft size={13} />
      </button>
      {open && createPortal(
        <div onClick={e => e.stopPropagation()} className="fixed z-[9999] rounded-xl py-1 shadow-2xl border" style={{ top: coords.top, left: coords.left, background: '#1c1c1c', borderColor: '#2f2f2f', minWidth: 140 }}>
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#444' }}>Move to</p>
          {allTypes.filter(t => t !== currentType).map(t => (
            <button key={t} onClick={e => { e.stopPropagation(); onMove(t); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-[#2a2a2a] transition-colors"
              style={{ color: '#ECECEC' }}
            >{labels[t]}</button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

function Avatar({ name, photoUrl, onPhotoChange, size = 36 }: AvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    onPhotoChange(compressed);
  };

  return (
    <div
      className="relative flex-shrink-0 cursor-pointer group"
      style={{ width: size, height: size }}
      onClick={() => inputRef.current?.click()}
      title="Upload photo"
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="w-full h-full rounded-full object-cover" />
      ) : (
        <div className="w-full h-full rounded-full bg-[#3a3a3a] flex items-center justify-center text-[#ECECEC] text-xs font-semibold">
          {getInitials(name) || <Camera size={14} className="text-[#666666]" />}
        </div>
      )}
      <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Camera size={12} className="text-white" />
      </div>
    </div>
  );
}

type ColumnId = 'payment' | 'amount' | 'cadence' | 'service' | 'leader' | 'status' | 'acquisition';
const DEFAULT_COLUMNS: ColumnId[] = ['status', 'payment', 'amount', 'cadence', 'service', 'leader', 'acquisition'];

const COLUMN_LABELS: Record<ColumnId, string> = {
  payment: 'Payment',
  amount: 'Amount',
  cadence: 'Cadence',
  service: 'Service',
  leader: 'Leader',
  status: 'Status',
  acquisition: 'Acquired Via',
};

const COLUMN_WIDTHS: Record<ColumnId, string> = {
  payment: '10%',
  amount: '9%',
  cadence: '10%',
  service: '12%',
  leader: '11%',
  status: '10%',
  acquisition: '13%',
};

interface ClientsManagerProps {
  storagePrefix: string;
}

// Column options type
type ColumnOptionsMap = {
  payment: string[];
  cadence: string[];
  service: string[];
  leader: string[];
  status: string[];
  acquisition: string[];
};

const ClientsManager: React.FC<ClientsManagerProps> = ({ storagePrefix }) => {
  const navigate = useNavigate();
  const { id: routeClientId } = useParams<{ id?: string }>();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addingType, setAddingType] = useState<ClientType>('recurring');
  const [draft, setDraft] = useState<Client>(newClient(0));
  // Derive selectedClient from route param + loaded clients
  const selectedClient = (() => {
    if (!routeClientId) return null;
    const client = clients.find(c => c.id === routeClientId);
    if (!client) return routeClientId ? { id: routeClientId, name: '', photoUrl: undefined, status: undefined, paymentStatus: undefined, amount: undefined, service: undefined } : null;
    return { id: client.id, name: client.name, photoUrl: client.photoUrl, status: client.status, paymentStatus: client.paymentStatus, amount: client.amount, service: client.service };
  })();
  const [showActive, setShowActive] = useState(true);

  // Custom column options — merged with defaults
  const [columnOptions, setColumnOptions] = useState<ColumnOptionsMap>({
    payment: DEFAULT_PAYMENT_STATUSES,
    cadence: DEFAULT_CADENCES,
    service: DEFAULT_SERVICES,
    leader: DEFAULT_LEADERS,
    status: DEFAULT_CLIENT_STATUSES,
    acquisition: DEFAULT_ACQUISITIONS,
  });

  // Load custom options from Supabase
  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data } = await supabase
        .from('column_options')
        .select('*')
        .eq('user_id', storagePrefix);
      if (data && data.length > 0) {
        const map: Partial<ColumnOptionsMap> = {};
        for (const row of data) {
          const col = row.column_name as keyof ColumnOptionsMap;
          if (!map[col]) map[col] = [];
          map[col]!.push(row.option_value);
        }
        setColumnOptions({
          payment: map.payment && map.payment.length > 0 ? map.payment : DEFAULT_PAYMENT_STATUSES,
          cadence: map.cadence && map.cadence.length > 0 ? map.cadence : DEFAULT_CADENCES,
          service: map.service && map.service.length > 0 ? map.service : DEFAULT_SERVICES,
          leader: map.leader && map.leader.length > 0 ? map.leader : DEFAULT_LEADERS,
          status: map.status && map.status.length > 0 ? map.status : DEFAULT_CLIENT_STATUSES,
          acquisition: map.acquisition && map.acquisition.length > 0 ? map.acquisition : DEFAULT_ACQUISITIONS,
        });
      }
    })();
  }, [storagePrefix]);

  // Save full options list to Supabase
  const saveColumnOptions = useCallback(async (col: keyof ColumnOptionsMap, options: string[]) => {
    if (!supabase) return;
    // Delete old rows for this column, then insert new
    await supabase.from('column_options').delete().eq('user_id', storagePrefix).eq('column_name', col);
    if (options.length > 0) {
      await supabase.from('column_options').insert(
        options.map((val, i) => ({
          id: crypto.randomUUID(),
          user_id: storagePrefix,
          column_name: col,
          option_value: val,
          order_num: i,
        }))
      );
    }
  }, [storagePrefix]);

  const addColumnOption = useCallback((col: keyof ColumnOptionsMap, val: string) => {
    setColumnOptions(prev => {
      const next = { ...prev, [col]: [...prev[col], val] };
      saveColumnOptions(col, next[col]);
      return next;
    });
  }, [saveColumnOptions]);

  const editColumnOption = useCallback((col: keyof ColumnOptionsMap, oldVal: string, newVal: string) => {
    setColumnOptions(prev => {
      const next = { ...prev, [col]: prev[col].map(v => v === oldVal ? newVal : v) };
      saveColumnOptions(col, next[col]);
      return next;
    });
    // Also update all clients that had the old value
    setClients(prev => prev.map(c => {
      const patch: Partial<Client> = {};
      if (col === 'payment' && c.paymentStatus === oldVal) patch.paymentStatus = newVal;
      if (col === 'cadence' && c.cadence === oldVal) patch.cadence = newVal;
      if (col === 'service' && c.service === oldVal) patch.service = newVal;
      if (col === 'leader' && c.leader === oldVal) patch.leader = newVal;
      if (col === 'status' && c.status === oldVal) patch.status = newVal;
      if (col === 'acquisition' && c.acquisition === oldVal) patch.acquisition = newVal;
      if (Object.keys(patch).length === 0) return c;
      // Persist the rename to Supabase too
      if (supabase) {
        const dbPatch: Record<string, any> = {};
        if (patch.paymentStatus) dbPatch.payment_status = patch.paymentStatus;
        if (patch.service) dbPatch.service = patch.service;
        if (patch.leader) dbPatch.leader = patch.leader;
        if (patch.status) dbPatch.status = patch.status;
        if (patch.acquisition) dbPatch.acquisition = patch.acquisition;
        supabase.from('clients').update(dbPatch).eq('id', c.id).eq('user_id', storagePrefix);
      }
      return { ...c, ...patch };
    }));
  }, [saveColumnOptions, storagePrefix]);

  const deleteColumnOption = useCallback((col: keyof ColumnOptionsMap, val: string) => {
    setColumnOptions(prev => {
      const next = { ...prev, [col]: prev[col].filter(v => v !== val) };
      // Don't allow deleting the last option
      if (next[col].length === 0) return prev;
      saveColumnOptions(col, next[col]);
      return next;
    });
  }, [saveColumnOptions]);

  // Column order (UI preference — stored in localStorage)
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(() => {
    try {
      const saved = localStorage.getItem('aureum_column_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate it contains exactly the right columns
        if (Array.isArray(parsed) && parsed.length === DEFAULT_COLUMNS.length && DEFAULT_COLUMNS.every(c => parsed.includes(c))) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_COLUMNS;
  });

  const dragColRef = useRef<ColumnId | null>(null);
  const dragOverColRef = useRef<ColumnId | null>(null);

  const handleColumnDragStart = useCallback((colId: ColumnId) => {
    dragColRef.current = colId;
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent, colId: ColumnId) => {
    e.preventDefault();
    dragOverColRef.current = colId;
  }, []);

  const handleColumnDrop = useCallback(() => {
    const from = dragColRef.current;
    const to = dragOverColRef.current;
    if (!from || !to || from === to) return;

    setColumnOrder(prev => {
      const next = [...prev];
      const fromIdx = next.indexOf(from);
      const toIdx = next.indexOf(to);
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, from);
      localStorage.setItem('aureum_column_order', JSON.stringify(next));
      return next;
    });
    dragColRef.current = null;
    dragOverColRef.current = null;
  }, []);

  // Debounce refs for name updates
  const nameDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load clients from Supabase on mount
  useEffect(() => {
    const load = async () => {
      if (!supabase) {
        setLoading(false);
        setError('Supabase is not configured.');
        return;
      }
      try {
        const { data, error: fetchError } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', storagePrefix)
          .order('order_num', { ascending: true });

        if (fetchError) throw fetchError;
        setClients((data ?? []).map(fromDbRow));
      } catch (err: any) {
        setError('Failed to load clients from Supabase.');
        console.error('ClientsManager load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [storagePrefix]);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  }, []);

  // Update a field immediately in state, then persist to Supabase
  const updateClient = useCallback(async (id: string, patch: Partial<Client>, immediate = true) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));

    if (!immediate) return;
    if (!supabase) return;

    const dbPatch: Record<string, any> = {};
    if ('name' in patch) dbPatch.name = patch.name;
    if ('photoUrl' in patch) dbPatch.photo_url = patch.photoUrl ?? null;
    if ('paymentStatus' in patch) dbPatch.payment_status = patch.paymentStatus;
    if ('amount' in patch) dbPatch.amount = patch.amount;
    if ('cadence' in patch) dbPatch.cadence = patch.cadence;
    if ('service' in patch) dbPatch.service = patch.service;
    if ('leader' in patch) dbPatch.leader = patch.leader;
    if ('status' in patch) dbPatch.status = patch.status;
    if ('acquisition' in patch) dbPatch.acquisition = patch.acquisition;
    if ('clientType' in patch) dbPatch.client_type = patch.clientType;

    try {
      const { error: updateError } = await supabase
        .from('clients')
        .update(dbPatch)
        .eq('id', id)
        .eq('user_id', storagePrefix);
      if (updateError) throw updateError;
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('cadence') || msg.includes('column')) {
        showError('Missing column in Supabase. Run the latest SQL migration (supabase_all_tables.sql).');
      } else {
        showError('Failed to save change to Supabase.');
      }
      console.error('ClientsManager update error:', err);
    }
  }, [storagePrefix, showError]);

  // Debounced name update
  const updateClientName = useCallback((id: string, name: string) => {
    // Update state immediately for responsiveness
    setClients(prev => prev.map(c => c.id === id ? { ...c, name } : c));

    // Clear existing debounce for this client
    if (nameDebounceRef.current[id]) clearTimeout(nameDebounceRef.current[id]);

    nameDebounceRef.current[id] = setTimeout(async () => {
      if (!supabase) return;
      try {
        const { error: updateError } = await supabase
          .from('clients')
          .update({ name })
          .eq('id', id)
          .eq('user_id', storagePrefix);
        if (updateError) throw updateError;
      } catch (err: any) {
        showError('Failed to save name to Supabase.');
        console.error('ClientsManager name update error:', err);
      }
    }, 600);
  }, [storagePrefix, showError]);

  const deleteClient = useCallback(async (id: string) => {
    if (!supabase) return;
    setClients(prev => prev.filter(c => c.id !== id));
    try {
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('user_id', storagePrefix);
      if (deleteError) throw deleteError;
    } catch (err: any) {
      showError('Failed to delete client from Supabase.');
      console.error('ClientsManager delete error:', err);
    }
  }, [storagePrefix, showError]);

  const handleAddSave = useCallback(async () => {
    if (!draft.name.trim()) return;
    if (!supabase) { showError('Supabase is not configured.'); return; }

    const newC: Client = { ...draft, name: draft.name.trim(), orderNum: clients.length };
    setClients(prev => [...prev, newC]);
    setDraft(newClient(clients.length + 1));
    setIsAdding(false);

    try {
      const { error: insertError } = await supabase
        .from('clients')
        .insert(toDbRow(newC, storagePrefix));
      if (insertError) throw insertError;
    } catch (err: any) {
      showError('Failed to save new client to Supabase.');
      console.error('ClientsManager insert error:', err);
    }
  }, [draft, clients.length, storagePrefix, showError]);

  const handleAddCancel = () => {
    setDraft(newClient(0));
    setIsAdding(false);
    setAddingType('recurring');
  };

  const toggleClientActive = useCallback(async (id: string, active: boolean) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, active } : c));
    if (!supabase) return;
    try {
      await supabase.from('clients').update({ active }).eq('id', id).eq('user_id', storagePrefix);
    } catch (err) {
      console.error('Failed to update client active status:', err);
    }
  }, [storagePrefix]);

  const activeClients = clients.filter(c => c.active);
  const inactiveClients = clients.filter(c => !c.active);

  const recurringClients = (showActive ? activeClients : inactiveClients).filter(c => c.clientType === 'recurring');
  const oneTimeClients = (showActive ? activeClients : inactiveClients).filter(c => c.clientType === 'one-time');
  const profitShareClients = (showActive ? activeClients : inactiveClients).filter(c => c.clientType === 'profit-share');

  const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
    'recurring': 'Recurring',
    'one-time': 'One-Time',
    'profit-share': 'Profit Share',
  };

  const moveClientToType = useCallback(async (clientId: string, newType: ClientType) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, clientType: newType } : c));
    if (!supabase) return;
    try {
      await supabase.from('clients').update({ client_type: newType }).eq('id', clientId).eq('user_id', storagePrefix);
    } catch (err) {
      console.error('Failed to move client:', err);
    }
  }, [storagePrefix]);

  // ── Full-page client workspace ──────────────────────────────────────────────
  if (selectedClient) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/clients')}
          className="flex items-center gap-2 text-sm font-medium transition-colors px-1 py-1"
          style={{ color: '#555' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ECECEC')}
          onMouseLeave={e => (e.currentTarget.style.color = '#555')}
        >
          ← Back to Clients
        </button>
        <ClientPanel
          client={selectedClient}
          storagePrefix={storagePrefix}
          onClose={() => navigate('/clients')}
          onClientUpdate={(id, patch) => {
            updateClient(id, patch as Partial<Client>);
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-[#666666]">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading clients…</span>
      </div>
    );
  }

  // ── Shared cell map builder ────────────────────────────────────────────────
  const buildCellMap = (client: Client): Record<ColumnId, React.ReactNode> => ({
    payment: (
      <SelectCell
        value={client.paymentStatus}
        options={columnOptions.payment}
        onChange={v => updateClient(client.id, { paymentStatus: v })}
        colorMap={paymentColors}
        onAddOption={v => addColumnOption('payment', v)}
        onEditOption={(o, n) => editColumnOption('payment', o, n)}
        onDeleteOption={v => deleteColumnOption('payment', v)}
      />
    ),
    amount: (
      <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
        <span className="text-xs text-emerald-500/60">$</span>
        <input
          type="text"
          value={client.amount ? client.amount.toLocaleString() : ''}
          onChange={e => {
            const raw = e.target.value.replace(/[^0-9.]/g, '');
            const num = parseFloat(raw) || 0;
            updateClient(client.id, { amount: num });
          }}
          className="bg-transparent text-xs font-medium text-emerald-400 focus:outline-none w-[80px] placeholder-[#3a3a3a]"
          placeholder="0"
        />
      </div>
    ),
    cadence: (
      <SelectCell
        value={client.cadence}
        options={columnOptions.cadence}
        onChange={v => updateClient(client.id, { cadence: v })}
        onAddOption={v => addColumnOption('cadence', v)}
        onEditOption={(o, n) => editColumnOption('cadence', o, n)}
        onDeleteOption={v => deleteColumnOption('cadence', v)}
      />
    ),
    service: (
      <SelectCell
        value={client.service}
        options={columnOptions.service}
        onChange={v => updateClient(client.id, { service: v })}
        onAddOption={v => addColumnOption('service', v)}
        onEditOption={(o, n) => editColumnOption('service', o, n)}
        onDeleteOption={v => deleteColumnOption('service', v)}
      />
    ),
    leader: (
      <SelectCell
        value={client.leader}
        options={columnOptions.leader}
        onChange={v => updateClient(client.id, { leader: v })}
        onAddOption={v => addColumnOption('leader', v)}
        onEditOption={(o, n) => editColumnOption('leader', o, n)}
        onDeleteOption={v => deleteColumnOption('leader', v)}
      />
    ),
    status: (
      <SelectCell
        value={client.status}
        options={columnOptions.status}
        onChange={v => updateClient(client.id, { status: v })}
        colorMap={statusColors}
        onAddOption={v => addColumnOption('status', v)}
        onEditOption={(o, n) => editColumnOption('status', o, n)}
        onDeleteOption={v => deleteColumnOption('status', v)}
      />
    ),
    acquisition: (
      <SelectCell
        value={client.acquisition}
        options={columnOptions.acquisition}
        onChange={v => updateClient(client.id, { acquisition: v })}
        colorMap={acquisitionColors}
        onAddOption={v => addColumnOption('acquisition', v)}
        onEditOption={(o, n) => editColumnOption('acquisition', o, n)}
        onDeleteOption={v => deleteColumnOption('acquisition', v)}
      />
    ),
  });

  // ── Shared table renderer ─────────────────────────────────────────────────
  const renderTable = (clientList: Client[], sectionType: ClientType) => (
    <div className="rounded-xl border border-[#2f2f2f] overflow-visible">
      <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '19%' }} />
          {columnOrder.map(col => (
            <col key={col} style={{ width: COLUMN_WIDTHS[col] }} />
          ))}
          <col style={{ width: '8%' }} />
        </colgroup>
        <thead>
          <tr className="border-b border-[#2f2f2f]" style={{ background: '#1a1a1a' }}>
            <th className="text-left px-5 py-3 text-xs font-semibold text-[#555] uppercase tracking-wider rounded-tl-xl">Name</th>
            {columnOrder.map(col => (
              <th
                key={col}
                draggable
                onDragStart={() => handleColumnDragStart(col)}
                onDragOver={e => handleColumnDragOver(e, col)}
                onDrop={handleColumnDrop}
                className="text-left px-5 py-3 text-xs font-semibold text-[#555] uppercase tracking-wider select-none cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-1.5">
                  <GripVertical size={10} className="flex-shrink-0" style={{ opacity: 0.2 }} />
                  {COLUMN_LABELS[col]}
                </div>
              </th>
            ))}
            <th className="px-3 py-3 rounded-tr-xl"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2f2f2f]">
          {clientList.map(client => {
            const cellMap = buildCellMap(client);
            return (
              <tr
                key={client.id}
                className="group bg-[#212121] hover:bg-[#1e1e1e] transition-colors cursor-pointer"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div onClick={e => e.stopPropagation()}>
                      <Avatar
                        name={client.name}
                        photoUrl={client.photoUrl}
                        onPhotoChange={url => updateClient(client.id, { photoUrl: url })}
                      />
                    </div>
                    <span
                      className="text-[#ECECEC] text-sm font-medium flex-1 min-w-0 cursor-pointer truncate"
                    >{client.name || 'Unnamed'}</span>
                  </div>
                </td>
                {columnOrder.map(col => (
                  <td key={col} className="px-5 py-3.5" onClick={e => { e.stopPropagation(); }}>{cellMap[col]}</td>
                ))}
                <td className="px-3 py-3.5 text-center">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all justify-end">
                    <MoveToMenu
                      currentType={client.clientType}
                      onMove={type => moveClientToType(client.id, type)}
                    />
                    {showActive ? (
                      <button
                        onClick={e => { e.stopPropagation(); toggleClientActive(client.id, false); }}
                        className="text-[#555] hover:text-[#ECECEC] transition-colors p-1"
                        title="Archive client"
                      ><Archive size={13} /></button>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); toggleClientActive(client.id, true); }}
                        className="text-[#555] hover:text-emerald-400 transition-colors p-1"
                        title="Reactivate client"
                      ><RotateCcw size={13} /></button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); deleteClient(client.id); }}
                      className="text-[#555] hover:text-red-400 transition-colors p-1"
                      title="Delete client"
                    ><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            );
          })}

          {/* Add new row */}
          {isAdding && addingType === sectionType && (
            <tr className="bg-[#1e1e1e]">
              <td className="px-5 py-3.5" colSpan={columnOrder.length + 2}>
                <div className="flex items-center gap-4">
                  <Avatar
                    name={draft.name}
                    photoUrl={draft.photoUrl}
                    onPhotoChange={url => setDraft(d => ({ ...d, photoUrl: url }))}
                  />
                  <input
                    autoFocus
                    value={draft.name}
                    onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddSave(); if (e.key === 'Escape') handleAddCancel(); }}
                    className="bg-transparent text-[#ECECEC] text-sm font-medium flex-1 min-w-0 focus:outline-none placeholder-[#555]"
                    placeholder="Client name..."
                  />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <SelectCell value={draft.paymentStatus} options={columnOptions.payment} onChange={v => setDraft(d => ({ ...d, paymentStatus: v }))} colorMap={paymentColors} />
                    <SelectCell value={draft.cadence} options={columnOptions.cadence} onChange={v => setDraft(d => ({ ...d, cadence: v }))} />
                    <SelectCell value={draft.service} options={columnOptions.service} onChange={v => setDraft(d => ({ ...d, service: v }))} />
                    <SelectCell value={draft.leader} options={columnOptions.leader} onChange={v => setDraft(d => ({ ...d, leader: v }))} />
                    <SelectCell value={draft.status} options={columnOptions.status} onChange={v => setDraft(d => ({ ...d, status: v }))} colorMap={statusColors} />
                    <SelectCell value={draft.acquisition} options={columnOptions.acquisition} onChange={v => setDraft(d => ({ ...d, acquisition: v }))} colorMap={acquisitionColors} />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={handleAddSave} className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-3 py-1.5 rounded-lg transition-colors" style={{ background: '#2a2a2a' }}>Save</button>
                    <button onClick={handleAddCancel} className="text-xs text-[#555] hover:text-[#ECECEC] px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
                  </div>
                </div>
              </td>
            </tr>
          )}

          {/* Empty state */}
          {clientList.length === 0 && !(isAdding && addingType === sectionType) && (
            <tr>
              <td colSpan={columnOrder.length + 2} className="px-4 py-12 text-center text-[#666666]">
                <p className="text-sm">No {CLIENT_TYPE_LABELS[sectionType]?.toLowerCase() || sectionType} clients yet.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header — tabs + add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#1a1a1a' }}>
          <button
            onClick={() => setShowActive(true)}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-all"
            style={{
              background: showActive ? '#2a2a2a' : 'transparent',
              color: showActive ? '#ECECEC' : '#555',
            }}
          >
            Active ({activeClients.length})
          </button>
          <button
            onClick={() => setShowActive(false)}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-all"
            style={{
              background: !showActive ? '#2a2a2a' : 'transparent',
              color: !showActive ? '#ECECEC' : '#555',
            }}
          >
            Inactive ({inactiveClients.length})
          </button>
        </div>
      </div>

      {/* ── Task Board ──────────────────────────────────────────────────────── */}
      <TaskBoard
        storagePrefix={storagePrefix}
        clients={clients.filter(c => c.active).map(c => ({ id: c.id, name: c.name }))}
      />

      {/* ── Recurring Clients ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: '#ECECEC' }}>Recurring Clients</h2>
          <button
            onClick={() => { setAddingType('recurring'); setDraft(newClient(clients.length, 'recurring')); setIsAdding(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{ background: '#2a2a2a', color: '#ECECEC' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#333')}
            onMouseLeave={e => (e.currentTarget.style.background = '#2a2a2a')}
          >
            <Plus size={13} /> Add Client
          </button>
        </div>
        {renderTable(recurringClients, 'recurring')}
      </div>

      {/* ── One-time Services ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: '#ECECEC' }}>One-Time Services</h2>
          <button
            onClick={() => { setAddingType('one-time'); setDraft(newClient(clients.length, 'one-time')); setIsAdding(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{ background: '#2a2a2a', color: '#ECECEC' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#333')}
            onMouseLeave={e => (e.currentTarget.style.background = '#2a2a2a')}
          >
            <Plus size={13} /> Add Client
          </button>
        </div>
        {renderTable(oneTimeClients, 'one-time')}
      </div>

      {/* ── Profit Share ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: '#ECECEC' }}>Profit Share</h2>
          <button
            onClick={() => { setAddingType('profit-share'); setDraft(newClient(clients.length, 'profit-share')); setIsAdding(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{ background: '#2a2a2a', color: '#ECECEC' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#333')}
            onMouseLeave={e => (e.currentTarget.style.background = '#2a2a2a')}
          >
            <Plus size={13} /> Add Client
          </button>
        </div>
        {renderTable(profitShareClients, 'profit-share')}
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-700 text-red-200 text-sm px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}

    </div>
  );
};

export default ClientsManager;
