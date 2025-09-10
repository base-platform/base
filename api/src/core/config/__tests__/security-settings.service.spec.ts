import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma/prisma.service';
import { SecuritySettingsService } from '../security-settings.service';

describe('SecuritySettingsService', () => {
  let service: SecuritySettingsService;
  let prismaService: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;

  const mockPrismaService = {
    systemSetting: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecuritySettingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SecuritySettingsService>(SecuritySettingsService);
    prismaService = module.get(PrismaService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSetting', () => {
    it('should return cached value if available and not expired', async () => {
      // Set up cache
      service['settingsCache'].set('passwordMinLength', 12);
      service['cacheExpiry'].set('passwordMinLength', new Date(Date.now() + 60000));

      const result = await service.getSetting('password_policy.min_length');
      
      expect(result).toBe(12);
      expect(prismaService.systemSetting.findFirst).not.toHaveBeenCalled();
    });

    it('should fetch from database when cache is empty', async () => {
      const mockSetting = {
        key: 'passwordMinLength',
        value: 10,
        category: 'password_policy',
        type: 'number',
        is_active: true,
      };

      prismaService.systemSetting.findFirst.mockResolvedValue(mockSetting);

      const result = await service.getSetting('password_policy.min_length');
      
      expect(result).toBe(10);
      expect(prismaService.systemSetting.findFirst).toHaveBeenCalledWith({
        where: { key: 'passwordMinLength', is_active: true },
      });
    });

    it('should return default value when setting not found in database', async () => {
      prismaService.systemSetting.findFirst.mockResolvedValue(null);

      const result = await service.getSetting('password_policy.min_length');
      
      expect(result).toBe(8); // Default value from definition
    });

    it('should fallback to environment variable when setting and default not found', async () => {
      prismaService.systemSetting.findFirst.mockResolvedValue(null);
      configService.get.mockReturnValue(15);

      const result = await service.getSetting('unknown_setting');
      
      expect(result).toBe(15);
      expect(configService.get).toHaveBeenCalledWith('UNKNOWN_SETTING');
    });

    it('should cache the result after fetching', async () => {
      const mockSetting = {
        key: 'passwordMinLength',
        value: 10,
        category: 'password_policy',
        type: 'number',
        is_active: true,
      };

      prismaService.systemSetting.findFirst.mockResolvedValue(mockSetting);

      await service.getSetting('password_policy.min_length');
      
      expect(service['settingsCache'].get('passwordMinLength')).toBe(10);
      expect(service['cacheExpiry'].has('passwordMinLength')).toBe(true);
    });
  });

  describe('validateSettingValue', () => {
    it('should validate number type correctly', () => {
      const definition = {
        key: 'passwordMinLength',
        category: 'password_policy',
        type: 'number' as const,
        defaultValue: 8,
        description: 'Minimum password length',
        validation: { min: 4, max: 128 },
      };

      const result = service.validateSettingValue(definition, 10);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for invalid number type', () => {
      const definition = {
        key: 'passwordMinLength',
        category: 'password_policy',
        type: 'number' as const,
        defaultValue: 8,
        description: 'Minimum password length',
        validation: { min: 4, max: 128 },
      };

      const result = service.validateSettingValue(definition, 'not-a-number');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value must be of type number');
    });

    it('should validate number range constraints', () => {
      const definition = {
        key: 'passwordMinLength',
        category: 'password_policy',
        type: 'number' as const,
        defaultValue: 8,
        description: 'Minimum password length',
        validation: { min: 4, max: 128 },
      };

      const resultTooLow = service.validateSettingValue(definition, 2);
      expect(resultTooLow.isValid).toBe(false);
      expect(resultTooLow.errors).toContain('Value must be at least 4');

      const resultTooHigh = service.validateSettingValue(definition, 200);
      expect(resultTooHigh.isValid).toBe(false);
      expect(resultTooHigh.errors).toContain('Value must be at most 128');
    });

    it('should validate boolean type correctly', () => {
      const definition = {
        key: 'passwordRequireUppercase',
        category: 'password_policy',
        type: 'boolean' as const,
        defaultValue: true,
        description: 'Require uppercase letters',
      };

      const resultTrue = service.validateSettingValue(definition, true);
      expect(resultTrue.isValid).toBe(true);

      const resultFalse = service.validateSettingValue(definition, false);
      expect(resultFalse.isValid).toBe(true);

      const resultInvalid = service.validateSettingValue(definition, 'true');
      expect(resultInvalid.isValid).toBe(false);
      expect(resultInvalid.errors).toContain('Value must be of type boolean');
    });

    it('should validate array type correctly', () => {
      const definition = {
        key: 'fileUploadAllowedExtensions',
        category: 'file_upload',
        type: 'array' as const,
        defaultValue: ['.jpg', '.png'],
        description: 'Allowed file extensions',
        validation: { min: 1, max: 10 },
      };

      const resultValid = service.validateSettingValue(definition, ['.jpg', '.png', '.gif']);
      expect(resultValid.isValid).toBe(true);

      const resultTooFew = service.validateSettingValue(definition, []);
      expect(resultTooFew.isValid).toBe(false);
      expect(resultTooFew.errors).toContain('Array must have at least 1 items');

      const resultTooMany = service.validateSettingValue(definition, new Array(12).fill('.jpg'));
      expect(resultTooMany.isValid).toBe(false);
      expect(resultTooMany.errors).toContain('Array must have at most 10 items');
    });

    it('should apply security-specific validation', () => {
      const passwordDefinition = {
        key: 'passwordMinLength',
        category: 'password_policy',
        type: 'number' as const,
        defaultValue: 8,
        description: 'Minimum password length',
        validation: { min: 1, max: 128 },
      };

      const result = service.validateSettingValue(passwordDefinition, 4);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password minimum length should be at least 8 for security');
    });

    it('should detect dangerous file extensions', () => {
      const definition = {
        key: 'fileUploadAllowedExtensions',
        category: 'file_upload',
        type: 'array' as const,
        defaultValue: ['.jpg', '.png'],
        description: 'Allowed file extensions',
      };

      const result = service.validateSettingValue(definition, ['.jpg', '.exe', '.png']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Dangerous file extensions detected in allowed list');
    });

    it('should validate enum constraints', () => {
      const definition = {
        key: 'testEnum',
        category: 'test',
        type: 'string' as const,
        defaultValue: 'option1',
        description: 'Test enum setting',
        validation: { enum: ['option1', 'option2', 'option3'] },
      };

      const resultValid = service.validateSettingValue(definition, 'option2');
      expect(resultValid.isValid).toBe(true);

      const resultInvalid = service.validateSettingValue(definition, 'invalid-option');
      expect(resultInvalid.isValid).toBe(false);
      expect(resultInvalid.errors).toContain('Value must be one of: option1, option2, option3');
    });

    it('should validate pattern constraints', () => {
      const definition = {
        key: 'testPattern',
        category: 'test',
        type: 'string' as const,
        defaultValue: 'valid123',
        description: 'Test pattern setting',
        validation: { pattern: '^[a-z]+[0-9]+$' },
      };

      const resultValid = service.validateSettingValue(definition, 'test123');
      expect(resultValid.isValid).toBe(true);

      const resultInvalid = service.validateSettingValue(definition, 'Test123!');
      expect(resultInvalid.isValid).toBe(false);
      expect(resultInvalid.errors).toContain('Value does not match required pattern');
    });
  });

  describe('updateSetting', () => {
    it('should update existing setting successfully', async () => {
      const mockSetting = {
        id: 'test-id',
        key: 'passwordMinLength',
        value: 12,
        category: 'password_policy',
        type: 'number',
      };

      prismaService.systemSetting.upsert.mockResolvedValue(mockSetting);
      prismaService.auditLog.create.mockResolvedValue(null);

      await service.updateSetting('passwordMinLength', 12, 'user-123');

      expect(prismaService.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'passwordMinLength' },
        create: {
          key: 'passwordMinLength',
          value: 12,
          category: 'password_policy',
          type: 'number',
          description: 'Minimum password length',
          is_public: false,
          created_by: 'user-123',
          updated_by: 'user-123',
        },
        update: {
          value: 12,
          updated_by: 'user-123',
          updated_at: expect.any(Date),
        },
      });
    });

    it('should throw error for unknown setting key', async () => {
      await expect(service.updateSetting('unknownKey', 'value', 'user-123'))
        .rejects.toThrow('Unknown setting key: unknownKey');
    });

    it('should throw error for invalid value', async () => {
      await expect(service.updateSetting('passwordMinLength', 'not-a-number', 'user-123'))
        .rejects.toThrow('Validation failed for passwordMinLength');
    });

    it('should clear cache after update', async () => {
      // Set up cache
      service['settingsCache'].set('passwordMinLength', 8);
      service['cacheExpiry'].set('passwordMinLength', new Date(Date.now() + 60000));

      prismaService.systemSetting.upsert.mockResolvedValue({} as any);
      prismaService.auditLog.create.mockResolvedValue(null);

      await service.updateSetting('passwordMinLength', 12, 'user-123');

      expect(service['settingsCache'].has('passwordMinLength')).toBe(false);
      expect(service['cacheExpiry'].has('passwordMinLength')).toBe(false);
    });

    it('should log setting change', async () => {
      prismaService.systemSetting.upsert.mockResolvedValue({} as any);
      prismaService.auditLog.create.mockResolvedValue(null);

      await service.updateSetting('passwordMinLength', 12, 'user-123');

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-123',
          action: 'SECURITY_SETTING_CHANGED',
          entity_type: 'SYSTEM_SETTING',
          entity_id: 'passwordMinLength',
          details: {
            setting_key: 'passwordMinLength',
            new_value: 12,
          },
          ip_address: null,
          user_agent: null,
        },
      });
    });
  });

  describe('getSettingsByCategory', () => {
    it('should return settings for specific category', async () => {
      const mockSettings = [
        { key: 'passwordMinLength', value: 8 },
        { key: 'passwordRequireUppercase', value: true },
      ];

      // Mock each setting call
      prismaService.systemSetting.findFirst
        .mockResolvedValueOnce(mockSettings[0])
        .mockResolvedValueOnce(mockSettings[1]);

      const result = await service.getSettingsByCategory('password_policy');

      expect(result).toHaveLength(10); // Number of password policy settings
      expect(result[0].key).toBe('passwordMinLength');
      expect(result[0].value).toBe(8);
      expect(result[0].type).toBe('number');
      expect(result[0].description).toBe('Minimum password length');
    });
  });

  describe('resetSetting', () => {
    it('should reset setting to default value', async () => {
      prismaService.systemSetting.upsert.mockResolvedValue({} as any);
      prismaService.auditLog.create.mockResolvedValue(null);

      await service.resetSetting('passwordMinLength', 'user-123');

      expect(prismaService.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'passwordMinLength' },
        create: expect.objectContaining({
          value: 8, // Default value
        }),
        update: expect.objectContaining({
          value: 8, // Default value
        }),
      });
    });

    it('should throw error for unknown setting key', async () => {
      await expect(service.resetSetting('unknownKey', 'user-123'))
        .rejects.toThrow('Unknown setting key: unknownKey');
    });
  });

  describe('mapServiceKeyToSettingKey', () => {
    it('should map service keys to setting keys correctly', () => {
      const serviceKey = 'password_policy.min_length';
      const mappedKey = service['mapServiceKeyToSettingKey'](serviceKey);
      
      expect(mappedKey).toBe('passwordMinLength');
    });

    it('should return original key if no mapping exists', () => {
      const serviceKey = 'unknownServiceKey';
      const mappedKey = service['mapServiceKeyToSettingKey'](serviceKey);
      
      expect(mappedKey).toBe('unknownServiceKey');
    });
  });

  describe('getCategories', () => {
    it('should return all available categories', () => {
      const categories = service.getCategories();

      expect(categories).toHaveLength(8);
      expect(categories[0]).toEqual({
        id: 'rate_limiting',
        name: 'Rate Limiting',
        description: 'Configure API request rate limits and throttling',
      });
      expect(categories[1]).toEqual({
        id: 'session_security',
        name: 'Session Security',
        description: 'Manage user sessions and device trust',
      });
    });
  });

  describe('getSettingDefinitions', () => {
    it('should return all setting definitions', () => {
      const definitions = service.getSettingDefinitions();

      expect(definitions.length).toBeGreaterThan(0);
      expect(definitions[0]).toHaveProperty('key');
      expect(definitions[0]).toHaveProperty('category');
      expect(definitions[0]).toHaveProperty('type');
      expect(definitions[0]).toHaveProperty('defaultValue');
      expect(definitions[0]).toHaveProperty('description');
    });

    it('should have valid structure for all definitions', () => {
      const definitions = service.getSettingDefinitions();

      definitions.forEach(def => {
        expect(def.key).toBeTruthy();
        expect(def.category).toBeTruthy();
        expect(['string', 'number', 'boolean', 'array', 'object']).toContain(def.type);
        expect(def.defaultValue).toBeDefined();
        expect(def.description).toBeTruthy();
      });
    });
  });
});