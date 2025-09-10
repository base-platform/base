import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SecuritySettingsService } from '../config/security-settings.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export interface ApiKeyRotationResult {
  oldKeyId: string;
  newKey: {
    id: string;
    name: string;
    key: string;
    expiresAt?: Date;
  };
  rotatedAt: Date;
}

export interface ApiKeyUsageStats {
  keyId: string;
  totalRequests: number;
  lastUsedAt?: Date;
  createdAt: Date;
  status: string;
  daysUntilExpiration?: number;
}

@Injectable()
export class ApiKeyRotationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly securitySettings: SecuritySettingsService,
  ) {}

  /**
   * Manually rotate an API key
   */
  async rotateApiKey(userId: string, keyId: string, newName?: string): Promise<ApiKeyRotationResult> {
    const existingKey = await this.prisma.apiKey.findFirst({
      where: {
        id: keyId,
        user_id: userId,
        status: 'active',
      },
    });

    if (!existingKey) {
      throw new BadRequestException('API key not found or already revoked');
    }

    // Generate new API key
    const newApiKey = uuidv4();
    const hashedKey = await bcrypt.hash(newApiKey, 10);

    // Create new key with same permissions and expiration logic
    const newKey = await this.prisma.apiKey.create({
      data: {
        name: newName || `${existingKey.name} (Rotated)`,
        key_hash: hashedKey,
        key_prefix: newApiKey.substring(0, 8),
        user_id: userId,
        permissions: existingKey.permissions,
        expires_at: existingKey.expires_at ? 
          new Date(Date.now() + (existingKey.expires_at.getTime() - existingKey.created_at.getTime())) : 
          null,
      },
    });

    // Mark old key as rotated (keep for audit purposes)
    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { 
        status: 'rotated',
        rotated_at: new Date(),
        rotated_to: newKey.id,
      },
    });

    // Log the rotation
    await this.logSecurityEvent(userId, 'API_KEY_ROTATED', {
      old_key_id: keyId,
      new_key_id: newKey.id,
      rotated_manually: true,
    });

    return {
      oldKeyId: keyId,
      newKey: {
        id: newKey.id,
        name: newKey.name,
        key: newApiKey,
        expiresAt: newKey.expires_at,
      },
      rotatedAt: new Date(),
    };
  }

  /**
   * Get API keys that need rotation (approaching expiration)
   */
  async getKeysNeedingRotation(userId?: string): Promise<ApiKeyUsageStats[]> {
    const rotationWarningDays = await this.securitySettings.getSetting<number>('api_keys.rotation_warning_days');
    const warningDate = new Date(Date.now() + (rotationWarningDays * 24 * 60 * 60 * 1000));
    
    const keys = await this.prisma.apiKey.findMany({
      where: {
        ...(userId && { user_id: userId }),
        status: 'active',
        OR: [
          { expires_at: { lte: warningDate, not: null } },
          { last_used_at: { lte: new Date(Date.now() - (90 * 24 * 60 * 60 * 1000)) } }, // 90 days old
        ],
      },
      include: {
        _count: {
          select: {
            usage_logs: true,
          },
        },
      },
    });

    return keys.map(key => ({
      keyId: key.id,
      totalRequests: key._count.usage_logs,
      lastUsedAt: key.last_used_at,
      createdAt: key.created_at,
      status: key.status,
      daysUntilExpiration: key.expires_at ? 
        Math.ceil((key.expires_at.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 
        undefined,
    }));
  }

  /**
   * Get usage statistics for API keys
   */
  async getApiKeyUsageStats(userId: string): Promise<ApiKeyUsageStats[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: {
        user_id: userId,
        status: { in: ['active', 'rotated'] },
      },
      include: {
        _count: {
          select: {
            usage_logs: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return keys.map(key => ({
      keyId: key.id,
      totalRequests: key._count.usage_logs,
      lastUsedAt: key.last_used_at,
      createdAt: key.created_at,
      status: key.status,
      daysUntilExpiration: key.expires_at ? 
        Math.ceil((key.expires_at.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 
        undefined,
    }));
  }

  /**
   * Bulk rotate API keys for a user
   */
  async bulkRotateKeys(userId: string, keyIds: string[]): Promise<ApiKeyRotationResult[]> {
    const results: ApiKeyRotationResult[] = [];

    for (const keyId of keyIds) {
      try {
        const result = await this.rotateApiKey(userId, keyId);
        results.push(result);
      } catch (error) {
        console.error(`Failed to rotate key ${keyId}:`, error);
        // Continue with other keys
      }
    }

    return results;
  }

  /**
   * Delete old rotated keys (cleanup)
   */
  async cleanupOldKeys(olderThanDays: number = 365): Promise<number> {
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    
    const result = await this.prisma.apiKey.deleteMany({
      where: {
        status: 'rotated',
        rotated_at: { lte: cutoffDate },
      },
    });

    await this.logSecurityEvent(null, 'API_KEYS_CLEANUP', {
      keys_deleted: result.count,
      older_than_days: olderThanDays,
    });

    return result.count;
  }

  /**
   * Force expire API key
   */
  async expireApiKey(userId: string, keyId: string, reason?: string): Promise<void> {
    const key = await this.prisma.apiKey.findFirst({
      where: {
        id: keyId,
        user_id: userId,
        status: 'active',
      },
    });

    if (!key) {
      throw new BadRequestException('API key not found or already expired');
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { 
        status: 'expired',
        expires_at: new Date(), // Set expiration to now
      },
    });

    await this.logSecurityEvent(userId, 'API_KEY_EXPIRED', {
      key_id: keyId,
      reason: reason || 'Manual expiration',
    });
  }

  /**
   * Scheduled task to check for keys needing rotation
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async checkKeysForRotation(): Promise<void> {
    const autoRotationEnabled = await this.securitySettings.getSetting<boolean>('api_keys.auto_rotation_enabled');
    
    if (!autoRotationEnabled) {
      return;
    }

    console.log('Checking API keys for rotation...');

    const keysNeedingRotation = await this.getKeysNeedingRotation();
    
    for (const keyStats of keysNeedingRotation) {
      try {
        // Only auto-rotate if key expires in less than 7 days
        if (keyStats.daysUntilExpiration && keyStats.daysUntilExpiration <= 7) {
          const key = await this.prisma.apiKey.findUnique({
            where: { id: keyStats.keyId },
          });
          
          if (key) {
            await this.rotateApiKey(key.user_id, keyStats.keyId, `${key.name} (Auto-Rotated)`);
            console.log(`Auto-rotated API key ${keyStats.keyId} for user ${key.user_id}`);
          }
        }
      } catch (error) {
        console.error(`Failed to auto-rotate key ${keyStats.keyId}:`, error);
      }
    }
  }

  /**
   * Scheduled cleanup of old rotated keys
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async scheduledCleanup(): Promise<void> {
    console.log('Running scheduled API key cleanup...');
    
    const deletedCount = await this.cleanupOldKeys(365); // Delete keys older than 1 year
    
    console.log(`Cleaned up ${deletedCount} old API keys`);
  }

  /**
   * Get rotation history for a user
   */
  async getRotationHistory(userId: string, limit: number = 50) {
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        user_id: userId,
        action: { in: ['API_KEY_ROTATED', 'API_KEY_EXPIRED', 'API_KEY_CREATED'] },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return auditLogs.map(log => ({
      action: log.action,
      details: log.details,
      timestamp: log.created_at,
      ipAddress: log.ip_address,
    }));
  }

  private async logSecurityEvent(
    userId: string | null,
    action: string,
    details: any,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          user_id: userId,
          action,
          entity_type: 'API_KEY',
          entity_id: details.key_id || details.new_key_id || null,
          details,
          ip_address: null,
          user_agent: null,
        },
      });
    } catch (error) {
      console.error('Failed to log API key security event:', error);
    }
  }
}