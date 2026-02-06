import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Folder, User, Check, Trash2, FileText, Image, ExternalLink } from 'lucide-react';
import { ContentItem, ContentStatus, Platform, TeamMember, VideoStyle } from '../types';
import { TEAM_MEMBERS } from '../constants';

const getMemberIdentity = (member: Pick<TeamMember, 'id' | 'name'>): string =>
  `${String(member.id).trim()}::${member.name.trim().toLowerCase()}`;

const getPersistedTeamMembers = (storagePrefix: string): TeamMember[] => {
  try {
    const stored = localStorage.getItem(`${storagePrefix}_team`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .filter(Boolean)
          .map((member: TeamMember) => ({
            ...member,
            id: String(member.id),
          }));
        const seen = new Set<string>();
        return normalized.filter(member => {
          const identity = getMemberIdentity(member);
          if (seen.has(identity)) return false;
          seen.add(identity);
          return true;
        });
      }
    }
  } catch {}
  return Object.values(TEAM_MEMBERS);
};

interface EditContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: ContentItem) => void;
  onDelete?: (id: string) => void;
  initialData?: ContentItem;
  defaultPlatform: Platform;
  storagePrefix: string;
}

const EditContentModal: React.FC<EditContentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  defaultPlatform,
  storagePrefix
}) => {
  const [formData, setFormData] = useState<ContentItem>({
    id: '',
    title: '',
    description: '',
    driveLink: '',
    scriptLink: '',
    thumbnailUrl: '',
    youtubeUrl: '',
    status: ContentStatus.PENDING,
    team: [],
    postDate: new Date().toISOString().split('T')[0],
    platform: defaultPlatform,
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Format date to YYYY-MM-DD for input[type="date"]
        let formattedDate = initialData.postDate;
        const parsedDate = new Date(initialData.postDate);
        if (!isNaN(parsedDate.getTime())) {
            formattedDate = parsedDate.toISOString().split('T')[0];
        }

        setFormData({
            ...initialData,
            description: initialData.description || '',
            postDate: formattedDate
        });
      } else {
        // Reset for new item
        setFormData({
          id: Date.now().toString(),
          title: '',
          description: '',
          driveLink: '',
          scriptLink: '',
          thumbnailUrl: '',
          youtubeUrl: '',
          status: ContentStatus.PENDING,
          team: [],
          postDate: new Date().toISOString().split('T')[0],
          platform: defaultPlatform,
        });
      }
    }
  }, [isOpen, initialData, defaultPlatform]);

  if (!isOpen) return null;

  const handleTeamToggle = (member: TeamMember) => {
    setFormData(prev => {
      const persisted = getPersistedTeamMembers(storagePrefix);
      const memberByIdentity = new Map(persisted.map(m => [getMemberIdentity(m), m]));
      const memberById = new Map(persisted.map(m => [String(m.id).trim(), m]));
      // Refresh all existing team members with latest data (photos, roles, etc.)
      const refreshedTeam = prev.team.map(t =>
        memberByIdentity.get(getMemberIdentity(t)) || memberById.get(String(t.id).trim()) || t
      );

      const memberIdentity = getMemberIdentity(member);
      const exists = refreshedTeam.find(t => getMemberIdentity(t) === memberIdentity);
      if (exists) {
        return { ...prev, team: refreshedTeam.filter(t => getMemberIdentity(t) !== memberIdentity) };
      } else {
        const freshMember = memberByIdentity.get(memberIdentity) || memberById.get(String(member.id).trim()) || { ...member, id: String(member.id).trim() };
        return { ...prev, team: [...refreshedTeam, freshMember] };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Format date back to a nice string for display if desired, or keep YYYY-MM-DD.
    // The current app uses "Oct 12, 2024".
    const dateObj = new Date(formData.postDate);
    const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    onSave({
        ...formData,
        postDate: displayDate
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#3a3a3a]">
          <h2 className="text-xl font-bold text-[#ECECEC]">
            {initialData ? 'Edit Content' : 'Add Content'}
          </h2>
          <button onClick={onClose} className="text-[#9B9B9B] hover:text-[#ECECEC] transition-none">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="content-form" onSubmit={handleSubmit} className="space-y-6">

            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9B9B9B]">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="e.g. How to scale your business"
                className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-4 py-3 text-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-[#555555] transition-none placeholder-[#666666]"
              />
            </div>

            {/* Description / Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9B9B9B] flex items-center gap-2">
                 <FileText size={14} /> Description / Notes
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Detailed notes, scripts, or transcript..."
                className="w-full h-32 bg-[#212121] border border-[#3a3a3a] rounded-lg px-4 py-3 text-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-[#555555] transition-none placeholder-[#666666] resize-none"
              />
            </div>

            {/* Platform, Status & Style Row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[#9B9B9B]">Platform</label>
                    <select
                        value={formData.platform}
                        onChange={e => setFormData({...formData, platform: e.target.value as Platform})}
                        className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-4 py-3 text-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-[#555555] transition-none appearance-none"
                    >
                        {Object.values(Platform).map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-[#9B9B9B]">Status</label>
                    <select
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value as ContentStatus})}
                        className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-4 py-3 text-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-[#555555] transition-none appearance-none"
                    >
                        {Object.values(ContentStatus).map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-[#9B9B9B]">Style</label>
                    <select
                        value={formData.style || ''}
                        onChange={e => setFormData({...formData, style: e.target.value ? e.target.value as VideoStyle : undefined})}
                        className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-4 py-3 text-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-[#555555] transition-none appearance-none"
                    >
                        <option value="">No style</option>
                        {Object.values(VideoStyle).map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Post Date */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-[#9B9B9B] flex items-center gap-2">
                    <Calendar size={14} /> Post Date
                </label>
                <input
                    type="date"
                    required
                    value={formData.postDate}
                    onChange={e => setFormData({...formData, postDate: e.target.value})}
                    className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-4 py-3 text-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-[#555555] transition-none [color-scheme:dark]"
                />
            </div>

            {/* Drive Link */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9B9B9B] flex items-center gap-2">
                <Folder size={14} /> Google Drive
              </label>
              <input
                type="text"
                value={formData.driveLink}
                onChange={e => setFormData({...formData, driveLink: e.target.value})}
                placeholder="https://drive.google.com/..."
                className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-4 py-3 text-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-[#555555] transition-none placeholder-[#666666]"
              />
            </div>

            {/* Script Link */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9B9B9B] flex items-center gap-2">
                <FileText size={14} /> Script (Google Doc)
              </label>
              <input
                type="text"
                value={formData.scriptLink || ''}
                onChange={e => setFormData({...formData, scriptLink: e.target.value})}
                placeholder="https://docs.google.com/..."
                className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-4 py-3 text-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-[#555555] transition-none placeholder-[#666666]"
              />
            </div>

            {/* Thumbnail */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9B9B9B] flex items-center gap-2">
                <Image size={14} /> Thumbnail
              </label>
              
              {/* File upload */}
              <label className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#212121] border border-dashed border-[#4a4a4a] rounded-lg text-sm text-[#9B9B9B] hover:text-[#ECECEC] hover:border-[#666666] cursor-pointer transition-colors">
                <Image size={16} />
                <span>Upload from device</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const dataUrl = event.target?.result as string;
                        setFormData({...formData, thumbnailUrl: dataUrl});
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
              
              {/* URL input */}
              <input
                type="text"
                value={formData.thumbnailUrl || ''}
                onChange={e => setFormData({...formData, thumbnailUrl: e.target.value})}
                placeholder="Or paste URL..."
                className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-4 py-3 text-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-[#555555] transition-none placeholder-[#666666]"
              />
              
              {/* Preview */}
              {formData.thumbnailUrl && (
                <img 
                  src={formData.thumbnailUrl} 
                  alt="Thumbnail preview" 
                  className="mt-2 w-full h-32 object-cover rounded-lg border border-[#3a3a3a]"
                  onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                />
              )}
            </div>

            {/* YouTube URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#9B9B9B] flex items-center gap-2">
                <ExternalLink size={14} /> YouTube URL
              </label>
              <input
                type="text"
                value={formData.youtubeUrl || ''}
                onChange={e => setFormData({...formData, youtubeUrl: e.target.value})}
                placeholder="https://youtube.com/..."
                className="w-full bg-[#212121] border border-[#3a3a3a] rounded-lg px-4 py-3 text-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-[#555555] transition-none placeholder-[#666666]"
              />
            </div>

            {/* Team Members */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-[#9B9B9B] flex items-center gap-2">
                <User size={14} /> Team Members
              </label>
              <div className="grid grid-cols-2 gap-2">
                {getPersistedTeamMembers(storagePrefix).map((member) => {
                    const memberIdentity = getMemberIdentity(member);
                    const isSelected = formData.team.some(t => getMemberIdentity(t) === memberIdentity);
                    return (
                        <button
                            key={memberIdentity}
                            type="button"
                            onClick={() => handleTeamToggle(member)}
                            className={`flex items-center gap-3 p-2 rounded-lg border transition-none ${
                                isSelected
                                    ? 'bg-[rgba(255,255,255,0.08)] border-[#4a4a4a] text-[#ECECEC]'
                                    : 'bg-[#212121] border-[#3a3a3a] text-[#9B9B9B] hover:bg-[rgba(255,255,255,0.05)]'
                            }`}
                        >
                            {member.photoUrl ? (
                                <img src={member.photoUrl} alt={member.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                                <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-xs font-bold text-[#ECECEC]`}>
                                    {member.initials}
                                </div>
                            )}
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{member.name}</p>
                                <p className="text-[10px] text-[#9B9B9B] truncate">{member.role}</p>
                            </div>
                            {isSelected && <Check size={14} className="text-[#ECECEC] shrink-0" />}
                        </button>
                    );
                })}
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#3a3a3a] flex items-center justify-between bg-[rgba(255,255,255,0.05)]">
          {initialData && onDelete ? (
             <button
                type="button"
                onClick={() => onDelete(initialData.id)}
                className="flex items-center gap-2 text-rose-500 hover:text-rose-400 text-sm font-medium transition-none"
             >
                <Trash2 size={16} /> Delete
             </button>
          ) : (
             <div></div>
          )}

          <div className="flex gap-3">
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[#9B9B9B] hover:text-[#ECECEC] text-sm font-medium transition-none"
            >
                Cancel
            </button>
            <button
                type="submit"
                form="content-form"
                className="px-6 py-2 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-lg text-sm font-semibold transition-none flex items-center gap-2"
            >
                <Save size={16} /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditContentModal;
