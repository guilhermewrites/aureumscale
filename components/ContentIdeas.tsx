import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, Trash2, Upload, Film, Calendar, Edit3 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { uploadPostThumbnail, isVideoUrl } from '../services/postMedia';

type PlatformType = 'x' | 'instagram' | 'youtube';
type StatusType = 'unscripted' | 'scripted' | 'scheduled' | 'posted';

export interface ContentIdea {
  id: string;
  user_id: string;
  platform: PlatformType;
  title: string;
  notes: string;
  thumbnail_url: string;
  status: StatusType;
  order_num: number;
}

const PLATFORM_META: Record<PlatformType, { label: string; icon: string; color: string; bg: string }> = {
  x:         { label: 'X',         icon: '𝕏',  color: '#ECECEC', bg: 'rgba(236,236,236,0.14)' },
  instagram: { label: 'Instagram', icon: '📸', color: '#fbcfe8', bg: 'rgba(251,207,232,0.14)' },
  youtube:   { label: 'YouTube',   icon: '▶️', color: '#fca5a5', bg: 'rgba(252,165,165,0.14)' },
};

const STATUS_META: Record<StatusType, { label: string; color: string }> = {
  unscripted: { label: 'Unscripted', color: '#d4d4d8' },
  scripted:   { label: 'Scripted',   color: '#bfdbfe' },
  scheduled:  { label: 'Scheduled',  color: '#fde68a' },
  posted:     { label: 'Posted',     color: '#86efac' },
};

interface Props {
  storagePrefix: string;
  onScheduleIdea: (draft: { platform: PlatformType; post_date: string; post_time: string; title: string; notes: string; status: StatusType; thumbnail_url: string }) => void;
}

const ContentIdeas: React.FC<Props> = ({ storagePrefix, onScheduleIdea }) => {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [editing, setEditing] = useState<ContentIdea | null>(null);
  const [form, setForm] = useState<Partial<ContentIdea>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<ContentIdea | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [filter, setFilter] = useState<PlatformType | 'all'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data, error } = await supabase
        .from('content_ideas')
        .select('*')
        .eq('user_id', storagePrefix)
        .order('order_num', { ascending: true })
        .order('created_at', { ascending: false });
      if (!error && data) setIdeas(data as ContentIdea[]);
    })();
  }, [storagePrefix]);

  const openNew = () => {
    setForm({
      id: '',
      platform: 'x',
      title: '',
      notes: '',
      thumbnail_url: '',
      status: 'unscripted',
    });
    setEditing({} as ContentIdea);
  };

  const openEdit = (idea: ContentIdea) => {
    setForm(idea);
    setEditing(idea);
  };

  const close = () => { setEditing(null); setForm({}); };

  const onFilePicked = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadPostThumbnail(file, storagePrefix);
      if (url) setForm(f => ({ ...f, thumbnail_url: url }));
    } finally { setUploading(false); }
  };

  const save = useCallback(async () => {
    if (!supabase || !form.platform) return;
    setSaving(true);
    try {
      const payload = {
        id: form.id || crypto.randomUUID(),
        user_id: storagePrefix,
        platform: form.platform,
        title: form.title || '',
        notes: form.notes || '',
        thumbnail_url: form.thumbnail_url || '',
        status: form.status || 'unscripted',
        order_num: form.order_num ?? 0,
        updated_at: new Date().toISOString(),
      };
      if (form.id) {
        await supabase.from('content_ideas').update(payload).eq('id', form.id).eq('user_id', storagePrefix);
        setIdeas(xs => xs.map(x => x.id === form.id ? { ...x, ...payload } as ContentIdea : x));
      } else {
        await supabase.from('content_ideas').insert(payload);
        setIdeas(xs => [payload as ContentIdea, ...xs]);
      }
      close();
    } finally { setSaving(false); }
  }, [form, storagePrefix]);

  const remove = useCallback(async () => {
    if (!supabase || !form.id) return;
    await supabase.from('content_ideas').delete().eq('id', form.id).eq('user_id', storagePrefix);
    setIdeas(xs => xs.filter(x => x.id !== form.id));
    close();
  }, [form.id, storagePrefix]);

  const openScheduleFor = (idea: ContentIdea) => {
    setScheduleTarget(idea);
    const d = new Date();
    setScheduleDate(d.toISOString().split('T')[0]);
    setScheduleTime('09:00');
  };

  const confirmSchedule = async () => {
    if (!supabase || !scheduleTarget || !scheduleDate) return;
    onScheduleIdea({
      platform: scheduleTarget.platform,
      post_date: scheduleDate,
      post_time: scheduleTime,
      title: scheduleTarget.title,
      notes: scheduleTarget.notes,
      status: 'scheduled',
      thumbnail_url: scheduleTarget.thumbnail_url,
    });
    await supabase.from('content_ideas').delete().eq('id', scheduleTarget.id).eq('user_id', storagePrefix);
    setIdeas(xs => xs.filter(x => x.id !== scheduleTarget.id));
    setScheduleTarget(null);
  };

  const filteredIdeas = ideas.filter(i => filter === 'all' || i.platform === filter);

  return (
    <div className="bg-[#1c1c1c] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#ECECEC]">Content Ideas</h2>
          <p className="text-[11px] text-[#555] mt-0.5">
            {filteredIdeas.length} {filteredIdeas.length === 1 ? 'idea' : 'ideas'} in the pipeline
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#161616] rounded-lg p-0.5 border border-[#252525]">
            <button onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === 'all' ? 'bg-[#252525] text-[#ECECEC]' : 'text-[#555] hover:text-[#888]'}`}>
              All
            </button>
            {(Object.keys(PLATFORM_META) as PlatformType[]).map(p => (
              <button key={p} onClick={() => setFilter(p)}
                className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${filter === p ? 'bg-[#252525]' : 'text-[#555] hover:text-[#888]'}`}>
                {PLATFORM_META[p].icon}
              </button>
            ))}
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
            style={{ background: 'rgba(134,239,172,0.12)', color: '#86efac', border: '1px solid rgba(134,239,172,0.25)' }}
          >
            <Plus size={12} /> New Idea
          </button>
        </div>
      </div>

      {filteredIdeas.length === 0 ? (
        <div className="py-10 text-center text-[#555] text-xs">
          No ideas yet. Click <span className="text-[#86efac]">New Idea</span> to start building your content pipeline.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredIdeas.map(idea => {
            const meta = PLATFORM_META[idea.platform];
            const statusMeta = STATUS_META[idea.status] || STATUS_META.unscripted;
            return (
              <div
                key={idea.id}
                className="rounded-xl overflow-hidden transition-all hover:translate-y-[-1px]"
                style={{
                  background: 'linear-gradient(135deg,rgba(255,255,255,0.035) 0%,rgba(255,255,255,0.01) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                <div className="relative" style={{ aspectRatio: '16/9', background: '#141414' }}>
                  {idea.thumbnail_url ? (
                    isVideoUrl(idea.thumbnail_url) ? (
                      <video src={idea.thumbnail_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    ) : (
                      <img src={idea.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#333] text-3xl">
                      {meta.icon}
                    </div>
                  )}
                  <div
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-medium backdrop-blur-sm"
                    style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33` }}
                  >
                    {meta.icon} {meta.label}
                  </div>
                  <div
                    className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-medium backdrop-blur-sm flex items-center gap-1"
                    style={{ background: 'rgba(0,0,0,0.5)', color: statusMeta.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusMeta.color }} />
                    {statusMeta.label}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-xs font-semibold text-[#ECECEC] truncate mb-1">
                    {idea.title || '(untitled idea)'}
                  </h3>
                  {idea.notes && (
                    <p className="text-[10px] text-[#666] line-clamp-2 mb-2.5">{idea.notes}</p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openScheduleFor(idea)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-medium transition-colors"
                      style={{ background: 'rgba(134,239,172,0.1)', color: '#86efac', border: '1px solid rgba(134,239,172,0.2)' }}
                    >
                      <Calendar size={10} /> Schedule
                    </button>
                    <button
                      onClick={() => openEdit(idea)}
                      className="px-2 py-1.5 rounded-md text-[#888] hover:text-[#ECECEC] hover:bg-[#252525] transition-colors"
                    >
                      <Edit3 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Idea modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={close}>
          <div
            className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#ECECEC]">{form.id ? 'Edit idea' : 'New content idea'}</h3>
              <button onClick={close} className="text-[#666] hover:text-[#ECECEC] transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#555] mb-1.5">Platform</label>
                <div className="flex gap-1.5">
                  {(Object.keys(PLATFORM_META) as PlatformType[]).map(p => {
                    const active = form.platform === p;
                    const meta = PLATFORM_META[p];
                    return (
                      <button
                        key={p}
                        onClick={() => setForm(f => ({ ...f, platform: p }))}
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: active ? meta.bg : '#161616',
                          border: `1px solid ${active ? meta.color + '55' : '#252525'}`,
                          color: active ? meta.color : '#888',
                        }}
                      >
                        <span className="mr-1">{meta.icon}</span>{meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#555] mb-1.5">Thumbnail / Media</label>
                {form.thumbnail_url ? (
                  <div className="relative rounded-lg overflow-hidden border border-[#252525]" style={{ aspectRatio: '16/9' }}>
                    {isVideoUrl(form.thumbnail_url) ? (
                      <video src={form.thumbnail_url} className="w-full h-full object-cover" controls muted playsInline preload="metadata" />
                    ) : (
                      <img src={form.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={() => setForm(f => ({ ...f, thumbnail_url: '' }))}
                      className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black/90 text-[#ECECEC] rounded-md p-1 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex flex-col items-center justify-center gap-1.5 py-5 border border-dashed border-[#2a2a2a] rounded-lg text-[#666] hover:text-[#888] hover:border-[#3a3a3a] transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <span className="text-[11px]">Uploading…</span>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-[#888]">
                          <Upload size={14} />
                          <Film size={14} />
                        </div>
                        <span className="text-[11px]">Upload image or MP4</span>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) onFilePicked(f);
                    e.target.value = '';
                  }}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#555] mb-1.5">Title / Hook</label>
                <input
                  type="text"
                  value={form.title || ''}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Headline or hook"
                  className="w-full bg-[#161616] border border-[#252525] rounded-lg px-3 py-2 text-xs text-[#ECECEC] placeholder-[#444] focus:outline-none focus:border-[#86efac]/40"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#555] mb-1.5">Notes / Script</label>
                <textarea
                  value={form.notes || ''}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Content, angle, references…"
                  rows={4}
                  className="w-full bg-[#161616] border border-[#252525] rounded-lg px-3 py-2 text-xs text-[#ECECEC] placeholder-[#444] focus:outline-none focus:border-[#86efac]/40 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#555] mb-1.5">Status</label>
                <select
                  value={form.status || 'unscripted'}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as StatusType }))}
                  className="w-full bg-[#161616] border border-[#252525] rounded-lg px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:border-[#86efac]/40"
                >
                  {(Object.keys(STATUS_META) as StatusType[]).map(s => (
                    <option key={s} value={s}>{STATUS_META[s].label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#2a2a2a]">
              {form.id ? (
                <button
                  onClick={remove}
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
                  disabled={saving || uploading}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(134,239,172,0.12)', color: '#86efac', border: '1px solid rgba(134,239,172,0.25)' }}>
                  {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create idea'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule prompt */}
      {scheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setScheduleTarget(null)}>
          <div
            className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#ECECEC]">Schedule idea</h3>
              <button onClick={() => setScheduleTarget(null)} className="text-[#666] hover:text-[#ECECEC] transition-colors">
                <X size={16} />
              </button>
            </div>
            <p className="text-[11px] text-[#666] mb-4 line-clamp-2">
              "{scheduleTarget.title || 'Untitled'}" will move from Ideas to the calendar.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#555] mb-1.5">Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  className="w-full bg-[#161616] border border-[#252525] rounded-lg px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:border-[#86efac]/40"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#555] mb-1.5">Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                  className="w-full bg-[#161616] border border-[#252525] rounded-lg px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:border-[#86efac]/40"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setScheduleTarget(null)}
                className="px-3 py-1.5 rounded-lg text-[11px] text-[#888] hover:text-[#ECECEC] transition-colors">
                Cancel
              </button>
              <button
                onClick={confirmSchedule}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                style={{ background: 'rgba(134,239,172,0.12)', color: '#86efac', border: '1px solid rgba(134,239,172,0.25)' }}>
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentIdeas;
