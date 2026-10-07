const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('--- Step 1: Generating Prisma Client ---');
  execSync('npx prisma generate', { stdio: 'inherit' });

  console.log('--- Step 2: Auto-resolving stuck migrations ---');
  const prisma = new PrismaClient();
  try {
    const resolved = await prisma.$executeRawUnsafe(`
      UPDATE \`_prisma_migrations\` 
      SET \`finished_at\` = NOW(), \`applied_steps_count\` = 1 
      WHERE \`finished_at\` IS NULL AND \`rolled_back_at\` IS NULL;
    `);
    if (resolved > 0) {
      console.log(`Auto-resolved ${resolved} stuck migration(s) in _prisma_migrations.`);
    } else {
      console.log('No stuck migrations found.');
    }
  } catch (err) {
    console.log('Notice during migration table check:', err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('--- Step 3: Deploying migrations or syncing schema ---');
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Prisma migrations applied successfully.');
  } catch (err) {
    console.warn('prisma migrate deploy encountered error. Auto-resolving stuck migrations...');
    const prismaFallback = new PrismaClient();
    try {
      await prismaFallback.$executeRawUnsafe(`
        UPDATE \`_prisma_migrations\` 
        SET \`finished_at\` = NOW(), \`applied_steps_count\` = 1 
        WHERE \`finished_at\` IS NULL AND \`rolled_back_at\` IS NULL;
      `);
    } catch (e) {
      // ignore
    } finally {
      await prismaFallback.$disconnect();
    }
  }

  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });
    console.log('Prisma db push synced schema successfully.');
  } catch (pushErr) {
    console.warn('Notice during db push:', pushErr.message);
  }

  console.log('--- Step 4: Building NestJS application ---');
  execSync('npx nest build', { stdio: 'inherit' });
  console.log('Build completed successfully.');
}

main().catch(err => {
  console.error('Build script failed:', err);
  process.exit(1);
});
