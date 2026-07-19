'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Gift, Star, Sparkles, X, Trophy, Zap, Clock, Info, ArrowLeft, Loader2 } from 'lucide-react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { useSession } from 'next-auth/react';
import { REWARD_POOLS, REWARD_DISPLAY_INFO, getDropChance, RewardPoolItem } from '@/lib/constants/crates';

interface Crate {
  id: string;
  crateType: 'common' | 'rare' | 'epic' | 'legendary' | 'daily';
  opened: boolean;
  createdAt: string;
}

interface CrateReward {
  rewardType: string;
  rewardValue: string;
  amount?: number;
}

const CRATE_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  common: { color: '#9CA3AF', icon: '📦', label: 'Common' },
  rare: { color: '#3B82F6', icon: '💎', label: 'Rare' },
  epic: { color: '#A855F7', icon: '⭐', label: 'Epic' },
  legendary: { color: '#F59E0B', icon: '👑', label: 'Legendary' },
  daily: { color: '#10B981', icon: '🎁', label: 'Daily' },
};

type ViewState = 'inventory' | 'inspect' | 'opening' | 'reward';

export function CrateOpener() {
  const { isDarkMode, currentTheme } = usePokemonTheme();
  const { data: session } = useSession();

  // Data State
  const [crates, setCrates] = useState<Crate[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextDailyAt, setNextDailyAt] = useState<string | null>(null);
  const [availableDaily, setAvailableDaily] = useState(false);

  // View State
  const [view, setView] = useState<ViewState>('inventory');
  const [inspectingCrate, setInspectingCrate] = useState<Crate | null>(null);

  // Opening State
  const [finalReward, setFinalReward] = useState<CrateReward | null>(null);
  const finalRewardRef = useRef<CrateReward | null>(null);
  const spinErrorRef = useRef(false);
  const [rouletteItems, setRouletteItems] = useState<RewardPoolItem[]>([]);
  const [spinError, setSpinError] = useState<string | null>(null);

  // Timer State
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const controller = new AbortController();
    if (session) fetchCrates(controller.signal);
    return () => controller.abort();
  }, [session]);

  // Timer Effect
  useEffect(() => {
    if (!nextDailyAt) {
      setTimeLeft('');
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(nextDailyAt).getTime();
      const distance = target - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft('Available Now!');
        setAvailableDaily(true);
        setNextDailyAt(null);
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [nextDailyAt]);

  const fetchCrates = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await fetch('/api/crates', { signal });
      if (res.ok) {
        const data = await res.json();
        setCrates(data.crates || []);
        setNextDailyAt(data.nextDailyAt);
        setAvailableDaily(data.availableDaily);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Failed to fetch crates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimDaily = async () => {
    // Show loading state instead of optimistic update
    setAvailableDaily(false);
    
    try {
      const res = await fetch('/api/crates/daily', { method: 'POST' });
      if (res.ok) {
        // Only update state after server confirmation
        fetchCrates();
      } else {
        // Show error - keep available if failed
        setAvailableDaily(true);
      }
    } catch (error) {
      console.error('Failed to claim daily crate:', error);
      // Rollback on error
      setAvailableDaily(true);
    }
  };

  const handleInspect = (crate: Crate) => {
    setInspectingCrate(crate);
    setView('inspect');
  };

  const closeInspect = () => {
    setInspectingCrate(null);
    setView('inventory');
  };

  // Utility to map a final reward back to its pool item representation for the UI
  const matchRewardToPoolItem = (crateType: string, reward: CrateReward): RewardPoolItem => {
    const pool = REWARD_POOLS[crateType] || REWARD_POOLS.common;
    // Find the closest match
    for (const item of pool) {
      if (item.type === reward.rewardType) {
        if (item.type === 'xp' && item.amount === reward.amount) return item;
        if ((item.type === 'badge' || item.type === 'title' || item.type === 'theme') && item.value === reward.rewardValue) return item;
      }
    }
    // Fallback if not found
    return pool[0];
  };

  // Generate an array of items for the roulette based on weights
  const generateRouletteArray = (crateType: string, winnerItem: RewardPoolItem) => {
    const numItems = 60; // Total items in the strip
    const winIndex = 50; // The item it will land on

    const pool = REWARD_POOLS[crateType] || REWARD_POOLS.common;
    const items: RewardPoolItem[] = [];

    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);

    for (let i = 0; i < numItems; i++) {
      if (i === winIndex) {
        items.push(winnerItem);
        continue;
      }

      let random = Math.random() * totalWeight;
      let selected = pool[0];
      for (const item of pool) {
        random -= item.weight;
        if (random <= 0) {
          selected = item;
          break;
        }
      }
      items.push(selected);
    }

    return { items, winIndex };
  };

  const handleOpen = async () => {
    if (!inspectingCrate) return;

    setSpinError(null);
    spinErrorRef.current = false;
    finalRewardRef.current = null;
    setFinalReward(null);

    // Call API FIRST to get the actual reward, then run animation with real reward
    let wonReward: CrateReward | null = null;
    try {
      const res = await fetch('/api/crates/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crateId: inspectingCrate.id }),
      });

      if (res.ok) {
        const data = await res.json();
        wonReward = data.reward;
        finalRewardRef.current = wonReward;
        setFinalReward(wonReward);
      } else {
        const errorData = await res.json();
        finalRewardRef.current = null;
        spinErrorRef.current = true;
        setSpinError(errorData.error || 'Failed to open crate');
        setTimeout(() => setView('inspect'), 2000);
        return;
      }
    } catch (error) {
      console.error('Failed to open crate:', error);
      finalRewardRef.current = null;
      spinErrorRef.current = true;
      setSpinError('Network error');
      setTimeout(() => setView('inspect'), 2000);
      return;
    }

    // Now generate the roulette animation with the ACTUAL reward from the server
    const pool = REWARD_POOLS[inspectingCrate.crateType] || REWARD_POOLS.common;
    const winnerItem = matchRewardToPoolItem(inspectingCrate.crateType, wonReward!);
    const { items } = generateRouletteArray(inspectingCrate.crateType, winnerItem);
    setRouletteItems(items);
    setView('opening');
  };

  const handleRewardClaimed = () => {
    setView('inventory');
    setInspectingCrate(null);
    setFinalReward(null);
    setRouletteItems([]);
    fetchCrates(); // Refresh inventory
  };

  const getRewardDisplayInfo = (item: RewardPoolItem) => {
    let color = '#9CA3AF'; // Gray
    if (item.type === 'theme' || item.type === 'title') color = '#F59E0B'; // Gold
    else if (item.type === 'badge') color = '#A855F7'; // Purple
    else if (item.type === 'xp' && item.amount && item.amount > 300) color = '#3B82F6'; // Blue

    const display = REWARD_DISPLAY_INFO[item.type];
    const text = item.type === 'xp' ? `${item.amount} XP` : String(item.value);

    return { icon: display.icon, label: display.label, text, color };
  };

  if (!session) return null;

  if (loading && view === 'inventory') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="animate-spin opacity-50" size={48} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-gray-50 dark:bg-gray-900 text-black dark:text-white">

      {/* ======================= INVENTORY VIEW ======================= */}
      {view === 'inventory' && (
        <div className="flex flex-col h-full overflow-y-auto scrollbar-thin p-4">

          {/* Header & Timer Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-black italic mb-4" style={{ color: currentTheme.colors.primary }}>INVENTORY</h2>

            <div className={`p-4 rounded-xl border-2 flex items-center justify-between shadow-sm transition-all
              ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase opacity-60">Daily Crate</p>
                  <p className="font-mono font-bold text-lg">
                    {availableDaily ? 'Available Now' : timeLeft}
                  </p>
                </div>
              </div>
              {availableDaily && (
                <button
                  onClick={handleClaimDaily}
                  className="px-4 py-2 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors shadow-md hover:scale-105 active:scale-95"
                >
                  Claim
                </button>
              )}
            </div>
          </div>

          {/* Crates Grid */}
          <h3 className="text-sm font-bold uppercase opacity-60 mb-3 tracking-widest">Your Crates</h3>

          {crates.filter(c => !c.opened).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-50 text-center">
              <Package size={64} className="mb-4" />
              <p className="font-bold text-lg">No Crates Available</p>
              <p className="text-sm mt-2 max-w-xs">Complete daily quests, chat, or play games to earn more crates!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-8">
              {crates.filter(c => !c.opened).map((crate) => {
                const config = CRATE_CONFIG[crate.crateType] || CRATE_CONFIG.common;
                return (
                  <motion.div
                    key={crate.id}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleInspect(crate)}
                    className="relative cursor-pointer group"
                  >
                    {/* Glow effect behind crate */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-300 rounded-2xl"
                      style={{ backgroundColor: config.color }}
                    />

                    <div className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition-colors
                      ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-gray-400'}`}
                      style={{ borderBottomColor: config.color, borderBottomWidth: '4px' }}
                    >
                      <div className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl mb-3 shadow-[inset_0_-4px_0_rgba(0,0,0,0.1)]"
                        style={{ backgroundColor: config.color }}>
                        {config.icon}
                      </div>
                      <h4 className="font-black text-center leading-tight uppercase tracking-wider text-sm">
                        {config.label}
                      </h4>
                      <p className="text-[10px] font-mono opacity-50 mt-1 uppercase">Crate</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================= INSPECT VIEW ======================= */}
      {view === 'inspect' && inspectingCrate && (
        <div className="absolute inset-0 z-10 flex flex-col bg-gray-50 dark:bg-gray-900">
          {/* Navbar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <button onClick={closeInspect} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
              <ArrowLeft size={24} />
            </button>
            <h2 className="font-black uppercase tracking-widest text-lg">Inspect</h2>
            <div className="w-10" /> {/* Spacer */}
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center pb-24">
            {/* Crate Showcase */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-32 h-32 rounded-3xl flex items-center justify-center text-7xl shadow-2xl mb-6 relative"
              style={{ backgroundColor: CRATE_CONFIG[inspectingCrate.crateType].color }}
            >
              {/* Rotating glow */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-[-50%] bg-gradient-to-tr from-white/0 via-white/40 to-white/0 blur-2xl rounded-full"
              />
              <div className="relative z-10 drop-shadow-xl">{CRATE_CONFIG[inspectingCrate.crateType].icon}</div>
            </motion.div>

            <h2 className="text-3xl font-black mb-1 uppercase" style={{ color: CRATE_CONFIG[inspectingCrate.crateType].color }}>
              {CRATE_CONFIG[inspectingCrate.crateType].label} Crate
            </h2>
            <p className="text-sm font-mono opacity-60 mb-8">Contains 1 random item. Drop rates below.</p>

            {/* Drop Rates List */}
            <div className="w-full max-w-sm flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-2">Possible Content</h3>

              {REWARD_POOLS[inspectingCrate.crateType]?.map((item, idx) => {
                const info = getRewardDisplayInfo(item);
                const chance = getDropChance(inspectingCrate.crateType, item);

                return (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border-l-4 transition-colors
                            ${isDarkMode ? 'bg-gray-800 border-gray-700/50' : 'bg-white border-gray-200'}`}
                    style={{ borderLeftColor: info.color }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-xl">{info.icon}</div>
                      <div>
                        <p className="font-bold text-sm leading-none">{info.text}</p>
                        <p className="text-[10px] font-mono opacity-50 uppercase mt-1">{info.label}</p>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-sm" style={{ color: info.color }}>
                      {chance.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Bottom Actions */}
          <div className={`absolute bottom-0 left-0 right-0 p-4 border-t flex justify-center backdrop-blur-md
              ${isDarkMode ? 'border-gray-800 bg-gray-900/80' : 'border-gray-200 bg-gray-50/80'}`}
          >
            <button
              onClick={handleOpen}
              className="w-full max-w-sm py-4 rounded-xl font-black text-lg uppercase tracking-widest text-white shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all border-b-4"
              style={{
                backgroundColor: CRATE_CONFIG[inspectingCrate.crateType].color,
                borderColor: 'rgba(0,0,0,0.2)'
              }}
            >
              Unlock Container
            </button>
          </div>
        </div>
      )}

      {/* ======================= OPENING ROULETTE VIEW ======================= */}
      {view === 'opening' && inspectingCrate && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-950 overflow-hidden">

          {spinError && (
            <div className="absolute top-1/4 text-red-500 font-bold bg-red-500/10 px-6 py-3 rounded-xl border border-red-500/50">
              {spinError}
            </div>
          )}

          {/* Header */}
          <div className="absolute top-12 left-0 right-0 text-center">
            <h2 className="text-2xl font-black text-white uppercase tracking-widest opacity-80">Unlocking...</h2>
            <p className="text-sm text-gray-400 font-mono mt-2" style={{ color: CRATE_CONFIG[inspectingCrate.crateType].color }}>
              {CRATE_CONFIG[inspectingCrate.crateType].label} Crate
            </p>
          </div>

          {/* The Roulette Window */}
          <div className="w-full h-48 relative flex items-center bg-gray-900 border-y-4 border-gray-800 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">

            {/* Center marker line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-yellow-400 z-10 shadow-[0_0_15px_rgba(250,204,21,1)]" style={{ transform: 'translateX(-50%)' }}>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-400 rotate-45" />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-400 rotate-45" />
            </div>

            {rouletteItems.length > 0 ? (
              <motion.div
                className="flex items-center h-full absolute left-1/2"
                // 160px is the width + margin of each item.
                // We want to shift exactly by - (50 * 160px) to land the 50th item in the center.
                // Since left is 50%, start x is 0.
                initial={{ x: 0 }}
                // 164 = item width (144) + margins (20). +82 = half item width to center the item on the marker
                animate={{ x: -(50 * 164 + 82) }}
                transition={{
                  duration: 5.5,
                  ease: [0.15, 0.85, 0.25, 1], // Custom slow-down ease (like CSGO)
                }}
                onAnimationComplete={() => {
                  // Wait for API result if it hasn't arrived yet, then show reward
                  const showReward = () => {
                    if (finalRewardRef.current) {
                      setView('reward');
                    } else if (!spinErrorRef.current) {
                      setTimeout(showReward, 100);
                    }
                  };
                  setTimeout(showReward, 600);
                }}
              >
                {rouletteItems.map((item, idx) => {
                  const info = getRewardDisplayInfo(item);
                  return (
                    <div key={idx}
                      className="w-36 h-36 mx-[10px] shrink-0 rounded-xl flex flex-col items-center justify-center p-2 relative overflow-hidden bg-gray-800 border-b-4 shadow-lg"
                      style={{ borderBottomColor: info.color }}
                    >
                      <div className="absolute inset-0 opacity-10" style={{ backgroundColor: info.color }} />
                      <div className="text-4xl mb-3">{info.icon}</div>
                      <div className="font-bold text-center text-white text-xs leading-tight z-10">{info.text}</div>
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <div className="w-full flex justify-center">
                <Loader2 className="animate-spin text-white opacity-50" size={32} />
              </div>
            )}
          </div>

          {/* Dark overlay gradients for edges */}
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-950 to-transparent z-10 pointer-events-none" />
        </div>
      )}

      {/* ======================= REWARD REVEAL VIEW ======================= */}
      <AnimatePresence>
        {view === 'reward' && finalReward && inspectingCrate && (
          <motion.div
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Sunburst background effect */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-100%] z-0 opacity-30"
              style={{
                background: 'repeating-conic-gradient(from 0deg, transparent 0deg 15deg, gold 15deg 30deg)'
              }}
            />

            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
              className="relative z-10 w-80 max-w-[90%] flex flex-col items-center gap-6"
            >
              {/* Reward item matched to pool for display info */}
              {(() => {
                const poolItem = matchRewardToPoolItem(inspectingCrate.crateType, finalReward);
                const info = getRewardDisplayInfo(poolItem);

                return (
                  <>
                    <h2 className="text-yellow-400 font-bold tracking-widest uppercase text-xs flex items-center gap-2">
                      <Sparkles size={14} /> REWARD UNLOCKED
                    </h2>

                    <div className="w-full max-w-[220px] aspect-square rounded-3xl flex flex-col items-center justify-center bg-gray-900 border-2 shadow-[0_0_30px_rgba(255,255,255,0.1)] relative overflow-hidden group"
                      style={{ borderColor: info.color }}>

                      {/* Inner glow */}
                      <div className="absolute inset-0 opacity-20 blur-xl" style={{ backgroundColor: info.color }} />

                      <motion.div
                        className="text-6xl mb-4 drop-shadow-xl z-10"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        {info.icon}
                      </motion.div>

                      <div className="z-10 text-center px-4">
                        <div className="text-[10px] font-mono uppercase opacity-60 mb-1" style={{ color: info.color }}>
                          {info.label}
                        </div>
                        <h3 className="text-xl font-black text-white leading-tight">
                          {info.text}
                        </h3>
                      </div>
                    </div>
                  </>
                )
              })()}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRewardClaimed}
                className="px-10 py-4 bg-white text-black font-black uppercase tracking-widest text-lg rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all"
              >
                Confirm
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
