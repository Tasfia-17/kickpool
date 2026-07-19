// BACKWARDS COMPATIBILITY LAYER
// This file re-exports from the new catThemes to maintain compatibility
// with existing code that imports from pokemonThemes

export type { CatTheme as PokemonTheme } from './catThemes';
export { CAT_THEMES as POKEMON_THEMES } from './catThemes';

