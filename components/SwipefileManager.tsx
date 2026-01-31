import React, { useState, useRef } from 'react';
import {
  Sparkles,
  PlaySquare,
  Layers,
  Megaphone,
  Youtube,
  Archive,
  Plus,
  Copy,
  ExternalLink,
  Trash2,
  Search,
  FileText,
  Image,
  Video,
  Play,
  X,
  Upload,
  RefreshCcw,
  Ban,
  AlertTriangle,
  Check
} from 'lucide-react';
import { SwipefileCategory, SwipefileItem, SwipefileMediaType } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';

// Helper to detect if a string is a URL
const isUrl = (str: string) => {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'data:';
  } catch {
    return false;
  }
};

const getYouTubeId = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

const getVimeoId = (url: string): string | null => {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
};

const isImageUrl = (url: string): boolean => {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?.*)?$/i.test(url) || url.startsWith('data:image/');
};

const isVideoUrl = (url: string): boolean => {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) || !!getYouTubeId(url) || !!getVimeoId(url) || url.startsWith('data:video/');
};

// Preview component for media
const MediaPreview: React.FC<{ item: SwipefileItem; onExpand?: (url: string) => void }> = ({ item, onExpand }) => {
  const [imgError, setImgError] = useState(false);
  const mediaUrl = item.mediaUrl || (item.mediaType !== 'text' && isUrl(item.content) ? item.content : '');

  if (item.mediaType === 'image' && mediaUrl && !imgError) {
    return (
      <div
        className="relative w-full h-40 rounded-lg overflow-hidden bg-gray-950 cursor-pointer group/img"
        onClick={() => onExpand?.(mediaUrl)}
      >
        <img
          src={mediaUrl}
          alt={item.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/60 rounded-full p-2">
            <ExternalLink size={16} className="text-white" />
          </div>
        </div>
      </div>
    );
  }

  if (item.mediaType === 'video' && mediaUrl) {
    const youtubeId = getYouTubeId(mediaUrl);
    const vimeoId = getVimeoId(mediaUrl);

    if (youtubeId) {
      return (
        <div className="relative w-full h-40 rounded-lg overflow-hidden bg-gray-950">
          <img src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`} alt={item.title} className="w-full h-full object-cover" />
          <a href={mediaUrl} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
              <Play size={20} className="text-white ml-0.5" fill="white" />
            </div>
          </a>
        </div>
      );
    }

    if (vimeoId) {
      return (
        <div className="relative w-full h-40 rounded-lg overflow-hidden bg-gray-950">
          <div className="w-full h-full bg-gradient-to-br from-blue-900/40 to-gray-950 flex items-center justify-center">
            <a href={mediaUrl} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center shadow-lg hover:bg-blue-400 transition-colors">
              <Play size={20} className="text-white ml-0.5" fill="white" />
            </a>
          </div>
        </div>
      );
    }

    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(mediaUrl) || mediaUrl.startsWith('data:video/')) {
      return (
        <div className="relative w-full h-40 rounded-lg overflow-hidden bg-gray-950">
          <video src={mediaUrl} className="w-full h-full object-cover" muted preload="metadata" />
          <a href={mediaUrl} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
              <Play size={20} className="text-white ml-0.5" fill="white" />
            </div>
          </a>
        </div>
      );
    }

    return (
      <a href={mediaUrl} target="_blank" rel="noreferrer" className="block w-full h-40 rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center hover:from-gray-700 transition-colors">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Play size={20} className="text-emerald-400 ml-0.5" />
          </div>
          <span className="text-xs text-gray-400">Open Video</span>
        </div>
      </a>
    );
  }

  return (
    <div className="bg-gray-950/50 rounded-lg p-3 text-xs text-gray-400 font-mono break-all line-clamp-4 relative">
      {item.content}
    </div>
  );
};

const ImageLightbox: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
    <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white p-2"><X size={24} /></button>
    <img src={url} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()} />
  </div>
);

type ConfirmType = 'delete_item' | 'delete_forever' | 'empty_trash';
interface ConfirmState {
  isOpen: boolean;
  type: ConfirmType;
  itemId?: string;
  title: string;
  message: string;
}

const MEDIA_TYPE_OPTIONS: { value: SwipefileMediaType; icon: React.ElementType; label: string }[] = [
  { value: 'text', icon: FileText, label: 'Text' },
  { value: 'image', icon: Image, label: 'Image' },
  { value: 'video', icon: Video, label: 'Video' },
];

type SwipeViewMode = 'library' | 'trash';

interface SwipefileManagerProps {
  storagePrefix: string;
}

const SwipefileManager: React.FC<SwipefileManagerProps> = ({ storagePrefix }) => {
  const [activeCategory, setActiveCategory] = useState<SwipefileCategory>(SwipefileCategory.PROMPTS);
  const [items, setItems] = useLocalStorage<SwipefileItem[]>(`${storagePrefix}_swipefile`, []);
  const [trash, setTrash] = useLocalStorage<SwipefileItem[]>(`${storagePrefix}_swipefile_trash`, []);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<SwipeViewMode>('library');


  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<'title' | 'content' | null>(null);
  const [editValue, setEditValue] = useState('');

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<ConfirmState>({ isOpen: false, type: 'delete_item', title: '', message: '' });

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [newItem, setNewItem] = useState<{title: string, content: string, tags: string, mediaType: SwipefileMediaType, mediaUrl: string}>({
    title: '', content: '', tags: '', mediaType: 'text', mediaUrl: ''
  });

  const categories = [
    { id: SwipefileCategory.PROMPTS, icon: Sparkles, label: 'Prompts' },
    { id: SwipefileCategory.VSLS, icon: PlaySquare, label: 'VSLs' },
    { id: SwipefileCategory.PAGES, icon: Layers, label: 'Pages' },
    { id: SwipefileCategory.ADS, icon: Megaphone, label: 'Ads' },
    { id: SwipefileCategory.YOUTUBE, icon: Youtube, label: 'YouTube' },
    { id: SwipefileCategory.OTHERS, icon: Archive, label: 'Others' },
  ];

  // --- File Import ---
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      let mediaType: SwipefileMediaType = 'text';
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';

      setNewItem(prev => ({
        ...prev,
        mediaType,
        mediaUrl: dataUrl,
        title: prev.title || file.name.replace(/\.[^.]+$/, ''),
      }));
      setIsAdding(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // --- Auto-detect media type ---
  const handleMediaUrlChange = (url: string) => {
    setNewItem(prev => {
      let mediaType = prev.mediaType;
      if (url && isUrl(url)) {
        if (isImageUrl(url)) mediaType = 'image';
        else if (isVideoUrl(url)) mediaType = 'video';
      }
      return { ...prev, mediaUrl: url, mediaType };
    });
  };

  // --- CRUD ---
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title) return;
    if (newItem.mediaType === 'text' && !newItem.content) return;
    if (newItem.mediaType !== 'text' && !newItem.mediaUrl && !newItem.content) return;

    const entry: SwipefileItem = {
      id: Date.now().toString(),
      title: newItem.title,
      content: newItem.content,
      mediaType: newItem.mediaType,
      mediaUrl: newItem.mediaUrl || undefined,
      category: activeCategory,
      tags: newItem.tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString()
    };

    setItems(prev => [entry, ...prev]);
    setNewItem({ title: '', content: '', tags: '', mediaType: 'text', mediaUrl: '' });
    setIsAdding(false);
  };

  // --- Trash system ---
  const requestDeleteItem = (id: string) => {
    setConfirmState({
      isOpen: true, type: 'delete_item', itemId: id,
      title: 'Move to Trash?',
      message: 'This item will be moved to the trash. You can restore it later.'
    });
  };

  const requestDeleteForever = (id: string) => {
    setConfirmState({
      isOpen: true, type: 'delete_forever', itemId: id,
      title: 'Permanently Delete?',
      message: 'This cannot be undone. The item will be removed forever.'
    });
  };

  const requestEmptyTrash = () => {
    if (trash.length === 0) return;
    setConfirmState({
      isOpen: true, type: 'empty_trash',
      title: 'Empty Trash?',
      message: 'Are you sure you want to permanently delete ALL items in the trash? This cannot be undone.'
    });
  };

  const handleConfirmAction = () => {
    const { type, itemId } = confirmState;
    if (type === 'delete_item' && itemId) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        setTrash(prev => [item, ...prev]);
        setItems(prev => prev.filter(i => i.id !== itemId));

      }
    } else if (type === 'delete_forever' && itemId) {
      setTrash(prev => prev.filter(i => i.id !== itemId));
    } else if (type === 'empty_trash') {
      setTrash([]);
    }
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  const handleRestore = (id: string) => {
    const item = trash.find(i => i.id === id);
    if (item) {
      setItems(prev => [item, ...prev]);
      setTrash(prev => prev.filter(i => i.id !== id));
    }
  };

  // --- Inline editing ---
  const startEditing = (id: string, field: 'title' | 'content', value: string) => {
    setEditingId(id);
    setEditField(field);
    setEditValue(value);
  };

  const saveEdit = () => {
    if (editingId && editField) {
      setItems(prev => prev.map(item => {
        if (item.id === editingId) {
          return { ...item, [editField]: editValue };
        }
        return item;
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredItems = items.filter(item =>
    item.category === activeCategory &&
    (item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const getMediaIcon = (type: SwipefileMediaType) => {
    switch (type) {
      case 'image': return <Image size={10} />;
      case 'video': return <Video size={10} />;
      default: return <FileText size={10} />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Lightbox */}
      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      {/* Confirm Dialog */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{confirmState.title}</h3>
              <p className="text-gray-400 text-sm mb-6">{confirmState.message}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setConfirmState(prev => ({...prev, isOpen: false}))} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors">Cancel</button>
                <button onClick={handleConfirmAction} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-rose-900/20">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileImport}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Swipefile Library</h2>
          <p className="text-gray-500 text-sm">Collect and organize your best assets.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-48 placeholder-gray-600"
            />
          </div>
          {viewMode === 'library' && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-700"
                title="Import from computer"
              >
                <Upload size={16} />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Plus size={16} className={isAdding ? 'rotate-45 transition-transform' : ''} />
                <span>{isAdding ? 'Cancel' : 'Add New'}</span>
              </button>
            </>
          )}
          {viewMode === 'trash' && trash.length > 0 && (
            <button
              onClick={requestEmptyTrash}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg text-sm font-semibold transition-colors"
            >
              <Trash2 size={16} />
              <span>Empty Trash</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {viewMode === 'library' && (
        <div className="border-b border-gray-800 overflow-x-auto">
          <div className="flex gap-6 pb-px min-w-max">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 pb-3 text-sm font-medium transition-all border-b-2 ${
                    isActive
                      ? 'text-emerald-400 border-emerald-400'
                      : 'text-gray-500 border-transparent hover:text-gray-300'
                  }`}
                >
                  <cat.icon size={16} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* View Switcher */}
      <div className="flex justify-start">
        <div className="bg-gray-900 p-1 rounded-lg border border-gray-800 flex items-center">
          <button
            onClick={() => setViewMode('library')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'library' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Archive size={16} />
            Library
          </button>
          <button
            onClick={() => setViewMode('trash')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'trash'
                ? 'bg-rose-900/20 text-rose-400 shadow-sm'
                : 'text-gray-500 hover:text-rose-400 hover:bg-rose-900/10'
            }`}
          >
            <Trash2 size={16} />
            Trash
          </button>
        </div>
      </div>

      {/* Add Form */}
      {isAdding && viewMode === 'library' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-in slide-in-from-top-2">
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 font-medium ml-1">Type</label>
              <div className="flex gap-2">
                {MEDIA_TYPE_OPTIONS.map(opt => {
                  const active = newItem.mediaType === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => setNewItem({ ...newItem, mediaType: opt.value })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        active ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-gray-950 border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
                      }`}>
                      <opt.icon size={16} />{opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 font-medium ml-1">Title</label>
              <input type="text" required placeholder="e.g. High Converting VSL Hook" value={newItem.title}
                onChange={e => setNewItem({...newItem, title: e.target.value})}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>

            {newItem.mediaType !== 'text' && (
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-medium ml-1">
                  {newItem.mediaType === 'image' ? 'Image URL' : 'Video URL'}
                </label>
                <div className="flex gap-2">
                  <input type="text" required={!newItem.mediaUrl}
                    placeholder={newItem.mediaType === 'image' ? 'https://example.com/image.jpg' : 'https://youtube.com/watch?v=...'}
                    value={newItem.mediaUrl}
                    onChange={e => handleMediaUrlChange(e.target.value)}
                    className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-700">
                    <Upload size={14} /> File
                  </button>
                </div>
                {newItem.mediaUrl && isUrl(newItem.mediaUrl) && newItem.mediaType === 'image' && (
                  <div className="mt-2 rounded-lg overflow-hidden bg-gray-950 max-h-40">
                    <img src={newItem.mediaUrl} alt="Preview" className="max-h-40 object-contain mx-auto" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
                {newItem.mediaUrl && getYouTubeId(newItem.mediaUrl) && (
                  <div className="mt-2 rounded-lg overflow-hidden bg-gray-950 max-h-40">
                    <img src={`https://img.youtube.com/vi/${getYouTubeId(newItem.mediaUrl)}/mqdefault.jpg`} alt="YouTube Preview" className="max-h-40 object-contain mx-auto" />
                  </div>
                )}
                {newItem.mediaUrl && newItem.mediaUrl.startsWith('data:image/') && (
                  <div className="mt-2 rounded-lg overflow-hidden bg-gray-950 max-h-40">
                    <img src={newItem.mediaUrl} alt="Imported Preview" className="max-h-40 object-contain mx-auto" />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 font-medium ml-1">
                {newItem.mediaType === 'text' ? 'Content / URL' : 'Notes (optional)'}
              </label>
              <textarea required={newItem.mediaType === 'text'}
                placeholder={newItem.mediaType === 'text' ? 'Paste text or URL here...' : 'Add notes about this asset...'}
                value={newItem.content}
                onChange={e => setNewItem({...newItem, content: e.target.value})}
                className="w-full h-24 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 font-medium ml-1">Tags (comma separated)</label>
              <input type="text" placeholder="e.g. hook, viral, q3" value={newItem.tags}
                onChange={e => setNewItem({...newItem, tags: e.target.value})}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20">
                Save Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Library Grid */}
      {viewMode === 'library' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all group flex flex-col justify-between h-full">
                <div className="p-5 pb-0 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                        item.mediaType === 'image' ? 'bg-blue-500/10 text-blue-400' :
                        item.mediaType === 'video' ? 'bg-purple-500/10 text-purple-400' :
                        'bg-gray-800 text-gray-500'
                      }`}>
                        {getMediaIcon(item.mediaType || 'text')}
                        {(item.mediaType || 'text').charAt(0).toUpperCase() + (item.mediaType || 'text').slice(1)}
                      </span>
                      {/* Inline title editing */}
                      {editingId === item.id && editField === 'title' ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                            autoFocus
                            className="flex-1 bg-gray-950 border border-emerald-500/50 rounded px-2 py-0.5 text-sm text-white focus:outline-none"
                          />
                          <button onClick={saveEdit} className="p-0.5 text-emerald-500 hover:text-emerald-400"><Check size={14} /></button>
                          <button onClick={cancelEdit} className="p-0.5 text-gray-500 hover:text-gray-300"><X size={14} /></button>
                        </div>
                      ) : (
                        <h3
                          className="font-semibold text-gray-200 line-clamp-1 text-sm cursor-pointer hover:text-emerald-400 transition-colors"
                          onClick={() => startEditing(item.id, 'title', item.title)}
                          title="Click to edit title"
                        >
                          {item.title}
                        </h3>
                      )}
                    </div>
                    <button onClick={() => requestDeleteItem(item.id)}
                      className="text-gray-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-2">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <MediaPreview item={{ ...item, mediaType: item.mediaType || 'text' }} onExpand={(url) => setLightboxUrl(url)} />

                  {/* Inline content/notes editing */}
                  {item.mediaType !== 'text' && item.content && editingId !== item.id ? (
                    <div
                      className="bg-gray-950/50 rounded-lg p-2 text-[11px] text-gray-500 line-clamp-2 cursor-pointer hover:text-gray-400 transition-colors"
                      onClick={() => startEditing(item.id, 'content', item.content)}
                      title="Click to edit notes"
                    >
                      {item.content}
                    </div>
                  ) : item.mediaType !== 'text' && !item.content && editingId !== item.id ? (
                    <div
                      className="bg-gray-950/50 rounded-lg p-2 text-[11px] text-gray-600 cursor-pointer hover:text-gray-500 transition-colors italic"
                      onClick={() => startEditing(item.id, 'content', '')}
                      title="Click to add notes"
                    >
                      Add notes...
                    </div>
                  ) : null}

                  {item.mediaType === 'text' && editingId === item.id && editField === 'content' ? (
                    <div className="space-y-1">
                      <textarea
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
                        autoFocus
                        className="w-full h-24 bg-gray-950 border border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none font-mono"
                      />
                      <div className="flex justify-end gap-1">
                        <button onClick={cancelEdit} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-300">Cancel</button>
                        <button onClick={saveEdit} className="px-2 py-1 text-xs text-emerald-500 hover:text-emerald-400 font-medium">Save</button>
                      </div>
                    </div>
                  ) : item.mediaType === 'text' && !(editingId === item.id && editField === 'content') ? (
                    <div
                      className="bg-gray-950/50 rounded-lg p-3 text-xs text-gray-400 font-mono break-all line-clamp-4 cursor-pointer hover:text-gray-300 transition-colors"
                      onClick={() => startEditing(item.id, 'content', item.content)}
                      title="Click to edit content"
                    >
                      {item.content}
                    </div>
                  ) : null}

                  {/* Notes editing for image/video */}
                  {item.mediaType !== 'text' && editingId === item.id && editField === 'content' && (
                    <div className="space-y-1">
                      <textarea
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
                        autoFocus
                        placeholder="Add notes..."
                        className="w-full h-16 bg-gray-950 border border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
                      />
                      <div className="flex justify-end gap-1">
                        <button onClick={cancelEdit} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-300">Cancel</button>
                        <button onClick={saveEdit} className="px-2 py-1 text-xs text-emerald-500 hover:text-emerald-400 font-medium">Save</button>
                      </div>
                    </div>
                  )}

                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-gray-800 text-gray-400 border border-gray-700">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-5 pt-3 mt-2 border-t border-gray-800 flex gap-2">
                  <button onClick={() => copyToClipboard(item.mediaUrl || item.content)}
                    className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors">
                    <Copy size={12} /> Copy
                  </button>
                  {(item.mediaUrl || isUrl(item.content)) && !item.mediaUrl?.startsWith('data:') && (
                    <a href={item.mediaUrl || item.content} target="_blank" rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors">
                      <ExternalLink size={12} /> Open
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
              <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center mb-3 text-gray-600">
                <Archive size={24} />
              </div>
              <p>No swipefile items in this category yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Trash View */}
      {viewMode === 'trash' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="overflow-x-auto min-h-[400px]">
            {trash.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-950/50 text-xs uppercase tracking-wider text-gray-500 font-medium border-b border-gray-800">
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 w-1/3">Title</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {trash.map((item) => (
                    <tr key={item.id} className="group hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          item.mediaType === 'image' ? 'bg-blue-500/10 text-blue-400' :
                          item.mediaType === 'video' ? 'bg-purple-500/10 text-purple-400' :
                          'bg-gray-800 text-gray-500'
                        }`}>
                          {getMediaIcon(item.mediaType || 'text')}
                          {(item.mediaType || 'text').charAt(0).toUpperCase() + (item.mediaType || 'text').slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-300 font-medium line-through decoration-gray-600 decoration-2">{item.title}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.category}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => handleRestore(item.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors">
                            <RefreshCcw size={14} /> Restore
                          </button>
                          <button onClick={() => requestDeleteForever(item.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors">
                            <Ban size={14} /> Delete Forever
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-600">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4 text-gray-700">
                  <Trash2 size={32} />
                </div>
                <p className="text-lg font-medium text-gray-500">Trash is empty</p>
                <p className="text-sm">Items moved to trash will appear here.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SwipefileManager;
