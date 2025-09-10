import { ApiClient } from '../../src/client';
import { axiosMock } from '../utils/axios-mock';
import { MockFactory } from '../utils/mock-factory';

describe('ApiClient Integration Tests', () => {
  let client: ApiClient;
  const baseUrl = 'http://localhost:3001/api/v1';

  beforeEach(() => {
    axiosMock.reset();
    client = ApiClient.create(baseUrl);
  });

  describe('Complete Authentication Flow', () => {
    it('should handle full authentication lifecycle', async () => {
      // 1. Register new user
      const registerData = {
        email: 'newuser@example.com',
        password: 'SecureP@ss123',
        firstName: 'New',
        lastName: 'User',
      };
      const authResponse = MockFactory.createAuthResponse();
      axiosMock.mockPost('/auth/register', authResponse);
      
      const registerResult = await client.auth.register(registerData);
      expect(registerResult.user.email).toBe(authResponse.user.email);
      // Sync token from auth client to main client
      client.setAccessToken(registerResult.accessToken);
      expect(client.getAccessToken()).toBe(authResponse.accessToken);

      // 2. Get user profile
      axiosMock.mockGet('/auth/profile', authResponse.user);
      const profile = await client.auth.getProfile();
      expect(profile.id).toBe(authResponse.user.id);

      // 3. Setup MFA
      const mfaSetup = MockFactory.createMFASetup();
      axiosMock.mockGet('/auth/mfa/setup', mfaSetup);
      const { secret, qrCode } = await client.mfa.setup();
      expect(secret).toBeDefined();
      expect(qrCode).toBeDefined();

      // 4. Enable MFA
      const backupCodes = ['code1', 'code2', 'code3'];
      axiosMock.mockPost('/auth/mfa/enable', { backupCodes });
      const mfaResult = await client.mfa.enable({
        token: '123456',
        secret: mfaSetup.secret,
      });
      expect(mfaResult.backupCodes).toHaveLength(3);

      // 5. Create API key
      const apiKey = MockFactory.createApiKey({ key: 'sk_test_123' });
      axiosMock.mockPost('/auth/api-keys', apiKey);
      const createdKey = await client.apiKeys.createApiKey({
        name: 'Test Key',
        permissions: ['read'],
      });
      expect(createdKey.key).toBe('sk_test_123');

      // 6. Use API key for requests
      client.setApiKey(createdKey.key!);
      expect(client.getApiKey()).toBe(createdKey.key);

      // 7. Logout
      axiosMock.mockPost('/auth/logout', {});
      await client.auth.logout();
      // Manually clear token from main client (token sync only works one way)
      client.setAccessToken(null);
      expect(client.getAccessToken()).toBeNull();
    });
  });

  describe('Entity Management Workflow', () => {
    it('should handle complete entity CRUD workflow', async () => {
      // Setup authentication
      client.setAccessToken('test-token');

      // 1. Create entity
      const entityData = {
        name: 'products',
        displayName: 'Products',
        description: 'Product catalog',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            price: { type: 'number' },
            category: { type: 'string' },
          },
          required: ['name', 'price'],
        },
      };
      const entity = MockFactory.createEntity(entityData);
      axiosMock.mockPost('/entities', entity);
      
      const createdEntity = await client.entities.createEntity(entityData);
      expect(createdEntity.name).toBe('products');

      // 2. Create records using dynamic API
      const product1 = {
        name: 'Laptop',
        price: 999.99,
        category: 'Electronics',
      };
      const createdProduct = { id: 'prod-1', ...product1 };
      axiosMock.mockPost('/products', createdProduct);
      
      const product = await client.entities.createDynamicRecord('products', product1);
      expect(product.id).toBe('prod-1');

      // 3. Bulk create products
      const bulkProducts = [
        { name: 'Mouse', price: 29.99, category: 'Accessories' },
        { name: 'Keyboard', price: 79.99, category: 'Accessories' },
      ];
      const bulkResult = {
        created: 2,
        failed: 0,
        records: bulkProducts.map((p, i) => ({ id: `prod-${i + 2}`, ...p })),
      };
      axiosMock.mockPost('/products/bulk', bulkResult);
      
      const bulk = await client.entities.bulkCreateDynamicRecords('products', bulkProducts);
      expect(bulk.created).toBe(2);

      // 4. List products with filtering
      const paginatedProducts = MockFactory.createPaginatedResponse([
        createdProduct,
        ...bulkResult.records,
      ]);
      axiosMock.mockGet('/products', paginatedProducts);
      
      const products = await client.entities.listDynamicRecords('products', {
        filter: { category: 'Accessories' },
        sort: 'price',
        order: 'asc',
      });
      expect(products.data).toHaveLength(3);

      // 5. Update product
      const updatedProduct = { ...createdProduct, price: 899.99 };
      axiosMock.mockPut('/products/prod-1', updatedProduct);
      
      const updated = await client.entities.updateDynamicRecord(
        'products',
        'prod-1',
        { price: 899.99 }
      );
      expect(updated.price).toBe(899.99);

      // 6. Export data
      const exportData = [createdProduct, ...bulkResult.records];
      axiosMock.mockGet(`/entities/${entity.id}/export?format=json`, exportData);
      
      const exported = await client.entities.exportEntityData(entity.id, 'json');
      expect(exported).toEqual(exportData);

      // 7. Delete product
      axiosMock.mockDelete('/products/prod-1');
      await client.entities.deleteDynamicRecord('products', 'prod-1');

      // 8. Delete entity
      axiosMock.mockDelete(`/entities/${entity.id}`);
      await client.entities.deleteEntity(entity.id);
    });
  });

  describe('Admin Operations Workflow', () => {
    it('should handle admin user management', async () => {
      // Setup admin authentication
      client.setAccessToken('admin-token');

      // 1. List users with filters
      const users = [
        MockFactory.createUser({ role: 'user' }),
        MockFactory.createUser({ role: 'admin' }),
      ];
      const paginatedUsers = MockFactory.createPaginatedResponse(users);
      axiosMock.mockGet('/admin/users', paginatedUsers);
      
      const userList = await client.admin.users.getUsers({
        role: 'user',
        isActive: true,
      });
      expect(userList.data).toHaveLength(2);

      // 2. Create new user
      const newUserData = {
        email: 'newadmin@example.com',
        password: 'Admin@123',
        role: 'admin' as const,
      };
      const newUser = MockFactory.createUser(newUserData);
      axiosMock.mockPost('/admin/users', newUser);
      
      const createdUser = await client.admin.users.createUser(newUserData);
      expect(createdUser.email).toBe(newUserData.email);

      // 3. Deactivate user
      const deactivatedUser = { ...newUser, isActive: false };
      axiosMock.mockPost(`/admin/users/${newUser.id}/deactivate`, deactivatedUser);
      
      const deactivated = await client.admin.users.deactivateUser(newUser.id);
      expect(deactivated.isActive).toBe(false);

      // 4. Get user statistics
      const stats = {
        totalUsers: 100,
        activeUsers: 85,
        verifiedUsers: 90,
        usersByRole: { admin: 5, user: 95 },
        recentRegistrations: 10,
        lastDayActive: 50,
      };
      axiosMock.mockGet('/admin/users/stats/overview', stats);
      
      const userStats = await client.admin.users.getUserStats();
      expect(userStats.totalUsers).toBe(100);
    });

    it('should handle rate limit configuration', async () => {
      client.setAccessToken('admin-token');

      // 1. Create rate limit rule
      const ruleData = {
        name: 'api-strict',
        endpoint: '/api/v1/entities/*',
        maxRequests: 100,
        windowMs: 60000,
        isActive: true,
      };
      const rule = MockFactory.createRateLimitRule(ruleData);
      axiosMock.mockPost('/admin/rate-limits', rule);
      
      const createdRule = await client.admin.rateLimits.createRateLimit(ruleData);
      expect(createdRule.name).toBe('api-strict');

      // 2. Test rate limit
      const testResult = {
        limited: false,
        rule,
        remainingRequests: 95,
        resetTime: new Date(Date.now() + 60000).toISOString(),
      };
      axiosMock.mockPost('/admin/rate-limits/test', testResult);
      
      const test = await client.admin.rateLimits.testRateLimit('/api/v1/entities', 'GET');
      expect(test.limited).toBe(false);
      expect(test.remainingRequests).toBe(95);

      // 3. Reload rate limits
      axiosMock.mockPost('/admin/rate-limits/reload', {
        message: 'Rate limits reloaded',
        rulesLoaded: 5,
      });
      
      const reload = await client.admin.rateLimits.reloadRateLimits();
      expect(reload.rulesLoaded).toBe(5);
    });

    it('should handle security settings', async () => {
      client.setAccessToken('admin-token');

      // 1. Get all security settings
      const settings = {
        password_min_length: 8,
        mfa_required: false,
        session_timeout: 3600000,
      };
      axiosMock.mockGet('/admin/security-settings/all', settings);
      
      const allSettings = await client.admin.security.getAllSettings();
      expect(allSettings.password_min_length).toBe(8);

      // 2. Update security setting
      const updatedSetting = MockFactory.createSecuritySetting({
        key: 'password_min_length',
        value: 12,
      });
      axiosMock.mockPut('/admin/security-settings/password_min_length', updatedSetting);
      
      const updated = await client.admin.security.updateSetting('password_min_length', 12);
      expect(updated.value).toBe(12);

      // 3. Export settings
      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        settings,
      };
      axiosMock.mockGet('/admin/security-settings/export/json', exportData);
      
      const exported = await client.admin.security.exportSettings();
      expect(exported.settings).toEqual(settings);

      // 4. Import settings
      const importResult = { imported: 3, errors: [] };
      axiosMock.mockPost('/admin/security-settings/import/json', importResult);
      
      const imported = await client.admin.security.importSettings({
        password_min_length: 12,
        mfa_required: true,
        session_timeout: 1800000,
      });
      expect(imported.imported).toBe(3);
    });
  });

  describe('Error Handling Across Modules', () => {
    it('should handle errors consistently across all modules', async () => {
      // Auth error
      axiosMock.mockError('post', '/auth/login', 401, 'Invalid credentials');
      await expect(
        client.auth.login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      });

      // Entity error
      axiosMock.mockError('get', '/entities/123', 404, 'Entity not found');
      await expect(
        client.entities.getEntity('123')
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Entity not found',
      });

      // Admin error
      axiosMock.mockError('get', '/admin/users', 403, 'Admin access required');
      await expect(
        client.admin.users.getUsers()
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Admin access required',
      });

      // Network error
      axiosMock.mockNetworkError('get', '/health');
      await expect(
        client.checkHealth()
      ).resolves.toBe(false);
    });
  });

  describe('Token Synchronization', () => {
    it('should synchronize tokens across all sub-clients', () => {
      const accessToken = 'shared-access-token';
      const apiKey = 'shared-api-key';

      // Set access token on main client
      client.setAccessToken(accessToken);
      
      // Verify it's set on all sub-clients
      expect(client.auth.getAccessToken()).toBe(accessToken);
      expect(client.entities.getAccessToken()).toBe(accessToken);
      expect(client.mfa.getAccessToken()).toBe(accessToken);
      expect(client.oauth.getAccessToken()).toBe(accessToken);
      expect(client.sessions.getAccessToken()).toBe(accessToken);
      expect(client.admin.users.getAccessToken()).toBe(accessToken);
      expect(client.admin.rateLimits.getAccessToken()).toBe(accessToken);
      expect(client.admin.security.getAccessToken()).toBe(accessToken);

      // Set API key on main client
      client.setApiKey(apiKey);
      
      // Verify it's set on all sub-clients
      expect(client.auth.getApiKey()).toBe(apiKey);
      expect(client.entities.getApiKey()).toBe(apiKey);
      expect(client.mfa.getApiKey()).toBe(apiKey);
      expect(client.oauth.getApiKey()).toBe(apiKey);
      expect(client.sessions.getApiKey()).toBe(apiKey);
      expect(client.admin.users.getApiKey()).toBe(apiKey);
      expect(client.admin.rateLimits.getApiKey()).toBe(apiKey);
      expect(client.admin.security.getApiKey()).toBe(apiKey);

      // Clear tokens
      client.setAccessToken(null);
      client.setApiKey(null);
      
      // Verify they're cleared on all sub-clients
      expect(client.auth.getAccessToken()).toBeNull();
      expect(client.entities.getAccessToken()).toBeNull();
      expect(client.auth.getApiKey()).toBeNull();
      expect(client.entities.getApiKey()).toBeNull();
    });
  });

  describe('Factory Methods', () => {
    it('should create browser client with default config', () => {
      const browserClient = ApiClient.createForBrowser();
      expect(browserClient).toBeInstanceOf(ApiClient);
    });

    it('should create node client with custom config', () => {
      const nodeClient = ApiClient.createForNode({
        baseUrl: 'https://api.production.com/v1',
      });
      expect(nodeClient).toBeInstanceOf(ApiClient);
    });
  });
});