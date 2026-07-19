import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/security';
import { getAdminBridgeSecret, getSocketServerAdminUrl } from '@/lib/adminBridge';
import { isMaintenanceMode, setMaintenanceMode } from '@/lib/maintenance';
import { friendsCache, SEARCH_CACHE } from '@/lib/cache';
import logger from '@/lib/logger';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.name || !isSuperAdmin((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const maintenanceMode = await isMaintenanceMode();
    return NextResponse.json({ maintenanceMode });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get system settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.name || !isSuperAdmin((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { action, value } = await req.json();

    if (action === 'setMaintenanceMode') {
      await setMaintenanceMode(value === true);
      
      // If turning ON maintenance mode, send a global broadcast
      if (value === true) {
        try {
          const socketUrl = getSocketServerAdminUrl();
          await fetch(`${socketUrl}/api/admin/broadcast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              secret: getAdminBridgeSecret(),
              message: 'SYSTEM MAINTENANCE: The site will be undergoing maintenance shortly. Please conclude your activities.' 
            }),
          });
        } catch (e) {
          logger.error('Failed to broadcast maintenance mode warning', e);
        }
      }
      
      return NextResponse.json({ success: true, maintenanceMode: value });
    }
    
    if (action === 'clearCache') {
      // Clear various caches
      await friendsCache.clear();
      await SEARCH_CACHE.clear();
      
      return NextResponse.json({ success: true, message: 'Caches cleared successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('System settings error:', error);
    return NextResponse.json({ error: 'Internal server error processing action' }, { status: 500 });
  }
}
