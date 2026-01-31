import React, { useState, useRef } from 'react';
import { Camera, Check, X, Plus, FileText } from 'lucide-react';
import { TeamMember } from '../types';
import { TEAM_MEMBERS } from '../constants';
import useLocalStorage from '../hooks/useLocalStorage';

const DEFAULT_MEMBERS = Object.values(TEAM_MEMBERS);

interface TeamManagerProps {
  storagePrefix: string;
}

const TeamManager: React.FC<TeamManagerProps> = ({ storagePrefix }) => {
  const [members, setMembers] = useLocalStorage<TeamMember[]>(`${storagePrefix}_team`, DEFAULT_MEMBERS);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<'name' | 'role' | 'description' | null>(null);
  const [editValue, setEditValue] = useState('');

  // Photo upload ref
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  // --- Inline editing ---
  const startEditing = (id: string, field: 'name' | 'role' | 'description', value: string) => {
    setEditingId(id);
    setEditField(field);
    setEditValue(value);
  };

  const saveEdit = () => {
    if (editingId && editField) {
      setMembers(prev => prev.map(m => {
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

  // --- Photo upload ---
  const triggerPhotoUpload = (memberId: string) => {
    setUploadTargetId(memberId);
    photoInputRef.current?.click();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setMembers(prev => prev.map(m =>
        m.id === uploadTargetId ? { ...m, photoUrl: dataUrl } : m
      ));
      setUploadTargetId(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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
    setMembers(prev => [...prev, newMember]);
    setNewMemberName('');
    setNewMemberRole('');
    setIsAddingMember(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hidden file input for photo */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-white">Team Members</h2>
          <p className="text-gray-500 text-sm">Meet the squad behind Aureum Scale.</p>
        </div>
        <button
          onClick={() => setIsAddingMember(!isAddingMember)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus size={16} className={isAddingMember ? 'rotate-45 transition-transform' : ''} />
          <span>{isAddingMember ? 'Cancel' : 'Add Member'}</span>
        </button>
      </div>

      {/* Add Member Form */}
      {isAddingMember && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-gray-500 font-medium ml-1">Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddMember(); }}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-gray-500 font-medium ml-1">Role</label>
              <input
                type="text"
                placeholder="e.g. Designer"
                value={newMemberRole}
                onChange={e => setNewMemberRole(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddMember(); }}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddMember}
                className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <div key={member.id} className="group bg-gray-900 border border-gray-800 p-6 rounded-2xl hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-900/10">
            <div className="flex items-start gap-5">
              {/* Avatar / Photo */}
              <div className="relative shrink-0">
                {member.photoUrl ? (
                  <div
                    className="w-16 h-16 rounded-2xl overflow-hidden cursor-pointer ring-4 ring-gray-900 group-hover:ring-emerald-900/30 transition-all"
                    onClick={() => triggerPhotoUpload(member.id)}
                    title="Click to change photo"
                  >
                    <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div
                    className={`w-16 h-16 rounded-2xl ${member.color} flex items-center justify-center text-xl font-bold text-white shadow-lg ring-4 ring-gray-900 group-hover:scale-105 transition-transform duration-300 cursor-pointer relative`}
                    onClick={() => triggerPhotoUpload(member.id)}
                    title="Click to add photo"
                  >
                    {member.initials}
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/30 rounded-2xl transition-colors flex items-center justify-center">
                      <Camera size={16} className="text-white opacity-0 group-hover:opacity-70 transition-opacity" />
                    </div>
                  </div>
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
                      className="flex-1 bg-gray-950 border border-emerald-500/50 rounded px-2 py-1 text-sm text-white focus:outline-none font-bold"
                    />
                    <button onClick={saveEdit} className="p-0.5 text-emerald-500 hover:text-emerald-400"><Check size={14} /></button>
                    <button onClick={cancelEdit} className="p-0.5 text-gray-500 hover:text-gray-300"><X size={14} /></button>
                  </div>
                ) : (
                  <h3
                    className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors cursor-pointer truncate"
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
                      className="flex-1 bg-gray-950 border border-emerald-500/50 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                    />
                    <button onClick={saveEdit} className="p-0.5 text-emerald-500 hover:text-emerald-400"><Check size={12} /></button>
                    <button onClick={cancelEdit} className="p-0.5 text-gray-500 hover:text-gray-300"><X size={12} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className="px-2.5 py-1 rounded-md bg-gray-950 border border-gray-800 text-xs text-gray-400 font-medium uppercase tracking-wide cursor-pointer hover:border-gray-600 hover:text-gray-300 transition-colors"
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
                    className="w-full h-20 bg-gray-950 border border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
                  />
                  <div className="flex justify-end gap-1">
                    <button onClick={cancelEdit} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-300">Cancel</button>
                    <button onClick={saveEdit} className="px-2 py-1 text-xs text-emerald-500 hover:text-emerald-400 font-medium">Save</button>
                  </div>
                </div>
              ) : member.description ? (
                <p
                  className="text-xs text-gray-500 leading-relaxed cursor-pointer hover:text-gray-400 transition-colors border-t border-gray-800 pt-3"
                  onClick={() => startEditing(member.id, 'description', member.description || '')}
                  title="Click to edit description"
                >
                  {member.description}
                </p>
              ) : (
                <p
                  className="text-xs text-gray-700 italic cursor-pointer hover:text-gray-500 transition-colors border-t border-gray-800 pt-3 flex items-center gap-1.5"
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
