import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import logger from "@/lib/logger";
import { invalidateFriendsCacheFor } from "@/lib/cache";
import redisClient, { isRedisAvailable } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import {
  resolveProfileSceneEffect,
  resolveProfileSceneId,
} from "@/lib/profileData";
import {
  PROFILE_SCENE_EFFECT_IDS,
  PROFILE_SCENE_IDS,
} from "@/lib/profileTypes";

export const dynamic = "force-dynamic";

function hasVipAccess(user: {
  isVIP?: boolean | null;
  isFounder?: boolean | null;
  role?: string | null;
}) {
  return !!user.isVIP || !!user.isFounder || user.role === "PURR_ADMIN";
}

function isValidColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{3,8}$/.test(value);
}

function isValidString(value: unknown, max = 200): value is string {
  return typeof value === "string" && value.length <= max;
}

function sanitizeCSS(css: unknown): string | null {
  if (typeof css !== "string") {
    return null;
  }

  const dangerous = /url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:/gi;
  return css.replace(dangerous, "/* blocked */").slice(0, 2000);
}

const VIP_SELECT = {
  id: true,
  username: true,
  isVIP: true,
  role: true,
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
  vipBioEffect: true,
  vipCustomCSS: true,
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
  profileSceneId: true,
  profileSceneEffect: true,
} as const;

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: session.user.name },
      select: VIP_SELECT,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...user,
      isVIP: hasVipAccess(user),
      profileSceneId: resolveProfileSceneId(user),
      profileSceneEffect: resolveProfileSceneEffect(user),
    });
  } catch (error) {
    logger.error("Failed to fetch VIP settings", error);
    return NextResponse.json(
      { error: "Failed to fetch VIP settings" },
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
    const body = (await req.json()) as Record<string, unknown>;
    const user = await prisma.user.findUnique({
      where: { username: session.user.name },
      select: {
        id: true,
        username: true,
        isVIP: true,
        isFounder: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!hasVipAccess(user)) {
      return NextResponse.json(
        { error: "VIP membership required" },
        { status: 403 },
      );
    }

    const updateData: Record<string, unknown> = {};

    const colorFields = [
      "vipNameColor",
      "vipProfileBanner",
      "vipProfileAccent",
      "vipProfileBorder",
      "vipCardNameColor",
    ] as const;
    for (const field of colorFields) {
      if (body[field] === undefined) {
        continue;
      }
      if (body[field] === null || body[field] === "") {
        updateData[field] = null;
      } else if (isValidColor(body[field])) {
        updateData[field] = body[field];
      }
    }

    const stringFields = [
      "vipFont",
      "vipBadge",
      "vipNameEffect",
      "vipNameGradient",
      "vipBioEffect",
      "vipCardNameGradient",
      "vipProfileBg",
      "vipProfileGlow",
      "profileCardStyle",
      "idCardStyle",
      "idCardCustomHeader",
      "idCardCustomBody",
      "idCardCustomAccent",
      "idCardCustomBorder",
    ] as const;
    for (const field of stringFields) {
      if (body[field] === undefined) {
        continue;
      }
      if (body[field] === null || body[field] === "") {
        if (field === "profileCardStyle") {
          updateData[field] = "classic";
        } else {
          updateData[field] = null;
        }
      } else if (isValidString(body[field])) {
        updateData[field] = body[field];
      }
    }

    const boolFields = [
      "vipGlow",
      "vipCardNameGlow",
      "idCardShowLevel",
      "idCardShowXp",
      "idCardShowHologram",
      "idCardShowScanlines",
    ] as const;
    for (const field of boolFields) {
      if (typeof body[field] === "boolean") {
        updateData[field] = body[field];
      }
    }

    if (body.vipCustomCSS !== undefined) {
      updateData.vipCustomCSS = sanitizeCSS(body.vipCustomCSS);
    }

    if (body.profileSceneId !== undefined) {
      if (
        body.profileSceneId === null ||
        body.profileSceneId === "" ||
        PROFILE_SCENE_IDS.includes(body.profileSceneId as (typeof PROFILE_SCENE_IDS)[number])
      ) {
        updateData.profileSceneId = body.profileSceneId || null;
      }
    }

    if (body.profileSceneEffect !== undefined) {
      if (
        body.profileSceneEffect === null ||
        body.profileSceneEffect === "" ||
        PROFILE_SCENE_EFFECT_IDS.includes(
          body.profileSceneEffect as (typeof PROFILE_SCENE_EFFECT_IDS)[number],
        )
      ) {
        updateData.profileSceneEffect = body.profileSceneEffect || null;
      }
    }

    await prisma.user.update({
      where: { username: session.user.name },
      data: updateData,
    });

    const updatedUser = await prisma.user.findUnique({
      where: { username: session.user.name },
      select: VIP_SELECT,
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Failed to reload VIP settings" },
        { status: 500 },
      );
    }

    invalidateFriendsCacheFor(user.id);
    if (redisClient && isRedisAvailable()) {
      await redisClient.del(`profile:${user.username}`);
    }

    return NextResponse.json({
      ...updatedUser,
      isVIP: hasVipAccess(updatedUser),
      profileSceneId: resolveProfileSceneId(updatedUser),
      profileSceneEffect: resolveProfileSceneEffect(updatedUser),
    });
  } catch (error) {
    logger.error("Failed to update VIP settings", error);
    return NextResponse.json(
      { error: "Failed to update VIP settings" },
      { status: 500 },
    );
  }
}
