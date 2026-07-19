"use client";

import Link from 'next/link';
import { memo } from 'react';

interface Room {
  id: string;
  name: string | null;
  currentVideoTitle: string;
  onlineCount: number;
  maxUsers: number;
  _count: { messages: number };
}

interface ServerBrowserProps {
  publicRooms: Room[];
  primaryColor: string;
  darkBackground: string;
  isDarkMode: boolean;
  isLoaded: boolean;
  t: (key: string) => string;
}

export const ServerBrowser = memo(function ServerBrowser({
  publicRooms,
  primaryColor,
  darkBackground,
  isDarkMode,
  isLoaded,
  t,
}: ServerBrowserProps) {
  return (
    <div
      className={`flex flex-col h-[300px] sm:h-[400px] md:h-[450px] transition-all duration-700 ease-out delay-100 ${isLoaded ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'}`}
    >
      <div
        className="border-4 border-black dark:border-white h-full flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] sm:dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] relative overflow-hidden transition-all duration-500 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] sm:hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[10px_10px_0px_0px_rgba(255,255,255,0.3)] sm:dark:hover:shadow-[16px_16px_0px_0px_rgba(255,255,255,0.3)]"
        style={{ backgroundColor: isDarkMode ? darkBackground : '#e0e0e0' }}
      >
        {/* Window Header */}
        <div className="text-white p-2 flex justify-between items-center border-b-4 border-black dark:border-white shrink-0" style={{ background: `linear-gradient(135deg, #111 0%, ${primaryColor}44 100%)` }}>
          <span className="font-mono font-bold flex items-center gap-2">
            <span className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }}></span>
            SERVER_BROWSER.EXE
          </span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-white border border-gray-500 transition-colors duration-200 hover:bg-yellow-400 cursor-pointer"></div>
            <div className="w-3 h-3 bg-white border border-gray-500 transition-colors duration-200 hover:bg-green-400 cursor-pointer"></div>
            <div className="w-3 h-3 bg-[#ff5555] border border-gray-500 transition-colors duration-200 hover:bg-red-600 cursor-pointer"></div>
          </div>
        </div>

        {/* Filter/Sort Tabs for UI discoverability (TestSprite) */}
        <div className="flex border-b-4 border-black dark:border-white shrink-0 bg-gray-200 dark:bg-gray-800 text-black dark:text-white">
          <button className="px-4 py-1.5 text-xs sm:text-sm font-bold font-mono border-r-4 border-black dark:border-white bg-[#e0e0e0] dark:bg-[#333] hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">Trending</button>
          <button className="px-4 py-1.5 text-xs sm:text-sm font-bold font-mono hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors opacity-70">Recent</button>
        </div>

        {/* List Container */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[url('/textures/pixel-weave.png')] pixel-scrollbar min-h-0 h-full relative">
          {!Array.isArray(publicRooms) || publicRooms.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-300 gap-3 relative">
              {/* TV static noise effect */}
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")', backgroundSize: '128px 128px' }} />
              {/* CRT scan line */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="w-full h-[2px] bg-white/5 animate-scan-line" />
              </div>
              <div className="text-center z-10">
                <p className="font-bold font-mono text-lg tracking-widest animate-pulse">NO SIGNAL</p>
                <p className="text-xs opacity-50 mt-1 font-mono">{t('noServers')}</p>
              </div>
            </div>
          ) : (
            publicRooms.map((room, index) => (
              <Link
                key={room.id}
                href={`/room/${room.id}`}
                className="block border-2 border-black dark:border-white p-2 sm:p-3 transition-all duration-300 ease-out group relative hover:translate-x-[4px] hover:-translate-y-[2px] hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] card-interactive animate-fade-in-up"
                style={{
                  backgroundColor: isDarkMode ? 'black' : 'white',
                  animationDelay: `${index * 80}ms`,
                  animationFillMode: 'both',
                }}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-base sm:text-lg truncate pr-8 group-hover:text-[#ff69b4] transition-all duration-300">
                    {room.name || `Room ${room.id}`}
                  </h3>
                  <span
                    className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse group-hover:scale-150 transition-transform duration-300"
                    style={{ backgroundColor: primaryColor }}
                  ></span>
                </div>
                <div className="text-xs font-mono text-gray-600 dark:text-gray-400 mt-1 truncate flex items-center gap-1 transition-colors duration-300 group-hover:text-gray-800 dark:group-hover:text-gray-200">
                  <span className="group-hover:animate-bounce flex-shrink-0">🎬</span>
                  <span className="truncate">{room.currentVideoTitle || t('nothingPlaying')}</span>
                </div>
                <div className="flex justify-between items-center mt-2 sm:mt-3 pt-2 border-t-2 border-gray-100 dark:border-gray-700 group-hover:border-gray-200 dark:group-hover:border-gray-600 transition-colors duration-300">
                  <span className="text-xs font-bold bg-gray-100 dark:bg-gray-700 px-2 py-0.5 border border-black dark:border-white rounded-sm transition-all duration-300 group-hover:scale-105 flex items-center gap-1">
                    <span className="flex-shrink-0">👥</span>
                    {room.onlineCount}
                  </span>
                  <span
                    className="text-xs font-black group-hover:underline transition-all duration-300 group-hover:translate-x-1"
                    style={{ color: primaryColor }}
                  >
                    JOIN &gt;&gt;
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Browser Footer */}
        <div
          className="border-t-4 border-black dark:border-white p-2 text-xs font-mono flex justify-between items-center shrink-0"
          style={{ backgroundColor: isDarkMode ? 'black' : '#e5e7eb' }}
        >
          <span>{t('statusOnline')}</span>
          <span>
            {publicRooms.length} {t('servers')}
          </span>
        </div>
      </div>
    </div>
  );
});
