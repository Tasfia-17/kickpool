import React from 'react';
import AIOfficeClient from '@/components/AIOffice/AIOfficeClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Office | CinePurr',
  description: 'The CinePurr autonomous engineering team office.',
};

export default function AIOfficePage() {
  return (
    <main className="min-h-screen bg-[#0f0a14] text-white flex flex-col font-sans">
      <div className="absolute top-0 left-0 w-full p-4 border-b border-[#222] bg-black/80 flex justify-between items-center z-50">
         <h1 className="text-xl font-bold tracking-widest text-[#00ffcc] uppercase flex items-center gap-3">
           <span className="text-2xl">🏢</span> CinePurr AI Office
         </h1>
         <div className="text-sm text-gray-400 font-mono">
           ENGINEERING HQ
         </div>
      </div>
      
      {/* The main client component which handles SSE real-time streaming and rendering SVGs */}
      <AIOfficeClient />
    </main>
  );
}
