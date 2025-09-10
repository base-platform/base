import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting sample data...\n');

  try {
    // Delete in order to respect foreign key constraints
    
    // 1. Delete function executions first
    console.log('Deleting function executions...');
    const executionResult = await prisma.functionExecution.deleteMany({});
    console.log(`  ✅ Deleted ${executionResult.count} function executions`);

    // 2. Delete functions
    console.log('Deleting functions...');
    const functionResult = await prisma.function.deleteMany({
      where: {
        name: {
          in: ['validate-email', 'slugify'],
        },
      },
    });
    console.log(`  ✅ Deleted ${functionResult.count} functions`);

    // 3. Delete entity records
    console.log('Deleting entity records...');
    const recordResult = await prisma.entityRecord.deleteMany({});
    console.log(`  ✅ Deleted ${recordResult.count} entity records`);

    // 4. Delete entities
    console.log('Deleting entities...');
    const entityResult = await prisma.entity.deleteMany({
      where: {
        name: {
          in: ['contact', 'task', 'event'],
        },
      },
    });
    console.log(`  ✅ Deleted ${entityResult.count} entities`);

    // 5. Delete API keys
    console.log('Deleting API keys...');
    const apiKeyResult = await prisma.apiKey.deleteMany({});
    console.log(`  ✅ Deleted ${apiKeyResult.count} API keys`);

    // 6. Delete idempotency keys
    console.log('Deleting idempotency keys...');
    const idempotencyResult = await prisma.idempotencyKey.deleteMany({});
    console.log(`  ✅ Deleted ${idempotencyResult.count} idempotency keys`);

    // 7. Delete users (except admin@example.com if you want to keep it)
    console.log('Deleting users...');
    const userResult = await prisma.user.deleteMany({
      where: {
        email: {
          not: 'admin@example.com', // Keep the default admin
        },
      },
    });
    console.log(`  ✅ Deleted ${userResult.count} users`);

    console.log('\n🎉 Sample data deleted successfully!');

  } catch (error) {
    console.error('❌ Error deleting sample data:', error);
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