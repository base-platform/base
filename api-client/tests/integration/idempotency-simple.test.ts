import { ApiClient } from '../../src/index';

describe('Idempotency Features - Simple Tests', () => {
  let client: ApiClient;
  let testIdempotencyKey: string;
  
  beforeAll(async () => {
    client = new ApiClient({
      baseUrl: process.env.API_BASE_URL || 'http://localhost:3001/api/v1',
      timeout: 10000,
    });
    
    // Generate unique idempotency key for this test run
    testIdempotencyKey = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  });

  describe('Registration Idempotency', () => {
    it('should handle duplicate registration requests with same idempotency key', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const idempotencyKey = `register-${testIdempotencyKey}`;
      
      const userData = {
        email: uniqueEmail,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'Idempotent',
      };

      // First request - should succeed
      const firstResponse = await client.auth.register(userData, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      expect(firstResponse).toBeDefined();
      expect(firstResponse.accessToken).toBeDefined();
      expect(firstResponse.user).toBeDefined();
      expect(firstResponse.user.email).toBe(uniqueEmail);

      // Second request with same idempotency key - should return cached response
      const secondResponse = await client.auth.register(userData, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      // Should return the exact same response
      expect(secondResponse.accessToken).toBe(firstResponse.accessToken);
      expect(secondResponse.user.id).toBe(firstResponse.user.id);
      expect(secondResponse.user.email).toBe(firstResponse.user.email);
    });

    it('should allow different registrations with different idempotency keys', async () => {
      const email1 = `test1-${Date.now()}@example.com`;
      const email2 = `test2-${Date.now()}@example.com`;
      
      const response1 = await client.auth.register({
        email: email1,
        password: 'TestPassword123!',
        firstName: 'User1',
      }, {
        headers: {
          'Idempotency-Key': `key1-${testIdempotencyKey}`,
        },
      });

      const response2 = await client.auth.register({
        email: email2,
        password: 'TestPassword123!',
        firstName: 'User2',
      }, {
        headers: {
          'Idempotency-Key': `key2-${testIdempotencyKey}`,
        },
      });

      expect(response1.user.id).not.toBe(response2.user.id);
      expect(response1.user.email).toBe(email1);
      expect(response2.user.email).toBe(email2);
    });
  });

  describe('API Key Creation Idempotency', () => {
    it('should prevent duplicate API key creation', async () => {
      // First login to get auth token
      const loginEmail = `apikey-test-${Date.now()}@example.com`;
      await client.auth.register({
        email: loginEmail,
        password: 'TestPassword123!',
      });
      
      const loginResponse = await client.auth.login({
        email: loginEmail,
        password: 'TestPassword123!',
      });

      client.setAccessToken(loginResponse.accessToken);

      const idempotencyKey = `apikey-${testIdempotencyKey}`;
      const apiKeyData = {
        name: `Test Key ${Date.now()}`,
        permissions: ['read'],
        expiresIn: 30,
      };

      // First request
      const firstResponse = await client.auth.createApiKey(apiKeyData, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      expect(firstResponse.id).toBeDefined();
      expect(firstResponse.key).toBeDefined();

      // Second request with same idempotency key
      const secondResponse = await client.auth.createApiKey(apiKeyData, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      // Should return the same API key
      expect(secondResponse.id).toBe(firstResponse.id);
      expect(secondResponse.key).toBe(firstResponse.key);
    });
  });

  describe('Entity Record Creation with Idempotency', () => {
    let testEntityId: string;

    beforeAll(async () => {
      // Login as admin
      const loginResponse = await client.auth.login({
        email: 'admin@example.com',
        password: 'password123',
      });
      
      client.setAccessToken(loginResponse.accessToken);

      // Create a test entity with idempotency enabled
      const entityName = `test-entity-${Date.now()}`;
      const entity = await client.entities.createEntity({
        name: entityName,
        displayName: 'Test Entity for Idempotency',
        description: 'Testing idempotency features',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            value: { type: 'number' },
          },
          required: ['name'],
        },
        isActive: true,
      });

      testEntityId = entity.id;
    });

    afterAll(async () => {
      // Clean up - delete the test entity
      if (testEntityId) {
        await client.entities.deleteEntity(testEntityId);
      }
    });

    it('should handle duplicate entity record creation', async () => {
      const idempotencyKey = `entity-record-${testIdempotencyKey}`;
      const recordData = {
        data: {
          name: 'Test Record',
          value: 42,
        },
      };

      // First creation
      const firstRecord = await client.entities.createEntityRecord(
        testEntityId,
        recordData,
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      expect(firstRecord.id).toBeDefined();
      expect(firstRecord.data.name).toBe('Test Record');

      // Second creation with same key
      const secondRecord = await client.entities.createEntityRecord(
        testEntityId,
        recordData,
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      // Should return the same record
      expect(secondRecord.id).toBe(firstRecord.id);
      expect(secondRecord.data).toEqual(firstRecord.data);
    });
  });

  describe('Headers Support', () => {
    it('should accept X-Idempotency-Key header', async () => {
      const uniqueEmail = `x-header-${Date.now()}@example.com`;
      const idempotencyKey = `x-header-${testIdempotencyKey}`;
      
      const response = await client.auth.register({
        email: uniqueEmail,
        password: 'TestPassword123!',
      }, {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      });

      expect(response.user.email).toBe(uniqueEmail);

      // Try again with same key
      const secondResponse = await client.auth.register({
        email: uniqueEmail,
        password: 'TestPassword123!',
      }, {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      });

      expect(secondResponse.user.id).toBe(response.user.id);
    });

    it('should work without idempotency key', async () => {
      const uniqueEmail = `no-key-${Date.now()}@example.com`;
      
      const response = await client.auth.register({
        email: uniqueEmail,
        password: 'TestPassword123!',
      });

      expect(response.user.email).toBe(uniqueEmail);
    });
  });
});