import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, Camera, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

type PaymentStatus = 'Missing Invoice' | 'Pending' | 'Paid';
type Service = 'Full-on-marketing' | 'Ghostwriting' | 'Social Media Management' | 'Webinar' | 'Design' | 'Video-Editing';
type Leader = 'Guilherme Writes' | 'Jhacson Mossman';
type ClientStatus = 'Happy' | 'Moderate' | 'Frustrated';

interface Client {
  id: string;
  name: string;
  photoUrl?: string;
  paymentStatus: PaymentStatus;
  service: Service;
  leader: Leader;
  status: ClientStatus;
  orderNum: number;
}

const PAYMENT_STATUSES: PaymentStatus[] = ['Missing Invoice', 'Pending', 'Paid'];
const SERVICES: Service[] = ['Full-on-marketing', 'Ghostwriting', 'Social Media Management', 'Webinar', 'Design', 'Video-Editing'];
const LEADERS: Leader[] = ['Guilherme Writes', 'Jhacson Mossman'];
const CLIENT_STATUSES: ClientStatus[] = ['Happy', 'Moderate', 'Frustrated'];

const paymentColors: Record<PaymentStatus, string> = {
  'Missing Invoice': 'bg-[#2a2a2a] text-red-400 border border-[#3a3a3a]',
  'Pending': 'bg-[#2a2a2a] text-[#9B9B9B] border border-[#3a3a3a]',
  'Paid': 'bg-[#2a2a2a] text-emerald-400 border border-[#3a3a3a]',
};

const statusColors: Record<ClientStatus, string> = {
  'Happy': 'bg-[#2a2a2a] text-emerald-400 border border-[#3a3a3a]',
  'Moderate': 'bg-[#2a2a2a] text-[#9B9B9B] border border-[#3a3a3a]',
  'Frustrated': 'bg-[#2a2a2a] text-red-400 border border-[#3a3a3a]',
};

function getInitials(name: string) {
  return name.trim().split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function newClient(orderNum: number): Client {
  return {
    id: crypto.randomUUID(),
    name: '',
    photoUrl: undefined,
    paymentStatus: 'Pending',
    service: 'Ghostwriting',
    leader: 'Guilherme Writes',
    status: 'Happy',
    orderNum,
  };
}

function toDbRow(client: Client, userId: string) {
  return {
    id: client.id,
    user_id: userId,
    name: client.name,
    photo_url: client.photoUrl ?? null,
    payment_status: client.paymentStatus,
    service: client.service,
    leader: client.leader,
    status: client.status,
    order_num: client.orderNum,
  };
}

function fromDbRow(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    photoUrl: row.photo_url ?? undefined,
    paymentStatus: row.payment_status as PaymentStatus,
    service: row.service as Service,
    leader: row.leader as Leader,
    status: row.status as ClientStatus,
    orderNum: row.order_num ?? 0,
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

interface SelectCellProps<T extends string> {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  colorMap?: Record<T, string>;
}

function SelectCell<T extends string>({ value, options, onChange, colorMap }: SelectCellProps<T>) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pillClass = colorMap
    ? colorMap[value]
    : 'bg-[#2a2a2a] text-[#ECECEC] border border-[#3a3a3a]';

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full cursor-pointer whitespace-nowrap ${pillClass}`}
      >
        <span className="truncate max-w-[110px]">{value}</span>
        <ChevronDown size={10} className="flex-shrink-0 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-max bg-[#1e1e1e] border border-[#3a3a3a] rounded-lg shadow-xl overflow-hidden">
          {options.map(o => (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(o); setOpen(false); }}
              className={`block w-full text-left text-xs px-3 py-2 hover:bg-[#2a2a2a] transition-colors ${o === value ? 'text-white font-semibold' : 'text-[#9B9B9B]'}`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface AvatarProps {
  name: string;
  photoUrl?: string;
  onPhotoChange: (url: string) => void;
  size?: number;
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

interface ClientsManagerProps {
  storagePrefix: string;
}

const ClientsManager: React.FC<ClientsManagerProps> = ({ storagePrefix }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<Client>(newClient(0));

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

    if (!immediate) return; // caller will handle debounce
    if (!supabase) return;

    const dbPatch: Record<string, any> = {};
    if ('name' in patch) dbPatch.name = patch.name;
    if ('photoUrl' in patch) dbPatch.photo_url = patch.photoUrl ?? null;
    if ('paymentStatus' in patch) dbPatch.payment_status = patch.paymentStatus;
    if ('service' in patch) dbPatch.service = patch.service;
    if ('leader' in patch) dbPatch.leader = patch.leader;
    if ('status' in patch) dbPatch.status = patch.status;

    try {
      const { error: updateError } = await supabase
        .from('clients')
        .update(dbPatch)
        .eq('id', id)
        .eq('user_id', storagePrefix);
      if (updateError) throw updateError;
    } catch (err: any) {
      showError('Failed to save change to Supabase.');
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-[#666666]">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading clients…</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#ECECEC]">Clients</h1>
          <p className="text-sm text-[#666666] mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#ECECEC] text-[#121212] text-sm font-medium rounded-lg hover:bg-white transition-colors"
        >
          <Plus size={16} />
          Add Client
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#2f2f2f] overflow-hidden">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col style={{ width: '28%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '2%' }} />
          </colgroup>
          <thead>
            <tr className="border-b border-[#2f2f2f] bg-[#1a1a1a]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#666666] uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#666666] uppercase tracking-wider">Payment</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#666666] uppercase tracking-wider">Service</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#666666] uppercase tracking-wider">Leader</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#666666] uppercase tracking-wider">Status</th>
              <th className="px-2 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2f2f2f]">
            {clients.map(client => (
              <tr key={client.id} className="group bg-[#212121] hover:bg-[#252525] transition-colors">
                {/* Name + Avatar */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={client.name}
                      photoUrl={client.photoUrl}
                      onPhotoChange={url => updateClient(client.id, { photoUrl: url })}
                    />
                    <input
                      value={client.name}
                      onChange={e => updateClientName(client.id, e.target.value)}
                      className="bg-transparent text-[#ECECEC] font-medium flex-1 min-w-0 focus:outline-none focus:border-b focus:border-[#3a3a3a] placeholder-[#666666]"
                      placeholder="Client name"
                    />
                  </div>
                </td>
                {/* Payment Status */}
                <td className="px-4 py-3">
                  <SelectCell
                    value={client.paymentStatus}
                    options={PAYMENT_STATUSES}
                    onChange={v => updateClient(client.id, { paymentStatus: v })}
                    colorMap={paymentColors}
                  />
                </td>
                {/* Service */}
                <td className="px-4 py-3">
                  <SelectCell
                    value={client.service}
                    options={SERVICES}
                    onChange={v => updateClient(client.id, { service: v })}
                  />
                </td>
                {/* Leader */}
                <td className="px-4 py-3">
                  <SelectCell
                    value={client.leader}
                    options={LEADERS}
                    onChange={v => updateClient(client.id, { leader: v })}
                  />
                </td>
                {/* Status */}
                <td className="px-4 py-3">
                  <SelectCell
                    value={client.status}
                    options={CLIENT_STATUSES}
                    onChange={v => updateClient(client.id, { status: v })}
                    colorMap={statusColors}
                  />
                </td>
                {/* Delete */}
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => deleteClient(client.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#666666] hover:text-red-400 transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}

            {/* Add new row */}
            {isAdding && (
              <tr className="bg-[#252525]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
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
                      className="bg-transparent text-[#ECECEC] font-medium flex-1 min-w-0 focus:outline-none border-b border-[#3a3a3a] placeholder-[#666666]"
                      placeholder="Client name..."
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <SelectCell value={draft.paymentStatus} options={PAYMENT_STATUSES} onChange={v => setDraft(d => ({ ...d, paymentStatus: v }))} colorMap={paymentColors} />
                </td>
                <td className="px-4 py-3">
                  <SelectCell value={draft.service} options={SERVICES} onChange={v => setDraft(d => ({ ...d, service: v }))} />
                </td>
                <td className="px-4 py-3">
                  <SelectCell value={draft.leader} options={LEADERS} onChange={v => setDraft(d => ({ ...d, leader: v }))} />
                </td>
                <td className="px-4 py-3">
                  <SelectCell value={draft.status} options={CLIENT_STATUSES} onChange={v => setDraft(d => ({ ...d, status: v }))} colorMap={statusColors} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <button onClick={handleAddSave} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">Save</button>
                    <button onClick={handleAddCancel} className="text-xs text-[#666666] hover:text-[#ECECEC]">Cancel</button>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty state */}
            {clients.length === 0 && !isAdding && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-[#666666]">
                  <p className="text-base font-medium mb-1">No clients yet</p>
                  <p className="text-sm">Click "Add Client" to get started.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
