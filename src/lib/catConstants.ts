// Cat facts for CinePurr - replacing Pokemon facts
// All original cat facts, no IP issues!
// Cat sprites by 0x72 (Robert Norenberg) - Licensed under CC BY-SA 4.0

// Helper to get cat sprite from public folder
const catSprite = (num: number) => `/cats/tile${num.toString().padStart(3, '0')}.png`;

export const CAT_FACTS_EN = [
  // General Cat Facts
  { fact: "Cats can rotate their ears 180 degrees!", cat: "tabby", avatar: catSprite(0) },
  { fact: "A group of cats is called a 'clowder'!", cat: "calico", avatar: catSprite(1) },
  { fact: "Cats spend 70% of their lives sleeping!", cat: "persian", avatar: catSprite(2) },
  { fact: "Cats have over 20 vocalizations including the purr!", cat: "siamese", avatar: catSprite(3) },

  // Physical Abilities
  { fact: "Cats can jump up to 6 times their length!", cat: "bengal", avatar: catSprite(4) },
  { fact: "A cat's nose print is unique, like a fingerprint!", cat: "orange", avatar: catSprite(5) },
  { fact: "Cats can run up to 30 miles per hour!", cat: "abyssinian", avatar: catSprite(6) },
  { fact: "Cats have 230 bones - more than humans!", cat: "maine-coon", avatar: catSprite(7) },

  // Senses
  { fact: "Cats can see in light 6x dimmer than humans need!", cat: "black", avatar: catSprite(8) },
  { fact: "A cat's whiskers are as wide as its body!", cat: "tuxedo", avatar: catSprite(9) },
  { fact: "Cats have a third eyelid called a 'haw'!", cat: "ragdoll", avatar: catSprite(10) },
  { fact: "Cats can hear sounds up to 64 kHz - way beyond humans!", cat: "scottish-fold", avatar: catSprite(11) },

  // Behavior
  { fact: "Cats knead to show they're happy and content!", cat: "british", avatar: catSprite(12) },
  { fact: "Slow blinking at a cat is like saying 'I love you'!", cat: "russian-blue", avatar: catSprite(13) },
  { fact: "Cats spend 30-50% of their day grooming!", cat: "persian2", avatar: catSprite(14) },
  { fact: "Cats bring 'gifts' because they think you can't hunt!", cat: "hunter", avatar: catSprite(15) },

  // History
  { fact: "Ancient Egyptians worshipped cats as gods!", cat: "egyptian", avatar: catSprite(16) },
  { fact: "The first cat in space was French - named Félicette!", cat: "space", avatar: catSprite(17) },
  { fact: "Cats have been domesticated for about 10,000 years!", cat: "ancient", avatar: catSprite(18) },
  { fact: "A cat was mayor of an Alaska town for 20 years!", cat: "mayor", avatar: catSprite(19) },

  // Fun Facts
  { fact: "Cats can't taste sweetness - they lack the receptor!", cat: "candy", avatar: catSprite(20) },
  { fact: "A cat's purr vibrates at 25-150 Hz - healing frequencies!", cat: "healer", avatar: catSprite(21) },
  { fact: "Cats have a dominant paw, just like humans!", cat: "paw", avatar: catSprite(22) },
  { fact: "The world's oldest cat lived to be 38 years old!", cat: "elder", avatar: catSprite(23) },

  // Communication
  { fact: "Cats only meow at humans - not other cats!", cat: "talker", avatar: catSprite(24) },
  { fact: "Each cat's meow is unique - developed just for you!", cat: "unique", avatar: catSprite(25) },
  { fact: "A cat's tail tells their mood - up means happy!", cat: "happy", avatar: catSprite(26) },
  { fact: "Cats headbutt to mark you with their scent!", cat: "bonk", avatar: catSprite(27) },

  // Intelligence
  { fact: "Cats have 300 million neurons in their brain!", cat: "smart", avatar: catSprite(28) },
  { fact: "Cats can recognize their owner's voice!", cat: "listener", avatar: catSprite(29) },
  { fact: "Cats dream just like humans do!", cat: "dreamer", avatar: catSprite(30) },
  { fact: "Cats can remember things for up to 16 hours!", cat: "memory", avatar: catSprite(31) },

  // Quirky Facts
  { fact: "Cats can drink seawater - their kidneys filter salt!", cat: "sailor", avatar: catSprite(32) },
  { fact: "A house cat shares 95.6% DNA with tigers!", cat: "tiger", avatar: catSprite(33) },
  { fact: "Cats can squeeze through any gap their head fits!", cat: "liquid", avatar: catSprite(34) },
  { fact: "Cats always land on their feet thanks to the 'righting reflex'!", cat: "acrobat", avatar: catSprite(35) },

  // CinePurr Themed
  { fact: "Cats love watching TV - especially bird videos!", cat: "watcher", avatar: catSprite(36) },
  { fact: "A cat's favorite genre? Anything with yarn!", cat: "movie", avatar: catSprite(37) },
  { fact: "Cats binge-watch by napping through commercials!", cat: "couch", avatar: catSprite(38) },
  { fact: "Movie night is purr-fect with friends!", cat: "cinema", avatar: catSprite(39) },
] as const;

export const CAT_FACTS_TR = [
  // Genel Kedi Bilgileri
  { fact: "Kediler kulaklarını 180 derece döndürebilir!", cat: "tabby", avatar: catSprite(0) },
  { fact: "Bir grup kediye 'clowder' denir!", cat: "calico", avatar: catSprite(1) },
  { fact: "Kediler hayatlarının %70'ini uyuyarak geçirir!", cat: "persian", avatar: catSprite(2) },
  { fact: "Kedilerin mırlama dahil 20'den fazla ses çıkarma yolu var!", cat: "siamese", avatar: catSprite(3) },

  // Fiziksel Yetenekler
  { fact: "Kediler boylarının 6 katına kadar zıplayabilir!", cat: "bengal", avatar: catSprite(4) },
  { fact: "Her kedinin burun izi parmak izi gibi benzersizdir!", cat: "orange", avatar: catSprite(5) },
  { fact: "Kediler saatte 48 km hıza ulaşabilir!", cat: "abyssinian", avatar: catSprite(6) },
  { fact: "Kedilerin 230 kemiği var - insanlardan daha fazla!", cat: "maine-coon", avatar: catSprite(7) },

  // Duyular
  { fact: "Kediler insanların ihtiyacından 6 kat daha az ışıkta görebilir!", cat: "black", avatar: catSprite(8) },
  { fact: "Bir kedinin bıyıkları vücudu kadar geniştir!", cat: "tuxedo", avatar: catSprite(9) },
  { fact: "Kedilerin 'haw' denilen üçüncü bir göz kapağı var!", cat: "ragdoll", avatar: catSprite(10) },
  { fact: "Kediler 64 kHz'e kadar ses duyabilir - insanların çok ötesinde!", cat: "scottish-fold", avatar: catSprite(11) },

  // Davranışlar
  { fact: "Kediler mutlu olduklarını göstermek için yoğururlar!", cat: "british", avatar: catSprite(12) },
  { fact: "Bir kediye yavaşça göz kırpmak 'seni seviyorum' demektir!", cat: "russian-blue", avatar: catSprite(13) },
  { fact: "Kediler günlerinin %30-50'sini temizlenerek geçirir!", cat: "persian2", avatar: catSprite(14) },
  { fact: "Kediler 'hediye' getirir çünkü avlanamayacağınızı düşünür!", cat: "hunter", avatar: catSprite(15) },

  // Tarih
  { fact: "Eski Mısırlılar kedilere tanrı olarak tapardı!", cat: "egyptian", avatar: catSprite(16) },
  { fact: "Uzaya giden ilk kedi Fransız'dı - adı Félicette!", cat: "space", avatar: catSprite(17) },
  { fact: "Kediler yaklaşık 10.000 yıldır evcilleştirilmiş!", cat: "ancient", avatar: catSprite(18) },
  { fact: "Bir kedi Alaska'da 20 yıl belediye başkanlığı yaptı!", cat: "mayor", avatar: catSprite(19) },

  // Eğlenceli Bilgiler
  { fact: "Kediler tatlı tadını alamaz - reseptörleri yok!", cat: "candy", avatar: catSprite(20) },
  { fact: "Kedilerin mırlaması 25-150 Hz'de titreşir - iyileştirici frekanslar!", cat: "healer", avatar: catSprite(21) },
  { fact: "Kedilerin de insanlar gibi baskın bir patisi var!", cat: "paw", avatar: catSprite(22) },
  { fact: "Dünyanın en yaşlı kedisi 38 yıl yaşadı!", cat: "elder", avatar: catSprite(23) },

  // İletişim
  { fact: "Kediler sadece insanlara miyavlar - diğer kedilere değil!", cat: "talker", avatar: catSprite(24) },
  { fact: "Her kedinin miyavlaması benzersizdir - sadece senin için geliştirildi!", cat: "unique", avatar: catSprite(25) },
  { fact: "Bir kedinin kuyruğu ruh halini anlatır - yukarı mutlu demek!", cat: "happy", avatar: catSprite(26) },
  { fact: "Kediler seni kendi kokulariyla işaretlemek için kafa atar!", cat: "bonk", avatar: catSprite(27) },

  // Zeka
  { fact: "Kedilerin beyninde 300 milyon nöron var!", cat: "smart", avatar: catSprite(28) },
  { fact: "Kediler sahibinin sesini tanıyabilir!", cat: "listener", avatar: catSprite(29) },
  { fact: "Kediler de insanlar gibi rüya görür!", cat: "dreamer", avatar: catSprite(30) },
  { fact: "Kediler 16 saate kadar şeyleri hatırlayabilir!", cat: "memory", avatar: catSprite(31) },

  // İlginç Bilgiler
  { fact: "Kediler deniz suyu içebilir - böbrekleri tuzu süzer!", cat: "sailor", avatar: catSprite(32) },
  { fact: "Ev kedisi DNA'sının %95.6'sını kaplanlarla paylaşır!", cat: "tiger", avatar: catSprite(33) },
  { fact: "Kediler başlarının sığdığı her boşluktan geçebilir!", cat: "liquid", avatar: catSprite(34) },
  { fact: "Kediler 'düzeltme refleksi' sayesinde hep ayaklarının üstüne düşer!", cat: "acrobat", avatar: catSprite(35) },

  // CinePurr Temalı
  { fact: "Kediler TV izlemeyi sever - özellikle kuş videolarını!", cat: "watcher", avatar: catSprite(36) },
  { fact: "Bir kedinin favori türü? İp olan herşey!", cat: "movie", avatar: catSprite(37) },
  { fact: "Kediler reklamlarda uyuyarak dizi maratonu yapar!", cat: "couch", avatar: catSprite(38) },
  { fact: "Film gecesi arkadaşlarla mükemmel!", cat: "cinema", avatar: catSprite(39) },
] as const;

// Export for backward compatibility
export const CAT_FACTS = CAT_FACTS_EN;

// Get cat facts based on language
export function getCatFactsByLanguage(language: string) {
  return language === 'tr' ? CAT_FACTS_TR : CAT_FACTS_EN;
}

// DiceBear avatar styles for user profiles (prioritize cute/friendly styles)
export const AVATAR_STYLES = [
  'fun-emoji',
  'pixel-art',
  'thumbs',
  'shapes',
  'lorelei',
  'notionists'
] as const;

// Generate a DiceBear avatar URL
export function generateAvatar(seed: string, style: typeof AVATAR_STYLES[number] = 'fun-emoji'): string {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

// Get a random cat fact
export function getRandomCatFact() {
  return CAT_FACTS[Math.floor(Math.random() * CAT_FACTS.length)];
}
