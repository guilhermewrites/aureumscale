import React, { useState } from 'react';

const pages = [
  { id: 'evergreen', label: 'Evergreen Page', src: '/funnels/luke-alexander/index.html' },
  { id: 'optin', label: 'Live Webinar Opt In', src: '/funnels/luke-alexander/optin/index.html' },
];

const LukeAlexanderFunnel: React.FC = () => {
  const [activePageId, setActivePageId] = useState(pages[0].id);
  const activePage = pages.find(p => p.id === activePageId)!;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-[#ECECEC]">Luke Alexander</h1>
          <p className="text-xs text-[#555] mt-0.5">Live funnel preview</p>
        </div>
        <a
          href={activePage.src}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#333] text-[#ECECEC] text-xs font-medium transition-none"
        >
          Open full page ↗
        </a>
      </div>

      {/* Page tabs */}
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

      <div className="flex-1 rounded-xl overflow-hidden border border-[#2a2a2a] min-h-0">
        <iframe
          src={activePage.src}
          className="w-full h-full"
          title={`Luke Alexander — ${activePage.label}`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
};

export default LukeAlexanderFunnel;
