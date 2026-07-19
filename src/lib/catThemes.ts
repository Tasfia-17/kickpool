// Pokemon-themed color themes for CinePurr
// Uses PokeAPI animated sprites from Generation V (Black/White)
import { POKEMON_THEME_DATA, PokemonThemeConfig, getPokeSprite } from './pokemonThemeData';

export { getPokeSprite };

export interface CatTheme {
  id: string;
  name: string;
  sprite: string; // Animated GIF URL from PokeAPI
  pokemonId: number;
  pokemonName: string;
  particleIds: number[]; // Pokemon IDs for floating particle sprites
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    darkBackground: string;
    text: string;
    cardBg: string;
  };
}

// Convert Pokemon theme data to CatTheme interface for backward compatibility
function toCatTheme(p: PokemonThemeConfig): CatTheme {
  return {
    id: p.id,
    name: p.name,
    sprite: p.sprite,
    pokemonId: p.pokemonId,
    pokemonName: p.pokemonName,
    particleIds: p.particleIds,
    colors: p.colors,
  };
}

export const CAT_THEMES: CatTheme[] = POKEMON_THEME_DATA.map(toCatTheme);
