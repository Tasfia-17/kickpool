import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  // Founder is highest priority, then ADMIN, then PURR_ADMIN
  const userRole = ((session?.user as any)?.role || '').toLowerCase();
  if (!session || !session.user || !['founder', 'admin', 'purr_admin'].includes(userRole)) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 403 });
  }
  const { username, email } = await req.json();
  if (!username && !email) {
    return NextResponse.json({ message: 'Username or email required.' }, { status: 400 });
  }
  try {
    const user = await prisma.user.update({
      where: username ? { username } : { email },
      data: { isVIP: true }
    });
    return NextResponse.json({ message: `VIP granted: ${user.username}` });
  } catch (e: any) {
    return NextResponse.json({ message: 'User not found or an error occurred.' }, { status: 404 });
  }
}
