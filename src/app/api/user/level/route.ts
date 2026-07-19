import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Adjust based on your auth file location
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ level: 1 }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { level: true, totalXP: true }
        });

        if (!user) {
            return NextResponse.json({ level: 1 }, { status: 404 });
        }

        // Return the actual level from DB
        return NextResponse.json({ level: user.level, totalXP: user.totalXP }, { status: 200 });

    } catch (error) {
        logger.error("Error fetching user level:", error);
        return NextResponse.json({ level: 1 }, { status: 500 });
    }
}
