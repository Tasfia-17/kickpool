import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  getAvailableShowcaseItemsForUser,
  getPassportBookForUser,
  getProfileShowcaseLimit,
  getRawProfileRecordByUsername,
  getResolvedShowcaseSlots,
} from "@/lib/profileData";
import type { ProfileShowcaseItemType } from "@/lib/profileTypes";

export const dynamic = "force-dynamic";

type ShowcaseInput = {
  slotIndex: number;
  itemType: ProfileShowcaseItemType | null;
  itemRef: string | null;
  caption?: string | null;
};

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

    const [passportBook, availableItems] = await Promise.all([
      getPassportBookForUser(user),
      getAvailableShowcaseItemsForUser(user),
    ]);

    const slots = await getResolvedShowcaseSlots(user, passportBook);

    return NextResponse.json({
      slotLimit: getProfileShowcaseLimit(user),
      slots,
      availableItems,
    });
  } catch (error) {
    logger.error("Failed to fetch profile showcases", error);
    return NextResponse.json(
      { error: "Failed to fetch showcases" },
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
    const body = (await req.json()) as { slots?: ShowcaseInput[] };
    const user = await getRawProfileRecordByUsername(session.user.name);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!Array.isArray(body.slots)) {
      return NextResponse.json({ error: "Invalid slot payload" }, { status: 400 });
    }

    const slotLimit = getProfileShowcaseLimit(user);
    const availableItems = await getAvailableShowcaseItemsForUser(user);
    const allowedItems = new Set(
      availableItems.map((item) => `${item.type}:${item.ref}`),
    );
    const prepared = new Map<number, ShowcaseInput>();

    for (const slot of body.slots) {
      if (
        typeof slot?.slotIndex !== "number" ||
        slot.slotIndex < 0 ||
        slot.slotIndex >= slotLimit
      ) {
        continue;
      }

      if (!slot.itemType || !slot.itemRef) {
        continue;
      }

      const signature = `${slot.itemType}:${slot.itemRef}`;
      if (!allowedItems.has(signature)) {
        continue;
      }

      prepared.set(slot.slotIndex, {
        slotIndex: slot.slotIndex,
        itemType: slot.itemType,
        itemRef: slot.itemRef,
        caption:
          typeof slot.caption === "string" ? slot.caption.slice(0, 140) : null,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.profileShowcaseSlot.deleteMany({
        where: { userId: user.id },
      });

      const entries = Array.from(prepared.values());
      if (entries.length > 0) {
        await tx.profileShowcaseSlot.createMany({
          data: entries.map((slot) => ({
            userId: user.id,
            slotIndex: slot.slotIndex,
            itemType: slot.itemType as ProfileShowcaseItemType,
            itemRef: slot.itemRef as string,
            caption: slot.caption ?? null,
          })),
        });
      }
    });

    const passportBook = await getPassportBookForUser(user);
    const slots = await getResolvedShowcaseSlots(user, passportBook);

    return NextResponse.json({
      slotLimit,
      slots,
    });
  } catch (error) {
    logger.error("Failed to update profile showcases", error);
    return NextResponse.json(
      { error: "Failed to update showcases" },
      { status: 500 },
    );
  }
}
