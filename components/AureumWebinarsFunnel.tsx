import React from 'react';
import { BackgroundPaths } from '@/components/ui/background-paths';

const AureumWebinarsFunnel: React.FC = () => {
  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Animated background paths — visible around the iframe */}
      <div className="absolute inset-0 z-0">
        <BackgroundPaths title="Aureum Webinars" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-[#ECECEC]">Aureum Webinars</h1>
          <p className="text-xs text-[#555] mt-0.5">Live funnel preview</p>
        </div>
        <a
          href="/funnels/aureum-webinars/index.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2a2a2a]/80 hover:bg-[#333]/80 text-[#ECECEC] text-xs font-medium backdrop-blur-sm transition-none"
        >
          Open full page ↗
        </a>
      </div>

      {/* VSL iframe — centered with paths visible around it */}
      <div className="relative z-10 flex-1 flex items-center justify-center min-h-0 py-4">
        <div className="w-[90%] h-[85%] rounded-xl overflow-hidden border border-[#2a2a2a] shadow-2xl">
          <iframe
            src="/funnels/aureum-webinars/index.html"
            className="w-full h-full"
            title="Aureum Webinars Funnel"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>
    </div>
  );
};

export default AureumWebinarsFunnel;
