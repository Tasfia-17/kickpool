// Move large constants outside components to prevent re-creation on every render
// Exported from catConstants for backwards compatibility
export { CAT_FACTS, CAT_FACTS_EN, CAT_FACTS_TR, generateAvatar, getRandomCatFact, getCatFactsByLanguage, AVATAR_STYLES } from './catConstants';
// Pokemon facts
export { POKEMON_FACTS, POKEMON_FACTS_EN, POKEMON_FACTS_TR, getPokemonFactsByLanguage, getRandomPokemonFact } from './pokemonFacts';
