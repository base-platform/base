import { BaseApiClient } from '../core/base-client';
import { RequestOptions } from '../types';

export interface UserRateLimit {
  id: string;
  userId: string;
  endpoint: string;
  method?: string;
  maxRequests: number;
  windowMs: number;
  reason?: string;
  expiresAt?: string;
  createdAt: string;
  createdBy?: string;
}

export interface CreateUserRateLimitRequest {
  userId?: string; // If not provided, applies to current user
  endpoint: string;
  method?: string;
  maxRequests: number;
  windowMs: number;
  reason?: string;
  expiresAt?: string;
}

export interface UserRateLimitStatus {
  endpoint: string;
  method?: string;
  limit: number;
  remaining: number;
  resetTime: string;
  isLimited: boolean;
}

export interface UserRateLimitStats {
  totalLimits: number;
  activeLimits: number;
  recentActivity: Array<{
    endpoint: string;
    timestamp: string;
    limited: boolean;
  }>;
}

/**
 * Client for User-specific Rate Limit operations
 */
export class UserRateLimitClient extends BaseApiClient {
  /**
   * Create a user-specific rate limit
   */
  async createUserRateLimit(data: CreateUserRateLimitRequest, options?: RequestOptions): Promise<UserRateLimit> {
    return this.post<UserRateLimit>('/auth/user-rate-limits', data, options);
  }

  /**
   * Get user's rate limits
   */
  async getUserRateLimits(userId?: string, options?: RequestOptions): Promise<UserRateLimit[]> {
    const params = userId ? { userId } : undefined;
    return this.get<UserRateLimit[]>('/auth/user-rate-limits', {
      params,
      ...options
    });
  }

  /**
   * Update a user rate limit
   */
  async updateUserRateLimit(
    limitId: string,
    data: Partial<CreateUserRateLimitRequest>,
    options?: RequestOptions
  ): Promise<UserRateLimit> {
    return this.put<UserRateLimit>(`/auth/user-rate-limits/${limitId}`, data, options);
  }

  /**
   * Delete a user rate limit
   */
  async deleteUserRateLimit(limitId: string, options?: RequestOptions): Promise<void> {
    await this.delete(`/auth/user-rate-limits/${limitId}`, options);
  }

  /**
   * Get rate limit statistics for current user
   */
  async getUserRateLimitStats(options?: RequestOptions): Promise<UserRateLimitStats> {
    return this.get<UserRateLimitStats>('/auth/user-rate-limits/stats', options);
  }

  /**
   * Check rate limit status for a specific endpoint
   */
  async checkRateLimitStatus(endpoint: string, method?: string, options?: RequestOptions): Promise<UserRateLimitStatus> {
    return this.get<UserRateLimitStatus>(`/auth/user-rate-limits/status/${endpoint}`, {
      params: method ? { method } : undefined,
      ...options
    });
  }

  /**
   * Clear rate limit counters for current user (admin action)
   */
  async clearRateLimitCounters(userId?: string, options?: RequestOptions): Promise<{ cleared: boolean }> {
    return this.post<{ cleared: boolean }>('/auth/user-rate-limits/clear', { userId }, options);
  }
}