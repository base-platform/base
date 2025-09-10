import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma/prisma.service';
import { SecuritySettingsService } from '../config/security-settings.service';
import { Prisma, RateLimitConfig } from '@prisma/client';

@Injectable()
export class RateLimitService implements OnModuleInit {
  private rateLimits: Map<string, RateLimitConfig> = new Map();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private securitySettings: SecuritySettingsService,
  ) {}

  async onModuleInit() {
    // Load rate limits from database or create defaults from environment variables
    await this.loadRateLimits();
  }

  async loadRateLimits() {
    try {
      // First, try to load from database
      const configs = await this.prisma.rateLimitConfig.findMany({
        where: { is_active: true },
        orderBy: { priority: 'desc' },
      });

      if (configs.length > 0) {
        // Use database configs
        configs.forEach(config => {
          this.rateLimits.set(config.name, config);
        });
      } else {
        // No configs in database, create from environment variables
        await this.createDefaultRateLimits();
      }
    } catch (error) {
      console.error('Error loading rate limits:', error);
      // Fallback to environment variables
      this.loadFromEnvironment();
    }
  }

  private async createDefaultRateLimits() {
    // Load rate limiting settings from database
    const defaultTTL = await this.securitySettings.getSetting<number>('rate_limiting.default_window_ms');
    const defaultLimit = await this.securitySettings.getSetting<number>('rate_limiting.default_max_requests');
    const authTTL = await this.securitySettings.getSetting<number>('rate_limiting.auth_window_ms');
    const authLimit = await this.securitySettings.getSetting<number>('rate_limiting.auth_max_requests');
    const apiTTL = await this.securitySettings.getSetting<number>('rate_limiting.api_window_ms');
    const apiLimit = await this.securitySettings.getSetting<number>('rate_limiting.api_max_requests');

    const defaultConfigs = [
      {
        name: 'default',
        description: 'Default rate limit for all endpoints',
        ttl: defaultTTL,
        limit: defaultLimit,
        endpoints: [],
        priority: 0,
      },
      {
        name: 'auth',
        description: 'Rate limit for authentication endpoints',
        ttl: authTTL,
        limit: authLimit,
        endpoints: ['/auth/login', '/auth/register', '/auth/refresh'],
        priority: 10,
      },
      {
        name: 'api',
        description: 'Rate limit for API endpoints',
        ttl: apiTTL,
        limit: apiLimit,
        endpoints: ['/api/*'],
        priority: 5,
      },
    ];

    for (const config of defaultConfigs) {
      const created = await this.prisma.rateLimitConfig.create({
        data: config,
      });
      this.rateLimits.set(created.name, created);
    }
  }

  private loadFromEnvironment() {
    // Fallback: Load directly from environment variables (without database)
    this.rateLimits.set('default', {
      id: 'env-default',
      name: 'default',
      description: 'Default rate limit from environment',
      ttl: this.configService.get<number>('RATE_LIMIT_DEFAULT_TTL', 60000),
      limit: this.configService.get<number>('RATE_LIMIT_DEFAULT_LIMIT', 1000),
      endpoints: [],
      is_active: true,
      priority: 0,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
      updated_by: null,
    });

    this.rateLimits.set('auth', {
      id: 'env-auth',
      name: 'auth',
      description: 'Auth rate limit from environment',
      ttl: this.configService.get<number>('RATE_LIMIT_AUTH_TTL', 900000),
      limit: this.configService.get<number>('RATE_LIMIT_AUTH_LIMIT', 20),
      endpoints: ['/auth/login', '/auth/register', '/auth/refresh'],
      is_active: true,
      priority: 10,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
      updated_by: null,
    });
  }

  getThrottlerOptions() {
    const throttlers = Array.from(this.rateLimits.values()).map(config => ({
      name: config.name,
      ttl: config.ttl,
      limit: config.limit,
    }));

    // Ensure we always have at least a default throttler
    if (throttlers.length === 0) {
      throttlers.push({
        name: 'default',
        ttl: 60000,
        limit: 1000,
      });
    }

    return { throttlers };
  }

  async getAllConfigs(): Promise<RateLimitConfig[]> {
    return this.prisma.rateLimitConfig.findMany({
      orderBy: { priority: 'desc' },
    });
  }

  async getConfig(name: string): Promise<RateLimitConfig | null> {
    return this.prisma.rateLimitConfig.findUnique({
      where: { name },
    });
  }

  async createConfig(data: Prisma.RateLimitConfigCreateInput): Promise<RateLimitConfig> {
    const config = await this.prisma.rateLimitConfig.create({ data });
    if (config.is_active) {
      this.rateLimits.set(config.name, config);
    }
    return config;
  }

  async updateConfig(
    name: string,
    data: Prisma.RateLimitConfigUpdateInput,
  ): Promise<RateLimitConfig> {
    const config = await this.prisma.rateLimitConfig.update({
      where: { name },
      data,
    });

    // Update in-memory cache
    if (config.is_active) {
      this.rateLimits.set(config.name, config);
    } else {
      this.rateLimits.delete(config.name);
    }

    return config;
  }

  async deleteConfig(name: string): Promise<void> {
    await this.prisma.rateLimitConfig.delete({
      where: { name },
    });
    this.rateLimits.delete(name);
  }

  async reloadConfigs(): Promise<void> {
    await this.loadRateLimits();
  }
}