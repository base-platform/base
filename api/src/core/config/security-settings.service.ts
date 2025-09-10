import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface SecuritySettingDefinition {
  key: string;
  category: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  defaultValue: any;
  description: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
    required?: boolean;
  };
  isPublic?: boolean;
}

export interface SecuritySettings {
  // Rate Limiting
  rateLimitDefault: number;
  rateLimitWindowMs: number;
  rateLimitBurst: number;
  rateLimitMaxRules: number;

  // Session Security
  sessionTtlHours: number;
  maxConcurrentSessions: number;
  deviceTrustDays: number;
  sessionInactivityMinutes: number;

  // Password Policies
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecial: boolean;
  passwordHistoryCount: number;
  passwordMaxAgeDays: number;

  // Account Lockout
  lockoutMaxAttempts: number;
  lockoutDurationMinutes: number;
  lockoutResetHours: number;
  lockoutPermanentThreshold: number;

  // File Upload Security
  fileUploadMaxSize: number;
  fileUploadMaxFiles: number;
  fileUploadAllowedMimes: string[];
  fileUploadAllowedExtensions: string[];
  fileUploadScanMalware: boolean;
  fileUploadQuarantineSuspicious: boolean;

  // MFA Settings
  mfaBackupCodeCount: number;
  mfaTotpWindow: number;
  mfaRequiredForAdmin: boolean;
  mfaTrustedDeviceDays: number;

  // API Key Settings
  apiKeyDefaultExpirationDays: number;
  apiKeyRotationWarningDays: number;
  apiKeyAutoRotationEnabled: boolean;
  apiKeyMaxPerUser: number;

  // Audit & Monitoring
  auditLogRetentionDays: number;
  securityEventNotifications: boolean;
  suspiciousActivityThreshold: number;
  failedLoginNotificationThreshold: number;
}

@Injectable()
export class SecuritySettingsService implements OnModuleInit {
  private settingsCache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, Date> = new Map();
  private readonly cacheTtlMinutes = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeDefaultSettings();
  }

  /**
   * Get all security settings definitions
   */
  getSettingDefinitions(): SecuritySettingDefinition[] {
    return [
      // Rate Limiting
      {
        key: 'rateLimitDefault',
        category: 'rate_limiting',
        type: 'number',
        defaultValue: 100,
        description: 'Default rate limit (requests per minute)',
        validation: { min: 1, max: 10000 },
      },
      {
        key: 'rateLimitWindowMs',
        category: 'rate_limiting',
        type: 'number',
        defaultValue: 60000,
        description: 'Rate limit window in milliseconds',
        validation: { min: 1000, max: 3600000 },
      },
      {
        key: 'rateLimitAuthWindowMs',
        category: 'rate_limiting',
        type: 'number',
        defaultValue: 900000,
        description: 'Auth endpoints rate limit window in milliseconds',
        validation: { min: 1000, max: 3600000 },
      },
      {
        key: 'rateLimitAuthLimit',
        category: 'rate_limiting',
        type: 'number',
        defaultValue: 20,
        description: 'Auth endpoints rate limit (requests per window)',
        validation: { min: 1, max: 1000 },
      },
      {
        key: 'rateLimitApiWindowMs',
        category: 'rate_limiting',
        type: 'number',
        defaultValue: 60000,
        description: 'API endpoints rate limit window in milliseconds',
        validation: { min: 1000, max: 3600000 },
      },
      {
        key: 'rateLimitApiLimit',
        category: 'rate_limiting',
        type: 'number',
        defaultValue: 500,
        description: 'API endpoints rate limit (requests per window)',
        validation: { min: 1, max: 5000 },
      },
      {
        key: 'rateLimitBurst',
        category: 'rate_limiting',
        type: 'number',
        defaultValue: 20,
        description: 'Burst rate limit for short periods',
        validation: { min: 1, max: 1000 },
      },
      {
        key: 'rateLimitMaxRules',
        category: 'rate_limiting',
        type: 'number',
        defaultValue: 50,
        description: 'Maximum custom rate limit rules per user',
        validation: { min: 1, max: 1000 },
      },

      // Session Security
      {
        key: 'sessionTtlHours',
        category: 'session_security',
        type: 'number',
        defaultValue: 24,
        description: 'Session lifetime in hours',
        validation: { min: 1, max: 720 },
      },
      {
        key: 'maxConcurrentSessions',
        category: 'session_security',
        type: 'number',
        defaultValue: 5,
        description: 'Maximum concurrent sessions per user',
        validation: { min: 1, max: 50 },
      },
      {
        key: 'deviceTrustDays',
        category: 'session_security',
        type: 'number',
        defaultValue: 30,
        description: 'Device trust duration in days',
        validation: { min: 1, max: 365 },
      },
      {
        key: 'sessionInactivityMinutes',
        category: 'session_security',
        type: 'number',
        defaultValue: 60,
        description: 'Session inactivity timeout in minutes',
        validation: { min: 5, max: 1440 },
      },

      // Password Policies
      {
        key: 'passwordMinLength',
        category: 'password_policy',
        type: 'number',
        defaultValue: 8,
        description: 'Minimum password length',
        validation: { min: 4, max: 128 },
      },
      {
        key: 'passwordRequireUppercase',
        category: 'password_policy',
        type: 'boolean',
        defaultValue: true,
        description: 'Require uppercase letters',
      },
      {
        key: 'passwordRequireLowercase',
        category: 'password_policy',
        type: 'boolean',
        defaultValue: true,
        description: 'Require lowercase letters',
      },
      {
        key: 'passwordRequireNumbers',
        category: 'password_policy',
        type: 'boolean',
        defaultValue: true,
        description: 'Require numbers',
      },
      {
        key: 'passwordRequireSpecial',
        category: 'password_policy',
        type: 'boolean',
        defaultValue: true,
        description: 'Require special characters',
      },
      {
        key: 'passwordHistoryCount',
        category: 'password_policy',
        type: 'number',
        defaultValue: 5,
        description: 'Number of previous passwords to remember',
        validation: { min: 0, max: 50 },
      },
      {
        key: 'passwordMaxAgeDays',
        category: 'password_policy',
        type: 'number',
        defaultValue: 90,
        description: 'Maximum password age in days (0 = no expiration)',
        validation: { min: 0, max: 365 },
      },

      // Account Lockout
      {
        key: 'lockoutMaxAttempts',
        category: 'account_lockout',
        type: 'number',
        defaultValue: 5,
        description: 'Maximum failed login attempts before lockout',
        validation: { min: 3, max: 20 },
      },
      {
        key: 'lockoutDurationMinutes',
        category: 'account_lockout',
        type: 'number',
        defaultValue: 30,
        description: 'Account lockout duration in minutes',
        validation: { min: 1, max: 1440 },
      },
      {
        key: 'lockoutResetHours',
        category: 'account_lockout',
        type: 'number',
        defaultValue: 24,
        description: 'Hours to reset failed attempt counter',
        validation: { min: 1, max: 168 },
      },
      {
        key: 'lockoutPermanentThreshold',
        category: 'account_lockout',
        type: 'number',
        defaultValue: 10,
        description: 'Failed attempts for permanent lockout (0 = disabled)',
        validation: { min: 0, max: 100 },
      },

      // File Upload Security
      {
        key: 'fileUploadMaxSize',
        category: 'file_upload',
        type: 'number',
        defaultValue: 10485760, // 10MB
        description: 'Maximum file upload size in bytes',
        validation: { min: 1024, max: 1073741824 }, // 1KB to 1GB
      },
      {
        key: 'fileUploadMaxSizeMB',
        category: 'file_upload',
        type: 'number',
        defaultValue: 10,
        description: 'Maximum file upload size in MB',
        validation: { min: 1, max: 1024 },
      },
      {
        key: 'fileUploadMaxFiles',
        category: 'file_upload',
        type: 'number',
        defaultValue: 5,
        description: 'Maximum files per upload',
        validation: { min: 1, max: 100 },
      },
      {
        key: 'fileUploadAllowedMimes',
        category: 'file_upload',
        type: 'array',
        defaultValue: ['image/*', 'application/pdf', 'text/plain'],
        description: 'Allowed MIME types',
      },
      {
        key: 'fileUploadAllowedExtensions',
        category: 'file_upload',
        type: 'array',
        defaultValue: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt'],
        description: 'Allowed file extensions',
      },
      {
        key: 'fileUploadScanMalware',
        category: 'file_upload',
        type: 'boolean',
        defaultValue: true,
        description: 'Enable malware scanning',
      },
      {
        key: 'fileUploadQuarantineSuspicious',
        category: 'file_upload',
        type: 'boolean',
        defaultValue: true,
        description: 'Quarantine suspicious files',
      },

      // MFA Settings
      {
        key: 'mfaBackupCodeCount',
        category: 'mfa',
        type: 'number',
        defaultValue: 10,
        description: 'Number of backup codes to generate',
        validation: { min: 5, max: 50 },
      },
      {
        key: 'mfaTotpWindow',
        category: 'mfa',
        type: 'number',
        defaultValue: 2,
        description: 'TOTP time window tolerance',
        validation: { min: 1, max: 10 },
      },
      {
        key: 'mfaSecretLength',
        category: 'mfa',
        type: 'number',
        defaultValue: 32,
        description: 'Length of MFA secret key',
        validation: { min: 16, max: 64 },
      },
      {
        key: 'mfaWindowToleranceSeconds',
        category: 'mfa',
        type: 'number',
        defaultValue: 60,
        description: 'TOTP window tolerance in seconds',
        validation: { min: 30, max: 300 },
      },
      {
        key: 'mfaRequiredForAdmin',
        category: 'mfa',
        type: 'boolean',
        defaultValue: true,
        description: 'Require MFA for admin users',
      },
      {
        key: 'mfaTrustedDeviceDays',
        category: 'mfa',
        type: 'number',
        defaultValue: 30,
        description: 'MFA trusted device duration in days',
        validation: { min: 1, max: 365 },
      },

      // API Key Settings
      {
        key: 'apiKeyDefaultExpirationDays',
        category: 'api_keys',
        type: 'number',
        defaultValue: 365,
        description: 'Default API key expiration in days (0 = no expiration)',
        validation: { min: 0, max: 3650 },
      },
      {
        key: 'apiKeyRotationWarningDays',
        category: 'api_keys',
        type: 'number',
        defaultValue: 30,
        description: 'Days before expiration to warn about rotation',
        validation: { min: 1, max: 365 },
      },
      {
        key: 'apiKeyAutoRotationEnabled',
        category: 'api_keys',
        type: 'boolean',
        defaultValue: false,
        description: 'Enable automatic API key rotation',
      },
      {
        key: 'apiKeyMaxPerUser',
        category: 'api_keys',
        type: 'number',
        defaultValue: 10,
        description: 'Maximum API keys per user',
        validation: { min: 1, max: 100 },
      },

      // Audit & Monitoring
      {
        key: 'auditLogRetentionDays',
        category: 'audit_monitoring',
        type: 'number',
        defaultValue: 90,
        description: 'Audit log retention in days',
        validation: { min: 1, max: 3650 },
      },
      {
        key: 'securityEventNotifications',
        category: 'audit_monitoring',
        type: 'boolean',
        defaultValue: true,
        description: 'Enable security event notifications',
        isPublic: true,
      },
      {
        key: 'suspiciousActivityThreshold',
        category: 'audit_monitoring',
        type: 'number',
        defaultValue: 5,
        description: 'Suspicious activity detection threshold',
        validation: { min: 1, max: 100 },
      },
      {
        key: 'failedLoginNotificationThreshold',
        category: 'audit_monitoring',
        type: 'number',
        defaultValue: 3,
        description: 'Failed login attempts before notification',
        validation: { min: 1, max: 20 },
      },
    ];
  }

  /**
   * Get a security setting value with fallback to default
   */
  async getSetting<T = any>(key: string, fallbackToEnv: boolean = true): Promise<T> {
    // Map service keys to setting definition keys
    const mappedKey = this.mapServiceKeyToSettingKey(key);
    
    // Check cache first
    const cached = this.settingsCache.get(mappedKey);
    const cacheExpiry = this.cacheExpiry.get(mappedKey);
    
    if (cached !== undefined && cacheExpiry && cacheExpiry > new Date()) {
      return cached;
    }

    // Get from database
    const setting = await this.prisma.systemSetting.findFirst({
      where: { key: mappedKey, is_active: true },
    });

    let value: T;
    
    if (setting) {
      value = setting.value as T;
    } else {
      // Fallback to default value from definition
      const definition = this.getSettingDefinitions().find(def => def.key === mappedKey);
      if (definition) {
        value = definition.defaultValue;
      } else if (fallbackToEnv) {
        // Fallback to environment variable
        value = this.config.get<T>(this.keyToEnvVar(key)) as T;
      } else {
        throw new Error(`Setting '${key}' not found`);
      }
    }

    // Cache the result
    this.settingsCache.set(mappedKey, value);
    this.cacheExpiry.set(mappedKey, new Date(Date.now() + this.cacheTtlMinutes * 60 * 1000));

    return value;
  }

  /**
   * Map service keys to setting definition keys
   */
  private mapServiceKeyToSettingKey(serviceKey: string): string {
    const keyMappings: Record<string, string> = {
      // Account lockout mappings
      'account_lockout.max_failed_attempts': 'lockoutMaxAttempts',
      'account_lockout.lockout_duration_minutes': 'lockoutDurationMinutes',
      'account_lockout.reset_window_minutes': 'lockoutResetHours',
      
      // Password policy mappings
      'password_policy.min_length': 'passwordMinLength',
      'password_policy.require_uppercase': 'passwordRequireUppercase',
      'password_policy.require_lowercase': 'passwordRequireLowercase',
      'password_policy.require_numbers': 'passwordRequireNumbers',
      'password_policy.require_special_chars': 'passwordRequireSpecial',
      'password_policy.prevent_common_passwords': 'passwordPreventCommon',
      'password_policy.prevent_user_info': 'passwordPreventUserInfo',
      'password_policy.password_history_count': 'passwordHistoryCount',
      'password_policy.password_expiry_days': 'passwordMaxAgeDays',
      'password_policy.min_password_age_days': 'passwordMinAgeDays',
      
      // Session security mappings
      'session_security.session_timeout_hours': 'sessionTtlHours',
      'session_security.max_concurrent_sessions': 'maxConcurrentSessions',
      'session_security.trusted_device_duration_days': 'deviceTrustDays',
      
      // File upload mappings
      'file_upload.max_file_size_mb': 'fileUploadMaxSizeMB',
      'file_upload.max_files': 'fileUploadMaxFiles',
      'file_upload.allowed_mime_types': 'fileUploadAllowedMimes',
      'file_upload.allowed_extensions': 'fileUploadAllowedExtensions',
      'file_upload.scan_for_malware': 'fileUploadScanMalware',
      'file_upload.quarantine_suspicious_files': 'fileUploadQuarantineSuspicious',
      
      // API keys mappings
      'api_keys.rotation_warning_days': 'apiKeyRotationWarningDays',
      'api_keys.auto_rotation_enabled': 'apiKeyAutoRotationEnabled',
      'api_keys.max_per_user': 'apiKeyMaxPerUser',
      'api_keys.default_expiration_days': 'apiKeyDefaultExpirationDays',
      
      // MFA mappings
      'mfa.secret_length': 'mfaSecretLength',
      'mfa.backup_codes_count': 'mfaBackupCodeCount',
      'mfa.window_tolerance_seconds': 'mfaWindowToleranceSeconds',
      'mfa.required_for_admin': 'mfaRequiredForAdmin',
      
      // Rate limiting mappings
      'rate_limiting.default_window_ms': 'rateLimitWindowMs',
      'rate_limiting.default_max_requests': 'rateLimitDefault',
      'rate_limiting.auth_window_ms': 'rateLimitAuthWindowMs',
      'rate_limiting.auth_max_requests': 'rateLimitAuthLimit',
      'rate_limiting.api_window_ms': 'rateLimitApiWindowMs',
      'rate_limiting.api_max_requests': 'rateLimitApiLimit',
      
      // Audit monitoring mappings
      'audit_monitoring.log_retention_days': 'auditLogRetentionDays',
      'audit_monitoring.security_event_notifications': 'securityEventNotifications',
      'audit_monitoring.suspicious_activity_threshold': 'suspiciousActivityThreshold',
      'audit_monitoring.failed_login_notification_threshold': 'failedLoginNotificationThreshold',
    };
    
    return keyMappings[serviceKey] || serviceKey;
  }

  /**
   * Get all security settings
   */
  async getAllSettings(): Promise<SecuritySettings> {
    const definitions = this.getSettingDefinitions();
    const settings = {} as SecuritySettings;

    for (const def of definitions) {
      settings[def.key as keyof SecuritySettings] = await this.getSetting(def.key);
    }

    return settings;
  }

  /**
   * Update a security setting
   */
  async updateSetting(
    key: string,
    value: any,
    userId: string,
  ): Promise<void> {
    const definition = this.getSettingDefinitions().find(def => def.key === key);
    
    if (!definition) {
      throw new Error(`Unknown setting key: ${key}`);
    }

    // Validate the value
    const validation = this.validateSettingValue(definition, value);
    if (!validation.isValid) {
      throw new Error(`Validation failed for ${key}: ${validation.errors.join(', ')}`);
    }

    // Update or create the setting
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: {
        key,
        value,
        category: definition.category,
        type: definition.type,
        description: definition.description,
        is_public: definition.isPublic || false,
        created_by: userId,
        updated_by: userId,
      },
      update: {
        value,
        updated_by: userId,
        updated_at: new Date(),
      },
    });

    // Clear cache
    this.clearSettingCache(key);

    // Log the change
    await this.logSettingChange(key, value, userId);
  }

  /**
   * Get settings by category
   */
  async getSettingsByCategory(category: string): Promise<Array<{
    key: string;
    value: any;
    description: string;
    type: string;
    validation?: any;
  }>> {
    const definitions = this.getSettingDefinitions().filter(
      def => def.category === category
    );

    const results = [];
    for (const def of definitions) {
      const value = await this.getSetting(def.key);
      results.push({
        key: def.key,
        value,
        description: def.description,
        type: def.type,
        validation: def.validation,
      });
    }

    return results;
  }

  /**
   * Reset setting to default value
   */
  async resetSetting(key: string, userId: string): Promise<void> {
    const definition = this.getSettingDefinitions().find(def => def.key === key);
    
    if (!definition) {
      throw new Error(`Unknown setting key: ${key}`);
    }

    await this.updateSetting(key, definition.defaultValue, userId);
  }

  /**
   * Get available setting categories
   */
  getCategories(): Array<{ id: string; name: string; description: string }> {
    return [
      {
        id: 'rate_limiting',
        name: 'Rate Limiting',
        description: 'Configure API request rate limits and throttling',
      },
      {
        id: 'session_security',
        name: 'Session Security',
        description: 'Manage user sessions and device trust',
      },
      {
        id: 'password_policy',
        name: 'Password Policy',
        description: 'Set password complexity and lifecycle rules',
      },
      {
        id: 'account_lockout',
        name: 'Account Lockout',
        description: 'Configure account lockout after failed logins',
      },
      {
        id: 'file_upload',
        name: 'File Upload',
        description: 'Security settings for file uploads',
      },
      {
        id: 'mfa',
        name: 'Multi-Factor Auth',
        description: 'Configure MFA and 2FA settings',
      },
      {
        id: 'api_keys',
        name: 'API Keys',
        description: 'API key lifecycle and rotation settings',
      },
      {
        id: 'audit_monitoring',
        name: 'Audit & Monitoring',
        description: 'Logging and security monitoring configuration',
      },
    ];
  }

  private async initializeDefaultSettings(): Promise<void> {
    const definitions = this.getSettingDefinitions();

    for (const def of definitions) {
      const exists = await this.prisma.systemSetting.findUnique({
        where: { key: def.key },
      });

      if (!exists) {
        await this.prisma.systemSetting.create({
          data: {
            key: def.key,
            value: def.defaultValue,
            category: def.category,
            type: def.type,
            description: def.description,
            is_public: def.isPublic || false,
          },
        });
      }
    }
  }

  /**
   * Comprehensive validation of setting values
   */
  validateSettingValue(definition: SecuritySettingDefinition, value: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Type validation
    if (!this.validateType(definition.type, value)) {
      errors.push(`Value must be of type ${definition.type}`);
    }

    // Constraint validation
    if (definition.validation) {
      const { min, max, pattern, enum: enumValues } = definition.validation;

      if (definition.type === 'number') {
        const num = Number(value);
        if (!isNaN(num)) {
          if (min !== undefined && num < min) {
            errors.push(`Value must be at least ${min}`);
          }
          if (max !== undefined && num > max) {
            errors.push(`Value must be at most ${max}`);
          }
        }
      }

      if (definition.type === 'string' && pattern) {
        if (!new RegExp(pattern).test(String(value))) {
          errors.push(`Value does not match required pattern`);
        }
      }

      if (enumValues && !enumValues.includes(String(value))) {
        errors.push(`Value must be one of: ${enumValues.join(', ')}`);
      }

      if (definition.type === 'array' && Array.isArray(value)) {
        if (min !== undefined && value.length < min) {
          errors.push(`Array must have at least ${min} items`);
        }
        if (max !== undefined && value.length > max) {
          errors.push(`Array must have at most ${max} items`);
        }
      }
    }

    // Security-specific validation
    const securityValidation = this.validateSecurityConstraints(definition.key, value);
    if (!securityValidation.isValid) {
      errors.push(...securityValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate data types
   */
  private validateType(expectedType: string, value: any): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return false;
    }
  }

  /**
   * Security-specific validation rules
   */
  private validateSecurityConstraints(key: string, value: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (key) {
      case 'passwordMinLength':
        if (value < 8) {
          errors.push('Password minimum length should be at least 8 for security');
        }
        break;

      case 'lockoutMaxAttempts':
        if (value > 10) {
          errors.push('Too many failed attempts allowed may compromise security');
        }
        break;

      case 'sessionTtlHours':
        if (value > 168) { // 1 week
          errors.push('Session duration too long may pose security risk');
        }
        break;

      case 'mfaTotpWindow':
        if (value > 5) {
          errors.push('TOTP window too large reduces MFA security');
        }
        break;

      case 'fileUploadMaxSize':
        if (value > 100 * 1024 * 1024) { // 100MB
          errors.push('File upload size too large may cause DoS attacks');
        }
        break;

      case 'apiKeyMaxPerUser':
        if (value > 50) {
          errors.push('Too many API keys per user may be difficult to manage securely');
        }
        break;

      case 'auditLogRetentionDays':
        if (value < 30) {
          errors.push('Audit logs should be retained for at least 30 days for compliance');
        }
        break;

      case 'fileUploadAllowedExtensions':
        if (Array.isArray(value)) {
          const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.php', '.asp', '.jsp'];
          const hasBlacklisted = value.some(ext => dangerousExtensions.includes(ext.toLowerCase()));
          if (hasBlacklisted) {
            errors.push('Dangerous file extensions detected in allowed list');
          }
        }
        break;

      case 'rateLimitDefault':
        if (value > 10000) {
          errors.push('Rate limit too high may not provide adequate protection');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private clearSettingCache(key: string): void {
    this.settingsCache.delete(key);
    this.cacheExpiry.delete(key);
  }

  private keyToEnvVar(key: string): string {
    // Convert camelCase to UPPER_SNAKE_CASE
    return key
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase()
      .replace(/^_/, '');
  }

  private async logSettingChange(key: string, value: any, userId: string): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          user_id: userId,
          action: 'SECURITY_SETTING_CHANGED',
          entity_type: 'SYSTEM_SETTING',
          entity_id: key,
          details: {
            setting_key: key,
            new_value: value,
          },
          ip_address: null,
          user_agent: null,
        },
      });
    } catch (error) {
      console.error('Failed to log setting change:', error);
    }
  }
}