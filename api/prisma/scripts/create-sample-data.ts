import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creating sample data...\n');

  try {
    // Create sample users with specific scenarios
    console.log('Creating users with different roles and scenarios...');
    const users = [];
    
    // Core users with standard email addresses
    const coreUsers = [
      {
        email: 'admin@example.com',
        username: 'admin',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        is_active: true,
        email_verified: true,
        scenario: 'Primary admin user'
      },
      {
        email: 'api-user@example.com',
        username: 'api_user',
        first_name: 'API',
        last_name: 'User',
        role: 'api_user',
        is_active: true,
        email_verified: true,
        scenario: 'API integration user'
      },
      {
        email: 'user@example.com',
        username: 'john_doe',
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        is_active: true,
        email_verified: true,
        scenario: 'Standard active user'
      }
    ];

    // Additional scenario-based users for comprehensive testing
    const scenarioUsers = [
      // Admin scenarios
      {
        email: 'manager@example.com',
        username: 'manager',
        first_name: 'Sarah',
        last_name: 'Manager',
        role: 'admin',
        is_active: true,
        email_verified: true,
        scenario: 'Secondary admin user',
        mfa_enabled: false
      },
      {
        email: 'super-admin@example.com',
        username: 'super_admin',
        first_name: 'Super',
        last_name: 'Admin',
        role: 'admin',
        is_active: true,
        email_verified: true,
        scenario: 'MFA-enabled admin',
        mfa_enabled: true
      },
      
      // API User scenarios
      {
        email: 'service@example.com',
        username: 'service_account',
        first_name: 'Service',
        last_name: 'Account',
        role: 'api_user',
        is_active: true,
        email_verified: true,
        scenario: 'Service account for automation'
      },
      {
        email: 'webhook@example.com',
        username: 'webhook_service',
        first_name: 'Webhook',
        last_name: 'Service',
        role: 'api_user',
        is_active: true,
        email_verified: true,
        scenario: 'Webhook service account'
      },
      
      // Problem scenarios
      {
        email: 'inactive@example.com',
        username: 'inactive_user',
        first_name: 'Inactive',
        last_name: 'User',
        role: 'user',
        is_active: false,
        email_verified: true,
        scenario: 'Deactivated user account'
      },
      {
        email: 'unverified@example.com',
        username: 'unverified_user',
        first_name: 'Pending',
        last_name: 'Verification',
        role: 'user',
        is_active: true,
        email_verified: false,
        scenario: 'User awaiting email verification'
      },
      {
        email: 'locked@example.com',
        username: 'locked_user',
        first_name: 'Locked',
        last_name: 'User',
        role: 'user',
        is_active: true,
        email_verified: true,
        scenario: 'User locked due to failed logins',
        failed_login_attempts: 5,
        account_locked_until: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        last_failed_login: new Date()
      },
      {
        email: 'suspended@example.com',
        username: 'suspended_user',
        first_name: 'Suspended',
        last_name: 'User',
        role: 'user',
        is_active: false,
        email_verified: true,
        scenario: 'Suspended user account'
      },
      
      // Testing scenarios
      {
        email: 'test@example.com',
        username: 'test_user',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        is_active: true,
        email_verified: true,
        scenario: 'Testing account'
      },
      {
        email: 'demo@example.com',
        username: 'demo_user',
        first_name: 'Demo',
        last_name: 'User',
        role: 'user',
        is_active: true,
        email_verified: true,
        scenario: 'Demo user account'
      },
      
      // Edge case scenarios
      {
        email: 'longtime@example.com',
        username: 'veteran',
        first_name: 'Long',
        last_name: 'Time',
        role: 'user',
        is_active: true,
        email_verified: true,
        scenario: 'Veteran user with extensive history'
      }
    ];

    // Create all defined users
    const allUsers = [...coreUsers, ...scenarioUsers];
    
    for (const userData of allUsers) {
      const password = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          username: userData.username,
          password_hash: password,
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role as any,
          is_active: userData.is_active,
          email_verified: userData.email_verified,
          email_verified_at: userData.email_verified ? new Date() : null,
          last_login_at: userData.is_active && userData.email_verified ? faker.date.recent({ days: 7 }) : null,
          mfa_enabled: (userData as any).mfa_enabled || false,
          failed_login_attempts: (userData as any).failed_login_attempts || 0,
          account_locked_until: (userData as any).account_locked_until || null,
          last_failed_login: (userData as any).last_failed_login || null,
        },
      });
      users.push(user);
      console.log(`  ✅ Created user: ${user.email} (${user.role}) - ${userData.scenario}`);
    }
    
    // Create additional random users for bulk testing
    console.log('\nCreating additional random users...');
    const additionalUserCount = 5;
    
    for (let i = 0; i < additionalUserCount; i++) {
      const password = await bcrypt.hash('password123', 10);
      const roles = ['user', 'api_user'] as const;
      const randomRole = faker.helpers.arrayElement(roles);
      const isActive = Math.random() > 0.1; // 90% chance of being active
      const isVerified = Math.random() > 0.2; // 80% chance of being verified
      
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email().toLowerCase(),
          username: faker.internet.username().toLowerCase(),
          password_hash: password,
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          role: randomRole,
          is_active: isActive,
          email_verified: isVerified,
          email_verified_at: isVerified ? faker.date.past({ years: 1 }) : null,
          last_login_at: isActive && isVerified ? faker.date.recent({ days: 30 }) : null,
          // Add some failed login attempts for testing lockout scenarios
          failed_login_attempts: Math.random() > 0.8 ? faker.number.int({ min: 1, max: 3 }) : 0,
          last_failed_login: Math.random() > 0.8 ? faker.date.recent({ days: 1 }) : null,
        },
      });
      users.push(user);
      console.log(`  ✅ Created user: ${user.email} (${user.role})`);
    }

    // Create sample entities
    console.log('\nCreating entities...');
    
    const contactEntity = await prisma.entity.create({
      data: {
        name: 'contact',
        display_name: 'Contact',
        description: 'Contact information for customers and leads',
        schema: {
          type: 'object',
          properties: {
            firstName: { type: 'string', minLength: 1, maxLength: 100 },
            lastName: { type: 'string', minLength: 1, maxLength: 100 },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            company: { type: 'string', maxLength: 200 },
            jobTitle: { type: 'string', maxLength: 100 },
            notes: { type: 'string', maxLength: 1000 },
            status: { type: 'string', enum: ['lead', 'customer', 'partner', 'inactive'] },
          },
          required: ['firstName', 'lastName', 'email', 'status'],
        },
        version: 1,
        is_active: true,
        created_by: users[0].id,
      },
    });
    console.log(`  ✅ Created entity: ${contactEntity.display_name}`);

    const taskEntity = await prisma.entity.create({
      data: {
        name: 'task',
        display_name: 'Task',
        description: 'Task management system',
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', maxLength: 2000 },
            status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done', 'cancelled'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            assignedTo: { type: 'string' },
            dueDate: { type: 'string', format: 'date-time' },
            tags: { type: 'array', items: { type: 'string' } },
            estimatedHours: { type: 'number', minimum: 0 },
            completedAt: { type: 'string', format: 'date-time' },
          },
          required: ['title', 'status', 'priority'],
        },
        version: 1,
        is_active: true,
        created_by: users[0].id,
      },
    });
    console.log(`  ✅ Created entity: ${taskEntity.display_name}`);

    const eventEntity = await prisma.entity.create({
      data: {
        name: 'event',
        display_name: 'Event',
        description: 'Event management system',
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', maxLength: 2000 },
            location: { type: 'string', maxLength: 500 },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            type: { type: 'string', enum: ['meeting', 'conference', 'workshop', 'webinar', 'social'] },
            capacity: { type: 'integer', minimum: 1 },
            registeredCount: { type: 'integer', minimum: 0 },
            isPublic: { type: 'boolean' },
            tags: { type: 'array', items: { type: 'string' } },
            organizer: { type: 'string' },
          },
          required: ['title', 'startDate', 'endDate', 'type'],
        },
        version: 1,
        is_active: true,
        created_by: users[0].id,
      },
    });
    console.log(`  ✅ Created entity: ${eventEntity.display_name}`);

    // Create sample records for each entity
    console.log('\nCreating entity records...');

    // Create contacts
    for (let i = 0; i < 10; i++) {
      await prisma.entityRecord.create({
        data: {
          entity_id: contactEntity.id,
          data: {
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            email: faker.internet.email().toLowerCase(),
            phone: faker.phone.number(),
            company: faker.company.name(),
            jobTitle: faker.person.jobTitle(),
            notes: faker.lorem.sentence(),
            status: faker.helpers.arrayElement(['lead', 'customer', 'partner', 'inactive']),
          },
          created_by: faker.helpers.arrayElement(users).id,
        },
      });
    }
    console.log('  ✅ Created 10 contact records');

    // Create tasks
    for (let i = 0; i < 15; i++) {
      const status = faker.helpers.arrayElement(['todo', 'in_progress', 'review', 'done', 'cancelled']);
      await prisma.entityRecord.create({
        data: {
          entity_id: taskEntity.id,
          data: {
            title: faker.lorem.sentence({ min: 3, max: 8 }),
            description: faker.lorem.paragraph(),
            status,
            priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
            assignedTo: faker.helpers.arrayElement(users).email,
            dueDate: faker.date.future().toISOString(),
            tags: faker.helpers.arrayElements(['bug', 'feature', 'enhancement', 'documentation', 'testing'], { min: 1, max: 3 }),
            estimatedHours: faker.number.int({ min: 1, max: 40 }),
            completedAt: status === 'done' ? faker.date.recent().toISOString() : null,
          },
          created_by: faker.helpers.arrayElement(users).id,
        },
      });
    }
    console.log('  ✅ Created 15 task records');

    // Create events
    for (let i = 0; i < 8; i++) {
      const startDate = faker.date.future();
      const endDate = new Date(startDate.getTime() + faker.number.int({ min: 1, max: 8 }) * 60 * 60 * 1000);
      const capacity = faker.number.int({ min: 10, max: 500 });
      
      await prisma.entityRecord.create({
        data: {
          entity_id: eventEntity.id,
          data: {
            title: faker.lorem.sentence({ min: 3, max: 6 }),
            description: faker.lorem.paragraph(),
            location: faker.location.streetAddress(true),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            type: faker.helpers.arrayElement(['meeting', 'conference', 'workshop', 'webinar', 'social']),
            capacity,
            registeredCount: faker.number.int({ min: 0, max: capacity }),
            isPublic: faker.datatype.boolean(),
            tags: faker.helpers.arrayElements(['technology', 'business', 'networking', 'training', 'team-building'], { min: 1, max: 3 }),
            organizer: faker.helpers.arrayElement(users).email,
          },
          created_by: faker.helpers.arrayElement(users).id,
        },
      });
    }
    console.log('  ✅ Created 8 event records');

    // Create API keys for some users
    console.log('\nCreating API keys...');
    let apiKeyCount = 0;
    
    for (const user of users.slice(0, 3)) {
      const apiKeyValue = 'sk_test_' + Buffer.from(Math.random().toString()).toString('base64').substring(0, 32);
      const apiKeyHash = await bcrypt.hash(apiKeyValue, 10);
      
      await prisma.apiKey.create({
        data: {
          user_id: user.id,
          name: `${faker.word.adjective()} API Key`,
          key_prefix: apiKeyValue.substring(0, 7),
          key_hash: apiKeyHash,
          permissions: faker.helpers.arrayElements(['read', 'write', 'delete'], { min: 1, max: 3 }),
          status: 'active',
          rate_limit: faker.number.int({ min: 100, max: 10000 }),
          expires_at: faker.date.future({ years: 1 }),
        },
      });
      apiKeyCount++;
    }
    console.log(`  ✅ Created ${apiKeyCount} API keys`);

    // Create some functions
    console.log('\nCreating functions...');
    
    const validateEmailFunction = await prisma.function.create({
      data: {
        name: 'validate-email',
        description: 'Validates email format and checks for disposable domains',
        runtime: 'javascript',
        code: `
exports.handler = async (event) => {
  const { email } = JSON.parse(event.body);
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  const isValid = emailRegex.test(email);
  const disposableDomains = ['tempmail.com', 'throwaway.email'];
  const domain = email.split('@')[1];
  const isDisposable = disposableDomains.includes(domain);
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      valid: isValid && !isDisposable,
      email,
      isDisposable
    })
  };
};`,
        env_vars: {},
        timeout: 10,
        memory: 128,
        is_active: true,
        created_by: users[0].id,
      },
    });
    console.log(`  ✅ Created function: ${validateEmailFunction.name}`);

    const slugifyFunction = await prisma.function.create({
      data: {
        name: 'slugify',
        description: 'Converts text to URL-friendly slug',
        runtime: 'javascript',
        code: `
exports.handler = async (event) => {
  const { text } = JSON.parse(event.body);
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return {
    statusCode: 200,
    body: JSON.stringify({ slug, original: text })
  };
};`,
        env_vars: {},
        timeout: 5,
        memory: 128,
        is_active: true,
        created_by: users[0].id,
      },
    });
    console.log(`  ✅ Created function: ${slugifyFunction.name}`);

    console.log('\n🎉 Sample data created successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - ${users.length} users (with various roles and scenarios)`);
    console.log(`    • ${users.filter(u => u.role === 'admin').length} admin users`);
    console.log(`    • ${users.filter(u => u.role === 'api_user').length} API users`);
    console.log(`    • ${users.filter(u => u.role === 'user').length} regular users`);
    console.log(`    • ${users.filter(u => !u.is_active).length} inactive users`);
    console.log(`    • ${users.filter(u => !u.email_verified).length} unverified users`);
    console.log(`  - 3 entities (Contact, Task, Event)`);
    console.log(`  - 33 entity records`);
    console.log(`  - ${apiKeyCount} API keys`);
    console.log(`  - 2 functions`);
    
    console.log('\n🔑 Login credentials (password: password123):');
    console.log(`  - admin@example.com (admin)`);
    console.log(`  - api-user@example.com (api_user)`);
    console.log(`  - user@example.com (user)`);
    console.log(`  - manager@example.com (admin)`);
    console.log(`  - inactive@example.com (inactive user)`);
    console.log(`  - unverified@example.com (unverified user)`);
    console.log(`  - service@example.com (api_user)`);
    console.log(`  - test@example.com (user)`);

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
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