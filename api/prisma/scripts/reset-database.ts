import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Resetting database to clean state...\n');

  try {
    // Delete all data in correct order
    console.log('📦 Cleaning database...');
    
    // 1. Delete function executions
    await prisma.functionExecution.deleteMany({});
    console.log('  ✅ Deleted all function executions');

    // 2. Delete functions
    await prisma.function.deleteMany({});
    console.log('  ✅ Deleted all functions');

    // 3. Delete entity records
    await prisma.entityRecord.deleteMany({});
    console.log('  ✅ Deleted all entity records');

    // 4. Delete entities
    await prisma.entity.deleteMany({});
    console.log('  ✅ Deleted all entities');

    // 5. Delete API keys
    await prisma.apiKey.deleteMany({});
    console.log('  ✅ Deleted all API keys');

    // 6. Delete idempotency keys
    await prisma.idempotencyKey.deleteMany({});
    console.log('  ✅ Deleted all idempotency keys');

    // 7. Delete all users
    await prisma.user.deleteMany({});
    console.log('  ✅ Deleted all users');

    console.log('\n✨ Database is now clean!');
    console.log('\n💡 To seed the database with initial data, run: npm run db:seed');
    console.log('💡 To add sample data, run: npm run db:sample');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });