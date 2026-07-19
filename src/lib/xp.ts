/**
 * XP and Level calculation utilities
 * Consistent level formula: level = floor(sqrt(totalXP / 100)) + 1
 */

/**
 * Calculate level from total XP
 * Formula: level = floor(sqrt(totalXP / 100)) + 1
 */
export function calculateLevel(totalXP: number): number {
  if (totalXP < 0) return 1;
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

/**
 * Calculate XP needed for a specific level
 * Formula: (level - 1)^2 * 100
 */
export function getXPForLevel(level: number): number {
  if (level < 1) return 0;
  return Math.pow(level - 1, 2) * 100;
}

/**
 * Calculate XP needed to reach next level
 */
export function getXPForNextLevel(currentLevel: number): number {
  return getXPForLevel(currentLevel + 1);
}

/**
 * Calculate XP progress within current level
 */
export function getXPProgress(totalXP: number, level: number): number {
  const xpForCurrentLevel = getXPForLevel(level);
  return totalXP - xpForCurrentLevel;
}

/**
 * Calculate XP needed to reach next level from current XP
 */
export function getXPNeededForNextLevel(totalXP: number, level: number): number {
  const xpForNextLevel = getXPForNextLevel(level);
  return Math.max(0, xpForNextLevel - totalXP);
}

/**
 * Calculate progress percentage to next level
 */
export function getProgressPercent(totalXP: number, level: number): number {
  const xpForCurrentLevel = getXPForLevel(level);
  const xpForNextLevel = getXPForNextLevel(level);
  const xpRange = xpForNextLevel - xpForCurrentLevel;
  if (xpRange <= 0) return 100;
  const progress = totalXP - xpForCurrentLevel;
  return Math.min(100, Math.max(0, (progress / xpRange) * 100));
}
