import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Mail, MessageSquare, Send, Plus, Trash2, Edit3, X, Clock, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

type Channel = 'email' | 'sms' | 'telegram';
type MsgStatus = 'draft' | 'scheduled' | 'sent' | 'failed';

export interface FunnelMessage {
  id: string;
  user_id: string;
  funnel_id: string;
  channel: Channel;
  subject: string;
  body: string;
  scheduled_at: string | null;
  sent_at: string | null;
  status: MsgStatus;
  recipient_count: number;
  notes: string;
}

const CHANNEL_META: Record<Channel, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  email:    { label: 'Email',    icon: <Mail size={12} />,         color: '#bfdbfe', bg: 'rgba(191,219,254,0.12)' },
  sms:      { label: 'SMS',      icon: <MessageSquare size={12} />, color: '#fde68a', bg: 'rgba(253,230,138,0.12)' },
  telegram: { label: 'Telegram', icon: <Send size={12} />,          color: '#86efac', bg: 'rgba(134,239,172,0.12)' },
};

const STATUS_META: Record<MsgStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     color: '#d4d4d8', icon: <Edit3 size={10} /> },
  scheduled: { label: 'Scheduled', color: '#fde68a', icon: <Clock size={10} /> },
  sent:      { label: 'Sent',      color: '#86efac', icon: <CheckCircle size={10} /> },
  failed:    { label: 'Failed',    color: '#fca5a5', icon: <AlertCircle size={10} /> },
};

const formatDateTime = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

interface Props {
  funnelId: string;
  storagePrefix: string;
  funnelName?: string;
}

const FunnelCommunications: React.FC<Props> = ({ funnelId, storagePrefix, funnelName }) => {
  const [messages, setMessages] = useState<FunnelMessage[]>([]);
  const [channel, setChannel] = useState<Channel>('email');
  const [statusFilter, setStatusFilter] = useState<MsgStatus | 'all'>('all');
  const [editing, setEditing] = useState<FunnelMessage | null>(null);
  const [form, setForm] = useState<Partial<FunnelMessage>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data, error } = await supabase
        .from('funnel_communications')
        .select('*')
        .eq('user_id', storagePrefix)
        .eq('funnel_id', funnelId)
        .order('created_at', { ascending: false });
      if (!error && data) setMessages(data as FunnelMessage[]);
    })();
  }, [storagePrefix, funnelId]);

  const channelMessages = useMemo(
    () => messages.filter(m => m.channel === channel && (statusFilter === 'all' || m.status === statusFilter)),
    [messages, channel, statusFilter]
  );

  const counts = useMemo(() => {
    const c = { email: 0, sms: 0, telegram: 0 };
    messages.forEach(m => { c[m.channel]++; });
    return c;
  }, [messages]);

  const openNew = () => {
    setForm({
      id: '',
      channel,
      subject: '',
      body: '',
      scheduled_at: null,
      status: 'draft',
      recipient_count: 0,
      notes: '',
    });
    setEditing({} as FunnelMessage);
  };

  const openEdit = (msg: FunnelMessage) => {
    setForm(msg);
    setEditing(msg);
  };

  const close = () => { setEditing(null); setForm({}); };

  const save = useCallback(async () => {
    if (!supabase || !form.channel) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      let nextStatus: MsgStatus = (form.status as MsgStatus) || 'draft';
      if (nextStatus === 'draft' && form.scheduled_at) nextStatus = 'scheduled';
      if (nextStatus === 'scheduled' && !form.scheduled_at) nextStatus = 'draft';

      const payload = {
        id: form.id || crypto.randomUUID(),
        user_id: storagePrefix,
        funnel_id: funnelId,
        channel: form.channel,
        subject: form.subject || '',
        body: form.body || '',
        scheduled_at: form.scheduled_at || null,
        sent_at: form.sent_at || null,
        status: nextStatus,
        recipient_count: form.recipient_count ?? 0,
        notes: form.notes || '',
        updated_at: now,
      };
      if (form.id) {
        await supabase.from('funnel_communications').update(payload).eq('id', form.id).eq('user_id', storagePrefix);
        setMessages(ms => ms.map(m => m.id === form.id ? { ...m, ...payload } as FunnelMessage : m));
      } else {
        await supabase.from('funnel_communications').insert(payload);
        setMessages(ms => [payload as FunnelMessage, ...ms]);
      }
      close();
    } finally { setSaving(false); }
  }, [form, storagePrefix, funnelId]);

  const remove = useCallback(async (id: string) => {
    if (!supabase) return;
    await supabase.from('funnel_communications').delete().eq('id', id).eq('user_id', storagePrefix);
    setMessages(ms => ms.filter(m => m.id !== id));
    if (editing && form.id === id) close();
  }, [editing, form.id, storagePrefix]);

  const markSent = useCallback(async (msg: FunnelMessage) => {
    if (!supabase) return;
    const now = new Date().toISOString();
    await supabase.from('funnel_communications').update({ status: 'sent', sent_at: now, updated_at: now })
      .eq('id', msg.id).eq('user_id', storagePrefix);
    setMessages(ms => ms.map(m => m.id === msg.id ? { ...m, status: 'sent', sent_at: now } : m));
  }, [storagePrefix]);

  const duplicate = useCallback(async (msg: FunnelMessage) => {
    if (!supabase) return;
    const copy: FunnelMessage = {
      ...msg,
      id: crypto.randomUUID(),
      status: 'draft',
      sent_at: null,
      subject: msg.subject ? `${msg.subject} (copy)` : '',
    };
    await supabase.from('funnel_communications').insert({ ...copy, user_id: storagePrefix, funnel_id: funnelId });
    setMessages(ms => [copy, ...ms]);
  }, [storagePrefix, funnelId]);

  const channelMeta = CHANNEL_META[channel];

  // For input[type=datetime-local] — convert between UTC ISO and local
  const toLocalInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const fromLocalInput = (v: string) => v ? new Date(v).toISOString() : null;

  return (
    <div className="h-full flex flex-col">
      {/* Channel tabs */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-shrink-0 flex-wrap">
        <div className="flex gap-1 bg-[#1a1a1a] rounded-lg p-1">
          {(Object.keys(CHANNEL_META) as Channel[]).map(c => {
            const meta = CHANNEL_META[c];
            const active = channel === c;
            return (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: active ? meta.bg : 'transparent',
                  color: active ? meta.color : '#666',
                  border: active ? `1px solid ${meta.color}33` : '1px solid transparent',
                }}
              >
                {meta.icon}
                {meta.label}
                <span className="text-[10px] opacity-70">{counts[c]}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#161616] rounded-lg p-0.5 border border-[#252525]">
            <button onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${statusFilter === 'all' ? 'bg-[#252525] text-[#ECECEC]' : 'text-[#555] hover:text-[#888]'}`}>
              All
            </button>
            {(Object.keys(STATUS_META) as MsgStatus[]).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${statusFilter === s ? 'bg-[#252525]' : 'hover:text-[#888]'}`}
                style={{ color: statusFilter === s ? STATUS_META[s].color : '#555' }}>
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
            style={{ background: channelMeta.bg, color: channelMeta.color, border: `1px solid ${channelMeta.color}33` }}
          >
            <Plus size={12} /> New {channelMeta.label}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 rounded-xl border border-[#2a2a2a] bg-[#161616] overflow-y-auto min-h-0">
        {channelMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#555] gap-2 py-16 px-6 text-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: channelMeta.bg, color: channelMeta.color }}>
              {channelMeta.icon}
            </div>
            <p className="text-sm font-medium text-[#888]">No {channelMeta.label.toLowerCase()} messages yet{funnelName ? ` for ${funnelName}` : ''}</p>
            <p className="text-xs text-[#555]">Write your first message, save it as a draft, or schedule it for later.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#202020]">
            {channelMessages.map(msg => {
              const sm = STATUS_META[msg.status] || STATUS_META.draft;
              const preview = msg.body ? msg.body.replace(/\n+/g, ' ').slice(0, 140) : '(no content yet)';
              return (
                <div
                  key={msg.id}
                  className="p-4 hover:bg-[#1a1a1a] transition-colors cursor-pointer group"
                  onClick={() => openEdit(msg)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
                          style={{ background: `${sm.color}15`, color: sm.color, border: `1px solid ${sm.color}30` }}
                        >
                          {sm.icon}
                          {sm.label}
                        </span>
                        {channel === 'email' && msg.subject && (
                          <h4 className="text-xs font-semibold text-[#ECECEC] truncate">{msg.subject}</h4>
                        )}
                        {msg.scheduled_at && msg.status !== 'sent' && (
                          <span className="text-[10px] text-[#777] flex items-center gap-1">
                            <Clock size={9} /> {formatDateTime(msg.scheduled_at)}
                          </span>
                        )}
                        {msg.sent_at && (
                          <span className="text-[10px] text-[#777] flex items-center gap-1">
                            <CheckCircle size={9} /> sent {formatDateTime(msg.sent_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#888] line-clamp-2 break-words">{preview}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {msg.status !== 'sent' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markSent(msg); }}
                          title="Mark as sent"
                          className="p-1.5 rounded-md text-[#888] hover:text-[#86efac] hover:bg-[#252525] transition-colors"
                        >
                          <CheckCircle size={12} />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); duplicate(msg); }}
                        title="Duplicate"
                        className="p-1.5 rounded-md text-[#888] hover:text-[#ECECEC] hover:bg-[#252525] transition-colors"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); remove(msg.id); }}
                        title="Delete"
                        className="p-1.5 rounded-md text-[#888] hover:text-[#fca5a5] hover:bg-[#252525] transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={close}>
          <div
            className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#ECECEC] flex items-center gap-2">
                {channelMeta.icon}
                {form.id ? `Edit ${channelMeta.label}` : `New ${channelMeta.label}`}
              </h3>
              <button onClick={close} className="text-[#666] hover:text-[#ECECEC] transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {form.channel === 'email' && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#555] mb-1.5">Subject</label>
                  <input
                    type="text"
                    value={form.subject || ''}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Email subject line"
                    className="w-full bg-[#161616] border border-[#252525] rounded-lg px-3 py-2 text-xs text-[#ECECEC] placeholder-[#444] focus:outline-none focus:border-[#86efac]/40"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#555] mb-1.5">
                  {form.channel === 'email' ? 'Body' : 'Message'}
                </label>
                <textarea
                  value={form.body || ''}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder={
                    form.channel === 'telegram'
                      ? 'Channel broadcast content…'
                      : form.channel === 'sms'
                      ? 'SMS text (keep under 160 chars per segment)…'
                      : 'Email body…'
                  }
                  rows={form.channel === 'sms' ? 3 : 8}
                  className="w-full bg-[#161616] border border-[#252525] rounded-lg px-3 py-2 text-xs text-[#ECECEC] placeholder-[#444] focus:outline-none focus:border-[#86efac]/40 resize-y font-mono leading-relaxed"
                />
                {form.channel === 'sms' && (
                  <p className="mt-1 text-[10px] text-[#555]">
                    {(form.body || '').length} chars · ~{Math.max(1, Math.ceil(((form.body || '').length || 1) / 160))} segment(s)
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#555] mb-1.5">Schedule for</label>
                  <input
                    type="datetime-local"
                    value={toLocalInput(form.scheduled_at ?? null)}
                    onChange={e => setForm(f => ({ ...f, scheduled_at: fromLocalInput(e.target.value) }))}
                    className="w-full bg-[#161616] border border-[#252525] rounded-lg px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:border-[#86efac]/40"
                  />
                  {form.scheduled_at && (
                    <button
                      onClick={() => setForm(f => ({ ...f, scheduled_at: null }))}
                      className="mt-1 text-[10px] text-[#666] hover:text-[#fca5a5] transition-colors"
                    >
                      Clear schedule
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#555] mb-1.5">Status</label>
                  <select
                    value={form.status || 'draft'}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as MsgStatus }))}
                    className="w-full bg-[#161616] border border-[#252525] rounded-lg px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:border-[#86efac]/40"
                  >
                    {(Object.keys(STATUS_META) as MsgStatus[]).map(s => (
                      <option key={s} value={s}>{STATUS_META[s].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#555] mb-1.5">Notes (internal)</label>
                <input
                  type="text"
                  value={form.notes || ''}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Private notes, audience targeting, reminders…"
                  className="w-full bg-[#161616] border border-[#252525] rounded-lg px-3 py-2 text-xs text-[#ECECEC] placeholder-[#444] focus:outline-none focus:border-[#86efac]/40"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#2a2a2a]">
              {form.id ? (
                <button
                  onClick={() => remove(form.id!)}
                  className="flex items-center gap-1.5 text-[11px] text-[#fca5a5] hover:text-[#fecaca] transition-colors"
                >
                  <Trash2 size={12} /> Delete
                </button>
              ) : <div />}
              <div className="flex items-center gap-2">
                <button
                  onClick={close}
                  className="px-3 py-1.5 rounded-lg text-[11px] text-[#888] hover:text-[#ECECEC] transition-colors">
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(134,239,172,0.12)', color: '#86efac', border: '1px solid rgba(134,239,172,0.25)' }}>
                  {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FunnelCommunications;
