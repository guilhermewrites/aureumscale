import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Folder, User, Check, Trash2, FileText } from 'lucide-react';
import { ContentItem, ContentStatus, Platform, TeamMember } from '../types';
import { TEAM_MEMBERS } from '../constants';

const getPersistedTeamMembers = (storagePrefix: string): TeamMember[] => {
  try {
    const stored = localStorage.getItem(`${storagePrefix}_team`);
    if (stored) return JSON.parse(stored);
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
      const exists = prev.team.find(t => t.id === member.id);
      if (exists) {
        return { ...prev, team: prev.team.filter(t => t.id !== member.id) };
      } else {
        return { ...prev, team: [...prev.team, member] };
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
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">
            {initialData ? 'Edit Content' : 'Add Content'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="content-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Title</label>
              <input 
                type="text" 
                required
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="e.g. How to scale your business"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder-gray-600"
              />
            </div>

            {/* Description / Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                 <FileText size={14} /> Description / Notes
              </label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Detailed notes, scripts, or transcript..."
                className="w-full h-32 bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder-gray-600 resize-none"
              />
            </div>

            {/* Platform & Status Row */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Platform</label>
                    <select 
                        value={formData.platform}
                        onChange={e => setFormData({...formData, platform: e.target.value as Platform})}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all appearance-none"
                    >
                        {Object.values(Platform).map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Status</label>
                    <select 
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value as ContentStatus})}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all appearance-none"
                    >
                        {Object.values(ContentStatus).map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Post Date */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Calendar size={14} /> Post Date
                </label>
                <input 
                    type="date"
                    required
                    value={formData.postDate}
                    onChange={e => setFormData({...formData, postDate: e.target.value})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all [color-scheme:dark]"
                />
            </div>

            {/* Drive Link */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Folder size={14} /> Drive Archive
              </label>
              <input 
                type="text" 
                value={formData.driveLink}
                onChange={e => setFormData({...formData, driveLink: e.target.value})}
                placeholder="https://drive.google.com/..."
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder-gray-600"
              />
            </div>

            {/* Team Members */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <User size={14} /> Team Members
              </label>
              <div className="grid grid-cols-2 gap-2">
                {getPersistedTeamMembers(storagePrefix).map((member) => {
                    const isSelected = formData.team.some(t => t.id === member.id);
                    return (
                        <button
                            key={member.id}
                            type="button"
                            onClick={() => handleTeamToggle(member)}
                            className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${
                                isSelected 
                                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white' 
                                    : 'bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-800'
                            }`}
                        >
                            {member.photoUrl ? (
                                <img src={member.photoUrl} alt={member.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                                <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-xs font-bold text-white`}>
                                    {member.initials}
                                </div>
                            )}
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{member.name}</p>
                                <p className="text-[10px] text-gray-500 truncate">{member.role}</p>
                            </div>
                            {isSelected && <Check size={14} className="text-emerald-500 shrink-0" />}
                        </button>
                    );
                })}
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex items-center justify-between bg-gray-900/50">
          {initialData && onDelete ? (
             <button 
                type="button"
                onClick={() => onDelete(initialData.id)}
                className="flex items-center gap-2 text-rose-500 hover:text-rose-400 text-sm font-medium transition-colors"
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
                className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
                Cancel
            </button>
            <button 
                type="submit" 
                form="content-form"
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
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