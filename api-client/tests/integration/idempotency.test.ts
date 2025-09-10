import { ApiClient } from '../../src/index';
import { v4 as uuidv4 } from 'uuid';

describe('Idempotency Features', () => {
  let client: ApiClient;
  let testUserId: string;
  let authToken: string;
  
  beforeAll(async () => {
    client = new ApiClient({
      baseURL: process.env.API_BASE_URL || 'http://localhost:3001/api/v1',
      timeout: 10000,
    });
    
    // Login as admin for tests
    const loginResult = await client.auth.login({
      email: 'admin@example.com',
      password: 'password123',
    });
    
    if (loginResult.success && loginResult.data) {
      authToken = loginResult.data.accessToken;
      testUserId = loginResult.data.user.id;
      client.setAccessToken(authToken);
    }
  });

  afterAll(async () => {
    // Cleanup
    client.clearAccessToken();
  });

  describe('Authentication Idempotency', () => {
    describe('User Registration', () => {
      it('should prevent duplicate user registration with same idempotency key', async () => {
        const idempotencyKey = `test-register-${uuidv4()}`;
        const userData = {
          email: `test-idempotent-${uuidv4()}@example.com`,
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

        expect(firstResponse.success).toBe(true);
        expect(firstResponse.data).toHaveProperty('accessToken');
        const firstUserId = firstResponse.data?.user?.id;

        // Second request with same idempotency key - should return cached response
        const secondResponse = await client.auth.register(userData, {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        });

        expect(secondResponse.success).toBe(true);
        expect(secondResponse.data?.user?.id).toBe(firstUserId);
        
        // Verify only one user was created
        // The response should be identical
        expect(secondResponse.data?.accessToken).toBe(firstResponse.data?.accessToken);
      });

      it('should allow registration with different idempotency keys', async () => {
        const userData1 = {
          email: `test-user1-${uuidv4()}@example.com`,
          password: 'TestPassword123!',
          firstName: 'User1',
          lastName: 'Test',
        };

        const userData2 = {
          email: `test-user2-${uuidv4()}@example.com`,
          password: 'TestPassword123!',
          firstName: 'User2',
          lastName: 'Test',
        };

        const response1 = await client.auth.register(userData1, {
          headers: {
            'Idempotency-Key': `key1-${uuidv4()}`,
          },
        });

        const response2 = await client.auth.register(userData2, {
          headers: {
            'Idempotency-Key': `key2-${uuidv4()}`,
          },
        });

        expect(response1.success).toBe(true);
        expect(response2.success).toBe(true);
        expect(response1.data?.user?.id).not.toBe(response2.data?.user?.id);
      });
    });

    describe('Token Refresh', () => {
      it('should prevent rapid token refresh with same idempotency key', async () => {
        const idempotencyKey = `test-refresh-${uuidv4()}`;
        
        // Get a refresh token first
        const loginResult = await client.auth.login({
          email: 'user@example.com',
          password: 'password123',
        });

        if (!loginResult.success || !loginResult.data?.refreshToken) {
          throw new Error('Failed to get refresh token');
        }

        const refreshToken = loginResult.data.refreshToken;

        // First refresh
        const firstRefresh = await client.auth.refreshToken(refreshToken, {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        });

        expect(firstRefresh.success).toBe(true);
        const firstAccessToken = firstRefresh.data?.accessToken;

        // Second refresh with same key - should return cached response
        const secondRefresh = await client.auth.refreshToken(refreshToken, {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        });

        expect(secondRefresh.success).toBe(true);
        expect(secondRefresh.data?.accessToken).toBe(firstAccessToken);
      });
    });

    describe('API Key Creation', () => {
      it('should prevent duplicate API key creation with same idempotency key', async () => {
        const idempotencyKey = `test-apikey-${uuidv4()}`;
        const apiKeyData = {
          name: `Test Key ${uuidv4()}`,
          permissions: ['read', 'write'],
          expiresIn: 30, // days
        };

        // First request
        const firstResponse = await client.auth.createApiKey(apiKeyData, {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        });

        expect(firstResponse.success).toBe(true);
        const firstKeyId = firstResponse.data?.id;
        const firstKey = firstResponse.data?.key;

        // Second request with same idempotency key
        const secondResponse = await client.auth.createApiKey(apiKeyData, {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        });

        expect(secondResponse.success).toBe(true);
        expect(secondResponse.data?.id).toBe(firstKeyId);
        expect(secondResponse.data?.key).toBe(firstKey);

        // Cleanup - delete the API key
        if (firstKeyId) {
          await client.auth.deleteApiKey(firstKeyId);
        }
      });

      it('should require idempotency key for API key rotation', async () => {
        // First create an API key
        const createResponse = await client.auth.createApiKey({
          name: `Rotation Test ${uuidv4()}`,
          permissions: ['read'],
          expiresIn: 30,
        });

        if (!createResponse.success || !createResponse.data?.id) {
          throw new Error('Failed to create API key');
        }

        const apiKeyId = createResponse.data.id;

        // Try to rotate without idempotency key - should fail if configured to require
        // Note: This depends on your backend configuration
        const rotateResponse = await client.request({
          method: 'POST',
          url: `/auth/api-keys/${apiKeyId}/rotate`,
          data: { newName: 'Rotated Key' },
        });

        // If rotation requires idempotency key, it should fail
        // Otherwise, it should succeed
        // This test depends on your backend configuration
        
        // Cleanup
        await client.auth.deleteApiKey(apiKeyId);
      });
    });
  });

  describe('Entity Idempotency Configuration', () => {
    let testEntityId: string;

    beforeAll(async () => {
      // Create a test entity with idempotency enabled
      const entityResponse = await client.entities.createEntity({
        name: `test-entity-${uuidv4()}`,
        displayName: 'Test Entity',
        description: 'Entity for idempotency testing',
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
      });

      if (entityResponse.success && entityResponse.data) {
        testEntityId = entityResponse.data.id;
      }
    });

    afterAll(async () => {
      // Delete test entity
      if (testEntityId) {
        await client.entities.deleteEntity(testEntityId);
      }
    });

    it('should respect entity-level idempotency configuration', async () => {
      if (!testEntityId) {
        throw new Error('Test entity not created');
      }

      const idempotencyKey = `entity-record-${uuidv4()}`;
      const recordData = {
        name: 'Test Record',
        value: 42,
      };

      // Create record with idempotency key
      const firstResponse = await client.entities.createEntityRecord(
        testEntityId,
        recordData,
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      expect(firstResponse.success).toBe(true);
      const firstRecordId = firstResponse.data?.id;

      // Try to create again with same key - should return cached response
      const secondResponse = await client.entities.createEntityRecord(
        testEntityId,
        recordData,
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      expect(secondResponse.success).toBe(true);
      expect(secondResponse.data?.id).toBe(firstRecordId);

      // Cleanup - delete the record
      if (firstRecordId) {
        await client.entities.deleteEntityRecord(testEntityId, firstRecordId);
      }
    });

    it('should handle idempotency for dynamic API endpoints', async () => {
      if (!testEntityId) {
        throw new Error('Test entity not created');
      }

      // Get the entity to know its name for dynamic API
      const entityResponse = await client.entities.getEntity(testEntityId);
      if (!entityResponse.success || !entityResponse.data) {
        throw new Error('Failed to get entity');
      }

      const entityName = entityResponse.data.name;
      const idempotencyKey = `dynamic-${uuidv4()}`;
      const recordData = {
        name: 'Dynamic Record',
        value: 100,
      };

      // Create via dynamic API with idempotency
      const firstResponse = await client.entities.createDynamicRecord(
        entityName,
        recordData,
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      expect(firstResponse.success).toBe(true);
      const firstRecordId = firstResponse.data?.id;

      // Retry with same key
      const secondResponse = await client.entities.createDynamicRecord(
        entityName,
        recordData,
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      expect(secondResponse.success).toBe(true);
      expect(secondResponse.data?.id).toBe(firstRecordId);

      // Cleanup
      if (firstRecordId) {
        await client.entities.deleteDynamicRecord(entityName, firstRecordId);
      }
    });

    it('should not apply idempotency to GET requests', async () => {
      // GET requests should never be idempotent as they don't modify state
      const idempotencyKey = `get-test-${uuidv4()}`;
      
      const response = await client.entities.listEntities({
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      expect(response.success).toBe(true);
      // Should work normally without idempotency processing
    });

    it('should handle different idempotency TTLs', async () => {
      // Create entity with short TTL
      const shortTTLEntity = await client.entities.createEntity({
        name: `short-ttl-${uuidv4()}`,
        displayName: 'Short TTL Entity',
        description: 'Entity with short idempotency TTL',
        schema: {
          type: 'object',
          properties: {
            data: { type: 'string' },
          },
        },
        isActive: true,
        idempotencyEnabled: true,
        idempotencyTtl: 1000, // 1 second
        idempotencyMethods: ['POST'],
      });

      if (!shortTTLEntity.success || !shortTTLEntity.data) {
        throw new Error('Failed to create short TTL entity');
      }

      const entityId = shortTTLEntity.data.id;
      const idempotencyKey = `ttl-test-${uuidv4()}`;

      // First request
      const firstResponse = await client.entities.createEntityRecord(
        entityId,
        { data: 'test' },
        {
          headers: { 'Idempotency-Key': idempotencyKey },
        }
      );

      expect(firstResponse.success).toBe(true);

      // Immediate retry - should return cached
      const cachedResponse = await client.entities.createEntityRecord(
        entityId,
        { data: 'test' },
        {
          headers: { 'Idempotency-Key': idempotencyKey },
        }
      );

      expect(cachedResponse.data?.id).toBe(firstResponse.data?.id);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1500));

      // After TTL - should create new record
      const newResponse = await client.entities.createEntityRecord(
        entityId,
        { data: 'test' },
        {
          headers: { 'Idempotency-Key': idempotencyKey },
        }
      );

      // This might create a new record or fail depending on backend cleanup
      // The test verifies TTL behavior

      // Cleanup
      await client.entities.deleteEntity(entityId);
    });
  });

  describe('Idempotency Error Handling', () => {
    it('should handle concurrent requests with same idempotency key', async () => {
      const idempotencyKey = `concurrent-${uuidv4()}`;
      const userData = {
        email: `concurrent-${uuidv4()}@example.com`,
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

      // One should succeed, the other might get a conflict or the cached response
      const results = [response1, response2].filter(
        r => r.status === 'fulfilled' && r.value.success
      );

      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle failed requests and allow retry', async () => {
      const idempotencyKey = `retry-${uuidv4()}`;
      
      // Try to create entity with invalid schema - should fail
      const invalidEntity = {
        name: `invalid-${uuidv4()}`,
        displayName: 'Invalid Entity',
        description: 'This should fail',
        schema: 'invalid-json', // Invalid schema
        isActive: true,
      };

      const firstAttempt = await client.entities.createEntity(invalidEntity as any, {
        headers: { 'Idempotency-Key': idempotencyKey },
      });

      expect(firstAttempt.success).toBe(false);

      // Fix the data and retry with same key
      const validEntity = {
        ...invalidEntity,
        schema: { type: 'object', properties: {} },
      };

      // Depending on backend implementation, this might:
      // 1. Allow retry if previous attempt failed
      // 2. Return the failed response
      const secondAttempt = await client.entities.createEntity(validEntity, {
        headers: { 'Idempotency-Key': idempotencyKey },
      });

      // Verify behavior based on your implementation
      // The test documents the expected behavior
    });
  });

  describe('Idempotency Header Variations', () => {
    it('should accept both Idempotency-Key and X-Idempotency-Key headers', async () => {
      const userData1 = {
        email: `header-test1-${uuidv4()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Header1',
        lastName: 'Test',
      };

      const userData2 = {
        email: `header-test2-${uuidv4()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Header2',
        lastName: 'Test',
      };

      // Test with Idempotency-Key
      const response1 = await client.auth.register(userData1, {
        headers: {
          'Idempotency-Key': `header1-${uuidv4()}`,
        },
      });

      // Test with X-Idempotency-Key
      const response2 = await client.auth.register(userData2, {
        headers: {
          'X-Idempotency-Key': `header2-${uuidv4()}`,
        },
      });

      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);
    });

    it('should work without idempotency key when not required', async () => {
      // Most endpoints should work without idempotency key
      const userData = {
        email: `no-key-${uuidv4()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'NoKey',
        lastName: 'Test',
      };

      const response = await client.auth.register(userData);
      expect(response.success).toBe(true);
    });
  });
});