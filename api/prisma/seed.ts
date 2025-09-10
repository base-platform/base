import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      password_hash: adminPassword,
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      is_active: true,
      email_verified: true,
      email_verified_at: new Date(),
    },
  });
  console.log('✅ Created admin user:', adminUser.email);

  // Create test user
  const userPassword = await bcrypt.hash('user123', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      username: 'testuser',
      password_hash: userPassword,
      first_name: 'Test',
      last_name: 'User',
      role: 'user',
      is_active: true,
      email_verified: true,
      email_verified_at: new Date(),
    },
  });
  console.log('✅ Created test user:', testUser.email);

  // Create sample entities
  const userProfileEntity = await prisma.entity.upsert({
    where: { name: 'user-profile' },
    update: {},
    create: {
      name: 'user-profile',
      display_name: 'User Profile',
      description: 'User profile information',
      schema: {
        type: 'object',
        properties: {
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          bio: { type: 'string', maxLength: 500 },
          avatar: { type: 'string', format: 'uri' },
          birthDate: { type: 'string', format: 'date' },
          phoneNumber: { type: 'string', pattern: '^\\+?[1-9]\\d{1,14}$' },
        },
        required: ['firstName', 'lastName'],
      },
      version: 1,
      is_active: true,
      created_by: adminUser.id,
    },
  });
  console.log('✅ Created entity:', userProfileEntity.display_name);

  const productEntity = await prisma.entity.upsert({
    where: { name: 'product' },
    update: {},
    create: {
      name: 'product',
      display_name: 'Product',
      description: 'Product catalog',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 1000 },
          price: { type: 'number', minimum: 0 },
          currency: { type: 'string', enum: ['USD', 'EUR', 'GBP'] },
          sku: { type: 'string', pattern: '^[A-Z0-9-]+$' },
          inStock: { type: 'boolean' },
          category: { type: 'string' },
          tags: { 
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['name', 'price', 'currency', 'sku'],
      },
      version: 1,
      is_active: true,
      created_by: adminUser.id,
    },
  });
  console.log('✅ Created entity:', productEntity.display_name);

  const blogPostEntity = await prisma.entity.upsert({
    where: { name: 'blog-post' },
    update: {},
    create: {
      name: 'blog-post',
      display_name: 'Blog Post',
      description: 'Blog content management',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          slug: { type: 'string', pattern: '^[a-z0-9-]+$' },
          content: { type: 'string' },
          excerpt: { type: 'string', maxLength: 300 },
          author: { type: 'string' },
          publishedAt: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['draft', 'published', 'archived'] },
          tags: { 
            type: 'array',
            items: { type: 'string' },
          },
          featuredImage: { type: 'string', format: 'uri' },
        },
        required: ['title', 'slug', 'content', 'author', 'status'],
      },
      version: 1,
      is_active: true,
      created_by: adminUser.id,
    },
  });
  console.log('✅ Created entity:', blogPostEntity.display_name);

  // Create sample entity records
  const profileRecord = await prisma.entityRecord.create({
    data: {
      entity_id: userProfileEntity.id,
      data: {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Software developer passionate about building great products',
        avatar: 'https://example.com/avatar.jpg',
        birthDate: '1990-01-15',
        phoneNumber: '+1234567890',
      },
      created_by: testUser.id,
    },
  });
  console.log('✅ Created sample user profile record');

  const productRecords = await Promise.all([
    prisma.entityRecord.create({
      data: {
        entity_id: productEntity.id,
        data: {
          name: 'Laptop Pro 15',
          description: 'High-performance laptop for professionals',
          price: 1299.99,
          currency: 'USD',
          sku: 'LP-15-001',
          inStock: true,
          category: 'Electronics',
          tags: ['laptop', 'computer', 'professional'],
        },
        created_by: adminUser.id,
      },
    }),
    prisma.entityRecord.create({
      data: {
        entity_id: productEntity.id,
        data: {
          name: 'Wireless Mouse',
          description: 'Ergonomic wireless mouse with precision tracking',
          price: 49.99,
          currency: 'USD',
          sku: 'WM-001',
          inStock: true,
          category: 'Accessories',
          tags: ['mouse', 'wireless', 'accessories'],
        },
        created_by: adminUser.id,
      },
    }),
  ]);
  console.log('✅ Created sample product records');

  const blogRecord = await prisma.entityRecord.create({
    data: {
      entity_id: blogPostEntity.id,
      data: {
        title: 'Getting Started with Dynamic APIs',
        slug: 'getting-started-with-dynamic-apis',
        content: 'Learn how to create and manage dynamic APIs using our platform...',
        excerpt: 'A comprehensive guide to building dynamic APIs',
        author: 'Admin User',
        publishedAt: new Date().toISOString(),
        status: 'published',
        tags: ['tutorial', 'api', 'development'],
        featuredImage: 'https://example.com/blog/api-guide.jpg',
      },
      created_by: adminUser.id,
    },
  });
  console.log('✅ Created sample blog post record');

  // Create API key for admin user
  const apiKeyValue = 'sk_test_' + Buffer.from(Math.random().toString()).toString('base64').substring(0, 32);
  const apiKeyHash = await bcrypt.hash(apiKeyValue, 10);
  
  const apiKey = await prisma.apiKey.create({
    data: {
      user_id: adminUser.id,
      name: 'Test API Key',
      key_prefix: apiKeyValue.substring(0, 7),
      key_hash: apiKeyHash,
      permissions: ['read', 'write', 'delete'],
      status: 'active',
      rate_limit: 1000,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
  });
  console.log('✅ Created API key for admin user');
  console.log('📋 API Key (save this, it won\'t be shown again):', apiKeyValue);

  console.log('🎉 Database seed completed successfully!');
  console.log('\n📝 Login credentials:');
  console.log('   Admin: admin@example.com / admin123');
  console.log('   User: user@example.com / user123');
  console.log(`   API Key: ${apiKeyValue}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });