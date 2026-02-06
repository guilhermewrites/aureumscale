import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Youtube,
  Instagram,
  Linkedin,
  Video,
  Plus,
  LayoutList,
  Lightbulb,
  Trash2,
  RefreshCcw,
  Ban,
  AlertTriangle,
  X,
} from 'lucide-react';
import { ContentItem, ContentStatus, Platform, ContentIdea } from '../types';
import EditContentModal from './EditContentModal';
import ContentRow from './ContentRow';
import IdeationBoard from './IdeationBoard';
import useLocalStorage from '../hooks/useLocalStorage';
import { supabase } from '../services/supabaseClient';

type ViewMode = 'pipeline' | 'ideation' | 'trash';

type ConfirmType = 'delete_content' | 'delete_idea' | 'restore_content' | 'delete_forever' | 'empty_trash';

interface ConfirmState {
    isOpen: boolean;
    type: ConfirmType;
    itemId?: string;
    title: string;
    message: string;
}

interface ContentManagerProps {
  storagePrefix: string;
}

const ContentManager: React.FC<ContentManagerProps> = ({ storagePrefix }) => {
  const [activePlatform, setActivePlatform] = useState<Platform>(Platform.YOUTUBE);
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');

  // Storage for Content Pipeline - start empty, Supabase will load the real data
  const [items, setItems] = useLocalStorage<ContentItem[]>(`${storagePrefix}_content`, []);
  const [isLoading, setIsLoading] = useState(true);

  // Storage for Ideas
  const [ideas, setIdeas] = useLocalStorage<ContentIdea[]>(`${storagePrefix}_ideas`, []);

  // Storage for Trash
  const [trash, setTrash] = useLocalStorage<ContentItem[]>(`${storagePrefix}_trash`, []);

  // Supabase sync
  const hasLoadedFromSupabase = useRef(false);

  const syncToSupabase = useCallback(async (item: ContentItem, action: 'upsert' | 'delete') => {
    if (!supabase) return;
    try {
      if (action === 'upsert') {
        const { error } = await supabase.from('content_items').upsert({
          id: item.id,
          user_id: storagePrefix,
          title: item.title,
          description: item.description,
          drive_link: item.driveLink,
          script_link: item.scriptLink,
          thumbnail_url: item.thumbnailUrl,
          youtube_url: item.youtubeUrl,
          status: item.status,
          style: item.style,
          team: item.team,
          post_date: item.postDate,
          platform: item.platform,
        });
        if (error) {
          console.error('Supabase upsert error:', error.message);
        }
      } else {
        const { error } = await supabase.from('content_items').delete().eq('id', item.id);
        if (error) {
          console.error('Supabase delete error:', error.message);
        }
      }
    } catch (err) {
      console.error('Supabase sync error:', err);
    }
  }, [storagePrefix]);

  // Load from Supabase on mount (once only)
  useEffect(() => {
    if (hasLoadedFromSupabase.current || !supabase) return;
    hasLoadedFromSupabase.current = true;

    const loadFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('content_items')
          .select('*')
          .eq('user_id', storagePrefix);

        if (error) {
          console.error('Failed to load from Supabase:', error);
          return;
        }

        if (data && data.length > 0) {
          // Build a map of latest team member data from localStorage
          let persistedMembers: Record<string, any> = {};
          try {
            const stored = localStorage.getItem(`${storagePrefix}_team`);
            if (stored) {
              const members = JSON.parse(stored);
              members.forEach((m: any) => { persistedMembers[m.id] = m; });
            }
          } catch {}

          const supabaseItems: ContentItem[] = data.map(row => {
            // Enrich team members with latest localStorage data (photos, etc.)
            const rawTeam = row.team || [];
            const enrichedTeam = rawTeam.map((t: any) => persistedMembers[t.id] || t);

            return {
              id: row.id,
              title: row.title,
              description: row.description || undefined,
              driveLink: row.drive_link || '',
              scriptLink: row.script_link || undefined,
              thumbnailUrl: row.thumbnail_url || undefined,
              youtubeUrl: row.youtube_url || undefined,
              status: row.status as ContentStatus,
              style: row.style || undefined,
              team: enrichedTeam,
              postDate: row.post_date || '',
              platform: row.platform as Platform,
            };
          });

          // Replace with Supabase data - Supabase is the source of truth
          setItems(supabaseItems);
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Supabase load error:', err);
        setIsLoading(false);
      }
    };
    loadFromSupabase();
  }, [storagePrefix, setItems]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | undefined>(undefined);

  // Confirmation Dialog State
  const [confirmState, setConfirmState] = useState<ConfirmState>({
      isOpen: false,
      type: 'delete_content',
      title: '',
      message: ''
  });

  const filteredContent = items.filter(item => item.platform === activePlatform);
  const filteredIdeas = ideas.filter(idea => idea.platform === activePlatform);

  const tabs = [
    { id: Platform.YOUTUBE, icon: Youtube, label: 'YouTube' },
    { id: Platform.INSTAGRAM, icon: Instagram, label: 'Instagram' },
    { id: Platform.TIKTOK, icon: Video, label: 'TikTok' },
    { id: Platform.LINKEDIN, icon: Linkedin, label: 'LinkedIn' },
  ];

  // --- Actions ---

  const handleConfirmAction = () => {
      const { type, itemId } = confirmState;

      if (type === 'delete_content' && itemId) {
        const itemToDelete = items.find(i => i.id === itemId);
        if (itemToDelete) {
            setTrash(prev => [itemToDelete, ...prev]);
            setItems(prev => prev.filter(item => item.id !== itemId));
            // Delete from Supabase
            syncToSupabase(itemToDelete, 'delete');
        }
        if (editingItem?.id === itemId) {
            setIsModalOpen(false);
            setEditingItem(undefined);
        }
      } else if (type === 'delete_idea' && itemId) {
         setIdeas(prev => prev.filter(idea => idea.id !== itemId));
      } else if (type === 'delete_forever' && itemId) {
         const itemToDelete = trash.find(i => i.id === itemId);
         if (itemToDelete) {
           syncToSupabase(itemToDelete, 'delete');
         }
         setTrash(prev => prev.filter(i => i.id !== itemId));
      } else if (type === 'empty_trash') {
         // Delete all trash items from Supabase
         trash.forEach(item => syncToSupabase(item, 'delete'));
         setTrash([]);
      } else if (type === 'restore_content' && itemId) {
         const itemToRestore = trash.find(i => i.id === itemId);
         if (itemToRestore) {
            setItems(prev => [...prev, itemToRestore]);
            setTrash(prev => prev.filter(i => i.id !== itemId));
            // Re-add to Supabase
            syncToSupabase(itemToRestore, 'upsert');
         }
      }

      setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  // --- Wrappers for Buttons ---

  const requestDeleteContent = (id: string) => {
      setConfirmState({
          isOpen: true,
          type: 'delete_content',
          itemId: id,
          title: 'Move to Trash?',
          message: 'This item will be moved to the trash. You can restore it later.'
      });
  };

  const requestDeleteIdea = (id: string) => {
    setConfirmState({
        isOpen: true,
        type: 'delete_idea',
        itemId: id,
        title: 'Delete Idea?',
        message: 'This action cannot be undone. Are you sure you want to delete this idea?'
    });
  };

  const requestDeleteForever = (id: string) => {
    setConfirmState({
        isOpen: true,
        type: 'delete_forever',
        itemId: id,
        title: 'Permanently Delete?',
        message: 'This cannot be undone. The item will be removed forever.'
    });
  };

  const requestEmptyTrash = () => {
    if (trash.length === 0) return;
    setConfirmState({
        isOpen: true,
        type: 'empty_trash',
        title: 'Empty Trash?',
        message: 'Are you sure you want to permanently delete ALL items in the trash? This cannot be undone.'
    });
  };

  const requestRestore = (id: string) => {
      // Direct restore usually doesn't need confirmation
      const itemToRestore = trash.find(i => i.id === id);
      if (itemToRestore) {
        setItems(prev => [...prev, itemToRestore]);
        setTrash(prev => prev.filter(i => i.id !== id));
        syncToSupabase(itemToRestore, 'upsert');
      }
  };

  // --- Content Pipeline Handlers ---

  const handleAddNewContent = () => {
    setEditingItem(undefined);
    setIsModalOpen(true);
  };

  const handleEditContent = (item: ContentItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleUpdateItem = (updatedItem: ContentItem) => {
    // Enrich team with latest member data before persisting
    let enrichedItem = updatedItem;
    try {
      const stored = localStorage.getItem(`${storagePrefix}_team`);
      if (stored) {
        const members = JSON.parse(stored);
        const memberMap = new Map(members.map((m: any) => [m.id, m]));
        enrichedItem = {
          ...updatedItem,
          team: updatedItem.team.map(t => (memberMap.get(t.id) as any) || t),
        };
      }
    } catch {}
    setItems(prev => prev.map(item => item.id === enrichedItem.id ? enrichedItem : item));
    syncToSupabase(enrichedItem, 'upsert');
  };

  const handleSaveContent = (newItem: ContentItem) => {
    if (editingItem) {
      handleUpdateItem(newItem);
    } else {
      setItems(prev => [...prev, newItem]);
      syncToSupabase(newItem, 'upsert');
    }
    setIsModalOpen(false);
    setEditingItem(undefined);
  };

  const handleDemoteContent = (item: ContentItem) => {
    const newIdea: ContentIdea = {
        id: Date.now().toString(),
        text: item.title,
        platform: item.platform,
        createdAt: new Date().toISOString(),
        transcript: item.description || ''
    };
    setIdeas(prev => [newIdea, ...prev]);
    setItems(prev => prev.filter(i => i.id !== item.id));
    syncToSupabase(item, 'delete');
    setViewMode('ideation');
  };

  // --- Ideation Handlers ---

  const handleAddIdea = (text: string) => {
    const newIdea: ContentIdea = {
      id: Date.now().toString(),
      text,
      platform: activePlatform,
      createdAt: new Date().toISOString(),
      transcript: ''
    };
    setIdeas(prev => [newIdea, ...prev]);
  };

  const handleUpdateIdea = (updatedIdea: ContentIdea) => {
    setIdeas(prev => prev.map(idea => idea.id === updatedIdea.id ? updatedIdea : idea));
  };

  const handlePromoteIdea = (idea: ContentIdea) => {
    const newItem: ContentItem = {
      id: Date.now().toString(),
      title: idea.text,
      description: idea.transcript,
      driveLink: '',
      status: ContentStatus.PENDING,
      team: [],
      postDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      platform: activePlatform
    };
    setItems(prev => [...prev, newItem]);
    syncToSupabase(newItem, 'upsert');
    setIdeas(prev => prev.filter(i => i.id !== idea.id));
    setViewMode('pipeline');
  };

  // Helper to render platform icon
  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case Platform.YOUTUBE: return <Youtube size={14} />;
      case Platform.INSTAGRAM: return <Instagram size={14} />;
      case Platform.TIKTOK: return <Video size={14} />;
      case Platform.LINKEDIN: return <Linkedin size={14} />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* CONFIRMATION DIALOG */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-[#3a3a3a] rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={24} className="text-amber-500" />
                    </div>
                    <h3 className="text-lg font-bold text-[#ECECEC] mb-2">{confirmState.title}</h3>
                    <p className="text-[#9B9B9B] text-sm mb-6">{confirmState.message}</p>

                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => setConfirmState(prev => ({...prev, isOpen: false}))}
                            className="px-4 py-2 bg-[#3a3a3a] hover:bg-[#3a3a3a] text-[#ECECEC] rounded-lg text-sm font-medium transition-none"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmAction}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-[#ECECEC] rounded-lg text-sm font-medium transition-none shadow-lg shadow-rose-900/20"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      <EditContentModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingItem(undefined); }}
        onSave={handleSaveContent}
        onDelete={editingItem ? requestDeleteContent : undefined}
        initialData={editingItem}
        defaultPlatform={activePlatform}
        storagePrefix={storagePrefix}
      />

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold text-[#ECECEC]">Content Hub</h2>
           <p className="text-[#9B9B9B] text-sm">Manage creation, review, and publishing schedules.</p>
        </div>
        {viewMode === 'pipeline' && (
          <button
              onClick={handleAddNewContent}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-[#212121] rounded-lg text-sm font-semibold hover:bg-[#e5e5e5] transition-none"
          >
            <Plus size={16} />
            <span>Add Content</span>
          </button>
        )}
        {viewMode === 'trash' && trash.length > 0 && (
          <button
              onClick={requestEmptyTrash}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg text-sm font-semibold transition-none cursor-pointer"
          >
            <Trash2 size={16} />
            <span>Empty Trash</span>
          </button>
        )}
      </div>

      {/* Navigation / Tabs */}
      <div className="flex flex-col space-y-4">
        {/* Only show Platform tabs if NOT in Trash mode */}
        {viewMode !== 'trash' && (
            <div className="border-b border-[#3a3a3a]">
            <div className="flex gap-1 overflow-x-auto pb-1">
                {tabs.map((tab) => {
                const isActive = activePlatform === tab.id;
                return (
                    <button
                    key={tab.id}
                    onClick={() => setActivePlatform(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-medium transition-none whitespace-nowrap ${
                        isActive
                        ? 'border-[#ECECEC] text-[#ECECEC] bg-[rgba(255,255,255,0.05)] rounded-t-lg'
                        : 'border-transparent text-[#9B9B9B] hover:text-[#ECECEC] hover:bg-[rgba(255,255,255,0.05)] rounded-t-lg'
                    }`}
                    >
                    <tab.icon size={18} className={isActive ? 'text-[#ECECEC]' : ''} />
                    {tab.label}
                    </button>
                );
                })}
            </div>
            </div>
        )}

        {/* View Switcher (Pipeline vs Ideation vs Trash) */}
        <div className="flex justify-start">
          <div className="bg-[#2f2f2f] p-1 rounded-lg border border-[#3a3a3a] flex items-center">
             <button
                onClick={() => setViewMode('pipeline')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-none ${
                   viewMode === 'pipeline'
                      ? 'bg-[#3a3a3a] text-[#ECECEC] shadow-sm'
                      : 'text-[#9B9B9B] hover:text-[#ECECEC]'
                }`}
             >
                <LayoutList size={16} />
                Pipeline
             </button>
             <button
                onClick={() => setViewMode('ideation')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-none ${
                   viewMode === 'ideation'
                      ? 'bg-[#3a3a3a] text-[#ECECEC] shadow-sm'
                      : 'text-[#9B9B9B] hover:text-[#ECECEC]'
                }`}
             >
                <Lightbulb size={16} />
                Ideation
             </button>
             <button
                onClick={() => setViewMode('trash')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-none ${
                   viewMode === 'trash'
                      ? 'bg-rose-900/20 text-rose-400 shadow-sm'
                      : 'text-[#9B9B9B] hover:text-rose-400 hover:bg-rose-900/10'
                }`}
             >
                <Trash2 size={16} />
                Trash
             </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'pipeline' && (
        <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#212121] text-xs uppercase tracking-wider text-[#9B9B9B] font-medium border-b border-[#3a3a3a]">
                  <th className="px-6 py-4 w-[40%]">Title</th>
                  <th className="px-3 py-4 text-center w-16">Drive</th>
                  <th className="px-3 py-4 text-center w-16">Script</th>
                  <th className="px-3 py-4 w-24">Status</th>
                  <th className="px-3 py-4 w-24">Style</th>
                  <th className="px-3 py-4 w-24">Team</th>
                  <th className="px-4 py-4 text-right w-28">Post Date</th>
                  <th className="px-2 py-4 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3a3a3a]">
                {filteredContent.length > 0 ? (
                  filteredContent.map((item) => (
                      <ContentRow
                          key={item.id}
                          item={item}
                          onUpdate={handleUpdateItem}
                          onDelete={requestDeleteContent}
                          onDemote={handleDemoteContent}
                          onEdit={handleEditContent}
                          storagePrefix={storagePrefix}
                      />
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-[#9B9B9B]">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-[#666666]">
                          <Plus size={24} />
                        </div>
                        <p>No content scheduled for {activePlatform}.</p>
                        <button onClick={handleAddNewContent} className="text-sm text-[#ECECEC] hover:text-[#ECECEC] font-medium">Create your first post</button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'ideation' && (
        <IdeationBoard
           platform={activePlatform}
           ideas={filteredIdeas}
           onAdd={handleAddIdea}
           onUpdate={handleUpdateIdea}
           onDelete={requestDeleteIdea}
           onPromote={handlePromoteIdea}
        />
      )}

      {viewMode === 'trash' && (
        <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-300">
             <div className="overflow-x-auto min-h-[400px]">
                {trash.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#212121] text-xs uppercase tracking-wider text-[#9B9B9B] font-medium border-b border-[#3a3a3a]">
                        <th className="px-6 py-4">Platform</th>
                        <th className="px-6 py-4 w-1/3">Title</th>
                        <th className="px-6 py-4">Original Date</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3a3a3a]">
                        {trash.map((item) => (
                            <tr key={item.id} className="group hover:bg-[rgba(255,255,255,0.05)] transition-none">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-[#9B9B9B]">
                                        {getPlatformIcon(item.platform)}
                                        <span className="text-sm">{item.platform}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[#b4b4b4] font-medium line-through decoration-[#666666] decoration-2">{item.title}</span>
                                    {item.description && <p className="text-xs text-[#666666] truncate max-w-xs">{item.description}</p>}
                                </td>
                                <td className="px-6 py-4 text-sm text-[#9B9B9B]">
                                    {item.postDate}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        <button
                                            onClick={() => requestRestore(item.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-none"
                                            title="Restore to Pipeline"
                                        >
                                            <RefreshCcw size={14} /> Restore
                                        </button>
                                        <button
                                            onClick={() => requestDeleteForever(item.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-none"
                                            title="Delete Forever"
                                        >
                                            <Ban size={14} /> Delete Forever
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    </table>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-[#666666]">
                        <div className="w-16 h-16 bg-[rgba(255,255,255,0.05)] rounded-full flex items-center justify-center mb-4 text-[#666666]">
                            <Trash2 size={32} />
                        </div>
                        <p className="text-lg font-medium text-[#9B9B9B]">Trash is empty</p>
                        <p className="text-sm">Items moved to trash will appear here.</p>
                    </div>
                )}
             </div>
        </div>
      )}
    </div>
  );
};

export default ContentManager;
