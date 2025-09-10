import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('API E2E Tests', () => {
  let app: INestApplication;
  let adminToken: string;
  let testEntityId: string;
  let testRecordId: string;
  let testApiKeyId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as admin to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'admin123',
      });
    
    adminToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testRecordId) {
      await request(app.getHttpServer())
        .delete(`/api/v1/entities/records/${testRecordId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
    
    if (testEntityId) {
      await request(app.getHttpServer())
        .delete(`/api/v1/entities/${testEntityId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    if (testApiKeyId) {
      await request(app.getHttpServer())
        .post(`/api/v1/auth/api-keys/${testApiKeyId}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    await app.close();
  });

  describe('Health & Basic Endpoints', () => {
    it('/api/v1/health (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
        });
    });

    it('/api/v1 (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/v1')
        .expect(200);
    });
  });

  describe('Authentication', () => {
    let refreshToken: string;

    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'user@example.com',
          password: 'user123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          refreshToken = res.body.refreshToken;
        });
    });

    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrong',
        })
        .expect(401);
    });

    it('should register new user', () => {
      const timestamp = Date.now();
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `test${timestamp}@example.com`,
          password: 'Test123!@#',
          username: `testuser${timestamp}`,
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('user');
        });
    });

    it('should refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should logout successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          refreshToken: refreshToken,
        })
        .expect(200);
    });
  });

  describe('Entities CRUD', () => {
    it('should list all entities', () => {
      return request(app.getHttpServer())
        .get('/api/v1/entities')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should create new entity', () => {
      return request(app.getHttpServer())
        .post('/api/v1/entities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `test-entity-${Date.now()}`,
          displayName: 'Test Entity',
          description: 'E2E Test Entity',
          schema: {
            type: 'object',
            properties: {
              testField: { type: 'string' },
              testNumber: { type: 'number' },
            },
            required: ['testField'],
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name');
          testEntityId = res.body.id;
        });
    });

    it('should get entity by ID', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/entities/${testEntityId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testEntityId);
        });
    });

    it('should update entity', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/entities/${testEntityId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          displayName: 'Updated Test Entity',
          description: 'Updated E2E Test Entity',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.display_name).toBe('Updated Test Entity');
        });
    });

    it('should require authentication for entity operations', () => {
      return request(app.getHttpServer())
        .get('/api/v1/entities')
        .expect(401);
    });
  });

  describe('Entity Records CRUD', () => {
    it('should create entity record', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/entities/${testEntityId}/records`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          testField: 'Test Value',
          testNumber: 42,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.data.testField).toBe('Test Value');
          testRecordId = res.body.id;
        });
    });

    it('should list entity records', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/entities/${testEntityId}/records`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should get record by ID', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/entities/records/${testRecordId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testRecordId);
        });
    });

    it('should update record', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/entities/records/${testRecordId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          testField: 'Updated Value',
          testNumber: 100,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.testField).toBe('Updated Value');
        });
    });
  });

  describe('Dynamic API', () => {
    it('should get products via dynamic API', () => {
      return request(app.getHttpServer())
        .get('/api/v1/product')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should create product via dynamic API', () => {
      return request(app.getHttpServer())
        .post('/api/v1/product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Test Product ${Date.now()}`,
          price: 99.99,
          currency: 'USD',
          sku: `TEST-${Date.now()}`,
          inStock: true,
        })
        .expect(201);
    });

    it('should validate product data', () => {
      return request(app.getHttpServer())
        .post('/api/v1/product/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Valid Product',
          price: 50,
          currency: 'USD',
          sku: 'VALID-001',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.valid).toBe(true);
        });
    });

    it('should reject invalid product data', () => {
      return request(app.getHttpServer())
        .post('/api/v1/product/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Product',
          price: -10, // Invalid: negative price
          currency: 'INVALID', // Invalid: not in enum
          sku: 'invalid sku', // Invalid: contains space
        })
        .expect(400);
    });
  });

  describe('API Keys', () => {
    let apiKey: string;

    it('should create API key', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/api-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E Test API Key',
          permissions: ['read', 'write'],
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('key');
          testApiKeyId = res.body.id;
          apiKey = res.body.key;
        });
    });

    it('should authenticate with API key', () => {
      return request(app.getHttpServer())
        .get('/api/v1/entities')
        .set('X-API-Key', apiKey)
        .expect(200);
    });

    it('should revoke API key', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/auth/api-keys/${testApiKeyId}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should reject revoked API key', () => {
      return request(app.getHttpServer())
        .get('/api/v1/entities')
        .set('X-API-Key', apiKey)
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoint', () => {
      return request(app.getHttpServer())
        .get('/api/v1/nonexistent')
        .expect(404);
    });

    it('should return 400 for invalid JSON', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    it('should return 400 for invalid UUID', () => {
      return request(app.getHttpServer())
        .get('/api/v1/entities/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should return 401 for missing authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/entities')
        .send({
          name: 'test',
          displayName: 'Test',
        })
        .expect(401);
    });
  });

  describe('Pagination & Filtering', () => {
    it('should paginate entities', () => {
      return request(app.getHttpServer())
        .get('/api/v1/entities?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(2);
        });
    });

    it('should filter active entities', () => {
      return request(app.getHttpServer())
        .get('/api/v1/entities?isActive=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach(entity => {
            expect(entity.is_active).toBe(true);
          });
        });
    });
  });
});