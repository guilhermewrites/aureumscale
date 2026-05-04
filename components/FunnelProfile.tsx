import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  IdCard, Plus, Trash2, ExternalLink, Check, Loader2, Camera,
  Target, Users as UsersIcon, Compass, Trophy, Link as LinkIcon,
  StickyNote, BookOpen, Calendar, X,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileStatus = 'active' | 'onboarding' | 'paused' | 'archived';

interface ProfileLink {
  id: string;
  label: string;
  url: string;
}

export interface FunnelProfileData {
  user_id: string;
  funnel_id: string;
  display_name: string;
  tagline: string;
  status: ProfileStatus;
  start_date: string | null;
  overview: string;
  main_offer: string;
  target_audience: string;
  north_star_metric: string;
  current_focus: string;
  team_member_ids: string[];
  links: ProfileLink[];
  notes: string;
  photo_url: string | null;
}

interface TeamMemberRow {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  photoUrl?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { id: ProfileStatus; label: string; color: string; bg: string }[] = [
  { id: 'active',     label: 'Active',     color: '#6dd49a', bg: 'rgba(134,239,172,0.12)' },
  { id: 'onboarding', label: 'Onboarding', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  { id: 'paused',     label: 'Paused',     color: '#fde68a', bg: 'rgba(253,230,138,0.12)' },
  { id: 'archived',   label: 'Archived',   color: '#a1a1aa', bg: 'rgba(161,161,170,0.12)' },
];

const SAVE_DEBOUNCE_MS = 500;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const buildEmptyProfile = (
  userId: string,
  funnelId: string,
  funnelName: string,
): FunnelProfileData => ({
  user_id: userId,
  funnel_id: funnelId,
  display_name: funnelName,
  tagline: '',
  status: 'active',
  start_date: new Date().toISOString().slice(0, 10),
  overview: '',
  main_offer: '',
  target_audience: '',
  north_star_metric: '',
  current_focus: '',
  team_member_ids: [],
  links: [],
  notes: '',
  photo_url: null,
});

const formatDate = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  funnelId: string;
  funnelName: string;
  storagePrefix: string;
}

const FunnelProfile: React.FC<Props> = ({ funnelId, funnelName, storagePrefix }) => {
  const [profile, setProfile] = useState<FunnelProfileData>(() =>
    buildEmptyProfile(storagePrefix, funnelId, funnelName),
  );
  const [team, setTeam] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'offline'>('idle');
  const [setupHint, setSetupHint] = useState<string | null>(null);

  const localKey = `${storagePrefix}_funnel_profile_${funnelId}`;
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedRef = useRef<string>('');

  // ── Load on mount ─────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // 1. Always read localStorage first as instant cache.
      try {
        const cached = window.localStorage.getItem(localKey);
        if (cached) {
          const parsed = JSON.parse(cached) as FunnelProfileData;
          if (!cancelled) setProfile(parsed);
        }
      } catch { /* ignore */ }

      // 2. Try Supabase.
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('funnel_profiles')
            .select('*')
            .eq('user_id', storagePrefix)
            .eq('funnel_id', funnelId)
            .maybeSingle();

          if (!cancelled) {
            if (error) {
              const msg = (error.message || '').toLowerCase();
              if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('schema cache')) {
                setSetupHint('Run supabase_funnel_profiles.sql in Supabase to sync this across devices. Saving locally for now.');
                setSaveStatus('offline');
              } else {
                console.warn('FunnelProfile load error:', error);
              }
            } else if (data) {
              const merged: FunnelProfileData = {
                ...buildEmptyProfile(storagePrefix, funnelId, funnelName),
                ...data,
                team_member_ids: data.team_member_ids ?? [],
                links: Array.isArray(data.links) ? data.links : [],
              };
              setProfile(merged);
              lastSavedRef.current = JSON.stringify(merged);
            }
          }
        } catch (err) {
          console.warn('FunnelProfile load exception:', err);
        }
      }

      // 3. Load team list (used by the team selector).
      if (supabase) {
        try {
          const { data: teamData } = await supabase
            .from('team_members')
            .select('id,name,role,initials,color,photo_url')
            .eq('user_id', storagePrefix)
            .order('order_num', { ascending: true });
          if (!cancelled && teamData) {
            setTeam(
              teamData.map((row: any) => ({
                id: row.id,
                name: row.name,
                role: row.role,
                initials: row.initials,
                color: row.color,
                photoUrl: row.photo_url ?? undefined,
              })),
            );
          }
        } catch { /* ignore */ }
      }

      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnelId, storagePrefix]);

  // ── Persist (debounced) ───────────────────────────────────────────────────

  const persist = useCallback((next: FunnelProfileData) => {
    // Local cache always.
    try { window.localStorage.setItem(localKey, JSON.stringify(next)); } catch { /* ignore */ }

    if (!supabase) {
      setSaveStatus('offline');
      return;
    }

    setSaveStatus('saving');
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        const payload = {
          user_id: next.user_id,
          funnel_id: next.funnel_id,
          display_name: next.display_name || null,
          tagline: next.tagline || null,
          status: next.status,
          start_date: next.start_date || null,
          overview: next.overview || null,
          main_offer: next.main_offer || null,
          target_audience: next.target_audience || null,
          north_star_metric: next.north_star_metric || null,
          current_focus: next.current_focus || null,
          team_member_ids: next.team_member_ids ?? [],
          links: next.links ?? [],
          notes: next.notes || null,
          photo_url: next.photo_url,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from('funnel_profiles')
          .upsert(payload, { onConflict: 'user_id,funnel_id' });
        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('schema cache')) {
            setSetupHint('Run supabase_funnel_profiles.sql in Supabase to sync this across devices. Saving locally for now.');
            setSaveStatus('offline');
          } else {
            console.warn('FunnelProfile save error:', error);
            setSaveStatus('offline');
          }
        } else {
          lastSavedRef.current = JSON.stringify(next);
          setSaveStatus('saved');
          window.setTimeout(() => {
            setSaveStatus(prev => (prev === 'saved' ? 'idle' : prev));
          }, 1200);
        }
      } catch (err) {
        console.warn('FunnelProfile save exception:', err);
        setSaveStatus('offline');
      }
    }, SAVE_DEBOUNCE_MS);
  }, [localKey]);

  // ── Field updaters ────────────────────────────────────────────────────────

  const updateField = <K extends keyof FunnelProfileData>(key: K, value: FunnelProfileData[K]) => {
    setProfile(prev => {
      const next = { ...prev, [key]: value };
      persist(next);
      return next;
    });
  };

  const toggleTeamMember = (id: string) => {
    setProfile(prev => {
      const isSelected = prev.team_member_ids.includes(id);
      const next = {
        ...prev,
        team_member_ids: isSelected
          ? prev.team_member_ids.filter(x => x !== id)
          : [...prev.team_member_ids, id],
      };
      persist(next);
      return next;
    });
  };

  const addLink = () => {
    setProfile(prev => {
      const next = {
        ...prev,
        links: [...prev.links, { id: newId(), label: '', url: '' }],
      };
      persist(next);
      return next;
    });
  };

  const updateLink = (id: string, patch: Partial<ProfileLink>) => {
    setProfile(prev => {
      const next = {
        ...prev,
        links: prev.links.map(l => (l.id === id ? { ...l, ...patch } : l)),
      };
      persist(next);
      return next;
    });
  };

  const removeLink = (id: string) => {
    setProfile(prev => {
      const next = { ...prev, links: prev.links.filter(l => l.id !== id) };
      persist(next);
      return next;
    });
  };

  // ── Photo upload ──────────────────────────────────────────────────────────

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!supabase) {
      // Fallback: store as data URL locally.
      const reader = new FileReader();
      reader.onload = () => updateField('photo_url', reader.result as string);
      reader.readAsDataURL(file);
      return;
    }
    setUploadingPhoto(true);
    try {
      const path = `funnel-profiles/${storagePrefix}/${funnelId}/${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, '_')}`;
      // Make sure bucket exists (mirrors the project pattern).
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const exists = buckets?.some(b => b.name === 'funnel-media');
        if (!exists) await supabase.storage.createBucket('funnel-media', { public: true });
      } catch { /* ignore — bucket may already exist */ }

      const { error: upErr } = await supabase.storage
        .from('funnel-media')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        console.warn('Photo upload error:', upErr);
        // Local fallback
        const reader = new FileReader();
        reader.onload = () => updateField('photo_url', reader.result as string);
        reader.readAsDataURL(file);
      } else {
        const { data } = supabase.storage.from('funnel-media').getPublicUrl(path);
        if (data?.publicUrl) updateField('photo_url', data.publicUrl);
      }
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const statusMeta = useMemo(
    () => STATUS_OPTIONS.find(s => s.id === profile.status) ?? STATUS_OPTIONS[0],
    [profile.status],
  );

  const selectedTeam = useMemo(
    () => team.filter(m => profile.team_member_ids.includes(m.id)),
    [team, profile.team_member_ids],
  );

  const initials = (profile.display_name || funnelName).split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center text-[#5a5a5a]">
        <Loader2 className="animate-spin" size={18} />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pr-1">
      <div className="max-w-5xl mx-auto pb-12">
        {/* Save indicator */}
        <div className="flex items-center justify-end mb-2 h-5">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-[10px] text-[#5a5a5a]">
              <Loader2 size={10} className="animate-spin" /> Saving…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-[10px] text-[#6dd49a]">
              <Check size={10} /> Saved
            </span>
          )}
          {saveStatus === 'offline' && (
            <span className="text-[10px] text-[#fbbf24]">Saved locally</span>
          )}
        </div>

        {setupHint && (
          <div className="mb-3 text-[11px] text-[#fbbf24] bg-[rgba(251,191,36,0.08)] border border-[rgba(251,191,36,0.2)] rounded-none-none px-3 py-2">
            {setupHint}
          </div>
        )}

        {/* Hero card ───────────────────────────────────────────── */}
        <div className="bg-[#141414] border border-[#1a1a1a] rounded-none-none p-5 mb-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative w-16 h-16 rounded-none-none overflow-hidden border border-[#1a1a1a] bg-[#1a1a1a] flex items-center justify-center"
                title="Change photo"
              >
                {profile.photo_url ? (
                  <img src={profile.photo_url} alt={profile.display_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#f4f4f4] text-base font-semibold">{initials}</span>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploadingPhoto ? (
                    <Loader2 size={14} className="text-white animate-spin" />
                  ) : (
                    <Camera size={14} className="text-white" />
                  )}
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>

            {/* Name + tagline + status */}
            <div className="flex-1 min-w-0">
              <input
                value={profile.display_name}
                onChange={e => updateField('display_name', e.target.value)}
                placeholder="Client name"
                className="w-full bg-transparent text-[#f4f4f4] text-lg font-semibold outline-none placeholder:text-[#3a3a3a]"
              />
              <input
                value={profile.tagline}
                onChange={e => updateField('tagline', e.target.value)}
                placeholder="One-line description (e.g. 'Live webinar funnel selling AIF Toolkit at $97')"
                className="w-full bg-transparent text-[#999] text-xs outline-none mt-1 placeholder:text-[#3a3a3a]"
              />

              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {/* Status */}
                <div className="relative">
                  <select
                    value={profile.status}
                    onChange={e => updateField('status', e.target.value as ProfileStatus)}
                    className="appearance-none cursor-pointer text-[10px] font-medium px-2.5 py-1 rounded-none-full border outline-none pr-6"
                    style={{
                      color: statusMeta.color,
                      backgroundColor: statusMeta.bg,
                      borderColor: statusMeta.bg,
                    }}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.id} value={s.id} style={{ background: '#1a1a1a', color: '#f4f4f4' }}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <span
                    className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px]"
                    style={{ color: statusMeta.color }}
                  >▼</span>
                </div>

                {/* Start date */}
                <label className="flex items-center gap-1.5 text-[10px] text-[#5a5a5a] cursor-pointer">
                  <Calendar size={11} />
                  <span>Started</span>
                  <input
                    type="date"
                    value={profile.start_date ?? ''}
                    onChange={e => updateField('start_date', e.target.value || null)}
                    className="bg-transparent text-[#f4f4f4] outline-none text-[10px]"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Snapshot grid ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <SnapshotField
            icon={<Target size={12} />}
            label="Main offer"
            placeholder="What's being sold? (e.g. AIF Toolkit at $97)"
            value={profile.main_offer}
            onChange={v => updateField('main_offer', v)}
          />
          <SnapshotField
            icon={<UsersIcon size={12} />}
            label="Target audience"
            placeholder="Who is this for? (e.g. men 25-45 looking for online income)"
            value={profile.target_audience}
            onChange={v => updateField('target_audience', v)}
          />
          <SnapshotField
            icon={<Trophy size={12} />}
            label="North-star metric"
            placeholder="The one number you watch (e.g. cost per webinar registrant)"
            value={profile.north_star_metric}
            onChange={v => updateField('north_star_metric', v)}
          />
          <SnapshotField
            icon={<Compass size={12} />}
            label="Current focus"
            placeholder="What you're working on right now"
            value={profile.current_focus}
            onChange={v => updateField('current_focus', v)}
          />
        </div>

        {/* Project overview ────────────────────────────────────── */}
        <Section icon={<BookOpen size={12} />} title="Project overview" hint="The bigger picture — strategy, goals, history">
          <textarea
            value={profile.overview}
            onChange={e => updateField('overview', e.target.value)}
            placeholder={`Why does ${profile.display_name || 'this project'} exist? What does success look like? What's the strategy?`}
            className="w-full min-h-[120px] bg-[#0e0e0e] border border-[#1a1a1a] rounded-none-none px-3 py-2.5 text-[#f4f4f4] text-xs leading-relaxed outline-none focus:border-[#242424] resize-y placeholder:text-[#3a3a3a]"
          />
        </Section>

        {/* Team ───────────────────────────────────────────────── */}
        <Section
          icon={<UsersIcon size={12} />}
          title="Team on this project"
          hint={team.length === 0 ? 'Add people in the Team section first to assign them here' : 'Tap to assign / remove'}
        >
          {team.length === 0 ? (
            <div className="text-[11px] text-[#5a5a5a] italic px-1 py-2">
              No team members yet — head to the Team page to add people.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedTeam.length === 0 ? (
                  <span className="text-[11px] text-[#5a5a5a] italic px-1">Nobody assigned yet.</span>
                ) : (
                  selectedTeam.map(m => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 bg-[#1a1a1a] border border-[#1a1a1a] rounded-none-full pl-1 pr-2.5 py-1"
                    >
                      <Avatar member={m} size={20} />
                      <div className="leading-tight">
                        <div className="text-[11px] text-[#f4f4f4] font-medium">{m.name}</div>
                        <div className="text-[9px] text-[#5a5a5a]">{m.role}</div>
                      </div>
                      <button
                        onClick={() => toggleTeamMember(m.id)}
                        className="ml-1 text-[#5a5a5a] hover:text-[#d46d6d]"
                        title="Remove"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="text-[10px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">All team</div>
              <div className="flex flex-wrap gap-1.5">
                {team.map(m => {
                  const selected = profile.team_member_ids.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleTeamMember(m.id)}
                      className={`flex items-center gap-1.5 rounded-none-full pl-0.5 pr-2 py-0.5 text-[10px] border transition-colors ${
                        selected
                          ? 'bg-[#1a1a1a] border-[#242424] text-[#f4f4f4]'
                          : 'bg-transparent border-[#1a1a1a] text-[#5a5a5a] hover:text-[#999] hover:border-[#242424]'
                      }`}
                      title={selected ? 'Remove from project' : 'Add to project'}
                    >
                      <Avatar member={m} size={16} />
                      <span>{m.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Section>

        {/* Important links ─────────────────────────────────────── */}
        <Section
          icon={<LinkIcon size={12} />}
          title="Important links"
          hint="Drive folders, dashboards, ad accounts, anything you re-open often"
          actions={
            <button
              onClick={addLink}
              className="flex items-center gap-1 px-2 py-1 rounded-none-none text-[10px] text-[#999] hover:text-[#f4f4f4] bg-[#1a1a1a] hover:bg-[#222] border border-[#1a1a1a]"
            >
              <Plus size={10} /> Add link
            </button>
          }
        >
          {profile.links.length === 0 ? (
            <div className="text-[11px] text-[#5a5a5a] italic px-1 py-2">No links yet.</div>
          ) : (
            <div className="space-y-1.5">
              {profile.links.map(link => (
                <div key={link.id} className="flex items-center gap-2 bg-[#0e0e0e] border border-[#1a1a1a] rounded-none-none px-2 py-1.5">
                  <input
                    value={link.label}
                    onChange={e => updateLink(link.id, { label: e.target.value })}
                    placeholder="Label (e.g. Drive folder)"
                    className="w-40 flex-shrink-0 bg-transparent text-[#f4f4f4] text-[11px] outline-none placeholder:text-[#3a3a3a]"
                  />
                  <input
                    value={link.url}
                    onChange={e => updateLink(link.id, { url: e.target.value })}
                    placeholder="https://…"
                    className="flex-1 min-w-0 bg-transparent text-[#999] text-[11px] outline-none placeholder:text-[#3a3a3a]"
                  />
                  {link.url && (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5a5a5a] hover:text-[#f4f4f4]"
                      title="Open"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    onClick={() => removeLink(link.id)}
                    className="text-[#5a5a5a] hover:text-[#d46d6d]"
                    title="Remove"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Notes ──────────────────────────────────────────────── */}
        <Section icon={<StickyNote size={12} />} title="Notes" hint="Quiet thoughts, decisions, context, reminders">
          <textarea
            value={profile.notes}
            onChange={e => updateField('notes', e.target.value)}
            placeholder="Anything worth remembering — meetings, blockers, decisions, ideas…"
            className="w-full min-h-[100px] bg-[#0e0e0e] border border-[#1a1a1a] rounded-none-none px-3 py-2.5 text-[#f4f4f4] text-xs leading-relaxed outline-none focus:border-[#242424] resize-y placeholder:text-[#3a3a3a]"
          />
        </Section>

        {profile.start_date && (
          <div className="text-[10px] text-[#3a3a3a] text-center mt-4">
            Started {formatDate(profile.start_date)}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  hint?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, title, hint, actions, children }) => (
  <div className="bg-[#141414] border border-[#1a1a1a] rounded-none-none p-4 mb-3">
    <div className="flex items-center justify-between mb-2.5">
      <div className="flex items-center gap-2 text-[#999]">
        {icon}
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#f4f4f4]">{title}</h3>
        {hint && <span className="text-[10px] text-[#5a5a5a] font-normal normal-case tracking-normal">— {hint}</span>}
      </div>
      {actions}
    </div>
    {children}
  </div>
);

const SnapshotField: React.FC<{
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ icon, label, placeholder, value, onChange }) => (
  <div className="bg-[#141414] border border-[#1a1a1a] rounded-none-none p-3.5">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#5a5a5a] mb-1.5">
      {icon}
      <span>{label}</span>
    </div>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent text-[#f4f4f4] text-xs outline-none placeholder:text-[#3a3a3a]"
    />
  </div>
);

const Avatar: React.FC<{ member: TeamMemberRow; size: number }> = ({ member, size }) => {
  if (member.photoUrl) {
    return (
      <img
        src={member.photoUrl}
        alt={member.name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`${member.color} rounded-none-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
      style={{ width: size, height: size, fontSize: Math.max(8, size * 0.42) }}
    >
      {member.initials}
    </div>
  );
};

export default FunnelProfile;
