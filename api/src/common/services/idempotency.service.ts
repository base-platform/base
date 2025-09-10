import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import { IdempotencyKey, IdempotencyConfig } from '@prisma/client';

export interface IdempotencyRequest {
  key: string;
  endpoint: string;
  method: string;
  userId?: string;
  entityId?: string;
  request: any;
}

export interface IdempotencyResult {
  exists: boolean;
  status?: string;
  response?: any;
  statusCode?: number;
}

@Injectable()
export class IdempotencyService implements OnModuleInit {
  private readonly logger = new Logger(IdempotencyService.name);
  private configCache: Map<string, IdempotencyConfig> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.loadConfigurations();
  }

  async loadConfigurations() {
    try {
      const configs = await this.prisma.idempotencyConfig.findMany({
        where: { enabled: true },
      });
      
      this.configCache.clear();
      configs.forEach(config => {
        this.configCache.set(config.endpoint, config);
      });
      
      this.logger.log(`Loaded ${configs.length} idempotency configurations`);
    } catch (error) {
      this.logger.error('Failed to load idempotency configurations', error);
    }
  }

  async getConfiguration(endpoint: string): Promise<IdempotencyConfig | null> {
    // Check exact match first
    if (this.configCache.has(endpoint)) {
      return this.configCache.get(endpoint);
    }

    // Check for wildcard configuration
    if (this.configCache.has('*')) {
      return this.configCache.get('*');
    }

    // Check for pattern matches
    for (const [pattern, config] of this.configCache.entries()) {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        if (regex.test(endpoint)) {
          return config;
        }
      }
    }

    return null;
  }

  async checkIdempotency(request: IdempotencyRequest): Promise<IdempotencyResult> {
    try {
      const existingKey = await this.prisma.idempotencyKey.findUnique({
        where: { key: request.key },
      });

      if (!existingKey) {
        return { exists: false };
      }

      // Check if expired
      if (existingKey.expires_at < new Date()) {
        await this.prisma.idempotencyKey.delete({
          where: { key: request.key },
        });
        return { exists: false };
      }

      return {
        exists: true,
        status: existingKey.status,
        response: existingKey.response,
        statusCode: existingKey.status_code,
      };
    } catch (error) {
      this.logger.error(`Error checking idempotency for key ${request.key}:`, error);
      return { exists: false };
    }
  }

  async createIdempotencyKey(
    request: IdempotencyRequest,
    ttl: number = 86400000, // 24 hours default
  ): Promise<IdempotencyKey> {
    const expiresAt = new Date(Date.now() + ttl);

    return await this.prisma.idempotencyKey.create({
      data: {
        key: request.key,
        endpoint: request.endpoint,
        method: request.method,
        user_id: request.userId,
        entity_id: request.entityId,
        request: request.request,
        status: 'processing',
        expires_at: expiresAt,
      },
    });
  }

  async completeIdempotencyKey(
    key: string,
    response: any,
    statusCode: number,
  ): Promise<void> {
    try {
      await this.prisma.idempotencyKey.update({
        where: { key },
        data: {
          response,
          status_code: statusCode,
          status: 'completed',
          completed_at: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error completing idempotency key ${key}:`, error);
    }
  }

  async failIdempotencyKey(key: string, error: any): Promise<void> {
    try {
      await this.prisma.idempotencyKey.update({
        where: { key },
        data: {
          status: 'failed',
          response: { error: error.message || 'Unknown error' },
          completed_at: new Date(),
        },
      });
    } catch (err) {
      this.logger.error(`Error failing idempotency key ${key}:`, err);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredKeys() {
    try {
      const result = await this.prisma.idempotencyKey.deleteMany({
        where: {
          expires_at: {
            lt: new Date(),
          },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired idempotency keys`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up expired idempotency keys:', error);
    }
  }

  async getEntityIdempotencyConfig(entityName: string) {
    try {
      const entity = await this.prisma.entity.findUnique({
        where: { name: entityName },
        select: {
          idempotency_enabled: true,
          idempotency_ttl: true,
          idempotency_methods: true,
        },
      });

      return entity;
    } catch (error) {
      this.logger.error(`Error getting entity idempotency config for ${entityName}:`, error);
      return null;
    }
  }

  async createDefaultConfigurations() {
    const defaultConfigs = [
      {
        endpoint: '/auth/register',
        enabled: true,
        ttl: 86400000, // 24 hours
        methods: ['POST'],
        require_key: false,
      },
      {
        endpoint: '/auth/refresh',
        enabled: true,
        ttl: 60000, // 1 minute
        methods: ['POST'],
        require_key: false,
      },
      {
        endpoint: '/api-keys',
        enabled: true,
        ttl: 86400000, // 24 hours
        methods: ['POST'],
        require_key: false,
      },
      {
        endpoint: '/api-keys/*/rotate',
        enabled: true,
        ttl: 3600000, // 1 hour
        methods: ['POST'],
        require_key: true,
      },
      {
        endpoint: '/entities/*/records',
        enabled: true,
        ttl: 86400000, // 24 hours
        methods: ['POST', 'PUT'],
        require_key: false,
      },
    ];

    for (const config of defaultConfigs) {
      try {
        await this.prisma.idempotencyConfig.upsert({
          where: { endpoint: config.endpoint },
          update: config,
          create: config,
        });
      } catch (error) {
        this.logger.error(`Error creating default config for ${config.endpoint}:`, error);
      }
    }

    await this.loadConfigurations();
  }
}