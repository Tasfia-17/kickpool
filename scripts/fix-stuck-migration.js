/**
 * Fixes stuck/failed Prisma migrations by removing them from the
 * _prisma_migrations table so that `prisma migrate deploy` re-executes
 * the actual SQL. All affected migration files use IF NOT EXISTS guards
 * so re-running them is fully idempotent.
 *
 * Must run AFTER `prisma generate` so @prisma/client is available.
 * Usage: node scripts/fix-stuck-migration.js
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');

/**
 * Migrations whose SQL is idempotent (IF NOT EXISTS) and should be
 * re-run by Prisma if they are stuck (failed / never applied).
 */
const MIGRATIONS_TO_RERUN = [
  '20251223000000_add_user_titles',
  '20260305214044_add_cohost_watchlist',
];

async function resetMigration(prisma, migrationName) {
  const rows = await prisma.$queryRaw`
    SELECT migration_name, finished_at, rolled_back_at
    FROM _prisma_migrations
    WHERE migration_name = ${migrationName}
  `;

  if (!rows || rows.length === 0) {
    console.log(`[fix-migration] ${migrationName} not in table — Prisma will apply it fresh.`);
    return;
  }

  const row = rows[0];
  console.log(`[fix-migration] ${migrationName} current state:`, row);

  // Always delete and re-run these migrations — their SQL is fully idempotent
  // (IF NOT EXISTS on every ALTER/CREATE) so re-running is always safe.
  // We cannot trust finished_at here because a previous fix script may have
  // stamped it without the DDL ever executing.
  const deleted = await prisma.$executeRaw`
    DELETE FROM _prisma_migrations
    WHERE migration_name = ${migrationName}
  `;

  console.log(`[fix-migration] Removed entry for ${migrationName} (${deleted} row deleted). Prisma will re-apply the idempotent SQL.`);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const migration of MIGRATIONS_TO_RERUN) {
      await resetMigration(prisma, migration);
    }
  } catch (err) {
    // Non-fatal — log and continue so the build doesn't abort
    console.error('[fix-migration] Error (non-fatal):', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[fix-migration] Unexpected error (non-fatal):', err.message);
  process.exit(0);
});
