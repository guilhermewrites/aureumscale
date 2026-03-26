import React from 'react';

const ArnasGintalasFunnel: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-[#ECECEC]">Arnas Gintalas</h1>
          <p className="text-xs text-[#555] mt-0.5">Live funnel preview</p>
        </div>
        <a
          href="/funnels/arnas-gintalas/index.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#333] text-[#ECECEC] text-xs font-medium transition-none"
        >
          Open full page ↗
        </a>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-[#2a2a2a] min-h-0">
        <iframe
          src="/funnels/arnas-gintalas/index.html"
          className="w-full h-full"
          title="Arnas Gintalas Funnel"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  );
};

export default ArnasGintalasFunnel;
