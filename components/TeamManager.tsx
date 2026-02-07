import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Check, X, Plus, FileText, Trash2 } from 'lucide-react';
import { TeamMember } from '../types';
import { TEAM_MEMBERS } from '../constants';
import { supabase } from '../services/supabaseClient';

const DEFAULT_MEMBERS = Object.values(TEAM_MEMBERS);

const TEAM_STORAGE_KEY = (prefix: string) => `${prefix}_team`;

interface TeamManagerProps {
  storagePrefix: string;
}

const TeamManager: React.FC<TeamManagerProps> = ({ storagePrefix }) => {
  const [members, setMembers] = useState<TeamMember[]>(DEFAULT_MEMBERS);
  const [loading, setLoading] = useState(true);
  const hasLoadedFromSupabase = useRef(false);

  const syncToLocalStorage = useCallback((list: TeamMember[]) => {
    try {
      localStorage.setItem(TEAM_STORAGE_KEY(storagePrefix), JSON.stringify(list));
    } catch (e) {
      console.warn('Could not sync team to localStorage', e);
    }
  }, [storagePrefix]);

  const persistToSupabase = useCallback(async (list: TeamMember[]) => {
    if (!supabase) return;
    try {
      await supabase.from('team_members').delete().eq('user_id', storagePrefix);
      if (list.length > 0) {
        const rows = list.map((m, i) => ({
          id: m.id,
          user_id: storagePrefix,
          name: m.name,
          role: m.role,
          description: m.description ?? null,
          initials: m.initials,
          color: m.color,
          photo_url: m.photoUrl ?? null,
          order_num: i,
        }));
        await supabase.from('team_members').insert(rows);
      }
    } catch (err) {
      console.error('Supabase team save error:', err);
    }
  }, [storagePrefix]);

  useEffect(() => {
    if (hasLoadedFromSupabase.current) {
      setLoading(false);
      return;
    }
    if (!supabase) {
      syncToLocalStorage(DEFAULT_MEMBERS);
      setLoading(false);
      hasLoadedFromSupabase.current = true;
      return;
    }
    hasLoadedFromSupabase.current = true;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('*')
          .eq('user_id', storagePrefix)
          .order('order_num', { ascending: true });

        if (error) {
          console.error('Failed to load team from Supabase:', error);
          syncToLocalStorage(DEFAULT_MEMBERS);
          setMembers(DEFAULT_MEMBERS);
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          const list: TeamMember[] = data.map((row: any) => ({
            id: row.id,
            name: row.name,
            role: row.role,
            description: row.description ?? undefined,
            initials: row.initials,
            color: row.color,
            photoUrl: row.photo_url ?? undefined,
          }));
          setMembers(list);
          syncToLocalStorage(list);
        } else {
          setMembers(DEFAULT_MEMBERS);
          syncToLocalStorage(DEFAULT_MEMBERS);
          await persistToSupabase(DEFAULT_MEMBERS);
        }
      } catch (err) {
        console.error('Team load error:', err);
        setMembers(DEFAULT_MEMBERS);
        syncToLocalStorage(DEFAULT_MEMBERS);
      }
      setLoading(false);
    };
    load();
  }, [storagePrefix, syncToLocalStorage, persistToSupabase]);

  const setMembersAndPersist = useCallback((next: TeamMember[] | ((prev: TeamMember[]) => TeamMember[])) => {
    setMembers(prev => {
      const list = typeof next === 'function' ? next(prev) : next;
      syncToLocalStorage(list);
      persistToSupabase(list);
      return list;
    });
  }, [syncToLocalStorage, persistToSupabase]);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<'name' | 'role' | 'description' | null>(null);
  const [editValue, setEditValue] = useState('');

  // Photo upload

  // --- Inline editing ---
  const startEditing = (id: string, field: 'name' | 'role' | 'description', value: string) => {
    setEditingId(id);
    setEditField(field);
    setEditValue(value);
  };

  const saveEdit = () => {
    if (editingId && editField) {
      setMembersAndPersist(prev => prev.map(m => {
        if (m.id === editingId) {
          const updated = { ...m, [editField]: editValue };
          // Update initials if name changes
          if (editField === 'name' && editValue.trim()) {
            const parts = editValue.trim().split(/\s+/);
            updated.initials = parts.length >= 2
              ? (parts[0][0] + parts[1][0]).toUpperCase()
              : editValue.trim().slice(0, 2).toUpperCase();
          }
          return updated;
        }
        return m;
      }));
    }
    setEditingId(null);
    setEditField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditField(null);
    setEditValue('');
  };

  // --- Photo upload (with compression to avoid localStorage limit) ---
  const compressImage = (file: File, maxSize: number = 150): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        // Scale down to maxSize x maxSize
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        // Convert to JPEG at 70% quality for small file size
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = url;
    });
  };

  const triggerPhotoUpload = (memberId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        // Compress to 150x150 JPEG to save localStorage space
        const compressedDataUrl = await compressImage(file, 150);
        setMembersAndPersist(prev => prev.map(m =>
          m.id === memberId ? { ...m, photoUrl: compressedDataUrl } : m
        ));
      } catch (err) {
        console.error('Photo upload error:', err);
      }
    };
    input.click();
  };

  // --- Delete member ---
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteMember = (id: string) => {
    setMembersAndPersist(prev => prev.filter(m => m.id !== id));
    setConfirmDeleteId(null);
  };

  // --- Add member ---
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');

  const COLORS = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500'];

  const handleAddMember = () => {
    if (!newMemberName.trim() || !newMemberRole.trim()) return;
    const parts = newMemberName.trim().split(/\s+/);
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : newMemberName.trim().slice(0, 2).toUpperCase();

    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: newMemberName.trim(),
      role: newMemberRole.trim(),
      description: '',
      initials,
      color: COLORS[members.length % COLORS.length],
    };
    setMembersAndPersist(prev => [...prev, newMember]);
    setNewMemberName('');
    setNewMemberRole('');
    setIsAddingMember(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[#9B9B9B] text-sm">
        Loading team…
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Photo upload is handled via dynamic input creation */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-[#ECECEC]">Team Members</h2>
          <p className="text-[#9B9B9B] text-sm">Meet the squad behind Aureum Scale.</p>
        </div>
        <button
          onClick={() => setIsAddingMember(!isAddingMember)}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-lg text-sm font-semibold transition-none"
        >
          <Plus size={16} className={isAddingMember ? 'rotate-45' : ''} />
          <span>{isAddingMember ? 'Cancel' : 'Add Member'}</span>
        </button>
      </div>

      {/* Add Member Form */}
      {isAddingMember && (
        <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl p-6 animate-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-[#9B9B9B] font-medium ml-1">Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddMember(); }}
                className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555] placeholder-[#666666]"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-[#9B9B9B] font-medium ml-1">Role</label>
              <input
                type="text"
                placeholder="e.g. Designer"
                value={newMemberRole}
                onChange={e => setNewMemberRole(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddMember(); }}
                className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555] placeholder-[#666666]"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddMember}
                className="bg-white hover:bg-[#e5e5e5] text-[#212121] px-6 py-2 rounded-lg text-sm font-bold transition-none"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <div key={member.id} className="group relative bg-[#2f2f2f] border border-[#3a3a3a] p-6 rounded-xl hover:border-[#4a4a4a] transition-none">
            {/* Delete button */}
            {confirmDeleteId === member.id ? (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#212121] border border-red-500/30 rounded-lg px-2.5 py-1.5 z-10">
                <span className="text-xs text-[#9B9B9B]">Delete?</span>
                <button
                  onClick={() => handleDeleteMember(member.id)}
                  className="text-red-400 hover:text-red-300 text-xs font-medium"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-[#9B9B9B] hover:text-[#ECECEC] text-xs font-medium"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteId(member.id)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-[#666666] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-none"
                title="Remove member"
              >
                <Trash2 size={14} />
              </button>
            )}

            <div className="flex items-start gap-5">
              {/* Avatar / Photo */}
              <div className="relative shrink-0">
                {member.photoUrl ? (
                  <button
                    type="button"
                    className="w-16 h-16 rounded-xl overflow-hidden cursor-pointer ring-4 ring-[#2f2f2f]"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); triggerPhotoUpload(member.id); }}
                    title="Click to change photo"
                  >
                    <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`w-16 h-16 rounded-xl ${member.color} flex items-center justify-center text-xl font-bold text-white ring-4 ring-[#2f2f2f] cursor-pointer relative`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); triggerPhotoUpload(member.id); }}
                    title="Click to add photo"
                  >
                    {member.initials}
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/30 rounded-xl flex items-center justify-center pointer-events-none">
                      <Camera size={16} className="text-white opacity-0 group-hover:opacity-70" />
                    </div>
                  </button>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Editable Name */}
                {editingId === member.id && editField === 'name' ? (
                  <div className="flex items-center gap-1 mb-1">
                    <input
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                      autoFocus
                      className="flex-1 bg-[#212121] border border-[#4a4a4a] rounded px-2 py-1 text-sm text-[#ECECEC] focus:outline-none font-bold"
                    />
                    <button onClick={saveEdit} className="p-0.5 text-[#ECECEC] hover:text-white"><Check size={14} /></button>
                    <button onClick={cancelEdit} className="p-0.5 text-[#9B9B9B] hover:text-[#ECECEC]"><X size={14} /></button>
                  </div>
                ) : (
                  <h3
                    className="text-lg font-bold text-[#ECECEC] cursor-pointer truncate"
                    onClick={() => startEditing(member.id, 'name', member.name)}
                    title="Click to edit name"
                  >
                    {member.name}
                  </h3>
                )}

                {/* Editable Role */}
                {editingId === member.id && editField === 'role' ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                      autoFocus
                      className="flex-1 bg-[#212121] border border-[#4a4a4a] rounded px-2 py-0.5 text-xs text-[#ECECEC] focus:outline-none"
                    />
                    <button onClick={saveEdit} className="p-0.5 text-[#ECECEC] hover:text-white"><Check size={12} /></button>
                    <button onClick={cancelEdit} className="p-0.5 text-[#9B9B9B] hover:text-[#ECECEC]"><X size={12} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className="px-2.5 py-1 rounded-md bg-[#212121] border border-[#3a3a3a] text-xs text-[#9B9B9B] font-medium uppercase tracking-wide cursor-pointer hover:border-[#4a4a4a] hover:text-[#ECECEC] transition-none"
                      onClick={() => startEditing(member.id, 'role', member.role)}
                      title="Click to edit role"
                    >
                      {member.role}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Editable Description */}
            <div className="mt-4">
              {editingId === member.id && editField === 'description' ? (
                <div className="space-y-1">
                  <textarea
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
                    autoFocus
                    placeholder="Describe responsibilities, skills, focus areas..."
                    className="w-full h-20 bg-[#212121] border border-[#4a4a4a] rounded-lg px-3 py-2 text-xs text-[#ECECEC] focus:outline-none resize-none placeholder-[#666666]"
                  />
                  <div className="flex justify-end gap-1">
                    <button onClick={cancelEdit} className="px-2 py-1 text-xs text-[#9B9B9B] hover:text-[#ECECEC]">Cancel</button>
                    <button onClick={saveEdit} className="px-2 py-1 text-xs text-[#ECECEC] hover:text-white font-medium">Save</button>
                  </div>
                </div>
              ) : member.description ? (
                <p
                  className="text-xs text-[#9B9B9B] leading-relaxed cursor-pointer hover:text-[#b4b4b4] transition-none border-t border-[#3a3a3a] pt-3"
                  onClick={() => startEditing(member.id, 'description', member.description || '')}
                  title="Click to edit description"
                >
                  {member.description}
                </p>
              ) : (
                <p
                  className="text-xs text-[#666666] italic cursor-pointer hover:text-[#9B9B9B] transition-none border-t border-[#3a3a3a] pt-3 flex items-center gap-1.5"
                  onClick={() => startEditing(member.id, 'description', '')}
                  title="Click to add description"
                >
                  <FileText size={12} /> Add role description...
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamManager;
