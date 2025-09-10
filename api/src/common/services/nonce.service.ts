import { Injectable, UnauthorizedException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';

export interface NonceOptions {
  ttl?: number; // Time to live in milliseconds
  type?: 'jwt' | 'request';
  requireSignature?: boolean;
}

export interface NonceValidationResult {
  valid: boolean;
  reason?: string;
}

@Injectable()
export class NonceService implements OnModuleInit {
  private readonly logger = new Logger(NonceService.name);
  private readonly defaultJwtTtl = 900000; // 15 minutes for JWT nonces
  private readonly defaultRequestTtl = 300000; // 5 minutes for request nonces

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    this.logger.log('Nonce service initialized');
    // Start cleanup job
    this.cleanupExpiredNonces();
  }

  /**
   * Generate a new JWT nonce (JWT ID)
   */
  async generateJwtNonce(userId: string): Promise<string> {
    const jti = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + this.defaultJwtTtl);

    await this.prisma.nonce.create({
      data: {
        nonce: jti,
        type: 'jwt',
        user_id: userId,
        token_jti: jti,
        expires_at: expiresAt,
      },
    });

    return jti;
  }

  /**
   * Validate JWT nonce
   */
  async validateJwtNonce(jti: string, userId?: string): Promise<NonceValidationResult> {
    const nonce = await this.prisma.nonce.findUnique({
      where: { nonce: jti },
    });

    if (!nonce) {
      return { valid: false, reason: 'JWT nonce not found' };
    }

    if (nonce.type !== 'jwt') {
      return { valid: false, reason: 'Invalid nonce type' };
    }

    if (nonce.expires_at < new Date()) {
      return { valid: false, reason: 'JWT nonce expired' };
    }

    if (userId && nonce.user_id !== userId) {
      return { valid: false, reason: 'JWT nonce user mismatch' };
    }

    return { valid: true };
  }

  /**
   * Revoke JWT nonce (for logout or token invalidation)
   */
  async revokeJwtNonce(jti: string): Promise<void> {
    await this.prisma.nonce.deleteMany({
      where: { token_jti: jti },
    });
  }

  /**
   * Generate request nonce
   */
  async generateRequestNonce(
    userId?: string,
    endpoint?: string,
    method?: string,
  ): Promise<string> {
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.defaultRequestTtl);

    await this.prisma.nonce.create({
      data: {
        nonce,
        type: 'request',
        user_id: userId,
        endpoint,
        method,
        expires_at: expiresAt,
      },
    });

    return nonce;
  }

  /**
   * Validate and consume request nonce
   */
  async validateRequestNonce(
    nonce: string,
    endpoint?: string,
    method?: string,
    userId?: string,
  ): Promise<NonceValidationResult> {
    const existingNonce = await this.prisma.nonce.findUnique({
      where: { nonce },
    });

    // If nonce doesn't exist, it's a new client-generated nonce (first use)
    if (!existingNonce) {
      // Try to create the nonce record to prevent replay
      // Use a try-catch to handle race conditions
      try {
        const expiresAt = new Date(Date.now() + this.defaultRequestTtl);
        await this.prisma.nonce.create({
          data: {
            nonce,
            type: 'request',
            user_id: userId,
            endpoint,
            method,
            expires_at: expiresAt,
          },
        });
        return { valid: true };
      } catch (error) {
        // If creation fails (duplicate key), nonce was already used
        return { valid: false, reason: 'Nonce already used' };
      }
    }

    // If nonce already exists, it's been used - reject it
    return { valid: false, reason: 'Nonce already used' };
  }

  /**
   * Check if request nonce is required for endpoint
   */
  async isNonceRequired(endpoint: string, method: string, entityId?: string): Promise<boolean> {
    // Check entity-specific configuration first
    if (entityId) {
      const entityConfig = await this.prisma.nonceConfig.findUnique({
        where: { entity_id: entityId },
      });

      if (entityConfig) {
        return entityConfig.enabled && entityConfig.methods.includes(method);
      }
    }

    // Check endpoint-specific configuration
    const endpointConfig = await this.prisma.nonceConfig.findFirst({
      where: {
        endpoint: {
          in: [endpoint, endpoint.replace(/\/[^\/]+$/, '/*')], // Check exact and wildcard
        },
        enabled: true,
        methods: { has: method },
      },
      orderBy: { priority: 'desc' },
    });

    return !!endpointConfig;
  }

  /**
   * Get nonce configuration for entity or endpoint
   */
  async getNonceConfig(entityId?: string, endpoint?: string) {
    if (entityId) {
      return this.prisma.nonceConfig.findUnique({
        where: { entity_id: entityId },
      });
    }

    if (endpoint) {
      return this.prisma.nonceConfig.findUnique({
        where: { endpoint },
      });
    }

    return null;
  }

  /**
   * Create or update nonce configuration
   */
  async upsertNonceConfig(data: {
    entityId?: string;
    endpoint?: string;
    enabled: boolean;
    ttl?: number;
    methods?: string[];
    requireSignature?: boolean;
    priority?: number;
  }) {
    if (data.entityId) {
      return this.prisma.nonceConfig.upsert({
        where: { entity_id: data.entityId },
        create: {
          entity_id: data.entityId,
          enabled: data.enabled,
          ttl: data.ttl || this.defaultRequestTtl,
          methods: data.methods || ['POST', 'PUT', 'DELETE'],
          require_signature: data.requireSignature || false,
          priority: data.priority || 0,
        },
        update: {
          enabled: data.enabled,
          ttl: data.ttl,
          methods: data.methods,
          require_signature: data.requireSignature,
          priority: data.priority,
        },
      });
    }

    if (data.endpoint) {
      return this.prisma.nonceConfig.upsert({
        where: { endpoint: data.endpoint },
        create: {
          endpoint: data.endpoint,
          enabled: data.enabled,
          ttl: data.ttl || this.defaultRequestTtl,
          methods: data.methods || ['POST', 'PUT', 'DELETE'],
          require_signature: data.requireSignature || false,
          priority: data.priority || 0,
        },
        update: {
          enabled: data.enabled,
          ttl: data.ttl,
          methods: data.methods,
          require_signature: data.requireSignature,
          priority: data.priority,
        },
      });
    }

    throw new Error('Either entityId or endpoint must be provided');
  }

  /**
   * Generate HMAC signature for request
   */
  generateSignature(
    method: string,
    url: string,
    nonce: string,
    timestamp: number,
    body?: any,
    secret?: string,
  ): string {
    const signatureSecret = secret || this.config.get('NONCE_SECRET') || this.config.get('JWT_SECRET');
    const payload = `${method.toUpperCase()}:${url}:${nonce}:${timestamp}:${body ? JSON.stringify(body) : ''}`;
    
    return crypto
      .createHmac('sha256', signatureSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifySignature(
    signature: string,
    method: string,
    url: string,
    nonce: string,
    timestamp: number,
    body?: any,
    secret?: string,
  ): boolean {
    const expectedSignature = this.generateSignature(method, url, nonce, timestamp, body, secret);
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Clean up expired nonces
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredNonces() {
    try {
      const result = await this.prisma.nonce.deleteMany({
        where: {
          expires_at: {
            lt: new Date(),
          },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired nonces`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up expired nonces:', error);
    }
  }

  /**
   * Revoke all nonces for a user (e.g., on logout)
   */
  async revokeUserNonces(userId: string, type?: 'jwt' | 'request'): Promise<void> {
    const where: any = { user_id: userId };
    if (type) {
      where.type = type;
    }

    await this.prisma.nonce.deleteMany({ where });
  }
}