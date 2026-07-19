import { NextResponse } from 'next/server';
import { isMaintenanceMode } from '@/lib/maintenance';

export async function GET() {
  try {
    const maintenanceMode = await isMaintenanceMode();
    return NextResponse.json({ maintenanceMode });
  } catch (error) {
    return NextResponse.json({ maintenanceMode: false });
  }
}
