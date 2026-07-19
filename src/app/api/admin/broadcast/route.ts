import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/security';
import { getAdminBridgeSecret, getSocketServerAdminUrl } from '@/lib/adminBridge';
import logger from '@/lib/logger';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.name || !isSuperAdmin((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Forward the broadcast request to the custom socket server
    // Use internal URL for server-to-server communication
    const socketUrl = getSocketServerAdminUrl();
    const secret = getAdminBridgeSecret();

    const res = await fetch(`${socketUrl}/api/admin/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, message }),
    });

    if (!res.ok) {
      throw new Error(`Socket server responded with ${res.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error sending broadcast:', error);
    return NextResponse.json({ error: 'Internal server error while broadcasting' }, { status: 500 });
  }
}
