'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import AIOfficeScene from './AIOfficeScene';
import { OfficeEvent, AgentTurn } from '../../../scripts/ai-office/types';
import { useSocket } from '@/hooks/useSocket';

export default function AIOfficeClient() {
  const { data: session } = useSession();
  const socket = useSocket('ai-office', session?.user as any);
  
  // State for the visual 2D office
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<'thinking' | 'talking' | 'searching' | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [speechBubbles, setSpeechBubbles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!socket) return;

    const handleEvent = (event: OfficeEvent) => {
      switch (event.type) {
        case 'ROUND_START':
          setCurrentRound(event.payload.round);
          break;
          
        case 'AGENT_THINKING':
          setActiveAgent(event.payload.agent);
          setActiveAction('thinking');
          setSpeechBubbles(prev => ({ ...prev, [event.payload.agent]: '...' }));
          break;
          
        case 'AGENT_TOOL_CALL':
          setActiveAgent(event.payload.agent);
          setActiveAction('searching');
          setSpeechBubbles(prev => ({ 
            ...prev, 
            [event.payload.agent]: `[Running: ${event.payload.tool}]` 
          }));
          break;
          
        case 'AGENT_SPEAKING':
          const turn: AgentTurn = event.payload;
          setActiveAgent(turn.agent);
          setActiveAction('talking');
          setSpeechBubbles(prev => ({ 
            ...prev, 
            [turn.agent]: turn.content 
          }));
          break;

        case 'SUMMARY_GENERATING':
          setActiveAgent('Aziz'); 
          setActiveAction('thinking');
          setSpeechBubbles(prev => ({ ...prev, 'Aziz': 'Compiling executive summary...' }));
          break;
          
        case 'OFFICE_COMPLETE':
          setActiveAgent('Aziz');
          setActiveAction('talking');
          setSpeechBubbles(prev => ({ ...prev, 'Aziz': 'Session Complete! Check terminal for the full report.' }));
          
          setTimeout(() => {
            setActiveAgent(null);
            setActiveAction(null);
            setSpeechBubbles({});
          }, 10000);
          break;
          
        case 'OFFICE_ERROR':
          setActiveAgent('Aziz');
          setActiveAction('talking');
          setSpeechBubbles(prev => ({ ...prev, 'Aziz': `Error: ${event.payload.error}` }));
          break;
      }
    };

    socket.on('ai-office:event', handleEvent);
    return () => {
      socket.off('ai-office:event', handleEvent);
    };
  }, [socket]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full max-w-7xl mx-auto p-4 md:p-8 gap-4 pb-20 mt-16 font-mono">
      {/* Front-facing 2D Pixel Office */}
      <div className="flex-grow w-full rounded-2xl overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-[#33223f] bg-[#1a1122]">
        <AIOfficeScene 
          activeAgent={activeAgent} 
          activeAction={activeAction} 
          speechBubbles={speechBubbles}
        />
        
        {/* Overlay showing current round */}
        {currentRound > 0 && (
           <div className="absolute top-6 left-6 bg-black/80 text-[#00ffcc] px-6 py-3 rounded-xl border-2 border-[#00ffcc]/30 backdrop-blur-md shadow-[0_0_20px_rgba(0,255,204,0.2)] font-bold tracking-widest text-lg z-50">
             ROUND {currentRound}
           </div>
        )}
      </div>
    </div>
  );
}
