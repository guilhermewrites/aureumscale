import React, { useState } from 'react';
import { FileText, Send, IdCard } from 'lucide-react';
import FunnelCommunications from './FunnelCommunications';
import FunnelProfile from './FunnelProfile';

const pages = [
  { id: 'optin', label: 'Opt-In Page', src: '/funnels/arnas-gintalas/index.html' },
  { id: 'thankyou', label: 'Thank You Page', src: '/funnels/arnas-gintalas/thank-you/index.html' },
  { id: 'igmastery-optin', label: 'IG Mastery Opt-In', src: '/funnels/arnas-gintalas/igmastery/index.html' },
  { id: 'igmastery-ty', label: 'IG Mastery Thank You', src: '/funnels/arnas-gintalas/igmastery/thank-you.html' },
  { id: 'igmastery-privacy', label: 'Privacy Policy', src: '/funnels/arnas-gintalas/igmastery/privacy-policy.html' },
  { id: 'igmastery-terms', label: 'Terms', src: '/funnels/arnas-gintalas/igmastery/terms.html' },
];

const FUNNEL_ID = 'arnas-gintalas';
const FUNNEL_NAME = 'Arnas Gintalas';

interface Props {
  storagePrefix: string;
}

type View = 'profile' | 'pages' | 'communications';

const ArnasGintalasFunnel: React.FC<Props> = ({ storagePrefix }) => {
  const [view, setView] = useState<View>('profile');
  const [activePageId, setActivePageId] = useState(pages[0].id);
  const activePage = pages.find(p => p.id === activePageId)!;

  const subtitle =
    view === 'profile' ? 'Client overview, team & key links'
    : view === 'pages' ? 'Live funnel preview'
    : 'Email, SMS & Telegram broadcasts';

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-[#ECECEC]">{FUNNEL_NAME}</h1>
          <p className="text-xs text-[#555] mt-0.5">{subtitle}</p>
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
          onClick={() => setView('profile')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            view === 'profile' ? 'bg-[#2a2a2a] text-[#ECECEC]' : 'text-[#666] hover:text-[#999]'
          }`}
        >
          <IdCard size={12} /> Profile
        </button>
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

      {view === 'profile' ? (
        <FunnelProfile funnelId={FUNNEL_ID} funnelName={FUNNEL_NAME} storagePrefix={storagePrefix} />
      ) : view === 'pages' ? (
        <>
          <div className="flex gap-1 mb-3 flex-shrink-0 bg-[#1a1a1a] rounded-lg p-1 flex-wrap">
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

export default ArnasGintalasFunnel;
