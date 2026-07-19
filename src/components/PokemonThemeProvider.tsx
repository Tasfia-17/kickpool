'use client';

// BACKWARDS COMPATIBILITY LAYER
// This file re-exports from the new ThemeProvider to maintain compatibility
// with existing code that imports from PokemonThemeProvider

export { ThemeProvider as PokemonThemeProvider, useTheme as usePokemonTheme } from './ThemeProvider';
export type { CatTheme as PokemonTheme } from '@/lib/catThemes';
export { CAT_THEMES as POKEMON_THEMES } from '@/lib/catThemes';

