export interface RoomTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxUsers: number;
  isPublic: boolean;
  category?: string;
  tags?: string[];
}

export const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    id: 'movie_night',
    name: 'Movie Night',
    description: 'Perfect for watching movies with friends',
    icon: '🎬',
    maxUsers: 20,
    isPublic: true,
    category: 'entertainment',
    tags: ['movie', 'social'],
  },
  {
    id: 'study_session',
    name: 'Study Session',
    description: 'Focus and study together',
    icon: '📚',
    maxUsers: 5,
    isPublic: false,
    category: 'education',
    tags: ['study', 'focus'],
  },
  {
    id: 'party_room',
    name: 'Party Room',
    description: 'Big party with lots of people!',
    icon: '🎉',
    maxUsers: 50,
    isPublic: true,
    category: 'social',
    tags: ['party', 'fun'],
  },
  {
    id: 'anime_club',
    name: 'Anime Club',
    description: 'Watch anime together',
    icon: '🎌',
    maxUsers: 15,
    isPublic: true,
    category: 'anime',
    tags: ['anime', 'japanese'],
  },
  {
    id: 'chill_vibes',
    name: 'Chill Vibes',
    description: 'Relax and chill together',
    icon: '🌙',
    maxUsers: 10,
    isPublic: true,
    category: 'relaxation',
    tags: ['chill', 'relax'],
  },
];



