export interface RewardPoolItem {
    type: 'xp' | 'badge' | 'title' | 'theme';
    amount?: number;
    value?: string;
    weight: number;
}

export const REWARD_POOLS: Record<string, RewardPoolItem[]> = {
    common: [
        { type: 'xp', amount: 75, weight: 50 },
        { type: 'xp', amount: 150, weight: 30 },
        { type: 'badge', value: 'Common Collector', weight: 15 },
        { type: 'title', value: '🐱 Cat Lover', weight: 5 },
    ],
    rare: [
        { type: 'xp', amount: 150, weight: 40 },
        { type: 'xp', amount: 300, weight: 30 },
        { type: 'badge', value: 'Rare Collector', weight: 15 },
        { type: 'title', value: '⭐ Rising Star', weight: 10 },
        { type: 'theme', value: 'flareon', weight: 5 },
    ],
    epic: [
        { type: 'xp', amount: 300, weight: 30 },
        { type: 'xp', amount: 500, weight: 25 },
        { type: 'badge', value: 'Epic Collector', weight: 15 },
        { type: 'title', value: '🔥 Blazing Soul', weight: 10 },
        { type: 'theme', value: 'umbreon', weight: 10 },
        { type: 'theme', value: 'gengar', weight: 10 },
    ],
    legendary: [
        { type: 'xp', amount: 500, weight: 20 },
        { type: 'xp', amount: 1000, weight: 15 },
        { type: 'badge', value: 'Legendary Collector', weight: 20 },
        { type: 'title', value: '👑 Legend', weight: 12 },
        { type: 'theme', value: 'sylveon', weight: 13 },
        { type: 'theme', value: 'lucario', weight: 10 },
        { type: 'theme', value: 'gardevoir', weight: 10 },
    ],
    daily: [
        { type: 'xp', amount: 150, weight: 40 },
        { type: 'xp', amount: 300, weight: 25 },
        { type: 'xp', amount: 500, weight: 15 },
        { type: 'badge', value: 'Daily Player', weight: 10 },
        { type: 'title', value: '🌟 Daily Warrior', weight: 10 },
    ],
};

// Helper: Calculate drop chance % for an item
export function getDropChance(crateType: string, item: RewardPoolItem): number {
    const pool = REWARD_POOLS[crateType] || REWARD_POOLS.common;
    const totalWeight = pool.reduce((sum, i) => sum + i.weight, 0);
    if (totalWeight === 0) return 0;
    return (item.weight / totalWeight) * 100;
}

// Map types to display info
export const REWARD_DISPLAY_INFO: Record<string, { icon: string, label: string }> = {
    xp: { icon: '⭐', label: 'Experience' },
    badge: { icon: '🏆', label: 'Badge' },
    title: { icon: '✨', label: 'Title' },
    theme: { icon: '🎨', label: 'Theme' },
};
