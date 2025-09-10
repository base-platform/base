import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SecuritySettingsController } from '../security-settings.controller';
import { SecuritySettingsService } from '../../core/config/security-settings.service';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

describe('SecuritySettingsController (e2e)', () => {
  let app: INestApplication;
  let securitySettingsService: jest.Mocked<SecuritySettingsService>;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtToken: string;

  const mockSecuritySettingsService = {
    getSettingsByCategory: jest.fn(),
    getSetting: jest.fn(),
    updateSetting: jest.fn(),
    resetSetting: jest.fn(),
    getCategories: jest.fn(),
    getAllSettings: jest.fn(),
    getSettingDefinitions: jest.fn(),
    validateSettingValue: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    systemSetting: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET', 'test-secret'),
            signOptions: { expiresIn: '1h' },
          }),
          inject: [ConfigService],
        }),
      ],
      controllers: [SecuritySettingsController],
      providers: [
        {
          provide: SecuritySettingsService,
          useValue: mockSecuritySettingsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    securitySettingsService = moduleFixture.get(SecuritySettingsService);
    prismaService = moduleFixture.get(PrismaService);

    await app.init();

    // Mock JWT token (in real implementation, this would be generated)
    jwtToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock user
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: 'user-123',
      email: 'admin@test.com',
      role: 'admin',
      is_active: true,
    });
  });

  describe('GET /security-settings/categories', () => {
    it('should return all categories', async () => {
      const mockCategories = [
        {
          id: 'rate_limiting',
          name: 'Rate Limiting',
          description: 'Configure API request rate limits',
        },
        {
          id: 'password_policy',
          name: 'Password Policy',
          description: 'Set password complexity rules',
        },
      ];

      mockSecuritySettingsService.getCategories.mockReturnValue(mockCategories);

      const response = await request(app.getHttpServer())
        .get('/security-settings/categories')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toEqual(mockCategories);
      expect(mockSecuritySettingsService.getCategories).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/security-settings/categories')
        .expect(401);
    });
  });

  describe('GET /security-settings/category/:category', () => {
    it('should return settings for specific category', async () => {
      const mockSettings = [
        {
          key: 'passwordMinLength',
          value: 8,
          description: 'Minimum password length',
          type: 'number',
          validation: { min: 4, max: 128 },
        },
        {
          key: 'passwordRequireUppercase',
          value: true,
          description: 'Require uppercase letters',
          type: 'boolean',
        },
      ];

      mockSecuritySettingsService.getSettingsByCategory.mockResolvedValue(mockSettings);

      const response = await request(app.getHttpServer())
        .get('/security-settings/category/password_policy')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toEqual(mockSettings);
      expect(mockSecuritySettingsService.getSettingsByCategory).toHaveBeenCalledWith('password_policy');
    });

    it('should return empty array for invalid category', async () => {
      mockSecuritySettingsService.getSettingsByCategory.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/security-settings/category/invalid_category')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /security-settings/setting/:key', () => {
    it('should return specific setting value', async () => {
      const mockValue = 12;
      mockSecuritySettingsService.getSetting.mockResolvedValue(mockValue);

      const response = await request(app.getHttpServer())
        .get('/security-settings/setting/passwordMinLength')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toEqual({ key: 'passwordMinLength', value: mockValue });
      expect(mockSecuritySettingsService.getSetting).toHaveBeenCalledWith('passwordMinLength');
    });

    it('should handle non-existent setting', async () => {
      mockSecuritySettingsService.getSetting.mockRejectedValue(new Error('Setting not found'));

      await request(app.getHttpServer())
        .get('/security-settings/setting/nonExistentSetting')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(500);
    });
  });

  describe('PUT /security-settings/setting/:key', () => {
    it('should update setting successfully', async () => {
      const updateData = { value: 10 };
      
      mockSecuritySettingsService.updateSetting.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .put('/security-settings/setting/passwordMinLength')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({ 
        message: 'Setting updated successfully',
        key: 'passwordMinLength',
        value: 10
      });
      expect(mockSecuritySettingsService.updateSetting).toHaveBeenCalledWith(
        'passwordMinLength',
        10,
        'user-123'
      );
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .put('/security-settings/setting/passwordMinLength')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({})
        .expect(400);
    });

    it('should handle validation errors', async () => {
      const updateData = { value: 'invalid' };
      
      mockSecuritySettingsService.updateSetting.mockRejectedValue(
        new Error('Validation failed: Value must be a number')
      );

      await request(app.getHttpServer())
        .put('/security-settings/setting/passwordMinLength')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(updateData)
        .expect(400);
    });

    it('should require admin role', async () => {
      mockRolesGuard.canActivate.mockReturnValueOnce(false);

      await request(app.getHttpServer())
        .put('/security-settings/setting/passwordMinLength')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ value: 10 })
        .expect(403);
    });
  });

  describe('POST /security-settings/bulk-update', () => {
    it('should update multiple settings successfully', async () => {
      const updateData = {
        settings: [
          { key: 'passwordMinLength', value: 10 },
          { key: 'passwordRequireUppercase', value: true },
          { key: 'sessionTtlHours', value: 48 },
        ]
      };

      mockSecuritySettingsService.updateSetting.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/security-settings/bulk-update')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Settings updated successfully',
        updated: 3,
        failed: 0,
        results: [
          { key: 'passwordMinLength', success: true },
          { key: 'passwordRequireUppercase', success: true },
          { key: 'sessionTtlHours', success: true },
        ]
      });

      expect(mockSecuritySettingsService.updateSetting).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in bulk update', async () => {
      const updateData = {
        settings: [
          { key: 'passwordMinLength', value: 10 },
          { key: 'invalidSetting', value: 'invalid' },
        ]
      };

      mockSecuritySettingsService.updateSetting
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Unknown setting key'));

      const response = await request(app.getHttpServer())
        .post('/security-settings/bulk-update')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.updated).toBe(1);
      expect(response.body.failed).toBe(1);
      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[0].success).toBe(true);
      expect(response.body.results[1].success).toBe(false);
      expect(response.body.results[1].error).toContain('Unknown setting key');
    });

    it('should validate bulk update structure', async () => {
      await request(app.getHttpServer())
        .post('/security-settings/bulk-update')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ invalid: 'data' })
        .expect(400);
    });

    it('should limit bulk update size', async () => {
      const updateData = {
        settings: Array.from({ length: 101 }, (_, i) => ({ 
          key: `setting${i}`, 
          value: i 
        }))
      };

      await request(app.getHttpServer())
        .post('/security-settings/bulk-update')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(updateData)
        .expect(400);
    });
  });

  describe('POST /security-settings/reset/:key', () => {
    it('should reset setting to default value', async () => {
      mockSecuritySettingsService.resetSetting.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/security-settings/reset/passwordMinLength')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Setting reset to default value',
        key: 'passwordMinLength'
      });
      expect(mockSecuritySettingsService.resetSetting).toHaveBeenCalledWith(
        'passwordMinLength',
        'user-123'
      );
    });

    it('should handle invalid setting key', async () => {
      mockSecuritySettingsService.resetSetting.mockRejectedValue(
        new Error('Unknown setting key: invalidSetting')
      );

      await request(app.getHttpServer())
        .post('/security-settings/reset/invalidSetting')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(400);
    });
  });

  describe('GET /security-settings/all', () => {
    it('should return all security settings', async () => {
      const mockSettings = {
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        sessionTtlHours: 24,
        rateLimitDefault: 100,
      };

      mockSecuritySettingsService.getAllSettings.mockResolvedValue(mockSettings);

      const response = await request(app.getHttpServer())
        .get('/security-settings/all')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toEqual(mockSettings);
      expect(mockSecuritySettingsService.getAllSettings).toHaveBeenCalled();
    });
  });

  describe('POST /security-settings/validate', () => {
    it('should validate setting value', async () => {
      const testData = {
        key: 'passwordMinLength',
        value: 10
      };

      mockSecuritySettingsService.validateSettingValue.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockSecuritySettingsService.getSettingDefinitions.mockReturnValue([
        {
          key: 'passwordMinLength',
          category: 'password_policy',
          type: 'number',
          defaultValue: 8,
          description: 'Minimum password length',
          validation: { min: 4, max: 128 }
        }
      ]);

      const response = await request(app.getHttpServer())
        .post('/security-settings/validate')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(testData)
        .expect(200);

      expect(response.body).toEqual({
        isValid: true,
        errors: []
      });
    });

    it('should return validation errors', async () => {
      const testData = {
        key: 'passwordMinLength',
        value: 2
      };

      mockSecuritySettingsService.validateSettingValue.mockReturnValue({
        isValid: false,
        errors: ['Value must be at least 4', 'Password minimum length should be at least 8 for security']
      });

      mockSecuritySettingsService.getSettingDefinitions.mockReturnValue([
        {
          key: 'passwordMinLength',
          category: 'password_policy',
          type: 'number',
          defaultValue: 8,
          description: 'Minimum password length',
          validation: { min: 4, max: 128 }
        }
      ]);

      const response = await request(app.getHttpServer())
        .post('/security-settings/validate')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(testData)
        .expect(200);

      expect(response.body.isValid).toBe(false);
      expect(response.body.errors).toHaveLength(2);
    });

    it('should handle unknown setting key in validation', async () => {
      const testData = {
        key: 'unknownSetting',
        value: 'test'
      };

      mockSecuritySettingsService.getSettingDefinitions.mockReturnValue([]);

      await request(app.getHttpServer())
        .post('/security-settings/validate')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(testData)
        .expect(400);
    });
  });

  describe('GET /security-settings/export', () => {
    it('should export all settings as JSON', async () => {
      const mockSettings = {
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        sessionTtlHours: 24,
      };

      mockSecuritySettingsService.getAllSettings.mockResolvedValue(mockSettings);

      const response = await request(app.getHttpServer())
        .get('/security-settings/export')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toEqual({
        exportedAt: expect.any(String),
        version: '1.0',
        settings: mockSettings
      });
      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('POST /security-settings/import', () => {
    it('should import settings from JSON', async () => {
      const importData = {
        version: '1.0',
        settings: {
          passwordMinLength: 10,
          passwordRequireUppercase: false,
        }
      };

      mockSecuritySettingsService.updateSetting.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/security-settings/import')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(importData)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Settings imported successfully',
        imported: 2,
        failed: 0,
        results: [
          { key: 'passwordMinLength', success: true },
          { key: 'passwordRequireUppercase', success: true },
        ]
      });

      expect(mockSecuritySettingsService.updateSetting).toHaveBeenCalledTimes(2);
    });

    it('should handle import format validation', async () => {
      const invalidData = {
        invalid: 'format'
      };

      await request(app.getHttpServer())
        .post('/security-settings/import')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should handle version compatibility', async () => {
      const importData = {
        version: '2.0',
        settings: {
          passwordMinLength: 10,
        }
      };

      await request(app.getHttpServer())
        .post('/security-settings/import')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(importData)
        .expect(400);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        ['get', '/security-settings/categories'],
        ['get', '/security-settings/all'],
        ['put', '/security-settings/setting/test'],
        ['post', '/security-settings/bulk-update'],
        ['post', '/security-settings/reset/test'],
        ['post', '/security-settings/validate'],
        ['get', '/security-settings/export'],
        ['post', '/security-settings/import'],
      ];

      for (const [method, path] of endpoints) {
        await request(app.getHttpServer())
          [method](path)
          .expect(401);
      }
    });

    it('should require admin role for write operations', async () => {
      mockRolesGuard.canActivate.mockReturnValue(false);

      const writeEndpoints = [
        ['put', '/security-settings/setting/test', { value: 'test' }],
        ['post', '/security-settings/bulk-update', { settings: [] }],
        ['post', '/security-settings/reset/test', {}],
        ['post', '/security-settings/import', { version: '1.0', settings: {} }],
      ];

      for (const [method, path, body] of writeEndpoints) {
        await request(app.getHttpServer())
          [method](path)
          .set('Authorization', `Bearer ${jwtToken}`)
          .send(body)
          .expect(403);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockSecuritySettingsService.getSettingsByCategory.mockRejectedValue(
        new Error('Database connection failed')
      );

      await request(app.getHttpServer())
        .get('/security-settings/category/password_policy')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(500);
    });

    it('should handle invalid JSON in request body', async () => {
      await request(app.getHttpServer())
        .put('/security-settings/setting/test')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle large request payloads', async () => {
      const largePayload = {
        settings: Array.from({ length: 1000 }, (_, i) => ({ 
          key: `setting${i}`.repeat(100), 
          value: 'x'.repeat(10000) 
        }))
      };

      await request(app.getHttpServer())
        .post('/security-settings/bulk-update')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(largePayload)
        .expect(413);
    });
  });
});