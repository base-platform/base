import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface UserRateLimitConfig {
  userId: string;
  endpoint?: string;
  limit: number;
  windowMs: number;
  burstLimit?: number; // Allow short bursts
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

@Injectable()
export class UserRateLimitService {
  private redis: Redis;
  private defaultConfig: {
    limit: number;
    windowMs: number;
    burstLimit: number;
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis(this.config.get<string>('REDIS_URL') || 'redis://localhost:6379');
    
    this.defaultConfig = {
      limit: this.config.get<number>('USER_RATE_LIMIT_DEFAULT', 100),
      windowMs: this.config.get<number>('USER_RATE_LIMIT_WINDOW_MS', 60000), // 1 minute
      burstLimit: this.config.get<number>('USER_RATE_LIMIT_BURST', 20),
    };
  }

  /**
   * Check if user request is within rate limits
   */
  async checkRateLimit(
    userId: string,
    endpoint: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<RateLimitResult> {
    // Get user-specific rate limit configuration
    const userConfig = await this.getUserRateLimitConfig(userId, endpoint);
    
    // Create unique key for this user/endpoint combination
    const key = this.createRateLimitKey(userId, endpoint);
    const burstKey = `${key}:burst`;
    
    const now = Date.now();
    const windowStart = now - userConfig.windowMs;

    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zremrangebyscore(burstKey, 0, now - (userConfig.burstLimit || 5) * 1000); // 5 second burst window
    
    // Count current requests in window
    pipeline.zcard(key);
    pipeline.zcard(burstKey);
    
    // Add current request timestamp
    const requestId = `${now}-${Math.random()}`;
    pipeline.zadd(key, now, requestId);
    pipeline.zadd(burstKey, now, requestId);
    
    // Set expiration
    pipeline.expire(key, Math.ceil(userConfig.windowMs / 1000));
    pipeline.expire(burstKey, 10); // 10 seconds for burst tracking
    
    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis pipeline failed');
    }

    const currentCount = (results[2][1] as number) || 0;
    const burstCount = (results[3][1] as number) || 0;
    
    // Check burst limit first (short-term protection)
    if (userConfig.burstLimit && burstCount > userConfig.burstLimit) {
      // Remove the request we just added since it's not allowed
      await this.redis.zrem(key, requestId);
      await this.redis.zrem(burstKey, requestId);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(now + 5000), // Burst reset in 5 seconds
        retryAfter: 5,
      };
    }
    
    // Check main window limit
    if (currentCount > userConfig.limit) {
      // Remove the request we just added since it's not allowed
      await this.redis.zrem(key, requestId);
      await this.redis.zrem(burstKey, requestId);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(windowStart + userConfig.windowMs),
        retryAfter: Math.ceil((windowStart + userConfig.windowMs - now) / 1000),
      };
    }

    // Log the API usage for analytics
    await this.logApiUsage(userId, endpoint, userAgent, ipAddress);
    
    return {
      allowed: true,
      remaining: Math.max(0, userConfig.limit - currentCount),
      resetTime: new Date(windowStart + userConfig.windowMs),
    };
  }

  /**
   * Get rate limit configuration for a specific user and endpoint
   */
  private async getUserRateLimitConfig(userId: string, endpoint: string): Promise<UserRateLimitConfig> {
    // Check for user-specific rate limit rules
    const userRule = await this.prisma.rateLimitRule.findFirst({
      where: {
        user_id: userId,
        is_active: true,
        OR: [
          { pattern: endpoint },
          { pattern: { contains: this.extractEndpointPattern(endpoint) } },
        ],
      },
      orderBy: { created_at: 'desc' },
    });

    if (userRule) {
      return {
        userId,
        endpoint,
        limit: userRule.limit,
        windowMs: userRule.window_ms,
        burstLimit: this.defaultConfig.burstLimit,
      };
    }

    // Check for global endpoint-specific rules
    const globalRule = await this.prisma.rateLimitRule.findFirst({
      where: {
        user_id: null,
        is_active: true,
        OR: [
          { pattern: endpoint },
          { pattern: { contains: this.extractEndpointPattern(endpoint) } },
        ],
      },
      orderBy: { created_at: 'desc' },
    });

    if (globalRule) {
      return {
        userId,
        endpoint,
        limit: globalRule.limit,
        windowMs: globalRule.window_ms,
        burstLimit: this.defaultConfig.burstLimit,
      };
    }

    // Return default configuration
    return {
      userId,
      endpoint,
      limit: this.defaultConfig.limit,
      windowMs: this.defaultConfig.windowMs,
      burstLimit: this.defaultConfig.burstLimit,
    };
  }

  /**
   * Create a custom rate limit rule for a user
   */
  async createUserRateLimit(
    userId: string,
    name: string,
    pattern: string,
    limit: number,
    windowMs: number,
    description?: string,
  ) {
    return this.prisma.rateLimitRule.create({
      data: {
        name,
        description,
        pattern,
        user_id: userId,
        limit,
        window_ms: windowMs,
        is_active: true,
      },
    });
  }

  /**
   * Update user rate limit rule
   */
  async updateUserRateLimit(
    ruleId: string,
    userId: string,
    updates: {
      limit?: number;
      windowMs?: number;
      isActive?: boolean;
      pattern?: string;
      description?: string;
    },
  ) {
    return this.prisma.rateLimitRule.updateMany({
      where: {
        id: ruleId,
        user_id: userId,
      },
      data: {
        ...(updates.limit && { limit: updates.limit }),
        ...(updates.windowMs && { window_ms: updates.windowMs }),
        ...(updates.isActive !== undefined && { is_active: updates.isActive }),
        ...(updates.pattern && { pattern: updates.pattern }),
        ...(updates.description && { description: updates.description }),
      },
    });
  }

  /**
   * Get user's rate limit rules
   */
  async getUserRateLimits(userId: string) {
    return this.prisma.rateLimitRule.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Delete user rate limit rule
   */
  async deleteUserRateLimit(ruleId: string, userId: string) {
    return this.prisma.rateLimitRule.deleteMany({
      where: {
        id: ruleId,
        user_id: userId,
      },
    });
  }

  /**
   * Get rate limit usage stats for a user
   */
  async getUserRateLimitStats(userId: string, hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const usage = await this.prisma.apiUsage.findMany({
      where: {
        user_id: userId,
        created_at: { gte: since },
      },
      select: {
        endpoint: true,
        method: true,
        status_code: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // Group by endpoint and calculate stats
    const endpointStats = usage.reduce((acc, req) => {
      const key = `${req.method} ${req.endpoint}`;
      if (!acc[key]) {
        acc[key] = {
          endpoint: key,
          total: 0,
          success: 0,
          errors: 0,
          rateLimited: 0,
        };
      }
      
      acc[key].total++;
      
      if (req.status_code < 400) {
        acc[key].success++;
      } else if (req.status_code === 429) {
        acc[key].rateLimited++;
      } else {
        acc[key].errors++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(endpointStats);
  }

  /**
   * Clear rate limit for user (admin function)
   */
  async clearUserRateLimit(userId: string, endpoint?: string) {
    const pattern = endpoint ? this.createRateLimitKey(userId, endpoint) : `rate_limit:user:${userId}:*`;
    
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    
    return { cleared: keys.length };
  }

  /**
   * Get current rate limit status for user
   */
  async getRateLimitStatus(userId: string, endpoint: string): Promise<RateLimitResult> {
    const config = await this.getUserRateLimitConfig(userId, endpoint);
    const key = this.createRateLimitKey(userId, endpoint);
    
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Count current requests in window
    const currentCount = await this.redis.zcount(key, windowStart, now);
    
    return {
      allowed: currentCount < config.limit,
      remaining: Math.max(0, config.limit - currentCount),
      resetTime: new Date(windowStart + config.windowMs),
    };
  }

  private createRateLimitKey(userId: string, endpoint: string): string {
    const cleanEndpoint = this.extractEndpointPattern(endpoint);
    return `rate_limit:user:${userId}:${cleanEndpoint}`;
  }

  private extractEndpointPattern(endpoint: string): string {
    // Remove query parameters and normalize
    return endpoint.split('?')[0]
      .replace(/\/+/g, '/')
      .replace(/\/$/, '')
      .toLowerCase();
  }

  private async logApiUsage(
    userId: string,
    endpoint: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      await this.prisma.apiUsage.create({
        data: {
          user_id: userId,
          endpoint: this.extractEndpointPattern(endpoint),
          method: 'UNKNOWN', // This should be passed from the guard
          status_code: 200, // This should be updated after response
          response_time: 0, // This should be calculated
          ip_address: ipAddress,
        },
      });
    } catch (error) {
      console.error('Failed to log API usage:', error);
    }
  }
}