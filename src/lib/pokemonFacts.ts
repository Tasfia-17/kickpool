// Pokemon facts for CinePurr - Fun Pokemon trivia
// Uses PokeAPI animated sprites for avatars

const SPRITE_BASE = '/sprites/animated';

const pokemonSprite = (id: number) => `${SPRITE_BASE}/${id}.gif`;

export const POKEMON_FACTS_EN = [
  // Pikachu & Electric Types
  { fact: "Pikachu's name comes from 'pika' (sparkle) + 'chu' (mouse squeak)!", pokemon: "Pikachu", avatar: pokemonSprite(25) },
  { fact: "Pikachu was originally going to be CinePurr's mascot from day one!", pokemon: "Pikachu", avatar: pokemonSprite(25) },
  { fact: "Jolteon has cells that generate electricity when stressed!", pokemon: "Jolteon", avatar: pokemonSprite(135) },
  { fact: "Raichu can store over 100,000 volts of electricity!", pokemon: "Raichu", avatar: pokemonSprite(26) },

  // Fire Types
  { fact: "Charizard can melt almost anything with its 3,000°F flame!", pokemon: "Charizard", avatar: pokemonSprite(6) },
  { fact: "Charmander's flame on its tail shows how healthy it is!", pokemon: "Charmander", avatar: pokemonSprite(4) },
  { fact: "Flareon has a body temperature of over 1,650°F!", pokemon: "Flareon", avatar: pokemonSprite(136) },
  { fact: "Arcanine is known as the 'Legendary Pokémon' in ancient scrolls!", pokemon: "Arcanine", avatar: pokemonSprite(59) },

  // Water Types
  { fact: "Squirtle's shell isn't just for protection - it reduces water resistance!", pokemon: "Squirtle", avatar: pokemonSprite(7) },
  { fact: "Vaporeon can dissolve into water and become invisible!", pokemon: "Vaporeon", avatar: pokemonSprite(134) },
  { fact: "Gyarados evolves from the weakest Pokémon, Magikarp!", pokemon: "Gyarados", avatar: pokemonSprite(130) },
  { fact: "Lapras can read human speech and is incredibly intelligent!", pokemon: "Lapras", avatar: pokemonSprite(131) },

  // Grass Types
  { fact: "Bulbasaur is the only starter that is dual-type from the start!", pokemon: "Bulbasaur", avatar: pokemonSprite(1) },
  { fact: "The seed on Bulbasaur's back grows by absorbing sunlight!", pokemon: "Bulbasaur", avatar: pokemonSprite(1) },
  { fact: "Leafeon purifies the air around it like a real plant!", pokemon: "Leafeon", avatar: pokemonSprite(470) },
  { fact: "Sceptile has seeds on its back that nourish large trees!", pokemon: "Sceptile", avatar: pokemonSprite(254) },

  // Ghost & Dark Types
  { fact: "Gengar hides in the shadows and drops the temperature by 10°F!", pokemon: "Gengar", avatar: pokemonSprite(94) },
  { fact: "Umbreon's rings glow in the dark when exposed to moonlight!", pokemon: "Umbreon", avatar: pokemonSprite(197) },
  { fact: "Haunter can phase through walls and lick you to steal your life force!", pokemon: "Haunter", avatar: pokemonSprite(93) },
  { fact: "Absol appears before disasters and tries to warn people!", pokemon: "Absol", avatar: pokemonSprite(359) },

  // Fairy & Cute Types
  { fact: "Sylveon wraps its ribbon-like feelers around your arm to sense emotions!", pokemon: "Sylveon", avatar: pokemonSprite(700) },
  { fact: "Jigglypuff's singing puts everyone to sleep - then it gets angry!", pokemon: "Jigglypuff", avatar: pokemonSprite(39) },
  { fact: "Eevee can evolve into 8 different forms - the most of any Pokémon!", pokemon: "Eevee", avatar: pokemonSprite(133) },
  { fact: "Togekiss brings happiness to people who respect mutual kindness!", pokemon: "Togekiss", avatar: pokemonSprite(468) },

  // Legendary Vibes
  { fact: "Dragonite can circle the globe in just 16 hours!", pokemon: "Dragonite", avatar: pokemonSprite(149) },
  { fact: "Lucario can sense auras and read thoughts and movements!", pokemon: "Lucario", avatar: pokemonSprite(448) },
  { fact: "Mewtwo was created by genetic manipulation of Mew's DNA!", pokemon: "Mewtwo", avatar: pokemonSprite(150) },
  { fact: "Mew is said to contain the DNA of every single Pokémon!", pokemon: "Mew", avatar: pokemonSprite(151) },

  // Fun Meta-facts
  { fact: "There are over 1,000 Pokémon species discovered so far!", pokemon: "Pokedex", avatar: pokemonSprite(132) },
  { fact: "Ditto can transform into any Pokémon it sees!", pokemon: "Ditto", avatar: pokemonSprite(132) },
  { fact: "Snorlax eats 900 pounds of food per day then falls asleep!", pokemon: "Snorlax", avatar: pokemonSprite(143) },
  { fact: "Magikarp is nearly useless but evolves into mighty Gyarados!", pokemon: "Magikarp", avatar: pokemonSprite(129) },

  // CinePurr themed
  { fact: "Pokémon love watching movies together - just like us!", pokemon: "Pikachu", avatar: pokemonSprite(25) },
  { fact: "The best way to watch is synced with friends - no lag!", pokemon: "Eevee", avatar: pokemonSprite(133) },
  { fact: "Every trainer needs a watch party room. Create yours!", pokemon: "Charizard", avatar: pokemonSprite(6) },
  { fact: "Stream night is super effective with friends!", pokemon: "Gengar", avatar: pokemonSprite(94) },

  // Types & Battles
  { fact: "Machamp can throw 500 punches per second!", pokemon: "Machamp", avatar: pokemonSprite(68) },
  { fact: "Alakazam's IQ is over 5,000 and it remembers everything!", pokemon: "Alakazam", avatar: pokemonSprite(65) },
  { fact: "Gardevoir can create small black holes to protect its trainer!", pokemon: "Gardevoir", avatar: pokemonSprite(282) },
  { fact: "Espeon developed its psychic powers from deep loyalty to its trainer!", pokemon: "Espeon", avatar: pokemonSprite(196) },
] as const;

export const POKEMON_FACTS_TR = [
  // Pikachu & Elektrik Tipleri
  { fact: "Pikachu'nun adı 'pika' (parıltı) + 'chu' (fare sesi) kelimelerinden gelir!", pokemon: "Pikachu", avatar: pokemonSprite(25) },
  { fact: "Pikachu en başından beri CinePurr'un maskotu olacaktı!", pokemon: "Pikachu", avatar: pokemonSprite(25) },
  { fact: "Jolteon stres altında elektrik üreten hücrelere sahip!", pokemon: "Jolteon", avatar: pokemonSprite(135) },
  { fact: "Raichu 100.000 voltun üzerinde elektrik depolayabilir!", pokemon: "Raichu", avatar: pokemonSprite(26) },

  // Ateş Tipleri
  { fact: "Charizard 1.650°C'lik alevi ile neredeyse her şeyi eritebilir!", pokemon: "Charizard", avatar: pokemonSprite(6) },
  { fact: "Charmander'ın kuyruğundaki alev ne kadar sağlıklı olduğunu gösterir!", pokemon: "Charmander", avatar: pokemonSprite(4) },
  { fact: "Flareon'un vücut sıcaklığı 900°C'nin üzerinde!", pokemon: "Flareon", avatar: pokemonSprite(136) },
  { fact: "Arcanine eski yazıtlarda 'Efsanevi Pokémon' olarak bilinir!", pokemon: "Arcanine", avatar: pokemonSprite(59) },

  // Su Tipleri
  { fact: "Squirtle'ın kabuğu sadece koruma için değil - su direncini azaltır!", pokemon: "Squirtle", avatar: pokemonSprite(7) },
  { fact: "Vaporeon suya karışıp görünmez olabilir!", pokemon: "Vaporeon", avatar: pokemonSprite(134) },
  { fact: "Gyarados en zayıf Pokémon olan Magikarp'tan evrimleşir!", pokemon: "Gyarados", avatar: pokemonSprite(130) },
  { fact: "Lapras insan konuşmasını anlayabilir ve inanılmaz zekidir!", pokemon: "Lapras", avatar: pokemonSprite(131) },

  // Çimen Tipleri
  { fact: "Bulbasaur başlangıçtan çift tipli olan tek starter Pokémon'dur!", pokemon: "Bulbasaur", avatar: pokemonSprite(1) },
  { fact: "Bulbasaur'un sırtındaki tohum güneş ışığını emerek büyür!", pokemon: "Bulbasaur", avatar: pokemonSprite(1) },
  { fact: "Leafeon gerçek bir bitki gibi etrafındaki havayı temizler!", pokemon: "Leafeon", avatar: pokemonSprite(470) },
  { fact: "Sceptile'ın sırtındaki tohumlar büyük ağaçları besler!", pokemon: "Sceptile", avatar: pokemonSprite(254) },

  // Hayalet & Karanlık Tipleri
  { fact: "Gengar gölgelere saklanır ve sıcaklığı 5°C düşürür!", pokemon: "Gengar", avatar: pokemonSprite(94) },
  { fact: "Umbreon'un halkaları ay ışığına maruz kaldığında karanlıkta parlar!", pokemon: "Umbreon", avatar: pokemonSprite(197) },
  { fact: "Haunter duvarlardan geçebilir ve sizi yalayarak yaşam gücünüzü çalar!", pokemon: "Haunter", avatar: pokemonSprite(93) },
  { fact: "Absol felaketlerden önce ortaya çıkar ve insanları uyarmaya çalışır!", pokemon: "Absol", avatar: pokemonSprite(359) },

  // Peri & Sevimli Tipler
  { fact: "Sylveon duygularınızı hissetmek için kurdele benzeri dokunaçlarını kolunuza sarar!", pokemon: "Sylveon", avatar: pokemonSprite(700) },
  { fact: "Jigglypuff'ın şarkısı herkesi uyutur - sonra kızar!", pokemon: "Jigglypuff", avatar: pokemonSprite(39) },
  { fact: "Eevee 8 farklı forma evrimleşebilir - herhangi bir Pokémon'un en çoğu!", pokemon: "Eevee", avatar: pokemonSprite(133) },
  { fact: "Togekiss karşılıklı nezakete saygı gösteren insanlara mutluluk getirir!", pokemon: "Togekiss", avatar: pokemonSprite(468) },

  // Efsanevi
  { fact: "Dragonite sadece 16 saatte dünyayı dolaşabilir!", pokemon: "Dragonite", avatar: pokemonSprite(149) },
  { fact: "Lucario auraları hissedebilir ve düşünceleri okuyabilir!", pokemon: "Lucario", avatar: pokemonSprite(448) },
  { fact: "Mewtwo, Mew'in DNA'sının genetik manipülasyonuyla yaratıldı!", pokemon: "Mewtwo", avatar: pokemonSprite(150) },
  { fact: "Mew'in her bir Pokémon'un DNA'sını içerdiği söylenir!", pokemon: "Mew", avatar: pokemonSprite(151) },

  // Eğlenceli Bilgiler
  { fact: "Şu ana kadar 1.000'den fazla Pokémon türü keşfedildi!", pokemon: "Pokedex", avatar: pokemonSprite(132) },
  { fact: "Ditto gördüğü herhangi bir Pokémon'a dönüşebilir!", pokemon: "Ditto", avatar: pokemonSprite(132) },
  { fact: "Snorlax günde 400 kilo yemek yer sonra uykuya dalar!", pokemon: "Snorlax", avatar: pokemonSprite(143) },
  { fact: "Magikarp neredeyse işe yaramaz ama güçlü Gyarados'a evrimleşir!", pokemon: "Magikarp", avatar: pokemonSprite(129) },

  // CinePurr temalı
  { fact: "Pokémon'lar da tıpkı bizim gibi birlikte film izlemeyi sever!", pokemon: "Pikachu", avatar: pokemonSprite(25) },
  { fact: "İzlemenin en iyi yolu arkadaşlarla senkronize - gecikme yok!", pokemon: "Eevee", avatar: pokemonSprite(133) },
  { fact: "Her eğitmenin bir izleme partisi odasına ihtiyacı var. Kendininkini oluştur!", pokemon: "Charizard", avatar: pokemonSprite(6) },
  { fact: "Arkadaşlarla yayın gecesi süper etkili!", pokemon: "Gengar", avatar: pokemonSprite(94) },

  // Tipler & Dövüşler
  { fact: "Machamp saniyede 500 yumruk atabilir!", pokemon: "Machamp", avatar: pokemonSprite(68) },
  { fact: "Alakazam'ın IQ'su 5.000'in üzerinde ve her şeyi hatırlar!", pokemon: "Alakazam", avatar: pokemonSprite(65) },
  { fact: "Gardevoir eğitmenini korumak için küçük kara delikler oluşturabilir!", pokemon: "Gardevoir", avatar: pokemonSprite(282) },
  { fact: "Espeon psişik güçlerini eğitmenine olan derin bağlılıktan geliştirdi!", pokemon: "Espeon", avatar: pokemonSprite(196) },
] as const;

export const POKEMON_FACTS = POKEMON_FACTS_EN;

export function getPokemonFactsByLanguage(language: string) {
  return language === 'tr' ? POKEMON_FACTS_TR : POKEMON_FACTS_EN;
}

export function getRandomPokemonFact() {
  return POKEMON_FACTS[Math.floor(Math.random() * POKEMON_FACTS.length)];
}
