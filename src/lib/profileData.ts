import { prisma } from "@/lib/prisma";
import { getProfileScene } from "@/lib/profileScenes";
import type {
  ActiveRoomPersona,
  ProfileAvailableRoom,
  ProfileAvailableShowcaseItem,
  ProfileCollectionCounts,
  ProfileFeaturedWatch,
  ProfilePassportStampView,
  ProfileRoomPersonaView,
  ProfileSceneEffectId,
  ProfileSceneId,
  ProfileShowcaseItemType,
  ProfileShowcaseSlotView,
  ProfileStampRarity,
  UserProfile,
} from "@/lib/profileTypes";
import { PROFILE_SCENE_EFFECT_IDS, PROFILE_SCENE_IDS } from "@/lib/profileTypes";
import { isAdminUser } from "@/lib/security";

type ProfileViewer = {
  id?: string | null;
  username?: string | null;
  role?: string | null;
};

type RawProfileRecord = {
  id: string;
  username: string;
  email: string | null;
  image: string | null;
  bio: string | null;
  discord: string | null;
  instagram: string | null;
  twitter: string | null;
  role: string;
  watchTime: number;
  roomsJoined: number;
  roomsCreated: number;
  messagesSent: number;
  totalXP: number;
  level: number;
  currentStreak: number;
  createdAt: Date;
  isVIP: boolean;
  isFounder: boolean;
  vipNameColor: string | null;
  vipFont: string | null;
  vipBadge: string | null;
  vipGlow: boolean;
  vipNameEffect: string | null;
  vipNameGradient: string | null;
  vipProfileBg: string | null;
  vipProfileBanner: string | null;
  vipProfileAccent: string | null;
  vipProfileBorder: string | null;
  vipProfileGlow: string | null;
  vipCardNameColor: string | null;
  vipCardNameGradient: string | null;
  vipCardNameGlow: boolean;
  profileCardStyle: string;
  idCardStyle: string | null;
  idCardCustomHeader: string | null;
  idCardCustomBody: string | null;
  idCardCustomAccent: string | null;
  idCardCustomBorder: string | null;
  idCardShowLevel: boolean;
  idCardShowXp: boolean;
  idCardShowHologram: boolean;
  idCardShowScanlines: boolean;
  activeTitle: string | null;
  unlockedBadges: string[];
  unlockedTitles: string[];
  unlockedThemes: string[];
  profileSceneId: string | null;
  profileSceneEffect: string | null;
};

type PassportSeed = {
  stampKey: string;
  stampType: string;
  label: string;
  artVariant: string;
  rarity: ProfileStampRarity;
  roomId?: string | null;
  earnedAt?: Date;
};

const PROFILE_SELECT = {
  id: true,
  username: true,
  email: true,
  image: true,
  bio: true,
  discord: true,
  instagram: true,
  twitter: true,
  role: true,
  watchTime: true,
  roomsJoined: true,
  roomsCreated: true,
  messagesSent: true,
  totalXP: true,
  level: true,
  currentStreak: true,
  createdAt: true,
  isVIP: true,
  isFounder: true,
  vipNameColor: true,
  vipFont: true,
  vipBadge: true,
  vipGlow: true,
  vipNameEffect: true,
  vipNameGradient: true,
  vipProfileBg: true,
  vipProfileBanner: true,
  vipProfileAccent: true,
  vipProfileBorder: true,
  vipProfileGlow: true,
  vipCardNameColor: true,
  vipCardNameGradient: true,
  vipCardNameGlow: true,
  profileCardStyle: true,
  idCardStyle: true,
  idCardCustomHeader: true,
  idCardCustomBody: true,
  idCardCustomAccent: true,
  idCardCustomBorder: true,
  idCardShowLevel: true,
  idCardShowXp: true,
  idCardShowHologram: true,
  idCardShowScanlines: true,
  activeTitle: true,
  unlockedBadges: true,
  unlockedTitles: true,
  unlockedThemes: true,
  profileSceneId: true,
  profileSceneEffect: true,
} as const;

function toTitleCase(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isSceneId(value: string | null | undefined): value is ProfileSceneId {
  return !!value && PROFILE_SCENE_IDS.includes(value as ProfileSceneId);
}

function isSceneEffectId(
  value: string | null | undefined,
): value is ProfileSceneEffectId {
  return !!value && PROFILE_SCENE_EFFECT_IDS.includes(value as ProfileSceneEffectId);
}

export function hasProfileShowcaseAccess(user: {
  isVIP?: boolean | null;
  isFounder?: boolean | null;
  role?: string | null;
}): boolean {
  return !!user.isVIP || !!user.isFounder || user.role === "PURR_ADMIN";
}

export function getProfileShowcaseLimit(user: {
  isVIP?: boolean | null;
  isFounder?: boolean | null;
  role?: string | null;
}): number {
  return hasProfileShowcaseAccess(user) ? 3 : 1;
}

export function resolveProfileSceneId(user: {
  profileSceneId?: string | null;
  vipProfileBg?: string | null;
  vipNameColor?: string | null;
}): ProfileSceneId {
  if (isSceneId(user.profileSceneId)) {
    return user.profileSceneId;
  }

  const legacySource = `${user.vipProfileBg ?? ""} ${user.vipNameColor ?? ""}`.toLowerCase();

  if (legacySource.includes("ffd700") || legacySource.includes("d4af37")) {
    return "goldenrod-arcade-loft";
  }

  if (
    legacySource.includes("ff69b4") ||
    legacySource.includes("e1306c") ||
    legacySource.includes("9333ea") ||
    legacySource.includes("7c3aed")
  ) {
    return "lavender-late-show";
  }

  if (
    legacySource.includes("00ff") ||
    legacySource.includes("22c55e") ||
    legacySource.includes("4ade80")
  ) {
    return "celadon-video-club";
  }

  if (
    legacySource.includes("ef4444") ||
    legacySource.includes("f97316") ||
    legacySource.includes("ff7849")
  ) {
    return "cinnabar-projection-booth";
  }

  return "pallet-hideout";
}

export function resolveProfileSceneEffect(user: {
  profileSceneEffect?: string | null;
}): ProfileSceneEffectId {
  if (isSceneEffectId(user.profileSceneEffect)) {
    return user.profileSceneEffect;
  }
  return "none";
}

async function getRoomHistoryStamps(userId: string): Promise<PassportSeed[]> {
  const recentHistory = await (prisma as any).watchHistory.findMany({
    where: { userId },
    orderBy: { watchedAt: "desc" },
    take: 24,
    select: {
      roomId: true,
      videoTitle: true,
      watchedAt: true,
    },
  });

  const uniqueRoomVisits = new Map<
    string,
    { watchedAt: Date; videoTitle: string | null }
  >();

  for (const entry of recentHistory as Array<{
    roomId: string;
    watchedAt: Date;
    videoTitle: string | null;
  }>) {
    if (!entry.roomId || uniqueRoomVisits.has(entry.roomId)) {
      continue;
    }

    uniqueRoomVisits.set(entry.roomId, {
      watchedAt: entry.watchedAt,
      videoTitle: entry.videoTitle,
    });
  }

  const roomIds = Array.from(uniqueRoomVisits.keys());
  if (roomIds.length === 0) {
    return [];
  }

  const rooms = await prisma.room.findMany({
    where: { id: { in: roomIds } },
    select: { id: true, name: true },
  });
  const roomsById = new Map(rooms.map((room) => [room.id, room]));

  return roomIds.slice(0, 8).map((roomId, index) => {
    const visit = uniqueRoomVisits.get(roomId);
    const room = roomsById.get(roomId);
    const visitCount = recentHistory.filter(
      (entry: { roomId: string }) => entry.roomId === roomId,
    ).length;
    const rarity: ProfileStampRarity =
      visitCount >= 4 ? "epic" : visitCount >= 2 ? "rare" : "common";

    return {
      stampKey: `room-visit:${roomId}`,
      stampType: "room-visit",
      label: room?.name || `Watch Room ${index + 1}`,
      artVariant:
        index % 3 === 0 ? "ticket" : index % 3 === 1 ? "poster" : "map-pin",
      rarity,
      roomId: room ? roomId : undefined,
      earnedAt: visit?.watchedAt,
    };
  });
}

function buildMilestoneStamps(user: RawProfileRecord): PassportSeed[] {
  const milestoneSeeds: Array<PassportSeed | null> = [
    {
      stampKey: "membership:first-night",
      stampType: "membership",
      label: "First Night In",
      artVariant: "starter-lamp",
      rarity: "common",
      earnedAt: user.createdAt,
    },
    user.roomsCreated >= 1
      ? {
          stampKey: "hosting:first-room",
          stampType: "hosting",
          label: "First Screening Hosted",
          artVariant: "projector",
          rarity: "rare",
        }
      : null,
    user.watchTime >= 10 * 60 * 60
      ? {
          stampKey: "watch:ten-hours",
          stampType: "watch",
          label: "10-Hour Marathon",
          artVariant: "film-reel",
          rarity: "rare",
        }
      : null,
    user.watchTime >= 100 * 60 * 60
      ? {
          stampKey: "watch:hundred-hours",
          stampType: "watch",
          label: "Century Reel",
          artVariant: "vhs-tower",
          rarity: "legendary",
        }
      : null,
    user.messagesSent >= 100
      ? {
          stampKey: "chat:one-hundred",
          stampType: "chat",
          label: "After-Credits Chatter",
          artVariant: "speech-burst",
          rarity: "rare",
        }
      : null,
    user.totalXP >= 1000
      ? {
          stampKey: "xp:one-thousand",
          stampType: "xp",
          label: "Rising Trainer",
          artVariant: "spark-emblem",
          rarity: "epic",
        }
      : null,
    user.currentStreak >= 7
      ? {
          stampKey: "streak:seven-days",
          stampType: "streak",
          label: "Seven-Day Lantern",
          artVariant: "lantern",
          rarity: "epic",
        }
      : null,
    user.unlockedBadges.length >= 5
      ? {
          stampKey: "collection:badge-case",
          stampType: "collection",
          label: "Badge Case Opened",
          artVariant: "badge-case",
          rarity: "epic",
        }
      : null,
    user.unlockedThemes.length >= 3
      ? {
          stampKey: "collection:theme-capsule",
          stampType: "collection",
          label: "Theme Capsule Keeper",
          artVariant: "palette-book",
          rarity: "rare",
        }
      : null,
    user.activeTitle
      ? {
          stampKey: "title:active",
          stampType: "title",
          label: `Title Equipped: ${user.activeTitle}`,
          artVariant: "title-ribbon",
          rarity: "rare",
        }
      : null,
    user.createdAt < new Date("2026-01-01T00:00:00.000Z")
      ? {
          stampKey: "membership:og",
          stampType: "membership",
          label: "OG CinePurr Resident",
          artVariant: "star-map",
          rarity: "legendary",
        }
      : null,
  ];

  return milestoneSeeds.filter(Boolean) as PassportSeed[];
}

async function ensurePassportStamps(user: RawProfileRecord): Promise<void> {
  const roomHistoryStamps = await getRoomHistoryStamps(user.id);
  const desiredStamps = [...buildMilestoneStamps(user), ...roomHistoryStamps];

  await Promise.all(
    desiredStamps.map((stamp) =>
      (prisma as any).profilePassportStamp.upsert({
        where: {
          userId_stampKey: {
            userId: user.id,
            stampKey: stamp.stampKey,
          },
        },
        create: {
          userId: user.id,
          stampKey: stamp.stampKey,
          stampType: stamp.stampType,
          label: stamp.label,
          artVariant: stamp.artVariant,
          rarity: stamp.rarity,
          roomId: stamp.roomId ?? null,
          earnedAt: stamp.earnedAt ?? new Date(),
        },
        update: {
          label: stamp.label,
          artVariant: stamp.artVariant,
          rarity: stamp.rarity,
          roomId: stamp.roomId ?? null,
        },
      }),
    ),
  );
}

function mapStampRecord(
  stamp: {
    id: string;
    stampKey: string;
    stampType: string;
    label: string;
    artVariant: string;
    rarity: ProfileStampRarity;
    roomId: string | null;
    earnedAt: Date;
  },
): ProfilePassportStampView {
  return {
    id: stamp.id,
    stampKey: stamp.stampKey,
    stampType: stamp.stampType,
    label: stamp.label,
    artVariant: stamp.artVariant,
    rarity: stamp.rarity,
    roomId: stamp.roomId,
    earnedAt: stamp.earnedAt.toISOString(),
  };
}

export async function getPassportBookForUser(
  user: RawProfileRecord,
): Promise<ProfilePassportStampView[]> {
  await ensurePassportStamps(user);

  const stamps = await (prisma as any).profilePassportStamp.findMany({
    where: { userId: user.id },
    orderBy: [{ earnedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      stampKey: true,
      stampType: true,
      label: true,
      artVariant: true,
      rarity: true,
      roomId: true,
      earnedAt: true,
    },
  });

  return (stamps as Array<{
    id: string;
    stampKey: string;
    stampType: string;
    label: string;
    artVariant: string;
    rarity: ProfileStampRarity;
    roomId: string | null;
    earnedAt: Date;
  }>).map(mapStampRecord);
}

export async function getPassportPreviewForUser(
  user: RawProfileRecord,
  limit = 6,
): Promise<ProfilePassportStampView[]> {
  const book = await getPassportBookForUser(user);
  return book.slice(0, limit);
}

function getShowcaseSubtitle(type: ProfileShowcaseItemType): string {
  switch (type) {
    case "badge":
      return "Hall of Fame Badge";
    case "title":
      return "Trainer Ribbon";
    case "theme":
      return "Theme Capsule";
    case "stamp":
      return "Passport Stamp";
  }
}

function resolveShowcaseItem(
  user: RawProfileRecord,
  stamps: ProfilePassportStampView[],
  itemType: ProfileShowcaseItemType,
  itemRef: string,
  caption?: string | null,
): ProfileShowcaseSlotView | null {
  switch (itemType) {
    case "badge":
      return {
        slotIndex: 0,
        itemType,
        itemRef,
        title: toTitleCase(itemRef),
        subtitle: getShowcaseSubtitle(itemType),
        caption,
        emoji: "🏅",
      };
    case "title":
      return {
        slotIndex: 0,
        itemType,
        itemRef,
        title: itemRef,
        subtitle: getShowcaseSubtitle(itemType),
        caption,
        emoji: "🎀",
      };
    case "theme":
      return {
        slotIndex: 0,
        itemType,
        itemRef,
        title: toTitleCase(itemRef),
        subtitle: getShowcaseSubtitle(itemType),
        caption,
        emoji: "🎨",
      };
    case "stamp": {
      const stamp = stamps.find((candidate) => candidate.stampKey === itemRef);
      if (!stamp) {
        return null;
      }

      return {
        slotIndex: 0,
        itemType,
        itemRef,
        title: stamp.label,
        subtitle: getShowcaseSubtitle(itemType),
        caption,
        emoji: stamp.rarity === "legendary" ? "🪪" : "📮",
      };
    }
  }
}

function buildDefaultShowcaseSequence(
  user: RawProfileRecord,
  stamps: ProfilePassportStampView[],
): Array<{ itemType: ProfileShowcaseItemType; itemRef: string }> {
  const candidates: Array<{ itemType: ProfileShowcaseItemType; itemRef: string }> = [];

  if (user.activeTitle) {
    candidates.push({ itemType: "title", itemRef: user.activeTitle });
  }
  if (user.unlockedBadges[0]) {
    candidates.push({ itemType: "badge", itemRef: user.unlockedBadges[0] });
  }
  if (user.unlockedThemes[0]) {
    candidates.push({ itemType: "theme", itemRef: user.unlockedThemes[0] });
  }

  const featuredStamp =
    stamps.find((stamp) => stamp.rarity === "legendary") ?? stamps[0];
  if (featuredStamp) {
    candidates.push({ itemType: "stamp", itemRef: featuredStamp.stampKey });
  }

  return candidates;
}

export async function getResolvedShowcaseSlots(
  user: RawProfileRecord,
  stamps: ProfilePassportStampView[],
): Promise<ProfileShowcaseSlotView[]> {
  const slotLimit = getProfileShowcaseLimit(user);
  const storedSlots = await (prisma as any).profileShowcaseSlot.findMany({
    where: { userId: user.id },
    orderBy: { slotIndex: "asc" },
    select: {
      id: true,
      slotIndex: true,
      itemType: true,
      itemRef: true,
      caption: true,
    },
  });

  const defaults = buildDefaultShowcaseSequence(user, stamps);
  const storedBySlot = new Map(
    (storedSlots as Array<{
      id: string;
      slotIndex: number;
      itemType: ProfileShowcaseItemType;
      itemRef: string;
      caption: string | null;
    }>).map((slot) => [slot.slotIndex, slot]),
  );

  const slots: ProfileShowcaseSlotView[] = [];

  for (let slotIndex = 0; slotIndex < slotLimit; slotIndex += 1) {
    const stored = storedBySlot.get(slotIndex);
    const resolved = stored
      ? resolveShowcaseItem(user, stamps, stored.itemType, stored.itemRef, stored.caption)
      : null;

    if (resolved) {
      slots.push({
        ...resolved,
        id: stored?.id,
        slotIndex,
      });
      continue;
    }

    const fallback = defaults.shift();
    if (fallback) {
      const fallbackView = resolveShowcaseItem(
        user,
        stamps,
        fallback.itemType,
        fallback.itemRef,
        null,
      );
      if (fallbackView) {
        slots.push({
          ...fallbackView,
          slotIndex,
        });
        continue;
      }
    }

    slots.push({
      slotIndex,
      itemType: null,
      itemRef: null,
      title: "Empty Pedestal",
      subtitle: "Add a highlight from your collection",
      emoji: "🪵",
      locked: false,
    });
  }

  return slots;
}

export async function getAvailableShowcaseItemsForUser(
  user: RawProfileRecord,
): Promise<ProfileAvailableShowcaseItem[]> {
  const stamps = await getPassportBookForUser(user);
  const badgeItems = user.unlockedBadges.map((badge) => ({
    type: "badge" as const,
    ref: badge,
    label: toTitleCase(badge),
    emoji: "🏅",
    description: "Badge",
  }));
  const titleItems = user.unlockedTitles.map((title) => ({
    type: "title" as const,
    ref: title,
    label: title,
    emoji: "🎀",
    description: "Title",
  }));
  const themeItems = user.unlockedThemes.map((theme) => ({
    type: "theme" as const,
    ref: theme,
    label: toTitleCase(theme),
    emoji: "🎨",
    description: "Theme",
  }));
  const stampItems = stamps.map((stamp) => ({
    type: "stamp" as const,
    ref: stamp.stampKey,
    label: stamp.label,
    emoji: stamp.rarity === "legendary" ? "🪪" : "📮",
    description: "Passport Stamp",
  }));

  return [...badgeItems, ...titleItems, ...themeItems, ...stampItems];
}

export async function getFeaturedWatchForUser(
  userId: string,
): Promise<ProfileFeaturedWatch | null> {
  const lastWatch = await (prisma as any).watchHistory.findFirst({
    where: { userId },
    orderBy: { watchedAt: "desc" },
    select: {
      roomId: true,
      videoTitle: true,
      watchedAt: true,
    },
  });

  if (!lastWatch) {
    return null;
  }

  return {
    kind: "history",
    roomId: lastWatch.roomId,
    videoTitle: lastWatch.videoTitle,
    watchedAt: lastWatch.watchedAt.toISOString(),
  };
}

export function getCollectionCounts(
  user: RawProfileRecord,
  stamps: ProfilePassportStampView[],
  showcases: ProfileShowcaseSlotView[],
): ProfileCollectionCounts {
  return {
    badges: user.unlockedBadges.length,
    titles: user.unlockedTitles.length,
    themes: user.unlockedThemes.length,
    stamps: stamps.length,
    showcases: showcases.filter((slot) => slot.itemType).length,
  };
}

async function getAvailableRoomsForUser(userId: string): Promise<ProfileAvailableRoom[]> {
  const hostedRooms = await prisma.room.findMany({
    where: { hostId: userId },
    select: { id: true, name: true },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  const watchHistory = await (prisma as any).watchHistory.findMany({
    where: { userId },
    orderBy: { watchedAt: "desc" },
    take: 16,
    select: { roomId: true },
  });

  const historyRoomIds = Array.from(
    new Set(
      (watchHistory as Array<{ roomId: string }>).map((item) => item.roomId),
    ),
  );
  const historyRooms = historyRoomIds.length
    ? await prisma.room.findMany({
        where: { id: { in: historyRoomIds } },
        select: { id: true, name: true },
      })
    : [];

  const roomMap = new Map<string, ProfileAvailableRoom>();

  for (const room of hostedRooms) {
    roomMap.set(room.id, {
      roomId: room.id,
      roomName: room.name || room.id,
      contextLabel: "Hosted by you",
    });
  }

  for (const room of historyRooms) {
    if (!roomMap.has(room.id)) {
      roomMap.set(room.id, {
        roomId: room.id,
        roomName: room.name || room.id,
        contextLabel: "Recent screening",
      });
    }
  }

  return Array.from(roomMap.values());
}

export async function getRoomPersonasForUser(
  userId: string,
): Promise<{
  personas: ProfileRoomPersonaView[];
  availableRooms: ProfileAvailableRoom[];
}> {
  const [personas, availableRooms] = await Promise.all([
    (prisma as any).roomPersona.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        room: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    getAvailableRoomsForUser(userId),
  ]);

  return {
    personas: (personas as Array<{
      id: string;
      roomId: string;
      displayName: string | null;
      badgeEmoji: string | null;
      aboutMe: string | null;
      sceneId: string | null;
      profileEffect: string | null;
      primaryColor: string | null;
      accentColor: string | null;
      avatarVariant: string | null;
      updatedAt: Date;
      room: { id: string; name: string | null };
    }>).map((persona) => ({
      id: persona.id,
      roomId: persona.roomId,
      roomName: persona.room?.name || persona.roomId,
      displayName: persona.displayName,
      badgeEmoji: persona.badgeEmoji,
      aboutMe: persona.aboutMe,
      sceneId: isSceneId(persona.sceneId) ? persona.sceneId : "pallet-hideout",
      profileEffect: isSceneEffectId(persona.profileEffect)
        ? persona.profileEffect
        : "none",
      primaryColor: persona.primaryColor,
      accentColor: persona.accentColor,
      avatarVariant: persona.avatarVariant,
      updatedAt: persona.updatedAt.toISOString(),
    })),
    availableRooms,
  };
}

export async function getActiveRoomPersona(
  userId: string,
  roomId: string | null | undefined,
): Promise<ActiveRoomPersona | null> {
  if (!roomId) {
    return null;
  }

  const persona = await (prisma as any).roomPersona.findUnique({
    where: {
      userId_roomId: {
        userId,
        roomId,
      },
    },
    include: {
      room: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!persona) {
    return null;
  }

  return {
    roomId: persona.roomId,
    roomName: persona.room?.name || persona.roomId,
    displayName: persona.displayName,
    badgeEmoji: persona.badgeEmoji,
    aboutMe: persona.aboutMe,
    sceneId: isSceneId(persona.sceneId) ? persona.sceneId : "pallet-hideout",
    profileEffect: isSceneEffectId(persona.profileEffect)
      ? persona.profileEffect
      : "none",
    primaryColor: persona.primaryColor,
    accentColor: persona.accentColor,
    avatarVariant: persona.avatarVariant,
  };
}

export async function getRawProfileRecordByUsername(
  username: string,
): Promise<RawProfileRecord | null> {
  return (await prisma.user.findUnique({
    where: { username, isBanned: false },
    select: PROFILE_SELECT,
  })) as RawProfileRecord | null;
}

export async function getProfileViewByUsername(options: {
  username: string;
  viewer?: ProfileViewer | null;
  roomId?: string | null;
}): Promise<UserProfile | null> {
  const user = await getRawProfileRecordByUsername(options.username);

  if (!user) {
    return null;
  }

  const viewer = options.viewer ?? null;
  const isOwnProfile = viewer?.username === options.username;
  const isAdmin = !!viewer?.role && isAdminUser(viewer.role);

  let friendStatus: UserProfile["friendStatus"] = "none";
  if (viewer?.id && !isOwnProfile) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: viewer.id, friendId: user.id },
          { userId: user.id, friendId: viewer.id },
        ],
      },
    });

    if (friendship) {
      friendStatus = "friends";
    } else {
      const sentRequest = await prisma.friendRequest.findFirst({
        where: {
          senderId: viewer.id,
          receiverId: user.id,
          status: "PENDING",
        },
      });

      if (sentRequest) {
        friendStatus = "pending";
      } else {
        const receivedRequest = await prisma.friendRequest.findFirst({
          where: {
            senderId: user.id,
            receiverId: viewer.id,
            status: "PENDING",
          },
        });
        if (receivedRequest) {
          friendStatus = "requested";
        }
      }
    }
  }

  const canViewFullJourney = isOwnProfile || isAdmin || friendStatus === "friends";
  const sceneId = resolveProfileSceneId(user);
  const sceneEffect = resolveProfileSceneEffect(user);
  const passportBook = await getPassportBookForUser(user);
  const passportPreview = passportBook.slice(0, 6);
  const showcaseSlots = await getResolvedShowcaseSlots(user, passportBook);
  const featuredWatch = canViewFullJourney
    ? await getFeaturedWatchForUser(user.id)
    : null;
  const activeRoomPersona = options.roomId
    ? await getActiveRoomPersona(user.id, options.roomId)
    : null;

  const collectionCounts = getCollectionCounts(user, passportBook, showcaseSlots);
  const effectiveScene = getProfileScene(activeRoomPersona?.sceneId || sceneId);

  return {
    id: user.id,
    name: user.username,
    username: user.username,
    email: isOwnProfile || isAdmin ? user.email ?? undefined : undefined,
    role: user.role,
    watchTime: user.watchTime ?? 0,
    roomsJoined: user.roomsJoined ?? 0,
    roomsCreated: user.roomsCreated ?? 0,
    messagesCount: user.messagesSent ?? 0,
    totalXP: user.totalXP ?? 0,
    level: user.level ?? 1,
    currentStreak: user.currentStreak ?? 0,
    createdAt: user.createdAt.toISOString(),
    friendStatus,
    bio: activeRoomPersona?.aboutMe ?? user.bio ?? undefined,
    discord: isOwnProfile || isAdmin ? user.discord ?? undefined : undefined,
    instagram: isOwnProfile || isAdmin ? user.instagram ?? undefined : undefined,
    twitter: isOwnProfile || isAdmin ? user.twitter ?? undefined : undefined,
    image: user.image ?? undefined,
    isVIP: user.isVIP || user.isFounder || user.role === "PURR_ADMIN",
    isFounder: user.isFounder ?? false,
    vipNameColor: user.vipNameColor ?? undefined,
    vipFont: user.vipFont ?? undefined,
    vipBadge: activeRoomPersona?.badgeEmoji ?? user.vipBadge ?? undefined,
    vipGlow: user.vipGlow ?? false,
    vipNameEffect: user.vipNameEffect ?? undefined,
    vipNameGradient: user.vipNameGradient ?? undefined,
    vipProfileBg: user.vipProfileBg ?? undefined,
    vipProfileBanner: user.vipProfileBanner ?? undefined,
    vipProfileAccent: user.vipProfileAccent ?? undefined,
    vipProfileBorder: user.vipProfileBorder ?? effectiveScene.border,
    vipProfileGlow: user.vipProfileGlow ?? effectiveScene.accent,
    vipCardNameColor: user.vipCardNameColor ?? undefined,
    vipCardNameGradient: user.vipCardNameGradient ?? undefined,
    vipCardNameGlow: user.vipCardNameGlow ?? false,
    profileCardStyle:
      user.profileCardStyle === "idcard" ? "idcard" : "classic",
    idCardStyle: user.idCardStyle ?? undefined,
    idCardCustomHeader: user.idCardCustomHeader ?? undefined,
    idCardCustomBody: user.idCardCustomBody ?? undefined,
    idCardCustomAccent: user.idCardCustomAccent ?? undefined,
    idCardCustomBorder: user.idCardCustomBorder ?? undefined,
    idCardShowLevel: user.idCardShowLevel,
    idCardShowXp: user.idCardShowXp,
    idCardShowHologram: user.idCardShowHologram,
    idCardShowScanlines: user.idCardShowScanlines,
    activeTitle: user.activeTitle,
    unlockedBadges: user.unlockedBadges,
    unlockedTitles: user.unlockedTitles,
    unlockedThemes: user.unlockedThemes,
    sceneId: activeRoomPersona?.sceneId || sceneId,
    sceneEffect: activeRoomPersona?.profileEffect || sceneEffect,
    showcaseSlots,
    passportPreview,
    collectionCounts,
    featuredWatch,
    canViewFullJourney,
    activeRoomPersona,
  };
}
