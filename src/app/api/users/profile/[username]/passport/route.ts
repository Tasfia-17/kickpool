import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import {
  getPassportBookForUser,
  getRawProfileRecordByUsername,
} from "@/lib/profileData";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username: rawUsername } = await params;
    const username = decodeURIComponent(rawUsername);
    const user = await getRawProfileRecordByUsername(username);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const stamps = await getPassportBookForUser(user);
    return NextResponse.json({
      username: user.username,
      stamps,
      total: stamps.length,
    });
  } catch (error) {
    logger.error("Error fetching passport stamps:", error);
    return NextResponse.json(
      { error: "Failed to fetch passport" },
      { status: 500 },
    );
  }
}
