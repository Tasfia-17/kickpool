export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface RoomState {
  roomId: string;
  isPlaying: boolean;
  timestamp: number; // Current video time in seconds
  lastUpdated: number; // Server timestamp when the state was last updated
  currentVideo?: VideoSource;
  hostId?: string;
}

export interface VideoSource {
  url: string;
  title: string;
  provider: 'youtube' | 'vimeo' | 'mp4' | 'movie' | 'iptv';
  isAnime?: boolean;
  userAgent?: string;
  referrer?: string;
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  isBroadcast?: boolean;
  reactions?: string;
  // VIP fields
  isVIP?: boolean;
  isFounder?: boolean;
  vipNameColor?: string;
  vipFont?: string;
  vipBadge?: string;
  vipGlow?: boolean;
  // CineRank
  watchTime?: number;
}

export interface QueueItem {
  id: string;
  url: string;
  title: string;
  provider: string;
  addedBy: string;
  votes: number;
  voters: string[];
  thumbnail?: string;
}
