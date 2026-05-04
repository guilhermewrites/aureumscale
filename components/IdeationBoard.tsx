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
           <div className="bg-[#0d0d0d] border border-[#242424] rounded-none-none w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-[#242424]">
                 <h2 className="text-xl font-bold text-[#f4f4f4] flex items-center gap-2">
                    <Sparkles size={20} className="text-[#f4f4f4]" />
                    Edit Idea
                 </h2>
                 <button onClick={closeModal} className="text-[#909090] hover:text-white transition-none">
                    <X size={24} />
                 </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-[#909090]">Idea / Topic</label>
                    <input
                      type="text"
                      value={modalText}
                      onChange={(e) => setModalText(e.target.value)}
                      className="w-full bg-[#000] border border-[#242424] rounded-none-none px-4 py-3 text-[#f4f4f4] focus:outline-none focus:ring-2 focus:ring-[#555555]"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-medium text-[#909090] flex items-center gap-2">
                       <FileText size={16} /> Transcript / Notes
                    </label>
                    <textarea
                       value={modalTranscript}
                       onChange={(e) => setModalTranscript(e.target.value)}
                       placeholder="Paste transcript or write detailed notes here..."
                       className="w-full h-64 bg-[#000] border border-[#242424] rounded-none-none px-4 py-3 text-[#f4f4f4] focus:outline-none focus:ring-2 focus:ring-[#555555] resize-none font-mono text-sm leading-relaxed"
                    />
                 </div>
              </div>

              <div className="p-6 border-t border-[#242424] flex justify-end gap-3 bg-[#0d0d0d] rounded-none-none">
                 <button onClick={closeModal} className="px-4 py-2 text-[#909090] hover:text-white text-sm font-medium">Cancel</button>
                 <button
                    onClick={saveChanges}
                    className="px-6 py-2 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-none-none text-sm font-semibold flex items-center gap-2"
                 >
                    <Save size={16} /> Save Changes
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Input Section */}
      <div className="bg-[#0d0d0d] border border-[#242424] rounded-none-none p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[#f4f4f4] mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-[#f4f4f4]" />
            <span>Brainstorming for {platform}</span>
        </h3>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#909090]">
                <StickyNote size={18} />
             </div>
             <input
                type="text"
                value={newIdeaText}
                onChange={(e) => setNewIdeaText(e.target.value)}
                placeholder={`Type a new idea for ${platform}...`}
                className="w-full bg-[#000] border border-[#242424] rounded-none-none pl-12 pr-4 py-3 text-[#f4f4f4] placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#555555] transition-none"
             />
          </div>
          <button
            type="submit"
            disabled={!newIdeaText.trim()}
            className="px-6 py-3 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-none-none font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-none flex items-center gap-2"
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
                className="group bg-[#0d0d0d] border border-[#242424] hover:border-[#4a4a4a] p-5 rounded-none-none transition-none hover:shadow-xl hover:shadow-black/20 flex flex-col justify-between min-h-[160px] cursor-pointer relative"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                   <span className="text-[10px] uppercase tracking-wider text-[#909090] font-semibold">{new Date(idea.createdAt).toLocaleDateString()}</span>
                   <div className="flex items-center gap-2">
                       {idea.transcript && (
                           <div className="text-[#f4f4f4] bg-[rgba(255,255,255,0.08)] p-1 rounded-none" title="Has Transcript">
                               <FileText size={12} />
                           </div>
                       )}
                       <button
                         onClick={(e) => {
                             e.stopPropagation();
                             onDelete(idea.id);
                         }}
                         className="text-[#666666] hover:text-rose-500 p-1 rounded-none-none hover:bg-rose-500/10 transition-none opacity-0 group-hover:opacity-100"
                         title="Delete Idea"
                       >
                         <Trash2 size={16} />
                       </button>
                   </div>
                </div>
                <p className="text-[#f4f4f4] font-medium leading-relaxed line-clamp-3">{idea.text}</p>
                {idea.transcript && (
                    <p className="mt-2 text-xs text-[#909090] line-clamp-2 italic font-mono bg-[#000] p-2 rounded-none border border-[#242424]">
                        {idea.transcript}
                    </p>
                )}
              </div>

              <div className="pt-4 mt-2 border-t border-[#242424] flex justify-end">
                 <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onPromote(idea);
                    }}
                    className="flex items-center gap-2 text-xs font-semibold text-[#f4f4f4] hover:text-[#f4f4f4] bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.1)] px-3 py-2 rounded-none-none transition-none w-full justify-center group/btn"
                 >
                    <span>Move to Pipeline</span>
                    <ArrowRightCircle size={14} className="transition-transform group-hover/btn:translate-x-1" />
                 </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-[#666666] border-2 border-dashed border-[#242424] rounded-none-none bg-[rgba(255,255,255,0.05)]">
           <div className="w-16 h-16 bg-[rgba(255,255,255,0.05)] rounded-none-full flex items-center justify-center mb-4">
             <StickyNote size={32} className="text-[#909090]" />
           </div>
           <p className="text-lg font-medium text-[#909090]">No ideas yet</p>
           <p className="text-sm">Start typing above to capture your thoughts.</p>
        </div>
      )}
    </div>
  );
};

export default IdeationBoard;
