import React, { useState } from 'react';
import { FileText, Send } from 'lucide-react';
import FunnelCommunications from './FunnelCommunications';

const pages = [
  { id: 'optin', label: 'Capture Page', src: '/funnels/luke-alexander/optin/index.html' },
  { id: 'slo', label: 'SLO Page', src: '/funnels/luke-alexander/slo/index.html' },
  { id: 'thank-you', label: 'Thank You', src: '/funnels/luke-alexander/thank-you/index.html' },
];

const FUNNEL_ID = 'luke-alexander';
const FUNNEL_NAME = 'Luke Alexander';

interface Props {
  storagePrefix: string;
}

type View = 'pages' | 'communications';

const LukeAlexanderFunnel: React.FC<Props> = ({ storagePrefix }) => {
  const [view, setView] = useState<View>('pages');
  const [activePageId, setActivePageId] = useState(pages[0].id);
  const activePage = pages.find(p => p.id === activePageId)!;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-[#ECECEC]">{FUNNEL_NAME}</h1>
          <p className="text-xs text-[#555] mt-0.5">
            {view === 'pages' ? 'Live funnel preview' : 'Email, SMS & Telegram broadcasts'}
          </p>
        </div>
        {view === 'pages' && (
          <a
            href={activePage.src}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#333] text-[#ECECEC] text-xs font-medium transition-none"
          >
            Open full page ↗
          </a>
        )}
      </div>

      {/* Top-level view tabs */}
      <div className="flex gap-1 mb-3 flex-shrink-0 bg-[#1a1a1a] rounded-lg p-1 self-start">
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
        <>
          {pages.length > 1 && (
            <div className="flex gap-1 mb-3 flex-shrink-0 bg-[#1a1a1a] rounded-lg p-1">
              {pages.map(page => (
                <button
                  key={page.id}
                  onClick={() => setActivePageId(page.id)}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-none ${
                    activePageId === page.id
                      ? 'bg-[#2a2a2a] text-[#ECECEC]'
                      : 'text-[#666] hover:text-[#999]'
                  }`}
                >
                  {page.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 rounded-xl overflow-hidden border border-[#2a2a2a] min-h-0">
            <iframe
              src={activePage.src}
              className="w-full h-full"
              title={`${FUNNEL_NAME} — ${activePage.label}`}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        </>
      ) : (
        <FunnelCommunications funnelId={FUNNEL_ID} storagePrefix={storagePrefix} funnelName={FUNNEL_NAME} />
      )}
    </div>
  );
};

export default LukeAlexanderFunnel;
