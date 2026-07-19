const { execSync } = require('node:child_process');

const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(command) {
  console.log(`[build] ${command}`);
  execSync(command, { stdio: 'inherit' });
}

function main() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

  if (hasDatabaseUrl) {
    console.log('[build] DATABASE_URL detected, running migration safety checks and deploy.');
    run('node scripts/fix-stuck-migration.js');
    run(`${npxBin} prisma migrate deploy`);
  } else {
    console.log('[build] DATABASE_URL not set, skipping migration repair and deploy for local validation builds.');
  }

  if (!process.env.NEXTAUTH_SECRET) {
    process.env.NEXTAUTH_SECRET = 'build-only-insecure-secret';
    console.log('[build] NEXTAUTH_SECRET not set, using a build-only fallback secret.');
  }

  if (!process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    console.log('[build] NEXTAUTH_URL not set, using http://localhost:3000 for build-time validation.');
  }

  run(`${npxBin} prisma generate`);
  run(`${npxBin} next build`);
}

main();
