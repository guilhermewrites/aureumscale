import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';

type PaymentStatus = 'Missing Invoice' | 'Pending' | 'Paid';
type Service = 'Full-on-marketing' | 'Ghostwriting' | 'Social Media Management' | 'Webinar' | 'Design' | 'Video-Editing';
type Leader = 'Guilherme Writes' | 'Jhacson Mossman';
type ClientStatus = 'Happy' | 'Moderate' | 'Frustrated';

interface Client {
  id: string;
  name: string;
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

const statusEmoji: Record<ClientStatus, string> = {
  'Happy': '😊',
  'Moderate': '😐',
  'Frustrated': '😤',
};

function newClient(): Client {
  return {
    id: crypto.randomUUID(),
    name: '',
    paymentStatus: 'Pending',
    service: 'Ghostwriting',
    leader: 'Guilherme Writes',
    status: 'Happy',
  };
}

interface SelectCellProps<T extends string> {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  colorMap?: Record<T, string>;
}

function SelectCell<T extends string>({ value, options, onChange, colorMap }: SelectCellProps<T>) {
  return (
    <div className="relative group">
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className={`appearance-none w-full text-xs font-medium px-2.5 py-1.5 rounded-full pr-6 cursor-pointer bg-transparent border-0 focus:outline-none ${colorMap ? colorMap[value] : 'text-[#ECECEC] bg-[#2f2f2f]'}`}
      >
        {options.map(o => (
          <option key={o} value={o} className="bg-[#1a1a1a] text-[#ECECEC]">{o}</option>
        ))}
      </select>
      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-60" />
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

  const updateClient = (id: string, field: keyof Client, value: string) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
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
      <div className="rounded-xl border border-[#2f2f2f] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2f2f2f] bg-[#1a1a1a]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#666666] uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#666666] uppercase tracking-wider">Payment Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#666666] uppercase tracking-wider">Service</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#666666] uppercase tracking-wider">Leader</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#666666] uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2f2f2f]">
            {clients.map(client => (
              <tr key={client.id} className="group bg-[#212121] hover:bg-[#252525] transition-colors">
                {/* Name */}
                <td className="px-4 py-3">
                  <input
                    value={client.name}
                    onChange={e => updateClient(client.id, 'name', e.target.value)}
                    className="bg-transparent text-[#ECECEC] font-medium w-full focus:outline-none focus:border-b focus:border-[#3a3a3a] placeholder-[#666666]"
                    placeholder="Client name"
                  />
                </td>
                {/* Payment Status */}
                <td className="px-4 py-3">
                  <SelectCell
                    value={client.paymentStatus}
                    options={PAYMENT_STATUSES}
                    onChange={v => updateClient(client.id, 'paymentStatus', v)}
                    colorMap={paymentColors}
                  />
                </td>
                {/* Service */}
                <td className="px-4 py-3">
                  <SelectCell
                    value={client.service}
                    options={SERVICES}
                    onChange={v => updateClient(client.id, 'service', v)}
                  />
                </td>
                {/* Leader */}
                <td className="px-4 py-3">
                  <SelectCell
                    value={client.leader}
                    options={LEADERS}
                    onChange={v => updateClient(client.id, 'leader', v)}
                  />
                </td>
                {/* Status */}
                <td className="px-4 py-3">
                  <SelectCell
                    value={client.status}
                    options={CLIENT_STATUSES}
                    onChange={v => updateClient(client.id, 'status', v)}
                    colorMap={statusColors}
                  />
                </td>
                {/* Delete */}
                <td className="px-4 py-3">
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
                  <input
                    autoFocus
                    value={draft.name}
                    onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddSave(); if (e.key === 'Escape') handleAddCancel(); }}
                    className="bg-transparent text-[#ECECEC] font-medium w-full focus:outline-none border-b border-[#3a3a3a] placeholder-[#666666]"
                    placeholder="Client name..."
                  />
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
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={handleAddSave} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">Save</button>
                  <button onClick={handleAddCancel} className="text-xs text-[#666666] hover:text-[#ECECEC]">Cancel</button>
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
