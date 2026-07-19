export type Mood = 'Happy' | 'Hype' | 'Sleepy' | 'Hungry';

export const MOOD_EMOJIS: Record<Mood, string> = {
    Happy: '😊',
    Hype: '🔥',
    Sleepy: '💤',
    Hungry: '🍎'
};

export const POKEMON_DATA: Record<string, { sprites: string[]; type: string[]; personality: string[] }> = {
    bulbasaur: {
        sprites: [
            "/sprites/animated/1.gif",
            "/sprites/animated/2.gif",
            "/sprites/animated/3.gif",
        ],
        type: ['Grass', 'Poison'],
        personality: ['Docile', 'Calm', 'Relaxed', 'Gentle']
    },
    charmander: {
        sprites: [
            "/sprites/animated/4.gif",
            "/sprites/animated/5.gif",
            "/sprites/animated/6.gif",
        ],
        type: ['Fire'],
        personality: ['Brave', 'Adamant', 'Naughty', 'Rash']
    },
    squirtle: {
        sprites: [
            "/sprites/animated/7.gif",
            "/sprites/animated/8.gif",
            "/sprites/animated/9.gif",
        ],
        type: ['Water'],
        personality: ['Jolly', 'Quirky', 'Impish', 'Naive']
    },
    pikachu: {
        sprites: [
            "/sprites/animated/172.gif",
            "/sprites/animated/25.gif",
            "/sprites/animated/26.gif",
        ],
        type: ['Electric'],
        personality: ['Hasty', 'Timid', 'Jolly', 'Modest']
    },
};

export const TYPE_COLORS: Record<string, string> = {
    Grass: '#78C850',
    Fire: '#F08030',
    Water: '#6890F0',
    Electric: '#F8D030',
    Poison: '#A040A0',
    Flying: '#A890F0',
};
