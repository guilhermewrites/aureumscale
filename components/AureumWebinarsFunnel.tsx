import React, { useState } from 'react';
import { FileText, Send } from 'lucide-react';
import { BackgroundPaths } from '@/components/ui/background-paths';
import FunnelCommunications from './FunnelCommunications';

const FUNNEL_ID = 'aureum-webinars';
const FUNNEL_NAME = 'Aureum Webinars';

interface Props {
  storagePrefix: string;
}

type View = 'pages' | 'communications';

const AureumWebinarsFunnel: React.FC<Props> = ({ storagePrefix }) => {
  const [view, setView] = useState<View>('pages');

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Animated background paths — visible around the iframe */}
      {view === 'pages' && (
        <div className="absolute inset-0 z-0">
          <BackgroundPaths title={FUNNEL_NAME} />
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-[#ECECEC]">{FUNNEL_NAME}</h1>
          <p className="text-xs text-[#555] mt-0.5">
            {view === 'pages' ? 'Live funnel preview' : 'Email, SMS & Telegram broadcasts'}
          </p>
        </div>
        {view === 'pages' && (
          <a
            href="/funnels/aureum-webinars/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2a2a2a]/80 hover:bg-[#333]/80 text-[#ECECEC] text-xs font-medium backdrop-blur-sm transition-none"
          >
            Open full page ↗
          </a>
        )}
      </div>

      {/* Top-level view tabs */}
      <div className="relative z-10 flex gap-1 mb-3 flex-shrink-0 bg-[#1a1a1a]/80 backdrop-blur-sm rounded-lg p-1 self-start">
        <button
          onClick={() => setView('pages')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            view === 'pages' ? 'bg-[#2a2a2a] text-[#ECECEC]' : 'text-[#666] hover:text-[#999]'
          }`}
        >
          <FileText size={12} /> Pages
        </button>
        <button
          onClick={() => setView('communications')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            view === 'communications' ? 'bg-[#2a2a2a] text-[#ECECEC]' : 'text-[#666] hover:text-[#999]'
          }`}
        >
          <Send size={12} /> Communications
        </button>
      </div>

      {view === 'pages' ? (
        <div className="relative z-10 flex-1 flex items-center justify-center min-h-0 py-4">
          <div className="w-[90%] h-[85%] rounded-xl overflow-hidden border border-[#2a2a2a] shadow-2xl">
            <iframe
              src="/funnels/aureum-webinars/index.html"
              className="w-full h-full"
              title={`${FUNNEL_NAME} Funnel`}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex-1 min-h-0">
          <FunnelCommunications funnelId={FUNNEL_ID} storagePrefix={storagePrefix} funnelName={FUNNEL_NAME} />
        </div>
      )}
    </div>
  );
};

export default AureumWebinarsFunnel;
