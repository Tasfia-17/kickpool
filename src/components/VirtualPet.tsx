"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from 'next-auth/react';
import { Pencil, X, Check, Heart, Utensils, ChevronRight, ChevronLeft } from 'lucide-react';

import { Mood, MOOD_EMOJIS, POKEMON_DATA, TYPE_COLORS } from '@/lib/petConstants';

// Seeded random number generator for consistent traits per user/pet combos
const seedRandom = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    return function () {
        let t = hash += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

export default function VirtualPet() {
    const { data: session } = useSession();
    const [petFamily, setPetFamily] = useState<string>('charmander');
    const [customName, setCustomName] = useState<string>('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');

    const [level, setLevel] = useState<number>(1);
    const [showMenu, setShowMenu] = useState(false);
    const [mounted, setMounted] = useState(false);

    // New Entertainment States
    const [mood, setMood] = useState<Mood>('Happy');
    const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
    const [petProgress, setPetProgress] = useState(0);
    const [lastPetTime, setLastPetTime] = useState(0);
    const [isPetted, setIsPetted] = useState(false);

    // Draggable / Minimizable state
    const [isMinimized, setIsMinimized] = useState<'left' | 'right' | false>(false);

    useEffect(() => {
        setMounted(true);
        // Load pet from local storage
        const savedPet = localStorage.getItem('cinepurr_virtual_pet');
        if (savedPet && POKEMON_DATA[savedPet]) {
            setPetFamily(savedPet);
        }

        const savedName = localStorage.getItem('cinepurr_virtual_pet_name');
        if (savedName) {
            setCustomName(savedName);
        }

        // Try to get user level
        const fetchLevel = async () => {
            try {
                const res = await fetch('/api/user/level');
                if (res.ok) {
                    const data = await res.json();
                    setLevel(data.level || 1);
                }
            } catch (e) {
                console.error("Could not fetch user level", e);
            }
        };

        if (session) {
            fetchLevel();
        }
    }, [session]);

    const changePet = (newPet: string) => {
        setPetFamily(newPet);
        localStorage.setItem('cinepurr_virtual_pet', newPet);
        // Reset custom name when changing species
        setCustomName('');
        localStorage.removeItem('cinepurr_virtual_pet_name');
    };

    const saveName = () => {
        const newName = tempName.trim();
        if (newName) {
            setCustomName(newName);
            localStorage.setItem('cinepurr_virtual_pet_name', newName);
        } else {
            setCustomName('');
            localStorage.removeItem('cinepurr_virtual_pet_name');
        }
        setIsEditingName(false);
    };

    const handleFeed = () => {
        setMood('Happy');
        // Add a burst of hearts
        const newHearts = Array.from({ length: 5 }).map((_, i) => ({
            id: Date.now() + i,
            x: Math.random() * 40 - 20,
            y: -20 - Math.random() * 20
        }));
        setHearts(prev => [...prev, ...newHearts]);
        // Set a "Full" state for a while? Maybe just mood is enough
        setTimeout(() => setMood('Happy'), 5000);
    };

    const handlePet = () => {
        const now = Date.now();
        if (now - lastPetTime < 200) {
            setPetProgress(prev => {
                const next = prev + 1;
                if (next > 10) {
                    setIsPetted(true);
                    setMood('Hype');
                    // Add heart
                    setHearts(prevHearts => [...prevHearts, { id: Date.now(), x: Math.random() * 40 - 20, y: -20 }]);
                    setTimeout(() => setIsPetted(false), 2000);
                    return 0;
                }
                return next;
            });
        } else {
            setPetProgress(0);
        }
        setLastPetTime(now);
    };

    // Auto-cleanup hearts
    useEffect(() => {
        if (hearts.length > 0) {
            const timer = setTimeout(() => {
                setHearts(prev => prev.slice(1));
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [hearts]);

    // Random mood changes
    useEffect(() => {
        const interval = setInterval(() => {
            const moods: Mood[] = ['Happy', 'Sleepy', 'Hungry'];
            setMood(moods[Math.floor(Math.random() * moods.length)]);
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    if (!mounted) return null;

    // Determine Evolution Stage based on level
    let stage = 0;
    if (level >= 16) stage = 1;
    if (level >= 36) stage = 2;

    const petData = POKEMON_DATA[petFamily];
    const currentSprite = petData.sprites[stage];

    // Ensure all random generation only happens after mount to prevent hydration mismatch
    const usernameValue = session?.user?.name || "Guest";
    const rng = seedRandom(`${usernameValue}-${petFamily}`);

    // We can safely use rng here because the entire component returns null until mounted (line 135)
    const gender = rng() > 0.5 ? '♂' : '♀';
    const natureIndex = Math.floor(rng() * petData.personality.length);
    const personality = petData.personality[natureIndex];

    // Define species names for default fallback
    const speciesNames = [
        ['Bulbasaur', 'Ivysaur', 'Venusaur'],
        ['Charmander', 'Charmeleon', 'Charizard'],
        ['Squirtle', 'Wartortle', 'Blastoise'],
        ['Pichu', 'Pikachu', 'Raichu']
    ];

    const familyIndex = Object.keys(POKEMON_DATA).indexOf(petFamily);
    const defaultName = speciesNames[familyIndex][stage];
    const displayName = customName || defaultName;

    const handleDragEnd = (event: any, info: any) => {
        const threshold = 50;
        if (info.point.x < threshold) {
            setIsMinimized('left');
            setShowMenu(false);
        } else if (info.point.x > window.innerWidth - threshold) {
            setIsMinimized('right');
            setShowMenu(false);
        }
    };

    if (isMinimized === 'left') {
        return (
            <motion.div
                initial={{ x: -50 }} animate={{ x: 0 }}
                className="fixed bottom-4 left-0 z-[900] bg-pink-500 rounded-r-xl p-2 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-y-2 border-r-2 border-black"
                onClick={() => setIsMinimized(false)}
            >
                <ChevronRight className="text-white" />
            </motion.div>
        );
    }

    if (isMinimized === 'right') {
        return (
            <motion.div
                initial={{ x: 50 }} animate={{ x: 0 }}
                className="fixed bottom-4 right-0 z-[900] bg-pink-500 rounded-l-xl p-2 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-y-2 border-l-2 border-black"
                onClick={() => setIsMinimized(false)}
            >
                <ChevronLeft className="text-white" />
            </motion.div>
        );
    }

    return (
        <motion.div
            drag
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            className="fixed bottom-4 left-4 z-[900] cursor-move"
            whileDrag={{ scale: 1.05 }}
        >
            <div className="relative pointer-events-auto">
                <AnimatePresence>
                    {showMenu && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, x: -20, y: 20 }}
                            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, x: -20, y: 20 }}
                            className="absolute bottom-full mb-4 left-0 bg-[#f8f9fa] dark:bg-[#1e293b] border-4 border-black dark:border-gray-500 rounded-xl p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-72"
                            style={{ fontFamily: '"VT323", monospace' }}
                        >
                            {/* Header / Name Edit */}
                            <div className="flex justify-between items-start mb-3 border-b-2 border-black dark:border-gray-500 pb-2">
                                {isEditingName ? (
                                    <div className="flex items-center w-full gap-2">
                                        <input
                                            type="text"
                                            value={tempName}
                                            onChange={(e) => setTempName(e.target.value)}
                                            className="w-full bg-white dark:bg-gray-700 border-2 border-black dark:border-gray-400 px-2 py-1 text-lg outline-none"
                                            placeholder={defaultName}
                                            autoFocus
                                            maxLength={15}
                                            onKeyDown={(e) => e.key === 'Enter' && saveName()}
                                        />
                                        <button onClick={saveName} aria-label="Save pet name" className="p-1.5 bg-green-500 hover:bg-green-600 text-white border-2 border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"><Check size={16} /></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setTempName(customName); setIsEditingName(true); }}>
                                        <h3 className="text-2xl font-bold dark:text-white flex items-center gap-1.5 leading-none">
                                            {displayName} <span className={gender === '♂' ? 'text-blue-500' : 'text-pink-500'}>{gender}</span>
                                        </h3>
                                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-black dark:hover:text-white">
                                            <Pencil size={14} />
                                        </button>
                                    </div>
                                )}
                                <button onClick={() => setShowMenu(false)} className="text-gray-500 hover:text-red-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Pet Stats Area */}
                            <div className="flex gap-4 mb-4">
                                <div className="w-24 h-24 bg-cover bg-center border-2 border-black dark:border-gray-500 rounded-lg shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)] flex items-center justify-center bg-white dark:bg-gray-800 relative overflow-hidden"
                                    style={{ backgroundImage: 'radial-gradient(circle, #f0f0f0 10%, transparent 11%), radial-gradient(circle at bottom left, #f0f0f0 5%, transparent 6%), radial-gradient(circle at bottom right, #f0f0f0 5%, transparent 6%), radial-gradient(circle at top left, #f0f0f0 5%, transparent 6%), radial-gradient(circle at top right, #f0f0f0 5%, transparent 6%)', backgroundSize: '1em 1em' }}>
                                    <img src={currentSprite} alt={displayName} className="w-16 h-16 object-contain z-10" style={{ imageRendering: 'pixelated' }} />

                                    {/* Hearts inside modal box too when feeding */}
                                    <AnimatePresence>
                                        {hearts.map(heart => (
                                            <motion.div
                                                key={heart.id}
                                                initial={{ y: 0, opacity: 1, scale: 0.5 }}
                                                animate={{ y: -40, opacity: 0, scale: 1.5 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute text-red-500 pointer-events-none z-20"
                                                style={{ left: `calc(50% + ${heart.x}px)` }}
                                            >
                                                ❤️
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500 dark:text-gray-400 text-sm">Lv.</span>
                                            <span className="text-xl font-bold dark:text-white leading-none">{level}</span>
                                        </div>
                                        <button
                                            onClick={handleFeed}
                                            className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs font-bold transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                                        >
                                            <Utensils size={12} /> FEED
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {petData.type.map(t => (
                                            <span key={t} className="text-xs text-white px-2 py-0.5 rounded border border-black dark:border-gray-300 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] uppercase font-bold tracking-wider" style={{ backgroundColor: TYPE_COLORS[t] }}>
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400 text-sm">Nature: </span>
                                            <span className="text-lg font-bold dark:text-gray-200">{personality}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase">Mood</span>
                                            <span className="text-sm font-bold dark:text-pink-400 flex items-center gap-1">
                                                {MOOD_EMOJIS[mood]} {mood}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Pet Selector */}
                            <div className="border-t-2 border-black dark:border-gray-500 pt-3">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 font-bold uppercase tracking-widest text-center">Swap Companion</p>
                                <div className="flex gap-2 justify-center">
                                    {Object.keys(POKEMON_DATA).map((family) => (
                                        <button
                                            key={family}
                                            onClick={() => changePet(family)}
                                            className={`p-1.5 border-2 rounded-md hover:scale-110 transition-transform ${petFamily === family ? 'border-pink-500 bg-pink-100 dark:bg-pink-900/40 shadow-[2px_2px_0px_0px_#ec4899]' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                                                }`}
                                            aria-label={`Select ${family}`}
                                        >
                                            <img
                                                src={POKEMON_DATA[family].sprites[0]}
                                                alt={family}
                                                className="w-8 h-8 object-contain"
                                                style={{ imageRendering: 'pixelated' }}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tooltip triangle */}
                            <div className="absolute -bottom-2 left-8 w-4 h-4 bg-[#f8f9fa] dark:bg-[#1e293b] border-b-4 border-r-4 border-black dark:border-gray-500 transform rotate-45"></div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.button
                    onClick={() => setShowMenu(!showMenu)}
                    onMouseMove={handlePet}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="relative group cursor-pointer w-20 h-20 flex items-end justify-center drop-shadow-lg p-2"
                    aria-label="Toggle virtual pet menu"
                >
                    {/* Mood Bubble */}
                    <AnimatePresence>
                        {mood !== 'Happy' && !showMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.5 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.5 }}
                                className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-600 rounded-full px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-lg"
                            >
                                {MOOD_EMOJIS[mood]}
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-gray-800 border-r-2 border-b-2 border-black dark:border-gray-600 rotate-45"></div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Hearts for Petting */}
                    <AnimatePresence>
                        {hearts.map(heart => (
                            <motion.div
                                key={heart.id}
                                initial={{ y: 0, opacity: 1, scale: 0.5 }}
                                animate={{ y: -60, opacity: 0, scale: 1.5 }}
                                exit={{ opacity: 0 }}
                                className="absolute text-red-500 pointer-events-none z-30"
                                style={{ left: `calc(50% + ${heart.x}px)` }}
                            >
                                ❤️
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Decorative shadow ellipse */}
                    <div className="absolute bottom-1 w-12 h-3 bg-black/20 dark:bg-black/40 rounded-[100%] blur-[2px]"></div>

                    <img
                        src={currentSprite}
                        alt="Virtual Pet"
                        width={80}
                        height={80}
                        className={`relative z-10 w-full h-full object-contain pointer-events-none ${isPetted ? 'animate-bounce' : ''}`}
                        style={{ imageRendering: 'pixelated' }}
                    />

                    {/* Level Badge (shows on hover) */}
                    <div className="absolute -top-2 -right-2 bg-pink-500 text-white text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full border border-black opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        Lv.{level}
                    </div>
                </motion.button>
            </div>
        </motion.div>
    );
}
