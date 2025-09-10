import { BaseApiClient } from '../core/base-client';
import { RequestOptions } from '../types';

export interface RateLimitRule {
  name: string;
  endpoint: string;
  method?: string;
  maxRequests: number;
  windowMs: number;
  skipIf?: string;
  message?: string;
  isActive: boolean;
  priority?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRateLimitRequest {
  name: string;
  endpoint: string;
  method?: string;
  maxRequests: number;
  windowMs: number;
  skipIf?: string;
  message?: string;
  isActive?: boolean;
  priority?: number;
}

export interface UpdateRateLimitRequest extends Partial<CreateRateLimitRequest> {}

/**
 * Client for Rate Limit management (Admin only)
 */
export class AdminRateLimitClient extends BaseApiClient {
  /**
   * Get all rate limit rules
   */
  async getRateLimits(options?: RequestOptions): Promise<RateLimitRule[]> {
    return this.get<RateLimitRule[]>('/admin/rate-limits', options);
  }

  /**
   * Get a specific rate limit rule by name
   */
  async getRateLimitByName(name: string, options?: RequestOptions): Promise<RateLimitRule> {
    return this.get<RateLimitRule>(`/admin/rate-limits/${name}`, options);
  }

  /**
   * Create a new rate limit rule
   */
  async createRateLimit(data: CreateRateLimitRequest, options?: RequestOptions): Promise<RateLimitRule> {
    return this.post<RateLimitRule>('/admin/rate-limits', data, options);
  }

  /**
   * Update a rate limit rule
   */
  async updateRateLimit(name: string, data: UpdateRateLimitRequest, options?: RequestOptions): Promise<RateLimitRule> {
    return this.put<RateLimitRule>(`/admin/rate-limits/${name}`, data, options);
  }

  /**
   * Delete a rate limit rule
   */
  async deleteRateLimit(name: string, options?: RequestOptions): Promise<void> {
    await this.delete(`/admin/rate-limits/${name}`, options);
  }

  /**
   * Reload all rate limit rules (refresh cache)
   */
  async reloadRateLimits(options?: RequestOptions): Promise<{ message: string; rulesLoaded: number }> {
    return this.post<{ message: string; rulesLoaded: number }>('/admin/rate-limits/reload', {}, options);
  }

  /**
   * Test rate limit rule
   */
  async testRateLimit(endpoint: string, method?: string, options?: RequestOptions): Promise<{
    limited: boolean;
    rule?: RateLimitRule;
    remainingRequests?: number;
    resetTime?: string;
  }> {
    return this.post('/admin/rate-limits/test', { endpoint, method }, options);
  }

  /**
   * Get rate limit statistics
   */
  async getRateLimitStats(options?: RequestOptions): Promise<{
    totalRules: number;
    activeRules: number;
    topLimitedEndpoints: Array<{
      endpoint: string;
      hitCount: number;
      limitedCount: number;
    }>;
  }> {
    return this.get('/admin/rate-limits/stats', options);
  }
}