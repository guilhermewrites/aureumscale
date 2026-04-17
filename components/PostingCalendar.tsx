import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, ExternalLink, Upload, Film } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { uploadPostThumbnail, isVideoUrl } from '../services/postMedia';

type PlatformType = 'x' | 'instagram' | 'youtube';
type StatusType = 'unscripted' | 'scripted' | 'scheduled' | 'posted';

export interface ScheduledPost {
  id: string;
  user_id: string;
  platform: PlatformType;
  post_date: string;
  post_time: string;
  title: string;
  notes: string;
  status: StatusType;
  link: string;
  thumbnail_url: string;
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const iso = (d: Date) => d.toISOString().split('T')[0];

interface Props {
  storagePrefix: string;
  prefilledForm?: Partial<ScheduledPost> | null;
  onPrefillConsumed?: () => void;
}

const PostingCalendar: React.FC<Props> = ({ storagePrefix, prefilledForm, onPrefillConsumed }) => {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [editing, setEditing] = useState<ScheduledPost | null>(null);
  const [form, setForm] = useState<Partial<ScheduledPost>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<PlatformType | 'all'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', storagePrefix)
        .order('post_date', { ascending: true });
      if (!error && data) setPosts(data as ScheduledPost[]);
    })();
  }, [storagePrefix]);

  useEffect(() => {
    if (prefilledForm) {
      setForm(prefilledForm);
      setEditing({} as ScheduledPost);
      if (prefilledForm.post_date) {
        const d = new Date(prefilledForm.post_date + 'T00:00');
        setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
      }
      onPrefillConsumed?.();
    }
  }, [prefilledForm, onPrefillConsumed]);

  const grid = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < startWeekday; i++) {
      const d = new Date(y, m, 1 - (startWeekday - i));
      cells.push({ date: d, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(y, m, d), inMonth: true });
    while (cells.length < 42) {
      const last = cells[cells.length - 1].date;
      const n = new Date(last); n.setDate(last.getDate() + 1);
      cells.push({ date: n, inMonth: false });
    }
    return cells;
  }, [cursor]);

  const postsByDate = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    posts
      .filter(p => filter === 'all' || p.platform === filter)
      .forEach(p => {
        const arr = map.get(p.post_date) || [];
        arr.push(p);
        map.set(p.post_date, arr);
      });
    map.forEach(arr => arr.sort((a, b) => (a.post_time || '').localeCompare(b.post_time || '')));
    return map;
  }, [posts, filter]);

  const monthCount = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    return posts.filter(p => {
      const d = new Date(p.post_date + 'T00:00');
      return d.getFullYear() === y && d.getMonth() === m && (filter === 'all' || p.platform === filter);
    }).length;
  }, [posts, cursor, filter]);

  const openNew = (date: Date) => {
    setForm({
      id: '',
      platform: 'x',
      post_date: iso(date),
      post_time: '09:00',
      title: '',
      notes: '',
      status: 'unscripted',
      link: '',
      thumbnail_url: '',
    });
    setEditing({} as ScheduledPost);
  };

  const openEdit = (post: ScheduledPost) => {
    setForm(post);
    setEditing(post);
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
    if (!supabase || !form.platform || !form.post_date) return;
    setSaving(true);
    try {
      const payload = {
        id: form.id || crypto.randomUUID(),
        user_id: storagePrefix,
        platform: form.platform,
        post_date: form.post_date,
        post_time: form.post_time || '',
        title: form.title || '',
        notes: form.notes || '',
        status: form.status || 'unscripted',
        link: form.link || '',
        thumbnail_url: form.thumbnail_url || '',
        updated_at: new Date().toISOString(),
      };
      if (form.id) {
        await supabase.from('scheduled_posts').update(payload).eq('id', form.id).eq('user_id', storagePrefix);
        setPosts(ps => ps.map(p => p.id === form.id ? { ...p, ...payload } as ScheduledPost : p));
      } else {
        await supabase.from('scheduled_posts').insert(payload);
        setPosts(ps => [...ps, payload as ScheduledPost]);
      }
      close();
    } finally { setSaving(false); }
  }, [form, storagePrefix]);

  const remove = useCallback(async () => {
    if (!supabase || !form.id) return;
    await supabase.from('scheduled_posts').delete().eq('id', form.id).eq('user_id', storagePrefix);
    setPosts(ps => ps.filter(p => p.id !== form.id));
    close();
  }, [form.id, storagePrefix]);

  const shiftMonth = (delta: number) => {
    setCursor(c => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  };

  const isToday = (d: Date) => iso(d) === iso(today);

  return (
    <div className="bg-[#1c1c1c] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#ECECEC]">Posting Calendar</h2>
          <p className="text-[11px] text-[#555] mt-0.5">
            {monthCount} posts scheduled in {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
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

          <div className="flex items-center gap-1 bg-[#161616] rounded-lg p-0.5 border border-[#252525]">
            <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-md text-[#888] hover:text-[#ECECEC] hover:bg-[#252525] transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-[#888] hover:text-[#ECECEC] hover:bg-[#252525] transition-colors">
              Today
            </button>
            <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-md text-[#888] hover:text-[#ECECEC] hover:bg-[#252525] transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="text-sm font-semibold text-[#ECECEC] min-w-[140px] text-right">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0 mb-0">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-[10px] font-medium uppercase tracking-wider text-[#555] px-2 py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0">
        {grid.map(({ date, inMonth }, i) => {
          const key = iso(date);
          const dayPosts = postsByDate.get(key) || [];
          const todayCell = isToday(date);
          return (
            <div
              key={i}
              onClick={() => openNew(date)}
              className="group relative cursor-pointer transition-colors"
              style={{
                minHeight: 112,
                padding: 8,
                background: inMonth
                  ? (todayCell
                      ? 'linear-gradient(135deg,rgba(255,255,255,0.055) 0%,rgba(255,255,255,0.02) 100%)'
                      : 'linear-gradient(135deg,rgba(255,255,255,0.022) 0%,rgba(255,255,255,0.008) 100%)')
                  : 'transparent',
                border: '1px solid rgba(255,255,255,0.06)',
                outline: todayCell ? '1px solid rgba(134,239,172,0.4)' : 'none',
                outlineOffset: -1,
                opacity: inMonth ? 1 : 0.35,
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[11px] font-semibold ${todayCell ? 'text-[#86efac]' : inMonth ? 'text-[#ECECEC]' : 'text-[#444]'}`}>
                  {date.getDate()}
                </span>
                <Plus size={11} className="text-[#444] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="space-y-1">
                {dayPosts.map(post => {
                  const meta = PLATFORM_META[post.platform];
                  const statusMeta = STATUS_META[post.status] || STATUS_META.unscripted;
                  return (
                    <button
                      key={post.id}
                      onClick={(e) => { e.stopPropagation(); openEdit(post); }}
                      className="w-full text-left px-1.5 py-1 transition-transform hover:translate-x-0.5 flex items-center gap-1.5"
                      style={{
                        background: meta.bg,
                        borderLeft: `2px solid ${meta.color}`,
                      }}
                    >
                      {post.thumbnail_url ? (
                        isVideoUrl(post.thumbnail_url) ? (
                          <video
                            src={post.thumbnail_url}
                            className="w-5 h-5 object-cover flex-shrink-0"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <img src={post.thumbnail_url} alt="" className="w-5 h-5 object-cover flex-shrink-0" />
                        )
                      ) : (
                        <span className="flex-shrink-0 text-[10px]">{meta.icon}</span>
                      )}
                      <div className="flex-1 min-w-0 flex items-center gap-1 text-[10px]" style={{ color: meta.color }}>
                        {post.post_time && <span className="opacity-80 flex-shrink-0">{post.post_time}</span>}
                        <span className="truncate opacity-90">{post.title || '(untitled)'}</span>
                      </div>
                      <span
                        className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                        style={{ background: statusMeta.color }}
                        title={statusMeta.label}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div className="mt-4 flex items-center gap-4 text-[10px] text-[#666] flex-wrap">
        <span className="uppercase tracking-wider text-[#444]">Status</span>
        {(Object.keys(STATUS_META) as StatusType[]).map(s => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_META[s].color }} />
            {STATUS_META[s].label}
          </span>
        ))}
      </div>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={close}>
          <div
            className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#ECECEC]">
                {form.id ? 'Edit post' : 'Schedule new post'}
              </h3>
              <button onClick={close} className="text-[#666] hover:text-[#ECECEC] transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Platform */}
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

              {/* Thumbnail */}
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

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#555] mb-1.5">Date</label>
                  <input
                    type="date"
                    value={form.post_date || ''}
                    onChange={e => setForm(f => ({ ...f, post_date: e.target.value }))}
                    className="w-full bg-[#161616] border border-[#252525] rounded-lg px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:border-[#86efac]/40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#555] mb-1.5">Time</label>
                  <input
                    type="time"
                    value={form.post_time || ''}
                    onChange={e => setForm(f => ({ ...f, post_time: e.target.value }))}
                    className="w-full bg-[#161616] border border-[#252525] rounded-lg px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:border-[#86efac]/40"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#555] mb-1.5">Title / Hook</label>
                <input
                  type="text"
                  value={form.title || ''}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Post headline or hook"
                  className="w-full bg-[#161616] border border-[#252525] rounded-lg px-3 py-2 text-xs text-[#ECECEC] placeholder-[#444] focus:outline-none focus:border-[#86efac]/40"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#555] mb-1.5">Notes / Script</label>
                <textarea
                  value={form.notes || ''}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Content, angle, references…"
                  rows={3}
                  className="w-full bg-[#161616] border border-[#252525] rounded-lg px-3 py-2 text-xs text-[#ECECEC] placeholder-[#444] focus:outline-none focus:border-[#86efac]/40 resize-none"
                />
              </div>

              {/* Status + Link */}
              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#555] mb-1.5">Link</label>
                  <input
                    type="url"
                    value={form.link || ''}
                    onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                    placeholder="https://…"
                    className="w-full bg-[#161616] border border-[#252525] rounded-lg px-3 py-2 text-xs text-[#ECECEC] placeholder-[#444] focus:outline-none focus:border-[#86efac]/40"
                  />
                </div>
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
                {form.link && (
                  <a href={form.link} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-[#888] hover:text-[#ECECEC] transition-colors">
                    <ExternalLink size={11} /> Open
                  </a>
                )}
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
                  {saving ? 'Saving…' : form.id ? 'Save changes' : 'Schedule post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostingCalendar;
