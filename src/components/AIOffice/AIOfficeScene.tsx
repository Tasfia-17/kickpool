'use client';

import React from 'react';

interface AgentVisualProps {
  isThinking: boolean;
  isTalking: boolean;
  isSearching: boolean;
  name: string;
}

// ── Background Environment ──────────────────────────────────────
const OfficeBackground = () => (
  <svg className="absolute inset-0 w-full h-full object-cover" preserveAspectRatio="none">
    {/* Dark wall color */}
    <rect width="100%" height="80%" fill="#292036" />
    {/* Floor base */}
    <rect y="80%" width="100%" height="20%" fill="#1a1423" />
    {/* Wall Paneling Lines */}
    <path d="M0 80% L100% 80%" stroke="#1a1423" strokeWidth="12" />
    <path d="M20% 0 L20% 80% M40% 0 L40% 80% M60% 0 L60% 80% M80% 0 L80% 80%" stroke="#221a2e" strokeWidth="4" />
    
    {/* Server Racks (Right side) */}
    <rect fill="#15121b" x="85%" y="40%" width="12%" height="40%" rx="4" />
    <rect fill="#0a080d" x="87%" y="45%" width="8%" height="5%" />
    <rect fill="#0a080d" x="87%" y="55%" width="8%" height="5%" />
    <rect fill="#0a080d" x="87%" y="65%" width="8%" height="5%" />
    
    {/* Whiteboard (Left side) */}
    <rect fill="#e0e0e0" x="5%" y="30%" width="15%" height="35%" rx="2" stroke="#444" strokeWidth="4" />
    {/* Whiteboard drawings */}
    <rect fill="#2196F3" x="7%" y="35%" width="5%" height="3%" />
    <rect fill="#4CAF50" x="7%" y="42%" width="7%" height="3%" />
    <circle fill="#F44336" cx="16%" cy="55%" r="1.5%" />
  </svg>
);

// ── Character Avatars (Front Facing, Highly expressive) ──────
// scale 0.8 to fit, drawn within a 100x100 box
const ArdaHead = ({ activeAction }: { activeAction: string | null }) => (
  <g transform="translate(25, 10)">
    {/* Shoulders */}
    <path d="M10,80 Q25,60 40,80 L40,100 L10,100 Z" fill="#3f51b5" />
    {/* Neck */}
    <rect x="20" y="55" width="10" height="15" fill="#f1c27d" />
    {/* Head */}
    <rect x="10" y="20" width="30" height="40" fill="#f1c27d" rx="4" />
    {/* Hair */}
    <path d="M8,25 Q25,0 42,25 L40,30 L10,30 Z" fill="#3b2a1a" />
    {/* Glasses */}
    <rect x="12" y="35" width="10" height="8" fill="none" stroke="#222" strokeWidth="2" />
    <rect x="28" y="35" width="10" height="8" fill="none" stroke="#222" strokeWidth="2" />
    <line x1="22" y1="39" x2="28" y2="39" stroke="#222" strokeWidth="2" />
    
    {/* Mouth */}
    {activeAction === 'talking' ? (
      <rect x="20" y="50" width="10" height="6" fill="#111" rx="2" className="animate-pulse" />
    ) : (
      <rect x="22" y="52" width="6" height="2" fill="#886845" />
    )}
  </g>
);

const AceHead = ({ activeAction }: { activeAction: string | null }) => (
  <g transform="translate(25, 10)">
    <path d="M5,80 Q25,50 45,80 L45,100 L5,100 Z" fill="#151515" /> {/* Black Hoodie */}
    <path d="M15,55 Q25,80 35,55" fill="none" stroke="#101010" strokeWidth="4" /> {/* Hoodie strings */}
    
    <rect x="20" y="55" width="10" height="10" fill="#ffdbac" /> {/* Neck */}
    <rect x="10" y="20" width="30" height="40" fill="#ffdbac" rx="8" /> {/* Head */}
    <path d="M5,20 C10,5 40,5 45,20 C45,35 40,25 25,25 C10,25 5,35 5,20" fill="#222" /> {/* Messy Hair */}
    
    {/* Eyes */}
    <rect x="15" y="35" width="6" height="4" fill="#111" rx="1" />
    <rect x="29" y="35" width="6" height="4" fill="#111" rx="1" />
    
    {/* Eye glow for searching */}
    {activeAction === 'searching' && (
      <g className="animate-pulse">
        <rect x="14" y="34" width="8" height="6" fill="#00ffcc" opacity="0.6" rx="2" />
        <rect x="28" y="34" width="8" height="6" fill="#00ffcc" opacity="0.6" rx="2" />
      </g>
    )}

    {activeAction === 'talking' ? (
      <ellipse cx="25" cy="52" rx="4" ry="6" fill="#111" className="animate-bounce" />
    ) : (
      <rect x="22" y="50" width="6" height="2" fill="#c49b6c" />
    )}
  </g>
);

const DemirHead = ({ activeAction }: { activeAction: string | null }) => (
  <g transform="translate(25, 10)">
    <path d="M10,80 Q25,60 40,80 L40,100 L10,100 Z" fill="#ffffff" /> {/* Formal shirt */}
    <path d="M22,70 L25,90 L28,70 Z" fill="#b71c1c" /> {/* Red Tie */}
    
    <rect x="20" y="55" width="10" height="15" fill="#e8bca1" /> {/* Neck */}
    <rect x="10" y="20" width="30" height="40" fill="#e8bca1" /> {/* Head blockier */}
    <rect x="8" y="15" width="34" height="15" fill="#555" rx="2" /> {/* Gray flat hair */}
    
    {/* Stern Eyes */}
    <rect x="14" y="35" width="8" height="2" fill="#333" />
    <rect x="28" y="35" width="8" height="2" fill="#333" />
    
    {activeAction === 'searching' && (
      <path d="M30 40 A5 5 0 1 1 30 39.9 Z M34 44 L38 48" fill="none" stroke="#ffeb3b" strokeWidth="3" className="animate-spin" style={{ transformOrigin: '30px 40px' }} />
    )}

    {activeAction === 'talking' ? (
      <rect x="22" y="50" width="6" height="5" fill="#111" />
    ) : (
      <rect x="20" y="52" width="10" height="1" fill="#a6846f" />
    )}
  </g>
);

const RubarHead = ({ activeAction }: { activeAction: string | null }) => (
  <g transform="translate(25, 10)">
    <path d="M5,80 Q25,60 45,80 L45,100 L5,100 Z" fill="#4caf50" /> {/* Green Jacket */}
    
    <rect x="20" y="55" width="10" height="15" fill="#e2b999" /> {/* Neck */}
    <rect x="10" y="20" width="30" height="40" fill="#e2b999" rx="6" /> {/* Head */}
    
    {/* Orange Beanie */}
    <path d="M8,25 Q25,-5 42,25 L8,25 Z" fill="#ff5722" />
    
    {/* Full Beard */}
    <path d="M10,40 Q25,75 40,40 L40,55 Q25,70 10,55 Z" fill="#4e342e" />
    
    <circle cx="18" cy="35" r="3" fill="#111" />
    <circle cx="32" cy="35" r="3" fill="#111" />

    {activeAction === 'talking' ? (
      <ellipse cx="25" cy="50" rx="4" ry="4" fill="#a16b5e" />
    ) : (
      <rect x="23" y="48" width="4" height="2" fill="#36221d" />
    )}
  </g>
);

const AzizHead = ({ activeAction }: { activeAction: string | null }) => (
  <g transform="translate(25, 10)">
    <path d="M0,80 Q25,50 50,80 L50,100 L0,100 Z" fill="#111" /> {/* Black turtle neck */}
    
    <rect x="20" y="55" width="10" height="15" fill="#d7a070" /> {/* Neck */}
    <rect x="10" y="20" width="30" height="40" fill="#d7a070" rx="10" /> {/* Head */}
    
    {/* Slick Hair */}
    <path d="M5,25 Q25,0 45,25 Q45,10 25,5 Q5,10 5,25 Z" fill="#000" />
    
    <rect x="14" y="35" width="7" height="4" fill="#222" rx="2" />
    <rect x="29" y="35" width="7" height="4" fill="#222" rx="2" />

    {activeAction === 'thinking' && (
      <circle cx="45" cy="20" r="4" fill="#00ffcc" className="animate-ping" />
    )}

    {activeAction === 'talking' ? (
      <path d="M20 50 Q25 58 30 50 Z" fill="#fff" stroke="#111" strokeWidth="2" />
    ) : (
      <rect x="22" y="52" width="6" height="2" fill="#996c46" />
    )}
  </g>
);

// ── Front Desk & Laptop ─────────────────────────────────────────

const DeskSetup = ({ agentName }: { agentName: string }) => (
  <g transform="translate(0, 75)">
    {/* Wood Desk Curve */}
    <path d="M -10 30 C 20 20, 80 20, 110 30 L 110 100 L -10 100 Z" fill="#2d1c1c" />
    <path d="M -10 30 C 20 20, 80 20, 110 30 L 110 35 C 80 25, 20 25, -10 35 Z" fill="#4e342e" />
    
    {/* Glowing Laptop back */}
    <rect x="25" y="10" width="50" height="25" fill="#cfcfcf" rx="4" />
    <path d="M35 18 L65 18 L50 28 Z" fill="#00ffcc" opacity="0.3" className="animate-pulse" /> {/* Cinepurr Logo Light */}
    
    {/* Name Plate */}
    <rect x="35" y="45" width="30" height="10" fill="#111" rx="2" />
    <text x="50" y="52" fill="#ffcd38" fontSize="6" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
      {agentName.toUpperCase()}
    </text>
  </g>
);

// ── Main Layout ───────────────────────────────────────────────

export default function AIOfficeScene({ 
  activeAgent, 
  activeAction, 
  speechBubbles 
}: { 
  activeAgent: string | null;
  activeAction: 'thinking' | 'talking' | 'searching' | null;
  speechBubbles: Record<string, string>;
}) {
  const team = [
    { name: 'Arda', Component: ArdaHead },
    { name: 'Açe', Component: AceHead },
    { name: 'Demir', Component: DemirHead },
    { name: 'Rubar', Component: RubarHead },
    { name: 'Aziz', Component: AzizHead },
  ];

  return (
    <div className="relative w-full h-full flex flex-col justify-end">
      {/* Background SVG Environment */}
      <OfficeBackground />
      
      {/* Container for the 5 agents lined up */}
      <div className="relative z-10 w-full flex justify-around items-end h-[60%] px-4 sm:px-10 gap-2 mb-[-1rem]">
        
        {team.map((agent, index) => {
          const isActive = activeAgent === agent.name;
          const isSearching = isActive && activeAction === 'searching';
          
          return (
            <div 
              key={agent.name} 
              className={`relative flex flex-col items-center justify-end w-[18%] max-w-[150px] aspect-[1/2] transition-all duration-700
                ${isActive ? 'z-50 scale-110 drop-shadow-[0_0_30px_rgba(0,255,204,0.4)]' : 'z-10 brightness-50 grayscale-[30%]'}
              `}
            >
              
              {/* Floating HTML Speech Bubble */}
              {speechBubbles[agent.name] && (
                <div 
                  className={`absolute bottom-[100%] mb-4 w-[250px] bg-white text-black p-4 rounded-xl shadow-2xl z-50 transition-all duration-500 origin-bottom
                    ${isActive ? 'opacity-100 scale-100 translate-y-0' : 'opacity-80 scale-90 translate-y-4'}
                  `}
                  style={{
                    // Prevent pushing off-screen on the edge avatars
                    left: index === 0 ? '0' : index === 4 ? 'auto' : '50%',
                    right: index === 4 ? '0' : 'auto',
                    transform: index > 0 && index < 4 ? 'translateX(-50%)' : 'none'
                  }}
                >
                  {/* Bubble Pointer */}
                  <div 
                    className="absolute -bottom-3 w-0 h-0 border-l-[10px] border-l-transparent border-t-[15px] border-t-white border-r-[10px] border-r-transparent" 
                    style={{ left: index === 0 ? '15%' : index === 4 ? '85%' : '50%', transform: 'translateX(-50%)' }}
                  />
                  
                  <div className="text-sm font-sans leading-relaxed break-words whitespace-pre-wrap max-h-[250px] overflow-y-auto custom-scrollbar">
                    {/* Prefix searching action with a strong aesthetic */}
                    {isSearching ? (
                      <div className="flex items-center gap-2 text-blue-600 font-bold">
                        <span className="animate-spin">🔎</span>
                        {speechBubbles[agent.name]}
                      </div>
                    ) : (
                      speechBubbles[agent.name]
                    )}
                  </div>
                </div>
              )}

              {/* The Agent SVG */}
              <div className={`w-full ${activeAction === 'thinking' && isActive ? 'animate-bounce' : ''}`}>
                <svg viewBox="0 0 100 150" className="w-full h-full overflow-visible">
                  {/* Environmental cast light from laptop */}
                  <ellipse cx="50" cy="90" rx="40" ry="10" fill="#00ffcc" opacity={isActive ? "0.2" : "0"} className="transition-opacity duration-1000" />
                  
                  {/* Head & Body */}
                  {(() => {
                    const AgentComp = agent.Component;
                    return <AgentComp activeAction={isActive ? activeAction : null} />;
                  })()}
                  
                  {/* Front Desk & Laptop (Overlaying the body) */}
                  <DeskSetup agentName={agent.name} />
                </svg>
              </div>

            </div>
          );
        })}
      </div>

      {/* Global Lighting Overlay — Darkens room when someone speaks */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-all duration-1000 mix-blend-multiply
          ${activeAgent ? 'bg-[rgba(10,5,20,0.7)]' : 'bg-transparent'}
        `}
      />
    </div>
  );
}
