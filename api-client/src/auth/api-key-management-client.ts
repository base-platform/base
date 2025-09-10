import { BaseApiClient } from '../core/base-client';
import { RequestOptions, ApiKey } from '../types';

export interface ApiKeyRotationResponse {
  oldKey: string;
  newKey: ApiKey;
  rotatedAt: string;
}

export interface BulkRotationRequest {
  keyIds: string[];
  reason?: string;
}

export interface BulkRotationResponse {
  rotated: ApiKeyRotationResponse[];
  failed: Array<{
    keyId: string;
    error: string;
  }>;
}

export interface ApiKeyUsageStats {
  keyId: string;
  name: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastUsedAt?: string;
  topEndpoints: Array<{
    endpoint: string;
    count: number;
  }>;
  dailyUsage: Array<{
    date: string;
    requests: number;
  }>;
}

export interface RotationHistory {
  keyId: string;
  rotatedAt: string;
  rotatedBy: string;
  reason?: string;
  oldKeyHash: string;
}

/**
 * Enhanced API Key Management Client
 */
export class ApiKeyManagementClient extends BaseApiClient {
  /**
   * Create a new API key with enhanced options
   */
  async createApiKey(data: {
    name: string;
    permissions?: string[];
    expiresAt?: Date;
    rateLimit?: number;
    allowedIps?: string[];
    metadata?: Record<string, any>;
  }, options?: RequestOptions): Promise<ApiKey> {
    return this.post<ApiKey>('/auth/api-keys', data, options);
  }

  /**
   * Rotate an API key
   */
  async rotateApiKey(keyId: string, reason?: string, options?: RequestOptions): Promise<ApiKeyRotationResponse> {
    return this.post<ApiKeyRotationResponse>(`/auth/api-keys/${keyId}/rotate`, { reason }, options);
  }

  /**
   * Bulk rotate multiple API keys
   */
  async rotateBulk(data: BulkRotationRequest, options?: RequestOptions): Promise<BulkRotationResponse> {
    return this.post<BulkRotationResponse>('/auth/api-keys/rotate-bulk', data, options);
  }

  /**
   * Set expiration for an API key
   */
  async setExpiration(keyId: string, expiresAt: Date, options?: RequestOptions): Promise<ApiKey> {
    return this.post<ApiKey>(`/auth/api-keys/${keyId}/expire`, { expiresAt }, options);
  }

  /**
   * Revoke an API key with reason
   */
  async revokeApiKey(keyId: string, reason?: string, options?: RequestOptions): Promise<void> {
    await this.post(`/auth/api-keys/${keyId}/revoke`, { reason }, options);
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStats(keyId?: string, options?: RequestOptions): Promise<ApiKeyUsageStats | ApiKeyUsageStats[]> {
    const endpoint = keyId ? `/auth/api-keys/${keyId}/usage-stats` : '/auth/api-keys/usage-stats';
    return this.get<ApiKeyUsageStats | ApiKeyUsageStats[]>(endpoint, options);
  }

  /**
   * Get API keys that need rotation
   */
  async getKeysNeedingRotation(options?: RequestOptions): Promise<Array<{
    key: ApiKey;
    reason: string;
    lastRotated?: string;
  }>> {
    return this.get<Array<{
      key: ApiKey;
      reason: string;
      lastRotated?: string;
    }>>('/auth/api-keys/rotation-needed', options);
  }

  /**
   * Get rotation history
   */
  async getRotationHistory(keyId?: string, options?: RequestOptions): Promise<RotationHistory[]> {
    const params = keyId ? { keyId } : undefined;
    return this.get<RotationHistory[]>('/auth/api-keys/rotation-history', {
      params,
      ...options
    });
  }

  /**
   * Update API key permissions
   */
  async updatePermissions(keyId: string, permissions: string[], options?: RequestOptions): Promise<ApiKey> {
    return this.put<ApiKey>(`/auth/api-keys/${keyId}/permissions`, { permissions }, options);
  }

  /**
   * Update API key rate limit
   */
  async updateRateLimit(keyId: string, rateLimit: number, options?: RequestOptions): Promise<ApiKey> {
    return this.put<ApiKey>(`/auth/api-keys/${keyId}/rate-limit`, { rateLimit }, options);
  }

  /**
   * Update allowed IPs for API key
   */
  async updateAllowedIps(keyId: string, allowedIps: string[], options?: RequestOptions): Promise<ApiKey> {
    return this.put<ApiKey>(`/auth/api-keys/${keyId}/allowed-ips`, { allowedIps }, options);
  }

  /**
   * Clone an API key with new name
   */
  async cloneApiKey(keyId: string, newName: string, options?: RequestOptions): Promise<ApiKey> {
    return this.post<ApiKey>(`/auth/api-keys/${keyId}/clone`, { name: newName }, options);
  }

  /**
   * Test API key validity
   */
  async testApiKey(key: string, options?: RequestOptions): Promise<{
    valid: boolean;
    permissions?: string[];
    expiresAt?: string;
    rateLimit?: number;
  }> {
    return this.post('/auth/api-keys/test', { key }, options);
  }
}