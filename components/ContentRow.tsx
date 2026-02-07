import React, { useState, useRef, useEffect } from 'react';
import {
  Folder, Clock, Loader2, CheckCircle2, Radio,
  Trash2, User, Check, Calendar, ExternalLink,
  ArrowLeftCircle, FilePenLine, FileText, Youtube,
  Instagram, Image, Pencil, Send, GripVertical, XCircle
} from 'lucide-react';
import { ContentItem, ContentStatus, TeamMember, Platform, VideoStyle, InstagramStyle, YOUTUBE_STATUSES, INSTAGRAM_STATUSES } from '../types';
import { TEAM_MEMBERS } from '../constants';
const normalizeMemberName = (name?: string): string => String(name || '').trim().toLowerCase();

const getPersistedTeamMembers = (storagePrefix: string): TeamMember[] => {
  try {
    const stored = localStorage.getItem(`${storagePrefix}_team`);
    if (stored !== null) {
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
          const id = String(member.id).trim();
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      }
      return [];
    }
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
  isDragged?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

const ContentRow: React.FC<ContentRowProps> = ({ item, onUpdate, onDelete, onDemote, onEdit, storagePrefix, isDragged, isDragOver, onDragStart, onDragOver: onDragOverProp, onDragLeave, onDrop, onDragEnd }) => {
  // Resolve team members with latest data (photos, roles, etc.) from localStorage
  const resolvedTeam = React.useMemo(() => {
    const persisted = getPersistedTeamMembers(storagePrefix);
    const memberById = new Map(persisted.map(m => [String(m.id).trim(), m]));
    const memberByName = new Map(persisted.map(m => [normalizeMemberName(m.name), m]));
    return item.team
      .map(t => memberByName.get(normalizeMemberName(t.name)) || memberById.get(String(t.id).trim()) || t)
      .filter(t => memberByName.has(normalizeMemberName(t.name)));
  }, [item.team, storagePrefix]);
  // Edit states
  const [editingField, setEditingField] = useState<'title' | 'status' | 'style' | 'team' | 'date' | 'link' | 'script' | 'thumbnail' | 'youtube' | null>(null);

  // Temporary values for editing
  const [tempTitle, setTempTitle] = useState(item.title);
  const [tempLink, setTempLink] = useState(item.driveLink);
  const [tempScript, setTempScript] = useState(item.scriptLink || '');
  const [tempThumbnail, setTempThumbnail] = useState(item.thumbnailUrl || '');
  const [tempYoutubeUrl, setTempYoutubeUrl] = useState(item.youtubeUrl || '');
  const [tempDate, setTempDate] = useState('');

  // Dropdown refs for click outside
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const teamDropdownRef = useRef<HTMLDivElement>(null);
  const linkDropdownRef = useRef<HTMLDivElement>(null);
  const scriptDropdownRef = useRef<HTMLDivElement>(null);
  const thumbnailDropdownRef = useRef<HTMLDivElement>(null);
  const styleDropdownRef = useRef<HTMLDivElement>(null);
  const youtubeInputRef = useRef<HTMLInputElement>(null);
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
      if (editingField === 'script' && scriptDropdownRef.current && !scriptDropdownRef.current.contains(event.target as Node)) {
         setEditingField(null);
      }
      if (editingField === 'thumbnail' && thumbnailDropdownRef.current && !thumbnailDropdownRef.current.contains(event.target as Node)) {
         setEditingField(null);
      }
      if (editingField === 'style' && styleDropdownRef.current && !styleDropdownRef.current.contains(event.target as Node)) {
         setEditingField(null);
      }
      if (editingField === 'youtube' && youtubeInputRef.current && !youtubeInputRef.current.contains(event.target as Node)) {
         saveYoutubeUrl();
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
  }, [editingField, tempTitle, tempLink, tempScript, tempThumbnail, tempYoutubeUrl]); // Dependencies important for save closures

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

  const saveScript = () => {
    onUpdate({ ...item, scriptLink: tempScript });
    setEditingField(null);
  };

  const saveThumbnail = () => {
    onUpdate({ ...item, thumbnailUrl: tempThumbnail });
    setEditingField(null);
  };

  const saveYoutubeUrl = () => {
    onUpdate({ ...item, youtubeUrl: tempYoutubeUrl });
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

  const updateStyle = (newStyle: VideoStyle | InstagramStyle | undefined) => {
    onUpdate({ ...item, style: newStyle });
    setEditingField(null);
  };

  const getStyleConfig = (style: VideoStyle | InstagramStyle) => {
    switch (style) {
      // YouTube styles
      case VideoStyle.MIRO:
        return { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', dot: 'bg-yellow-400' };
      case VideoStyle.IPAD:
        return { color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', dot: 'bg-sky-400' };
      case VideoStyle.GAMMA:
        return { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', dot: 'bg-violet-400' };
      case VideoStyle.BLENDED:
        return { color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20', dot: 'bg-teal-400' };
      case VideoStyle.ED_LAWRENCE:
        return { color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', dot: 'bg-pink-400' };
      // Instagram styles
      case InstagramStyle.MOVING_CHAIR:
        return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400' };
      case InstagramStyle.TALKING_HEAD:
        return { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', dot: 'bg-rose-400' };
      case InstagramStyle.FACE_BACKGROUND:
        return { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', dot: 'bg-indigo-400' };
      case InstagramStyle.VOICE_OVER:
        return { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', dot: 'bg-cyan-400' };
      default:
        return { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', dot: 'bg-gray-400' };
    }
  };

  // Platform-aware: which styles to show
  const getStylesForPlatform = (platform: Platform): (VideoStyle | InstagramStyle)[] => {
    switch (platform) {
      case Platform.INSTAGRAM:
        return Object.values(InstagramStyle);
      case Platform.YOUTUBE:
      default:
        return Object.values(VideoStyle);
    }
  };

  // Platform-aware: which statuses to show
  const getStatusesForPlatform = (platform: Platform): ContentStatus[] => {
    switch (platform) {
      case Platform.INSTAGRAM:
        return INSTAGRAM_STATUSES;
      default:
        return YOUTUBE_STATUSES;
    }
  };

  const toggleTeamMember = (member: TeamMember) => {
    const persisted = getPersistedTeamMembers(storagePrefix);
    const memberById = new Map(persisted.map(m => [String(m.id).trim(), m]));
    const memberByName = new Map(persisted.map(m => [normalizeMemberName(m.name), m]));
    const activeNames = new Set(persisted.map(m => normalizeMemberName(m.name)));
    // Refresh all existing team members with latest data
    const refreshedTeam = item.team.map(t =>
      memberByName.get(normalizeMemberName(t.name)) || memberById.get(String(t.id).trim()) || t
    ).filter(t => activeNames.has(normalizeMemberName(t.name)));

    const memberName = normalizeMemberName(member.name);
    const exists = refreshedTeam.find(t => normalizeMemberName(t.name) === memberName);
    let newTeam;
    if (exists) {
      newTeam = refreshedTeam.filter(t => normalizeMemberName(t.name) !== memberName);
    } else {
      // Use fresh member data from persisted source
      const freshMember = memberByName.get(memberName) || memberById.get(String(member.id).trim()) || member;
      newTeam = [...refreshedTeam, freshMember];
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
      case ContentStatus.EDITING:
        return { icon: Pencil, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
      case ContentStatus.SENT:
        return { icon: Send, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
      case ContentStatus.REJECTED:
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
      case ContentStatus.DONE:
        return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
      case ContentStatus.LIVE:
        return { icon: Radio, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
    }
  };

  const statusConfig = getStatusConfig(item.status);
  const StatusIcon = statusConfig.icon;

  const getPlatformIcon = () => {
    switch (item.platform) {
      case Platform.YOUTUBE:
        return <Youtube size={16} className="text-[#9B9B9B]" />;
      case Platform.INSTAGRAM:
        return <Instagram size={16} className="text-[#9B9B9B]" />;
      case Platform.TIKTOK:
        return <span className="text-xs font-bold text-[#9B9B9B]">TT</span>;
      case Platform.LINKEDIN:
        return <span className="text-xs font-bold text-[#9B9B9B]">in</span>;
      default:
        return null;
    }
  };

  // Compress image to avoid localStorage limit (~5MB total)
  const compressThumbnail = (file: File, maxWidth: number = 320): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          reject(new Error('Canvas context'));
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image load failed'));
      };
      img.src = url;
    });
  };

  const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressThumbnail(file, 320);
      setTempThumbnail(dataUrl);
    } catch (err) {
      console.error('Thumbnail compress error:', err);
    }
  };

  const hasThumbnail = !!item.thumbnailUrl;

  return (
    <tr
      className={`group hover:bg-[rgba(255,255,255,0.05)] transition-none ${hasThumbnail ? 'align-top' : ''} ${isDragged ? 'opacity-40' : ''} ${isDragOver ? 'relative bg-white/10 border-t-4 border-t-white shadow-[inset_0_2px_0_0_rgba(255,255,255,0.4)]' : ''}`}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragOver={onDragOverProp}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >

      {/* TITLE CELL */}
      <td className={`px-6 ${hasThumbnail ? 'py-3' : 'py-4'} relative`}>
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          {onDragStart && (
            <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-[#666666] hover:text-[#9B9B9B] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical size={14} />
            </div>
          )}
          {/* Thumbnail */}
          {hasThumbnail && (
            <div className="relative group/thumb flex-shrink-0">
              <img 
                src={item.thumbnailUrl} 
                alt={item.title}
                className="w-28 h-16 object-cover rounded-lg border border-[#3a3a3a]"
              />
              <button
                onClick={() => {
                  setTempThumbnail(item.thumbnailUrl || '');
                  setEditingField('thumbnail');
                }}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
              >
                <Image size={16} className="text-white" />
              </button>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {/* Platform Icon */}
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {getPlatformIcon()}
              </div>
              
              {/* Title */}
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
                  className="flex-1 bg-[#2f2f2f] border border-[#4a4a4a] rounded px-2 py-1 text-sm text-[#ECECEC] focus:outline-none"
                />
              ) : (
                <span
                    onClick={() => {
                        setTempTitle(item.title);
                        setEditingField('title');
                    }}
                    className="font-medium text-[#ECECEC] text-sm block truncate max-w-xs cursor-pointer hover:text-[#ECECEC] border border-transparent hover:border-[#4a4a4a] rounded px-2 py-1 transition-none"
                    title="Click to edit title"
                >
                    {item.title}
                </span>
              )}
            </div>
            
            {item.description && (
                <span className="text-[10px] text-[#9B9B9B] pl-7 block truncate max-w-xs mt-0.5">{item.description}</span>
            )}
            
            {/* YouTube URL */}
            {editingField === 'youtube' ? (
              <div className="pl-7 mt-1 flex items-center gap-2">
                <input
                  ref={youtubeInputRef}
                  type="text"
                  value={tempYoutubeUrl}
                  onChange={(e) => setTempYoutubeUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveYoutubeUrl();
                    if (e.key === 'Escape') {
                        setTempYoutubeUrl(item.youtubeUrl || '');
                        setEditingField(null);
                    }
                  }}
                  placeholder="https://youtube.com/..."
                  autoFocus
                  className="flex-1 max-w-xs bg-[#2f2f2f] border border-[#4a4a4a] rounded px-2 py-0.5 text-[10px] text-[#ECECEC] focus:outline-none placeholder-[#666666]"
                />
                <button onClick={saveYoutubeUrl} className="text-[#9B9B9B] hover:text-[#ECECEC]">
                  <Check size={12} />
                </button>
              </div>
            ) : item.youtubeUrl ? (
              <a 
                href={item.youtubeUrl} 
                target="_blank" 
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTempYoutubeUrl(item.youtubeUrl || '');
                  setEditingField('youtube');
                }}
                className="text-[10px] text-[#666666] hover:text-[#9B9B9B] pl-7 mt-1 flex items-center gap-1 truncate max-w-xs"
                title="Double-click to edit"
              >
                <ExternalLink size={10} /> {item.youtubeUrl.replace('https://', '').replace('www.', '').slice(0, 40)}...
              </a>
            ) : (
              <button
                onClick={() => {
                  setTempYoutubeUrl('');
                  setEditingField('youtube');
                }}
                className="text-[10px] text-[#666666] hover:text-[#9B9B9B] pl-7 mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ExternalLink size={10} /> Add YouTube URL
              </button>
            )}
            
            {/* Add thumbnail button (when no thumbnail) */}
            {!hasThumbnail && (
              <button
                onClick={() => {
                  setTempThumbnail('');
                  setEditingField('thumbnail');
                }}
                className="text-[10px] text-[#666666] hover:text-[#9B9B9B] pl-7 mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Image size={10} /> Add thumbnail
              </button>
            )}
          </div>
        </div>
        
        {/* Thumbnail edit dropdown */}
        {editingField === 'thumbnail' && (
          <div ref={thumbnailDropdownRef} className="absolute mt-2 w-72 bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl shadow-2xl z-50 p-3">
            <label className="text-xs font-semibold text-[#9B9B9B] mb-2 block">Thumbnail</label>
            
            {/* File upload */}
            <label className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-[#212121] border border-dashed border-[#4a4a4a] rounded-lg text-xs text-[#9B9B9B] hover:text-[#ECECEC] hover:border-[#666666] cursor-pointer transition-colors mb-2">
              <Image size={14} />
              <span>Upload from device</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleThumbnailFileChange}
              />
            </label>
            
            {/* URL input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={tempThumbnail}
                onChange={(e) => setTempThumbnail(e.target.value)}
                placeholder="Or paste URL..."
                className="flex-1 bg-[#212121] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-[#ECECEC] focus:ring-1 focus:ring-[#555555] outline-none"
                onKeyDown={(e) => e.key === 'Enter' && saveThumbnail()}
              />
              <button onClick={saveThumbnail} className="p-1 bg-[rgba(255,255,255,0.08)] text-[#ECECEC] rounded hover:bg-[rgba(255,255,255,0.1)]">
                <Check size={14} />
              </button>
            </div>
            
            {/* Preview */}
            {tempThumbnail && (
              <div className="mt-2">
                <img src={tempThumbnail} alt="Preview" className="w-full h-20 object-cover rounded border border-[#3a3a3a]" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
              </div>
            )}
          </div>
        )}
      </td>

      {/* DRIVE CELL */}
      <td className="px-3 py-4 text-center relative">
        <div className="relative inline-block">
            <button
                onClick={() => {
                    setTempLink(item.driveLink);
                    setEditingField('link');
                }}
                className={`inline-flex p-2 rounded-lg transition-none ${item.driveLink ? 'text-[#9B9B9B] hover:text-[#ECECEC] hover:bg-[rgba(255,255,255,0.08)]' : 'text-[#666666] hover:text-[#9B9B9B]'}`}
                title="Edit Drive Link"
            >
                <Folder size={18} />
            </button>

            {editingField === 'link' && (
                <div ref={linkDropdownRef} className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl shadow-2xl z-50 p-3">
                    <label className="text-xs font-semibold text-[#9B9B9B] mb-2 block">Drive Link</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={tempLink}
                            onChange={(e) => setTempLink(e.target.value)}
                            placeholder="https://..."
                            className="flex-1 bg-[#212121] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-[#ECECEC] focus:ring-1 focus:ring-[#555555] outline-none"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && saveLink()}
                        />
                        <button onClick={saveLink} className="p-1 bg-[rgba(255,255,255,0.08)] text-[#ECECEC] rounded hover:bg-[rgba(255,255,255,0.1)]">
                            <Check size={14} />
                        </button>
                        {item.driveLink && (
                            <a href={item.driveLink} target="_blank" rel="noreferrer" className="p-1 text-[#9B9B9B] hover:text-white">
                                <ExternalLink size={14} />
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
      </td>

      {/* SCRIPT CELL */}
      <td className="px-3 py-4 text-center relative">
        <div className="relative inline-block">
            <button
                onClick={() => {
                    setTempScript(item.scriptLink || '');
                    setEditingField('script');
                }}
                className={`inline-flex p-2 rounded-lg transition-none ${item.scriptLink ? 'text-[#9B9B9B] hover:text-[#ECECEC] hover:bg-[rgba(255,255,255,0.08)]' : 'text-[#666666] hover:text-[#9B9B9B]'}`}
                title="Edit Script Link"
            >
                <FileText size={18} />
            </button>

            {editingField === 'script' && (
                <div ref={scriptDropdownRef} className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl shadow-2xl z-50 p-3">
                    <label className="text-xs font-semibold text-[#9B9B9B] mb-2 block">Script Link (Google Doc)</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={tempScript}
                            onChange={(e) => setTempScript(e.target.value)}
                            placeholder="https://docs.google.com/..."
                            className="flex-1 bg-[#212121] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-[#ECECEC] focus:ring-1 focus:ring-[#555555] outline-none"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && saveScript()}
                        />
                        <button onClick={saveScript} className="p-1 bg-[rgba(255,255,255,0.08)] text-[#ECECEC] rounded hover:bg-[rgba(255,255,255,0.1)]">
                            <Check size={14} />
                        </button>
                        {item.scriptLink && (
                            <a href={item.scriptLink} target="_blank" rel="noreferrer" className="p-1 text-[#9B9B9B] hover:text-white">
                                <ExternalLink size={14} />
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
      </td>

      {/* STATUS CELL */}
      <td className="px-3 py-4 relative">
        <div className="relative inline-block">
            <button
                onClick={() => setEditingField('status')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-none cursor-pointer ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
            >
                <StatusIcon size={12} className={item.status === ContentStatus.LIVE ? 'animate-pulse' : ''} />
                {item.status}
            </button>

            {editingField === 'status' && (
                <div ref={statusDropdownRef} className="absolute top-full left-0 mt-2 w-40 bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {getStatusesForPlatform(item.platform).map((status) => {
                        const conf = getStatusConfig(status);
                        const SIcon = conf.icon;
                        return (
                            <button
                                key={status}
                                onClick={() => updateStatus(status)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[rgba(255,255,255,0.05)] transition-none ${item.status === status ? 'bg-[rgba(255,255,255,0.05)]' : ''}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${conf.color.replace('text-', 'bg-')}`}></div>
                                <span className={conf.color}>{status}</span>
                                {item.status === status && <Check size={12} className="ml-auto text-[#ECECEC]" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
      </td>

      {/* STYLE CELL */}
      <td className="px-3 py-4 relative">
        <div className="relative inline-block">
            {item.style ? (() => {
              const styleConf = getStyleConfig(item.style);
              return (
                <button
                    onClick={() => setEditingField('style')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-none cursor-pointer ${styleConf.bg} ${styleConf.color} ${styleConf.border}`}
                >
                    {item.style}
                </button>
              );
            })() : (
              <button
                  onClick={() => setEditingField('style')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-none cursor-pointer bg-transparent text-[#666666] border-[#3a3a3a] hover:text-[#9B9B9B] hover:border-[#4a4a4a]"
              >
                  Set style
              </button>
            )}

            {editingField === 'style' && (
                <div ref={styleDropdownRef} className="absolute top-full left-0 mt-2 w-40 bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {item.style && (
                      <button
                          onClick={() => updateStyle(undefined)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[rgba(255,255,255,0.05)] transition-none text-[#666666]"
                      >
                          <span>Clear</span>
                      </button>
                    )}
                    {getStylesForPlatform(item.platform).map((style) => {
                        const conf = getStyleConfig(style);
                        return (
                            <button
                                key={style}
                                onClick={() => updateStyle(style)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[rgba(255,255,255,0.05)] transition-none ${item.style === style ? 'bg-[rgba(255,255,255,0.05)]' : ''}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${conf.dot}`}></div>
                                <span className={conf.color}>{style}</span>
                                {item.style === style && <Check size={12} className="ml-auto text-[#ECECEC]" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
      </td>

      {/* TEAM CELL */}
      <td className="px-3 py-4 relative">
        <div className="relative inline-block">
             <div
                onClick={() => setEditingField('team')}
                className="flex -space-x-2 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity p-1 -m-1 rounded-lg hover:bg-[rgba(255,255,255,0.05)]"
                title="Edit Team"
             >
                {resolvedTeam.length > 0 ? resolvedTeam.map((member) => (
                    member.photoUrl ? (
                        <img
                            key={member.id}
                            src={member.photoUrl}
                            alt={member.name}
                            className="inline-block h-8 w-8 rounded-full ring-2 ring-[#2f2f2f] object-cover"
                        />
                    ) : (
                        <div
                            key={member.id}
                            className={`inline-block h-8 w-8 rounded-full ring-2 ring-[#2f2f2f] ${member.color} flex items-center justify-center text-[10px] font-bold text-[#ECECEC]`}
                        >
                            {member.initials}
                        </div>
                    )
                )) : (
                    <div className="h-8 w-8 rounded-full bg-[#3a3a3a] border border-dashed border-[#4a4a4a] flex items-center justify-center text-[#9B9B9B]">
                        <User size={14} />
                    </div>
                )}
            </div>

            {editingField === 'team' && (
                <div ref={teamDropdownRef} className="absolute top-full left-0 mt-2 w-56 bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-100">
                    <p className="text-xs font-semibold text-[#9B9B9B] mb-2 px-2">Assign Team</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                        {getPersistedTeamMembers(storagePrefix).map((member) => {
                            const memberName = normalizeMemberName(member.name);
                            const isSelected = item.team.some(t => normalizeMemberName(t.name) === memberName);
                            return (
                                <button
                                    key={memberName}
                                    onClick={() => toggleTeamMember(member)}
                                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-none ${
                                        isSelected ? 'bg-[rgba(255,255,255,0.08)]' : 'hover:bg-[rgba(255,255,255,0.05)]'
                                    }`}
                                >
                                    {member.photoUrl ? (
                                        <img src={member.photoUrl} alt={member.name} className="w-6 h-6 rounded-full object-cover" />
                                    ) : (
                                        <div className={`w-6 h-6 rounded-full ${member.color} flex items-center justify-center text-[10px] font-bold text-[#ECECEC]`}>
                                            {member.initials}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-medium truncate ${isSelected ? 'text-[#ECECEC]' : 'text-[#b4b4b4]'}`}>{member.name}</p>
                                    </div>
                                    {isSelected && <Check size={12} className="text-[#ECECEC]" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
      </td>

      {/* DATE CELL */}
      <td className="px-4 py-4 text-right">
        {editingField === 'date' ? (
             <input
                type="date"
                value={tempDate}
                onChange={saveDate}
                onBlur={() => setEditingField(null)}
                autoFocus
                className="bg-[#2f2f2f] border border-[#4a4a4a] rounded px-2 py-1 text-xs text-[#ECECEC] focus:outline-none [color-scheme:dark]"
             />
        ) : (
            <span
                onClick={() => setEditingField('date')}
                className="text-sm text-[#9B9B9B] font-mono cursor-pointer hover:text-[#ECECEC] hover:bg-[rgba(255,255,255,0.05)] px-2 py-1 rounded transition-none"
                title="Click to edit date"
            >
                {item.postDate}
            </span>
        )}
      </td>

      {/* ACTIONS */}
      <td className="px-2 py-4 text-right">
        <div className="flex items-center justify-end gap-2 relative z-10">
            <button
                type="button"
                onClick={() => onEdit(item)}
                className="text-[#666666] hover:text-[#ECECEC] transition-none p-1.5 hover:bg-[rgba(255,255,255,0.08)] rounded-lg cursor-pointer"
                title="Edit Details"
            >
                <FilePenLine size={16} />
            </button>
            <button
                type="button"
                onClick={() => onDemote(item)}
                className="text-[#666666] hover:text-blue-400 transition-none p-1.5 hover:bg-blue-500/10 rounded-lg cursor-pointer"
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
                className="text-[#666666] hover:text-rose-400 transition-none p-1.5 hover:bg-rose-500/10 rounded-lg cursor-pointer"
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
