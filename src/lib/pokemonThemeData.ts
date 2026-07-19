// Pokemon-themed color themes for CinePurr
// Uses PokeAPI animated sprites from Generation V (Black/White)

// Sprite URL helpers — served from /public for long-lived caching
const SPRITE_BASE = '/sprites/animated';
const STATIC_BASE = '/sprites/small';
const SMALL_SPRITE = '/sprites/small';

/** Get a small static sprite (96×96 PNG) for any Pokemon by ID */
export const getPokeSprite = (id: number) => `${SMALL_SPRITE}/${id}.png`;

export interface PokemonThemeConfig {
  id: string;
  name: string;
  pokemonName: string;
  pokemonId: number;
  sprite: string; // Animated GIF URL
  staticSprite: string; // Static fallback
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    darkBackground: string;
    text: string;
    cardBg: string;
  };
  particleIds: number[]; // Related Pokemon IDs for floating particle sprites
}

export const POKEMON_THEME_DATA: PokemonThemeConfig[] = [
  {
    id: 'pikachu',
    name: 'Pikachu',
    pokemonName: 'Pikachu',
    pokemonId: 25,
    sprite: `${SPRITE_BASE}/25.gif`,
    staticSprite: `${STATIC_BASE}/25.png`,
    colors: {
      primary: '#FDCB6E',
      secondary: '#F39C12',
      accent: '#E74C3C',
      background: '#FFFAF0',
      darkBackground: '#2a2318',
      text: '#2D3436',
      cardBg: '#FFFFFF',
    },
    particleIds: [25, 172, 26, 311, 312], // Pikachu, Pichu, Raichu, Plusle, Minun
  },
  {
    id: 'charizard',
    name: 'Charizard',
    pokemonName: 'Charizard',
    pokemonId: 6,
    sprite: `${SPRITE_BASE}/6.gif`,
    staticSprite: `${STATIC_BASE}/6.png`,
    colors: {
      primary: '#FF9F43',
      secondary: '#E67E22',
      accent: '#FFD93D',
      background: '#FFF8F0',
      darkBackground: '#1a1512',
      text: '#2D3436',
      cardBg: '#FFFFFF',
    },
    particleIds: [6, 4, 5, 155, 58], // Charizard, Charmander, Charmeleon, Cyndaquil, Growlithe
  },
  {
    id: 'umbreon',
    name: 'Umbreon',
    pokemonName: 'Umbreon',
    pokemonId: 197,
    sprite: `${SPRITE_BASE}/197.gif`,
    staticSprite: `${STATIC_BASE}/197.png`,
    colors: {
      primary: '#2C3E50',
      secondary: '#1A252F',
      accent: '#FDCB6E',
      background: '#F8F9FA',
      darkBackground: '#0d1117',
      text: '#2D3436',
      cardBg: '#FFFFFF',
    },
    particleIds: [197, 198, 228, 215, 302], // Umbreon, Murkrow, Houndour, Sneasel, Sableye
  },
  {
    id: 'flareon',
    name: 'Flareon',
    pokemonName: 'Flareon',
    pokemonId: 136,
    sprite: `${SPRITE_BASE}/136.gif`,
    staticSprite: `${STATIC_BASE}/136.png`,
    colors: {
      primary: '#E17055',
      secondary: '#B83B5E',
      accent: '#F5CBA7',
      background: '#FDF5E6',
      darkBackground: '#2a1a18',
      text: '#2D3436',
      cardBg: '#FFFFFF',
    },
    particleIds: [136, 37, 58, 77, 240], // Flareon, Vulpix, Growlithe, Ponyta, Magby
  },
  {
    id: 'squirtle',
    name: 'Squirtle',
    pokemonName: 'Squirtle',
    pokemonId: 7,
    sprite: `${SPRITE_BASE}/7.gif`,
    staticSprite: `${STATIC_BASE}/7.png`,
    colors: {
      primary: '#74B9FF',
      secondary: '#0984E3',
      accent: '#A29BFE',
      background: '#F0F8FF',
      darkBackground: '#0c1929',
      text: '#2D3436',
      cardBg: '#FFFFFF',
    },
    particleIds: [7, 8, 9, 158, 258], // Squirtle, Wartortle, Blastoise, Totodile, Mudkip
  },
  {
    id: 'eevee',
    name: 'Eevee',
    pokemonName: 'Eevee',
    pokemonId: 133,
    sprite: `${SPRITE_BASE}/133.gif`,
    staticSprite: `${STATIC_BASE}/133.png`,
    colors: {
      primary: '#DFE6E9',
      secondary: '#636E72',
      accent: '#74B9FF',
      background: '#FAFAFA',
      darkBackground: '#1a1a1f',
      text: '#2D3436',
      cardBg: '#FFFFFF',
    },
    particleIds: [133, 196, 134, 135, 471], // Eevee, Espeon, Vaporeon, Jolteon, Glaceon
  },
  {
    id: 'gengar',
    name: 'Gengar',
    pokemonName: 'Gengar',
    pokemonId: 94,
    sprite: `${SPRITE_BASE}/94.gif`,
    staticSprite: `${STATIC_BASE}/94.png`,
    colors: {
      primary: '#A29BFE',
      secondary: '#6C5CE7',
      accent: '#00CEC9',
      background: '#F5F3FF',
      darkBackground: '#0d0d12',
      text: '#2D3436',
      cardBg: '#FFFFFF',
    },
    particleIds: [94, 92, 93, 200, 355], // Gengar, Gastly, Haunter, Misdreavus, Duskull
  },
  {
    id: 'sylveon',
    name: 'Sylveon',
    pokemonName: 'Sylveon',
    pokemonId: 700,
    sprite: `${SPRITE_BASE}/700.gif`,
    staticSprite: `${STATIC_BASE}/700.png`,
    colors: {
      primary: '#FD79A8',
      secondary: '#E84393',
      accent: '#FFEAA7',
      background: '#FFF0F6',
      darkBackground: '#2a1a24',
      text: '#2D3436',
      cardBg: '#FFFFFF',
    },
    particleIds: [700, 35, 39, 175, 280], // Sylveon, Clefairy, Jigglypuff, Togepi, Ralts
  },
  {
    id: 'bulbasaur',
    name: 'Bulbasaur',
    pokemonName: 'Bulbasaur',
    pokemonId: 1,
    sprite: `${SPRITE_BASE}/1.gif`,
    staticSprite: `${STATIC_BASE}/1.png`,
    colors: {
      primary: '#00B894',
      secondary: '#00756F',
      accent: '#FDCB6E',
      background: '#F0FFF4',
      darkBackground: '#0d2818',
      text: '#2D3436',
      cardBg: '#FFFFFF',
    },
    particleIds: [1, 2, 3, 152, 252], // Bulbasaur, Ivysaur, Venusaur, Chikorita, Treecko
  },
];
