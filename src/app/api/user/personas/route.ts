import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  getRawProfileRecordByUsername,
  getRoomPersonasForUser,
  hasProfileShowcaseAccess,
} from "@/lib/profileData";
import {
  PROFILE_SCENE_EFFECT_IDS,
  PROFILE_SCENE_IDS,
} from "@/lib/profileTypes";

export const dynamic = "force-dynamic";

type PersonaInput = {
  roomId: string;
  displayName?: string | null;
  badgeEmoji?: string | null;
  aboutMe?: string | null;
  sceneId?: string | null;
  profileEffect?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  avatarVariant?: string | null;
};

function truncate(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max) : null;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await getRawProfileRecordByUsername(session.user.name);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!hasProfileShowcaseAccess(user)) {
      return NextResponse.json(
        { error: "VIP membership required" },
        { status: 403 },
      );
    }

    const data = await getRoomPersonasForUser(user.id);
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Failed to fetch room personas", error);
    return NextResponse.json(
      { error: "Failed to fetch room personas" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { personas?: PersonaInput[] };
    const user = await getRawProfileRecordByUsername(session.user.name);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!hasProfileShowcaseAccess(user)) {
      return NextResponse.json(
        { error: "VIP membership required" },
        { status: 403 },
      );
    }

    if (!Array.isArray(body.personas)) {
      return NextResponse.json({ error: "Invalid persona payload" }, { status: 400 });
    }

    const { availableRooms } = await getRoomPersonasForUser(user.id);
    const allowedRoomIds = new Set(availableRooms.map((room) => room.roomId));

    const preparedMap = new Map<
      string,
      {
        userId: string;
        roomId: string;
        displayName: string | null;
        badgeEmoji: string | null;
        aboutMe: string | null;
        sceneId: string | null;
        profileEffect: string | null;
        primaryColor: string | null;
        accentColor: string | null;
        avatarVariant: string | null;
      }
    >();

    for (const persona of body.personas) {
      if (typeof persona?.roomId !== "string" || !allowedRoomIds.has(persona.roomId)) {
        continue;
      }

      preparedMap.set(persona.roomId, {
        userId: user.id,
        roomId: persona.roomId,
        displayName: truncate(persona.displayName, 32),
        badgeEmoji: truncate(persona.badgeEmoji, 8),
        aboutMe: truncate(persona.aboutMe, 180),
        sceneId:
          persona.sceneId &&
          PROFILE_SCENE_IDS.includes(
            persona.sceneId as (typeof PROFILE_SCENE_IDS)[number],
          )
            ? persona.sceneId
            : null,
        profileEffect:
          persona.profileEffect &&
          PROFILE_SCENE_EFFECT_IDS.includes(
            persona.profileEffect as (typeof PROFILE_SCENE_EFFECT_IDS)[number],
          )
            ? persona.profileEffect
            : null,
        primaryColor: truncate(persona.primaryColor, 20),
        accentColor: truncate(persona.accentColor, 20),
        avatarVariant: truncate(persona.avatarVariant, 40),
      });
    }

    const prepared = Array.from(preparedMap.values());

    await prisma.$transaction(async (tx) => {
      await tx.roomPersona.deleteMany({
        where: { userId: user.id },
      });

      if (prepared.length > 0) {
        await tx.roomPersona.createMany({
          data: prepared,
        });
      }
    });

    const data = await getRoomPersonasForUser(user.id);
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Failed to update room personas", error);
    return NextResponse.json(
      { error: "Failed to update room personas" },
      { status: 500 },
    );
  }
}
