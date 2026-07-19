import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import logger from "@/lib/logger";
import { getProfileViewByUsername } from "@/lib/profileData";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const [{ username: rawUsername }, session] = await Promise.all([
      params,
      getServerSession(authOptions),
    ]);
    const username = decodeURIComponent(rawUsername);
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    const profile = await getProfileViewByUsername({
      username,
      roomId,
      viewer: session?.user
        ? {
            id: (session.user as { id?: string }).id,
            username: session.user.name,
            role: (session.user as { role?: string }).role,
          }
        : null,
    });

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    logger.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}
