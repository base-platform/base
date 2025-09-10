import { BaseApiClient } from '../core/base-client';
import { RequestOptions } from '../types';

export interface SecuritySetting {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  category: string;
  description?: string;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
  updatedAt?: string;
  updatedBy?: string;
}

export interface SecurityCategory {
  name: string;
  displayName: string;
  description: string;
  settings: SecuritySetting[];
}

export interface SecuritySettingsExport {
  version: string;
  exportedAt: string;
  settings: Record<string, any>;
}

export interface ValidationTestResult {
  category: string;
  settings: Array<{
    key: string;
    currentValue: any;
    isValid: boolean;
    error?: string;
  }>;
}

/**
 * Client for Security Settings management (Admin only)
 */
export class SecuritySettingsClient extends BaseApiClient {
  /**
   * Get all security categories
   */
  async getCategories(options?: RequestOptions): Promise<SecurityCategory[]> {
    return this.get<SecurityCategory[]>('/admin/security-settings/categories', options);
  }

  /**
   * Get all security setting definitions
   */
  async getDefinitions(options?: RequestOptions): Promise<Record<string, SecuritySetting>> {
    return this.get<Record<string, SecuritySetting>>('/admin/security-settings/definitions', options);
  }

  /**
   * Get all security settings
   */
  async getAllSettings(options?: RequestOptions): Promise<Record<string, any>> {
    return this.get<Record<string, any>>('/admin/security-settings/all', options);
  }

  /**
   * Get settings by category
   */
  async getSettingsByCategory(category: string, options?: RequestOptions): Promise<Record<string, any>> {
    return this.get<Record<string, any>>(`/admin/security-settings/category/${category}`, options);
  }

  /**
   * Get a specific security setting
   */
  async getSetting(key: string, options?: RequestOptions): Promise<{ key: string; value: any; metadata?: any }> {
    return this.get<{ key: string; value: any; metadata?: any }>(`/admin/security-settings/${key}`, options);
  }

  /**
   * Update a specific security setting
   */
  async updateSetting(key: string, value: any, options?: RequestOptions): Promise<SecuritySetting> {
    return this.put<SecuritySetting>(`/admin/security-settings/${key}`, { value }, options);
  }

  /**
   * Update multiple security settings
   */
  async updateMultipleSettings(settings: Record<string, any>, options?: RequestOptions): Promise<{ updated: string[]; errors?: any[] }> {
    return this.put<{ updated: string[]; errors?: any[] }>('/admin/security-settings', { settings }, options);
  }

  /**
   * Reset a setting to default value
   */
  async resetSetting(key: string, options?: RequestOptions): Promise<SecuritySetting> {
    return this.post<SecuritySetting>(`/admin/security-settings/${key}/reset`, {}, options);
  }

  /**
   * Test/validate all settings
   */
  async testValidation(options?: RequestOptions): Promise<ValidationTestResult[]> {
    return this.get<ValidationTestResult[]>('/admin/security-settings/validation/test', options);
  }

  /**
   * Export security settings
   */
  async exportSettings(options?: RequestOptions): Promise<SecuritySettingsExport> {
    return this.get<SecuritySettingsExport>('/admin/security-settings/export/json', options);
  }

  /**
   * Import security settings
   */
  async importSettings(settings: Record<string, any>, options?: RequestOptions): Promise<{ imported: number; errors?: any[] }> {
    return this.post<{ imported: number; errors?: any[] }>('/admin/security-settings/import/json', { settings }, options);
  }
}