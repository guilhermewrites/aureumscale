import React, { useState, useRef } from 'react';
import { Plus, Trash2, ChevronDown, Camera } from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';

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
}

const PAYMENT_STATUSES: PaymentStatus[] = ['Missing Invoice', 'Pending', 'Paid'];
const SERVICES: Service[] = ['Full-on-marketing', 'Ghostwriting', 'Social Media Management', 'Webinar', 'Design', 'Video-Editing'];
const LEADERS: Leader[] = ['Guilherme Writes', 'Jhacson Mossman'];
const CLIENT_STATUSES: ClientStatus[] = ['Happy', 'Moderate', 'Frustrated'];

const paymentColors: Record<PaymentStatus, string> = {
  'Missing Invoice': 'bg-red-500/15 text-red-400 border border-red-500/30',
  'Pending': 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  'Paid': 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
};

const statusColors: Record<ClientStatus, string> = {
  'Happy': 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  'Moderate': 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  'Frustrated': 'bg-red-500/15 text-red-400 border border-red-500/30',
};

function getInitials(name: string) {
  return name.trim().split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function newClient(): Client {
  return {
    id: crypto.randomUUID(),
    name: '',
    photoUrl: undefined,
    paymentStatus: 'Pending',
    service: 'Ghostwriting',
    leader: 'Guilherme Writes',
    status: 'Happy',
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
  minWidth?: string;
}

function SelectCell<T extends string>({ value, options, onChange, colorMap, minWidth }: SelectCellProps<T>) {
  return (
    <div className="relative inline-flex" style={{ minWidth }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className={`appearance-none text-xs font-medium px-3 py-1.5 rounded-full pr-7 cursor-pointer bg-transparent border-0 focus:outline-none w-full ${colorMap ? colorMap[value] : 'text-[#ECECEC] bg-[#2a2a2a]'}`}
      >
        {options.map(o => (
          <option key={o} value={o} className="bg-[#1a1a1a] text-[#ECECEC]">{o}</option>
        ))}
      </select>
      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-60" />
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
  const [clients, setClients] = useLocalStorage<Client[]>(`${storagePrefix}_clients`, []);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<Client>(newClient());

  const updateClient = (id: string, patch: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const handleAddSave = () => {
    if (!draft.name.trim()) return;
    setClients(prev => [...prev, { ...draft, name: draft.name.trim() }]);
    setDraft(newClient());
    setIsAdding(false);
  };

  const handleAddCancel = () => {
    setDraft(newClient());
    setIsAdding(false);
  };

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
      <div className="rounded-xl border border-[#2f2f2f] overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 740 }}>
          <thead>
            <tr className="border-b border-[#2f2f2f] bg-[#1a1a1a]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#666666] uppercase tracking-wider" style={{ minWidth: 220 }}>Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#666666] uppercase tracking-wider" style={{ minWidth: 150 }}>Payment Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#666666] uppercase tracking-wider" style={{ minWidth: 190 }}>Service</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#666666] uppercase tracking-wider" style={{ minWidth: 160 }}>Leader</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#666666] uppercase tracking-wider" style={{ minWidth: 110 }}>Status</th>
              <th className="px-4 py-3" style={{ width: 40 }}></th>
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
                      onChange={e => updateClient(client.id, { name: e.target.value })}
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
                    minWidth="140px"
                  />
                </td>
                {/* Service */}
                <td className="px-4 py-3">
                  <SelectCell
                    value={client.service}
                    options={SERVICES}
                    onChange={v => updateClient(client.id, { service: v })}
                    minWidth="180px"
                  />
                </td>
                {/* Leader */}
                <td className="px-4 py-3">
                  <SelectCell
                    value={client.leader}
                    options={LEADERS}
                    onChange={v => updateClient(client.id, { leader: v })}
                    minWidth="150px"
                  />
                </td>
                {/* Status */}
                <td className="px-4 py-3">
                  <SelectCell
                    value={client.status}
                    options={CLIENT_STATUSES}
                    onChange={v => updateClient(client.id, { status: v })}
                    colorMap={statusColors}
                    minWidth="100px"
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
                  <SelectCell value={draft.paymentStatus} options={PAYMENT_STATUSES} onChange={v => setDraft(d => ({ ...d, paymentStatus: v }))} colorMap={paymentColors} minWidth="140px" />
                </td>
                <td className="px-4 py-3">
                  <SelectCell value={draft.service} options={SERVICES} onChange={v => setDraft(d => ({ ...d, service: v }))} minWidth="180px" />
                </td>
                <td className="px-4 py-3">
                  <SelectCell value={draft.leader} options={LEADERS} onChange={v => setDraft(d => ({ ...d, leader: v }))} minWidth="150px" />
                </td>
                <td className="px-4 py-3">
                  <SelectCell value={draft.status} options={CLIENT_STATUSES} onChange={v => setDraft(d => ({ ...d, status: v }))} colorMap={statusColors} minWidth="100px" />
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
    </div>
  );
};

export default ClientsManager;
