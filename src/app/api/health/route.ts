import { NextResponse } from 'next/server';

// Health check endpoint to verify environment variables and database
export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      // NOTE: Do NOT expose the actual NEXTAUTH_URL value here — it leaks infra details.
    },
    database: {
      status: 'unknown',
      error: null as string | null,
    },
  };

  // Test database connection and check if tables exist
  try {
    const { prisma } = await import('@/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    
    // Check if Room table exists
    try {
      const tableCheck = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'Room'
        );
      `;
      const tableExists = (tableCheck as any[])[0]?.exists || false;
      
      checks.database.status = tableExists ? 'connected' : 'connected_but_no_tables';
      if (!tableExists) {
        checks.database.error = 'Database connected but Room table does not exist. Migrations may not have run.';
      }
    } catch (tableError: any) {
      // If we can't check tables, at least we know connection works
      checks.database.status = 'connected';
    }
  } catch (error: any) {
    checks.database.status = 'error';
    checks.database.error = error.message || 'Unknown database error';
    if (error.code) {
      checks.database.error += ` (code: ${error.code})`;
    }
  }

  // Return status
  const isHealthy = 
    checks.environment.hasDatabaseUrl &&
    checks.environment.hasNextAuthUrl &&
    checks.environment.hasNextAuthSecret &&
    checks.database.status === 'connected';

  return NextResponse.json(checks, {
    status: isHealthy ? 200 : 500,
  });
}


