/**
 * CineRank — Rank titles based on total watch time in seconds.
 */

export interface CineRank {
  title: string;
  /** Lucide icon name to render for this rank */
  icon: string;
  color: string;
  minHours: number;
  maxHours: number | null;
}

export const CINE_RANKS: CineRank[] = [
  { title: 'Newcomer',       icon: 'Sprout',       color: '#94a3b8', minHours: 0,    maxHours: 1    },
  { title: 'Snack Watcher',  icon: 'MonitorPlay',  color: '#f97316', minHours: 1,    maxHours: 10   },
  { title: 'Movie Buff',     icon: 'Film',         color: '#3b82f6', minHours: 10,   maxHours: 50   },
  { title: 'Film Fanatic',   icon: 'Clapperboard', color: '#8b5cf6', minHours: 50,   maxHours: 200  },
  { title: 'Binge Lord',     icon: 'Zap',          color: '#ec4899', minHours: 200,  maxHours: 500  },
  { title: 'Marathon King',  icon: 'Trophy',       color: '#f59e0b', minHours: 500,  maxHours: 1000 },
  { title: 'Cinema Legend',  icon: 'Crown',        color: '#ff69b4', minHours: 1000, maxHours: null },
];

/** Get the CineRank for a user given their totalWatchSeconds. */
export function getCineRank(watchSeconds: number): CineRank {
  const hours = watchSeconds / 3600;
  for (let i = CINE_RANKS.length - 1; i >= 0; i--) {
    if (hours >= CINE_RANKS[i].minHours) return CINE_RANKS[i];
  }
  return CINE_RANKS[0];
}

/** Returns how many seconds until the next rank (or null if already at max). */
export function secondsToNextRank(watchSeconds: number): number | null {
  const hours = watchSeconds / 3600;
  for (const rank of CINE_RANKS) {
    if (rank.maxHours !== null && hours < rank.maxHours) {
      return Math.ceil((rank.maxHours - hours) * 3600);
    }
  }
  return null;
}
