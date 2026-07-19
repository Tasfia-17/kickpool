import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { isAdminUser } from '@/lib/security';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

// PUBLIC PROFILE FIELDS - Safe to show to anyone
const PUBLIC_FIELDS = {
  username: true,
  image: true,
  bio: true,
  createdAt: true,
  // Public VIP cosmetics (these are meant to be shown off)
  isVIP: true,
  isFounder: true,
  vipBadge: true,
};

// PRIVATE FIELDS - Only shown to the user themselves or admins
const PRIVATE_FIELDS = {
  ...PUBLIC_FIELDS,
  discord: true,
  instagram: true,
  twitter: true,
  role: true,
  vipNameColor: true,
  vipFont: true,
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
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    const requestedUsername = decodeURIComponent(resolvedParams.username);
    const authenticatedUsername = session?.user?.name;

    // Determine access level
    const isOwnProfile = authenticatedUsername === requestedUsername;
    const isAdmin = session?.user && isAdminUser((session.user as any).role);
    const hasFullAccess = isOwnProfile || isAdmin;

    // Select fields based on access level
    const selectFields = hasFullAccess ? PRIVATE_FIELDS : PUBLIC_FIELDS;

    const user = await (prisma.user.findUnique as any)({
      where: { username: requestedUsername },
      select: selectFields
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Log access for security monitoring (only log sensitive access)
    if (hasFullAccess && !isOwnProfile) {
      logger.info(`[SECURITY] Admin ${authenticatedUsername} accessed profile of ${requestedUsername}`);
    }

    return NextResponse.json(user);

  } catch (error) {
    logger.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
