'use client';

import { ReactNode } from 'react';

interface GameBoyContainerProps {
  children: ReactNode;
  isPlaying?: boolean;
  gameOver?: boolean;
}

export function GameBoyContainer({ children, isPlaying = false, gameOver = false }: GameBoyContainerProps) {
  return (
    <div className="flex flex-col items-center gap-2 w-full h-full justify-center p-2 overflow-hidden">
      
      {/* Game Console Shell - Compact */}
      <div className="relative bg-gray-300 rounded-lg shadow-xl border-b-4 border-r-4 border-gray-400 w-full max-w-[320px] flex flex-col">
        <div className="flex flex-col p-3 min-h-0">
        
          {/* Screen Bezel */}
          <div className="bg-gray-700 p-3 rounded-lg rounded-br-[20px] shadow-inner relative flex flex-col">
              
              {/* Power LED */}
              <div className={`absolute top-1 left-1 w-1.5 h-1.5 rounded-full ${isPlaying && !gameOver ? 'bg-red-500 shadow-[0_0_5px_red]' : 'bg-red-900'}`} />
              <div className="absolute top-1 right-8 text-[8px] text-gray-400 font-mono tracking-widest">BATTERY</div>

              {/* The Game Screen - Responsive */}
              <div className="flex items-center justify-center relative bg-[#9ca04c] border-2 border-[#8b914d] shadow-[inset_0_0_20px_rgba(0,0,0,0.2)] rounded min-h-[280px]">
                {/* Scanlines Overlay */}
                <div className="absolute inset-0 pointer-events-none z-20 opacity-10 rounded" 
                     style={{ 
                       background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 255, 0, 0.06))', 
                       backgroundSize: '100% 2px, 3px 100%' 
                     }} 
                />
                
                {/* Game Content */}
                <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
                  {children}
                </div>
              </div>
              
              <div className="mt-1 text-center text-gray-400 font-mono text-[7px] italic">
                 NINTENDO GAMEBOY TM
              </div>
          </div>
          
          {/* Controls Decoration - Compact */}
          <div className="mt-3 flex justify-between items-center px-4 shrink-0">
             <div className="w-16 h-16 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-full bg-gray-700 rounded shadow-md" />
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-3 bg-gray-700 rounded shadow-md" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-gray-600 rounded-full inset-shadow" />
             </div>
             
             <div className="flex gap-3 rotate-[-25deg] translate-y-2">
                <div className="flex flex-col items-center gap-0.5">
                   <div className="w-6 h-6 rounded-full bg-red-700 shadow-[0_2px_0_#550000]" />
                   <span className="font-bold text-gray-500 text-[9px]">B</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 mt-3">
                   <div className="w-6 h-6 rounded-full bg-red-700 shadow-[0_2px_0_#550000]" />
                   <span className="font-bold text-gray-500 text-[9px]">A</span>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}

