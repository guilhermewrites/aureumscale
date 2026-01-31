import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, Clock, Loader2, CheckCircle2, Radio, 
  Trash2, User, Check, Calendar, ExternalLink,
  ArrowLeftCircle, FilePenLine
} from 'lucide-react';
import { ContentItem, ContentStatus, TeamMember } from '../types';
import { TEAM_MEMBERS } from '../constants';

const getPersistedTeamMembers = (storagePrefix: string): TeamMember[] => {
  try {
    const stored = localStorage.getItem(`${storagePrefix}_team`);
    if (stored) return JSON.parse(stored);
  } catch {}
  return Object.values(TEAM_MEMBERS);
};

interface ContentRowProps {
  item: ContentItem;
  onUpdate: (item: ContentItem) => void;
  onDelete: (id: string) => void;
  onDemote: (item: ContentItem) => void;
  onEdit: (item: ContentItem) => void;
  storagePrefix: string;
}

const ContentRow: React.FC<ContentRowProps> = ({ item, onUpdate, onDelete, onDemote, onEdit, storagePrefix }) => {
  // Edit states
  const [editingField, setEditingField] = useState<'title' | 'status' | 'team' | 'date' | 'link' | null>(null);
  
  // Temporary values for editing
  const [tempTitle, setTempTitle] = useState(item.title);
  const [tempLink, setTempLink] = useState(item.driveLink);
  const [tempDate, setTempDate] = useState('');

  // Dropdown refs for click outside
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const teamDropdownRef = useRef<HTMLDivElement>(null);
  const linkDropdownRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Initialize date for input
  useEffect(() => {
    const dateObj = new Date(item.postDate);
    if (!isNaN(dateObj.getTime())) {
      setTempDate(dateObj.toISOString().split('T')[0]);
    } else {
      setTempDate(new Date().toISOString().split('T')[0]);
    }
  }, [item.postDate]);

  // Click outside handler to close dropdowns/inputs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingField === 'status' && statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setEditingField(null);
      }
      if (editingField === 'team' && teamDropdownRef.current && !teamDropdownRef.current.contains(event.target as Node)) {
        setEditingField(null);
      }
      if (editingField === 'link' && linkDropdownRef.current && !linkDropdownRef.current.contains(event.target as Node)) {
         setEditingField(null);
      }
      if (editingField === 'title' && titleInputRef.current && !titleInputRef.current.contains(event.target as Node)) {
         saveTitle();
      }
    };

    if (editingField) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingField, tempTitle, tempLink]); // Dependencies important for save closures

  // --- Handlers ---

  const saveTitle = () => {
    if (tempTitle.trim() !== item.title) {
      onUpdate({ ...item, title: tempTitle });
    }
    setEditingField(null);
  };

  const saveLink = () => {
    onUpdate({ ...item, driveLink: tempLink });
    setEditingField(null);
  };

  const saveDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setTempDate(newDate);
    // Convert back to display format "Oct 12, 2024"
    const dateObj = new Date(newDate);
    const displayDate = new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate())
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
    onUpdate({ ...item, postDate: displayDate });
    setEditingField(null);
  };

  const updateStatus = (newStatus: ContentStatus) => {
    onUpdate({ ...item, status: newStatus });
    setEditingField(null);
  };

  const toggleTeamMember = (member: TeamMember) => {
    const exists = item.team.find(t => t.id === member.id);
    let newTeam;
    if (exists) {
      newTeam = item.team.filter(t => t.id !== member.id);
    } else {
      newTeam = [...item.team, member];
    }
    onUpdate({ ...item, team: newTeam });
  };

  // --- Render Helpers ---

  const getStatusConfig = (status: ContentStatus) => {
    switch (status) {
      case ContentStatus.PENDING:
        return { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' };
      case ContentStatus.IN_PROGRESS:
        return { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
      case ContentStatus.DONE:
        return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
      case ContentStatus.LIVE:
        return { icon: Radio, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
    }
  };

  const statusConfig = getStatusConfig(item.status);
  const StatusIcon = statusConfig.icon;

  return (
    <tr className="group hover:bg-gray-800/30 transition-colors">
      
      {/* TITLE CELL */}
      <td className="px-6 py-4">
        {editingField === 'title' ? (
          <input
            ref={titleInputRef}
            type="text"
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveTitle();
              if (e.key === 'Escape') {
                  setTempTitle(item.title); 
                  setEditingField(null);
              }
            }}
            autoFocus
            className="w-full bg-gray-900 border border-emerald-500/50 rounded px-2 py-1 text-sm text-white focus:outline-none"
          />
        ) : (
          <div className="flex flex-col">
            <span 
                onClick={() => {
                    setTempTitle(item.title);
                    setEditingField('title');
                }}
                className="font-medium text-gray-200 text-sm block truncate max-w-xs cursor-pointer hover:text-emerald-400 border border-transparent hover:border-gray-700 rounded px-2 -mx-2 py-1 transition-all" 
                title="Click to edit title"
            >
                {item.title}
            </span>
            {item.description && (
                <span className="text-[10px] text-gray-500 px-2 -mx-2 truncate max-w-xs">{item.description}</span>
            )}
          </div>
        )}
      </td>

      {/* ARCHIVE/LINK CELL */}
      <td className="px-6 py-4 text-center relative">
        <div className="relative inline-block">
            <button
                onClick={() => {
                    setTempLink(item.driveLink);
                    setEditingField('link');
                }}
                className={`inline-flex p-2 rounded-lg transition-colors ${item.driveLink ? 'text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10' : 'text-gray-700 hover:text-gray-400'}`}
                title="Edit Drive Link"
            >
                <Folder size={18} />
            </button>
            
            {editingField === 'link' && (
                <div ref={linkDropdownRef} className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 p-3">
                    <label className="text-xs font-semibold text-gray-400 mb-2 block">Drive Link</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={tempLink}
                            onChange={(e) => setTempLink(e.target.value)}
                            placeholder="https://..."
                            className="flex-1 bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && saveLink()}
                        />
                        <button onClick={saveLink} className="p-1 bg-emerald-500/10 text-emerald-500 rounded hover:bg-emerald-500/20">
                            <Check size={14} />
                        </button>
                        {item.driveLink && (
                            <a href={item.driveLink} target="_blank" rel="noreferrer" className="p-1 text-gray-400 hover:text-white">
                                <ExternalLink size={14} />
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
      </td>

      {/* STATUS CELL */}
      <td className="px-6 py-4 relative">
        <div className="relative inline-block">
            <button 
                onClick={() => setEditingField('status')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all hover:scale-105 cursor-pointer ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
            >
                <StatusIcon size={12} className={item.status === ContentStatus.LIVE ? 'animate-pulse' : ''} />
                {item.status}
            </button>

            {editingField === 'status' && (
                <div ref={statusDropdownRef} className="absolute top-full left-0 mt-2 w-40 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {Object.values(ContentStatus).map((status) => {
                        const conf = getStatusConfig(status);
                        const SIcon = conf.icon;
                        return (
                            <button
                                key={status}
                                onClick={() => updateStatus(status)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-800 transition-colors ${item.status === status ? 'bg-gray-800/50' : ''}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${conf.color.replace('text-', 'bg-')}`}></div>
                                <span className={conf.color}>{status}</span>
                                {item.status === status && <Check size={12} className="ml-auto text-emerald-500" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
      </td>

      {/* TEAM CELL */}
      <td className="px-6 py-4 relative">
        <div className="relative inline-block">
             <div 
                onClick={() => setEditingField('team')}
                className="flex -space-x-2 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity p-1 -m-1 rounded-lg hover:bg-gray-800/30"
                title="Edit Team"
             >
                {item.team.length > 0 ? item.team.map((member) => (
                    member.photoUrl ? (
                        <img
                            key={member.id}
                            src={member.photoUrl}
                            alt={member.name}
                            className="inline-block h-8 w-8 rounded-full ring-2 ring-gray-900 object-cover"
                        />
                    ) : (
                        <div
                            key={member.id}
                            className={`inline-block h-8 w-8 rounded-full ring-2 ring-gray-900 ${member.color} flex items-center justify-center text-[10px] font-bold text-white`}
                        >
                            {member.initials}
                        </div>
                    )
                )) : (
                    <div className="h-8 w-8 rounded-full bg-gray-800 border border-dashed border-gray-600 flex items-center justify-center text-gray-500">
                        <User size={14} />
                    </div>
                )}
            </div>

            {editingField === 'team' && (
                <div ref={teamDropdownRef} className="absolute top-full left-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-100">
                    <p className="text-xs font-semibold text-gray-400 mb-2 px-2">Assign Team</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                        {getPersistedTeamMembers(storagePrefix).map((member) => {
                            const isSelected = item.team.some(t => t.id === member.id);
                            return (
                                <button
                                    key={member.id}
                                    onClick={() => toggleTeamMember(member)}
                                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                                        isSelected ? 'bg-emerald-500/10' : 'hover:bg-gray-800'
                                    }`}
                                >
                                    {member.photoUrl ? (
                                        <img src={member.photoUrl} alt={member.name} className="w-6 h-6 rounded-full object-cover" />
                                    ) : (
                                        <div className={`w-6 h-6 rounded-full ${member.color} flex items-center justify-center text-[10px] font-bold text-white`}>
                                            {member.initials}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-medium truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>{member.name}</p>
                                    </div>
                                    {isSelected && <Check size={12} className="text-emerald-500" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
      </td>

      {/* DATE CELL */}
      <td className="px-6 py-4 text-right">
        {editingField === 'date' ? (
             <input 
                type="date"
                value={tempDate}
                onChange={saveDate}
                onBlur={() => setEditingField(null)}
                autoFocus
                className="bg-gray-900 border border-emerald-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none [color-scheme:dark]"
             />
        ) : (
            <span 
                onClick={() => setEditingField('date')}
                className="text-sm text-gray-400 font-mono cursor-pointer hover:text-emerald-400 hover:bg-gray-800 px-2 py-1 rounded transition-colors"
                title="Click to edit date"
            >
                {item.postDate}
            </span>
        )}
      </td>

      {/* ACTIONS */}
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2 relative z-10">
            <button
                type="button"
                onClick={() => onEdit(item)}
                className="text-gray-600 hover:text-emerald-400 transition-colors p-1.5 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                title="Edit Details"
            >
                <FilePenLine size={16} />
            </button>
            <button
                type="button"
                onClick={() => onDemote(item)}
                className="text-gray-600 hover:text-blue-400 transition-colors p-1.5 hover:bg-blue-500/10 rounded-lg cursor-pointer"
                title="Move back to Ideation"
            >
                <ArrowLeftCircle size={16} />
            </button>
            <button 
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                }}
                className="text-gray-600 hover:text-rose-400 transition-colors p-1.5 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                title="Delete"
            >
                <Trash2 size={16} />
            </button>
        </div>
      </td>
    </tr>
  );
};

export default ContentRow;