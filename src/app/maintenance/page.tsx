import React from 'react';
import Link from 'next/link';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#ffebf0] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in-up">
        <div className="relative w-32 h-32 mx-auto bg-white rounded-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden mb-8">
            <span className="text-4xl">🐱🛠️</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black">
          We'll be right back!
        </h1>

        <div className="bg-white p-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-left">
          <p className="font-mono text-gray-700 leading-relaxed">
            CinePurr is currently undergoing scheduled maintenance to upgrade our systems and improve your watch party experience. 
          </p>
          <div className="mt-4 p-3 bg-red-50 border-2 border-red-500 text-red-900 font-mono text-sm">
            Please check back again shortly. Most maintenance windows last less than 15 minutes.
          </div>
        </div>

        <div className="pt-6 border-t-4 border-dashed border-pink-300">
           <Link 
            href="/login" 
            className="inline-block mt-4 text-xs font-mono font-bold text-gray-500 hover:text-black underline decoration-2 decoration-transparent hover:decoration-black transition-all"
           >
            Admin Access
           </Link>
        </div>
      </div>
    </div>
  );
}
