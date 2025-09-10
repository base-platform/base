/**
 * Real integration tests for idempotency features
 * These tests make actual HTTP requests to the API
 */

// Unmock axios for real HTTP requests
jest.unmock('axios');

import { ApiClient } from '../../src/index';

describe('Idempotency Integration Tests (Real API)', () => {
  let client: ApiClient;
  
  beforeAll(() => {
    // Create client with real axios (not mocked)
    client = new ApiClient({
      baseUrl: process.env.API_BASE_URL || 'http://localhost:3001/api/v1',
      timeout: 10000,
    });
  });

  // Helper to add delay between tests to avoid rate limiting
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  describe('Registration Idempotency', () => {
    beforeAll(async () => {
      await delay(1000); // Wait to avoid rate limiting
    });
    it('should handle duplicate registration with same idempotency key', async () => {
      const uniqueEmail = `idempotent-${Date.now()}@test.com`;
      const idempotencyKey = `reg-key-${Date.now()}`;
      
      const userData = {
        email: uniqueEmail,
        password: 'TestPass123!',
        firstName: 'Test',
      };

      // First request
      const firstResponse = await client.auth.register(userData, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      expect(firstResponse).toBeDefined();
      expect(firstResponse.accessToken).toBeDefined();
      expect(firstResponse.user).toBeDefined();
      expect(firstResponse.user.email).toBe(uniqueEmail);

      // Second request with same key - should return cached
      const secondResponse = await client.auth.register(userData, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      // Verify same response
      expect(secondResponse.accessToken).toBe(firstResponse.accessToken);
      expect(secondResponse.user.id).toBe(firstResponse.user.id);
    });

    it('should allow different registrations with different keys', async () => {
      const timestamp = Date.now();
      const email1 = `user1-${timestamp}@test.com`;
      const email2 = `user2-${timestamp}@test.com`;
      
      const [response1, response2] = await Promise.all([
        client.auth.register({
          email: email1,
          password: 'TestPass123!',
        }, {
          headers: { 'Idempotency-Key': `key1-${timestamp}` },
        }),
        client.auth.register({
          email: email2,
          password: 'TestPass123!',
        }, {
          headers: { 'Idempotency-Key': `key2-${timestamp}` },
        }),
      ]);

      expect(response1.user.email).toBe(email1);
      expect(response2.user.email).toBe(email2);
      expect(response1.user.id).not.toBe(response2.user.id);
    });
  });

  describe('API Key Idempotency', () => {
    beforeAll(async () => {
      await delay(1000); // Wait to avoid rate limiting
    });
    let accessToken: string;

    beforeAll(async () => {
      // Create user and login
      const email = `apikey-user-${Date.now()}@test.com`;
      await client.auth.register({
        email,
        password: 'TestPass123!',
      });

      const loginResponse = await client.auth.login({
        email,
        password: 'TestPass123!',
      });

      accessToken = loginResponse.accessToken;
      client.setAccessToken(accessToken);
    });

    it('should prevent duplicate API key creation', async () => {
      const idempotencyKey = `apikey-${Date.now()}`;
      const keyData = {
        name: `Key ${Date.now()}`,
        permissions: ['read'],
      };

      // First creation
      const firstKey = await client.auth.createApiKey(keyData, {
        headers: { 'Idempotency-Key': idempotencyKey },
      });

      expect(firstKey.id).toBeDefined();
      expect(firstKey.key).toBeDefined();

      // Second with same key
      const secondKey = await client.auth.createApiKey(keyData, {
        headers: { 'Idempotency-Key': idempotencyKey },
      });

      expect(secondKey.id).toBe(firstKey.id);
      expect(secondKey.key).toBe(firstKey.key);
    });
  });

  describe('Entity Records Idempotency', () => {
    let entityId: string;

    beforeAll(async () => {
      // Login as admin
      const loginResponse = await client.auth.login({
        email: 'admin@example.com',
        password: 'password123',
      });

      client.setAccessToken(loginResponse.accessToken);

      // Create test entity with idempotency enabled
      const entity = await client.entities.createEntity({
        name: `test-entity-${Date.now()}`,
        displayName: 'Test Entity',
        description: 'For idempotency testing',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            value: { type: 'number' },
          },
          required: ['name'],
        },
        isActive: true,
        idempotencyEnabled: true,
        idempotencyTtl: 3600000, // 1 hour
        idempotencyMethods: ['POST', 'PUT'],
      } as any);

      entityId = entity.id;
    });

    afterAll(async () => {
      // Cleanup
      if (entityId) {
        try {
          await client.entities.deleteEntity(entityId);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle duplicate record creation', async () => {
      const idempotencyKey = `record-${Date.now()}`;
      const recordData = {
        data: {
          name: 'Test Item',
          value: 99,
        },
      };

      // First creation
      const firstRecord = await client.entities.createEntityRecord(
        entityId,
        recordData,
        {
          headers: { 'Idempotency-Key': idempotencyKey },
        }
      );

      expect(firstRecord.id).toBeDefined();
      expect(firstRecord.data.name).toBe('Test Item');

      // Second with same key
      const secondRecord = await client.entities.createEntityRecord(
        entityId,
        recordData,
        {
          headers: { 'Idempotency-Key': idempotencyKey },
        }
      );

      expect(secondRecord.id).toBe(firstRecord.id);
      expect(secondRecord.data).toEqual(firstRecord.data);
    });
  });

  describe('Header Variations', () => {
    beforeAll(async () => {
      await delay(2000); // Longer wait as we're hitting rate limits
    });
    it('should accept both Idempotency-Key and X-Idempotency-Key', async () => {
      const timestamp = Date.now();
      
      // Test with Idempotency-Key
      const email1 = `header1-${timestamp}@test.com`;
      const response1 = await client.auth.register({
        email: email1,
        password: 'TestPass123!',
      }, {
        headers: { 'Idempotency-Key': `std-${timestamp}` },
      });

      expect(response1.user.email).toBe(email1);

      // Test with X-Idempotency-Key
      const email2 = `header2-${timestamp}@test.com`;
      const response2 = await client.auth.register({
        email: email2,
        password: 'TestPass123!',
      }, {
        headers: { 'X-Idempotency-Key': `x-${timestamp}` },
      });

      expect(response2.user.email).toBe(email2);
    });

    it('should work without idempotency key', async () => {
      const email = `no-key-${Date.now()}@test.com`;
      
      const response = await client.auth.register({
        email,
        password: 'TestPass123!',
      });

      expect(response.user.email).toBe(email);
    });
  });

  describe('Concurrent Requests', () => {
    beforeAll(async () => {
      await delay(2000); // Wait to avoid rate limiting
    });
    it('should handle concurrent requests with same key correctly', async () => {
      const idempotencyKey = `concurrent-${Date.now()}`;
      const userData = {
        email: `concurrent-${Date.now()}@test.com`,
        password: 'TestPass123!',
      };

      // Send multiple concurrent requests
      const results = await Promise.allSettled([
        client.auth.register(userData, {
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
        delay(50).then(() => client.auth.register(userData, {
          headers: { 'Idempotency-Key': idempotencyKey },
        })),
        delay(100).then(() => client.auth.register(userData, {
          headers: { 'Idempotency-Key': idempotencyKey },
        })),
      ]);

      // Filter successful responses
      const successful = results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as any).value);

      expect(successful.length).toBeGreaterThan(0);

      // All successful responses should have the same user ID
      if (successful.length > 1) {
        const firstUserId = successful[0].user.id;
        successful.forEach(response => {
          expect(response.user.id).toBe(firstUserId);
        });
      }
    });
  });
});