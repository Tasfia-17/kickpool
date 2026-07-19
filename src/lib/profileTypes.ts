export const PROFILE_SCENE_IDS = [
  "pallet-hideout",
  "celadon-video-club",
  "lavender-late-show",
  "goldenrod-arcade-loft",
  "cinnabar-projection-booth",
] as const;

export type ProfileSceneId = (typeof PROFILE_SCENE_IDS)[number];

export const PROFILE_SCENE_EFFECT_IDS = [
  "none",
  "golden-hour",
  "rainy-window",
  "starlit",
  "arcade-bloom",
] as const;

export type ProfileSceneEffectId = (typeof PROFILE_SCENE_EFFECT_IDS)[number];

export type ProfileShowcaseItemType = "badge" | "title" | "theme" | "stamp";

export type ProfileStampRarity = "common" | "rare" | "epic" | "legendary";

export interface ProfileShowcaseSlotView {
  id?: string;
  slotIndex: number;
  itemType: ProfileShowcaseItemType | null;
  itemRef: string | null;
  title: string;
  subtitle?: string;
  caption?: string | null;
  emoji?: string;
  locked?: boolean;
}

export interface ProfilePassportStampView {
  id: string;
  stampKey: string;
  stampType: string;
  label: string;
  artVariant: string;
  rarity: ProfileStampRarity;
  roomId?: string | null;
  earnedAt: string;
}

export interface ProfileCollectionCounts {
  badges: number;
  titles: number;
  themes: number;
  stamps: number;
  showcases: number;
}

export interface ProfileFeaturedWatch {
  kind: "live" | "history";
  roomId?: string | null;
  videoTitle: string;
  watchedAt: string;
}

export interface ProfileRoomPersonaView {
  id: string;
  roomId: string;
  roomName: string;
  displayName: string | null;
  badgeEmoji: string | null;
  aboutMe: string | null;
  sceneId: ProfileSceneId;
  profileEffect: ProfileSceneEffectId;
  primaryColor: string | null;
  accentColor: string | null;
  avatarVariant: string | null;
  updatedAt: string;
}

export interface ProfileAvailableRoom {
  roomId: string;
  roomName: string;
  contextLabel?: string;
}

export interface ProfileAvailableShowcaseItem {
  type: ProfileShowcaseItemType;
  ref: string;
  label: string;
  emoji?: string;
  description?: string;
}

export interface ActiveRoomPersona {
  roomId: string;
  roomName: string;
  displayName: string | null;
  badgeEmoji: string | null;
  aboutMe: string | null;
  sceneId: ProfileSceneId;
  profileEffect: ProfileSceneEffectId;
  primaryColor: string | null;
  accentColor: string | null;
  avatarVariant: string | null;
}

export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  email?: string;
  role: string;
  watchTime: number;
  roomsJoined: number;
  roomsCreated?: number;
  messagesCount: number;
  totalXP?: number;
  level?: number;
  currentStreak?: number;
  createdAt: string;
  friendStatus?: "none" | "pending" | "friends" | "requested";
  bio?: string;
  discord?: string;
  instagram?: string;
  twitter?: string;
  image?: string;
  isVIP?: boolean;
  isFounder?: boolean;
  vipNameColor?: string;
  vipFont?: string;
  vipBadge?: string;
  vipGlow?: boolean;
  vipNameEffect?: string;
  vipNameGradient?: string;
  vipProfileBg?: string;
  vipProfileBanner?: string;
  vipProfileAccent?: string;
  vipProfileBorder?: string;
  vipProfileGlow?: string;
  vipCardNameColor?: string;
  vipCardNameGradient?: string;
  vipCardNameGlow?: boolean;
  profileCardStyle?: "classic" | "idcard";
  idCardStyle?: string;
  idCardCustomHeader?: string;
  idCardCustomBody?: string;
  idCardCustomAccent?: string;
  idCardCustomBorder?: string;
  idCardShowLevel?: boolean;
  idCardShowXp?: boolean;
  idCardShowHologram?: boolean;
  idCardShowScanlines?: boolean;
  activeTitle?: string | null;
  unlockedBadges?: string[];
  unlockedTitles?: string[];
  unlockedThemes?: string[];
  sceneId: ProfileSceneId;
  sceneEffect: ProfileSceneEffectId;
  showcaseSlots: ProfileShowcaseSlotView[];
  passportPreview: ProfilePassportStampView[];
  collectionCounts: ProfileCollectionCounts;
  featuredWatch: ProfileFeaturedWatch | null;
  canViewFullJourney: boolean;
  activeRoomPersona?: ActiveRoomPersona | null;
}
