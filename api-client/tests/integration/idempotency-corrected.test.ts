import { ApiClient } from '../../src/index';

describe('Idempotency Features', () => {
  let client: ApiClient;
  
  beforeAll(() => {
    client = new ApiClient({
      baseUrl: process.env.API_BASE_URL || 'http://localhost:3001/api/v1',
      timeout: 10000,
    });
  });

  describe('Authentication Idempotency', () => {
    it('should handle duplicate registration requests with same idempotency key', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const idempotencyKey = `register-${Date.now()}`;
      
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
      const email2 = `test2-${Date.now() + 1}@example.com`;
      
      const response1 = await client.auth.register({
        email: email1,
        password: 'TestPassword123!',
        firstName: 'User1',
      }, {
        headers: {
          'Idempotency-Key': `key1-${Date.now()}`,
        },
      });

      const response2 = await client.auth.register({
        email: email2,
        password: 'TestPassword123!',
        firstName: 'User2',
      }, {
        headers: {
          'Idempotency-Key': `key2-${Date.now()}`,
        },
      });

      expect(response1.user.id).not.toBe(response2.user.id);
      expect(response1.user.email).toBe(email1);
      expect(response2.user.email).toBe(email2);
    });
  });

  describe('API Key Creation Idempotency', () => {
    let authToken: string;

    beforeAll(async () => {
      // Register and login to get auth token
      const loginEmail = `apikey-test-${Date.now()}@example.com`;
      await client.auth.register({
        email: loginEmail,
        password: 'TestPassword123!',
      });
      
      const loginResponse = await client.auth.login({
        email: loginEmail,
        password: 'TestPassword123!',
      });

      authToken = loginResponse.accessToken;
      client.setAccessToken(authToken);
    });

    it('should prevent duplicate API key creation', async () => {
      const idempotencyKey = `apikey-${Date.now()}`;
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
    let authToken: string;

    beforeAll(async () => {
      // Login as admin
      const loginResponse = await client.auth.login({
        email: 'admin@example.com',
        password: 'password123',
      });
      
      authToken = loginResponse.accessToken;
      client.setAccessToken(authToken);

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
        try {
          await client.entities.deleteEntity(testEntityId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle duplicate entity record creation', async () => {
      const idempotencyKey = `entity-record-${Date.now()}`;
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
      const idempotencyKey = `x-header-${Date.now()}`;
      
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

  describe('Concurrent Requests', () => {
    it('should handle concurrent requests with same idempotency key', async () => {
      const idempotencyKey = `concurrent-${Date.now()}`;
      const userData = {
        email: `concurrent-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Concurrent',
        lastName: 'Test',
      };

      // Send two requests simultaneously
      const [response1, response2] = await Promise.allSettled([
        client.auth.register(userData, {
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
        client.auth.register(userData, {
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
      ]);

      // At least one should succeed
      const successfulResponses = [response1, response2].filter(
        r => r.status === 'fulfilled'
      );

      expect(successfulResponses.length).toBeGreaterThan(0);

      // If both succeed, they should have the same user ID
      if (successfulResponses.length === 2) {
        const userId1 = (response1 as any).value.user.id;
        const userId2 = (response2 as any).value.user.id;
        expect(userId1).toBe(userId2);
      }
    });
  });
});