import React, { useState } from 'react';
import { Plus, Trash2, ArrowRightCircle, Sparkles, StickyNote, FileText, X, Save } from 'lucide-react';
import { ContentIdea, Platform } from '../types';

interface IdeationBoardProps {
  platform: Platform;
  ideas: ContentIdea[];
  onAdd: (text: string) => void;
  onUpdate: (idea: ContentIdea) => void;
  onDelete: (id: string) => void;
  onPromote: (idea: ContentIdea) => void;
}

const IdeationBoard: React.FC<IdeationBoardProps> = ({ 
  platform, 
  ideas, 
  onAdd, 
  onUpdate,
  onDelete, 
  onPromote 
}) => {
  const [newIdeaText, setNewIdeaText] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);

  // Form state for the modal
  const [modalText, setModalText] = useState('');
  const [modalTranscript, setModalTranscript] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newIdeaText.trim()) {
      onAdd(newIdeaText.trim());
      setNewIdeaText('');
    }
  };

  const openModal = (idea: ContentIdea) => {
    setSelectedIdea(idea);
    setModalText(idea.text);
    setModalTranscript(idea.transcript || '');
  };

  const closeModal = () => {
    setSelectedIdea(null);
  };

  const saveChanges = () => {
    if (selectedIdea) {
      onUpdate({
        ...selectedIdea,
        text: modalText,
        transcript: modalTranscript
      });
      closeModal();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Modal for Detailed Editing */}
      {selectedIdea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-gray-800">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles size={20} className="text-emerald-400" />
                    Edit Idea
                 </h2>
                 <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors">
                    <X size={24} />
                 </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Idea / Topic</label>
                    <input 
                      type="text" 
                      value={modalText} 
                      onChange={(e) => setModalText(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                       <FileText size={16} /> Transcript / Notes
                    </label>
                    <textarea 
                       value={modalTranscript}
                       onChange={(e) => setModalTranscript(e.target.value)}
                       placeholder="Paste transcript or write detailed notes here..."
                       className="w-full h-64 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none font-mono text-sm leading-relaxed"
                    />
                 </div>
              </div>

              <div className="p-6 border-t border-gray-800 flex justify-end gap-3 bg-gray-900/50 rounded-b-2xl">
                 <button onClick={closeModal} className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium">Cancel</button>
                 <button 
                    onClick={saveChanges}
                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                 >
                    <Save size={16} /> Save Changes
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Input Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-emerald-400" />
            <span>Brainstorming for {platform}</span>
        </h3>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                <StickyNote size={18} />
             </div>
             <input 
                type="text"
                value={newIdeaText}
                onChange={(e) => setNewIdeaText(e.target.value)}
                placeholder={`Type a new idea for ${platform}...`}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
             />
          </div>
          <button 
            type="submit"
            disabled={!newIdeaText.trim()}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <Plus size={18} />
            Add Idea
          </button>
        </form>
      </div>

      {/* Grid of Ideas */}
      {ideas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ideas.map((idea) => (
            <div 
                key={idea.id} 
                onClick={() => openModal(idea)}
                className="group bg-gray-900 border border-gray-800 hover:border-gray-700 p-5 rounded-2xl transition-all duration-200 hover:shadow-xl hover:shadow-black/20 flex flex-col justify-between min-h-[160px] cursor-pointer relative"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                   <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{new Date(idea.createdAt).toLocaleDateString()}</span>
                   <div className="flex items-center gap-2">
                       {idea.transcript && (
                           <div className="text-emerald-500 bg-emerald-500/10 p-1 rounded" title="Has Transcript">
                               <FileText size={12} />
                           </div>
                       )}
                       <button 
                         onClick={(e) => {
                             e.stopPropagation();
                             onDelete(idea.id);
                         }}
                         className="text-gray-600 hover:text-rose-500 p-1 rounded-md hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                         title="Delete Idea"
                       >
                         <Trash2 size={16} />
                       </button>
                   </div>
                </div>
                <p className="text-gray-200 font-medium leading-relaxed line-clamp-3">{idea.text}</p>
                {idea.transcript && (
                    <p className="mt-2 text-xs text-gray-500 line-clamp-2 italic font-mono bg-gray-950/50 p-2 rounded border border-gray-800/50">
                        {idea.transcript}
                    </p>
                )}
              </div>

              <div className="pt-4 mt-2 border-t border-gray-800/50 flex justify-end">
                 <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onPromote(idea);
                    }}
                    className="flex items-center gap-2 text-xs font-semibold text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-2 rounded-lg transition-colors w-full justify-center group/btn"
                 >
                    <span>Move to Pipeline</span>
                    <ArrowRightCircle size={14} className="transition-transform group-hover/btn:translate-x-1" />
                 </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-600 border-2 border-dashed border-gray-800 rounded-2xl bg-gray-900/30">
           <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
             <StickyNote size={32} className="text-gray-500" />
           </div>
           <p className="text-lg font-medium text-gray-400">No ideas yet</p>
           <p className="text-sm">Start typing above to capture your thoughts.</p>
        </div>
      )}
    </div>
  );
};

export default IdeationBoard;