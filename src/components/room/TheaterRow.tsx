'use client';

import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { POKEMON_DATA } from '@/lib/petConstants';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { getCachedRoomUsers, subscribeCachedRoomUsers } from '@/hooks/useSocket';

interface User {
    id: string;
    name: string;
    socketId: string;
    petFamily?: string;
    petName?: string;
}

interface TheaterRowProps {
    socket: Socket | null;
    roomId: string;
}

export default function TheaterRow({ socket, roomId }: TheaterRowProps) {
    const [users, setUsers] = useState<User[]>(() => getCachedRoomUsers(roomId));
    const { isDarkMode } = usePokemonTheme();

    // Subscribe to the module-level cache — NO direct socket listener.
    useEffect(() => {
        return subscribeCachedRoomUsers(roomId, (updatedUsers) => {
            setUsers(Array.isArray(updatedUsers) ? updatedUsers : []);
        });
    }, [roomId]);

    if (users.length === 0) return null;

    return (
        <div className="w-full h-24 relative mt-auto flex items-end justify-center perspective-1000 overflow-visible z-10">
            {/* Theater Row Base */}
            <div className={`absolute bottom-0 w-full h-8 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} border-t-4 border-black shadow-[0_-10px_30px_rgba(0,0,0,0.5)]`} />

            <div className="flex gap-4 sm:gap-8 px-4 w-full justify-center max-w-full overflow-x-auto no-scrollbar pb-2">
                <AnimatePresence>
                    {users.map((user, index) => {
                        const petInfo = user.petFamily && POKEMON_DATA[user.petFamily.toLowerCase()]
                            ? POKEMON_DATA[user.petFamily.toLowerCase()]
                            : POKEMON_DATA['charmander']; // Default

                        return (
                            <motion.div
                                key={user.socketId}
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex flex-col items-center group relative"
                            >
                                {/* Pet Name Tag */}
                                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white px-2 py-0.5 rounded text-[10px] whitespace-nowrap z-50 pointer-events-none">
                                    {user.petName || user.name + "'s Pet"}
                                </div>

                                {/* The Pet */}
                                <div className="relative w-12 h-12 flex items-center justify-center">
                                    <img
                                        src={petInfo.sprites[1]} // Evolution index 1 (middle) usually looks best
                                        alt={user.petFamily}
                                        className="w-full h-full object-contain pixelated"
                                    />
                                </div>

                                {/* Theater Seat */}
                                <div className="relative mt-1">
                                    <div className={`w-10 h-6 ${isDarkMode ? 'bg-red-900 border-red-800' : 'bg-red-600 border-red-700'} border-2 rounded-t-lg shadow-inner`} />
                                    <div className={`w-12 h-2 ${isDarkMode ? 'bg-red-800' : 'bg-red-500'} absolute -bottom-1 -left-1 rounded-full`} />
                                </div>

                                {/* User mini name tag */}
                                <div className={`mt-2 text-[8px] sm:text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} truncate max-w-[40px]`}>
                                    {user.name}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            <style jsx>{`
                .pixelated {
                    image-rendering: pixelated;
                    image-rendering: -moz-crisp-edges;
                    image-rendering: crisp-edges;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
