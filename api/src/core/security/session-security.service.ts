import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SecuritySettingsService } from '../config/security-settings.service';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import * as crypto from 'crypto';

export interface SessionInfo {
  sessionId: string;
  userId: string;
  deviceInfo: {
    userAgent: string;
    ipAddress: string;
    fingerprint?: string;
    platform?: string;
    browser?: string;
  };
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  isActive: boolean;
  isTrusted: boolean;
}

export interface DeviceFingerprint {
  userAgent: string;
  acceptLanguage?: string;
  acceptEncoding?: string;
  timezone?: string;
  screenResolution?: string;
  colorDepth?: number;
  platform?: string;
  hash: string;
}

@Injectable()
export class SessionSecurityService {
  private redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly securitySettings: SecuritySettingsService,
    private readonly jwt: JwtService,
  ) {
    this.redis = new Redis(this.config.get<string>('REDIS_URL') || 'redis://localhost:6379');
  }

  /**
   * Create a new session with security tracking
   */
  async createSession(
    userId: string,
    userAgent: string,
    ipAddress: string,
    deviceFingerprint?: Partial<DeviceFingerprint>,
  ): Promise<SessionInfo> {
    // Get session settings
    const sessionTTLHours = await this.securitySettings.getSetting<number>('session_security.session_timeout_hours');
    const sessionTTL = sessionTTLHours * 60 * 60; // Convert to seconds

    // Generate session ID
    const sessionId = crypto.randomUUID();
    
    // Parse device info
    const deviceInfo = this.parseDeviceInfo(userAgent);
    
    // Create device fingerprint
    const fingerprint = this.createDeviceFingerprint(userAgent, deviceFingerprint);
    
    // Check if device is trusted
    const isTrusted = await this.isDeviceTrusted(userId, fingerprint.hash);
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + sessionTTL * 1000);

    const sessionInfo: SessionInfo = {
      sessionId,
      userId,
      deviceInfo: {
        ...deviceInfo,
        fingerprint: fingerprint.hash,
        ipAddress,
      },
      createdAt: now,
      lastActiveAt: now,
      expiresAt,
      isActive: true,
      isTrusted,
    };

    // Store session in Redis
    await this.storeSession(sessionInfo);
    
    // Update user's active sessions in database
    await this.updateUserActiveSessions(userId);
    
    // Enforce concurrent session limits
    await this.enforceConcurrentSessionLimits(userId);
    
    // Log session creation
    await this.logSecurityEvent(userId, 'SESSION_CREATED', {
      session_id: sessionId,
      device_fingerprint: fingerprint.hash,
      ip_address: ipAddress,
      is_trusted: isTrusted,
    });

    return sessionInfo;
  }

  /**
   * Validate and refresh session
   */
  async validateSession(sessionId: string, userAgent: string, ipAddress: string): Promise<SessionInfo | null> {
    const sessionInfo = await this.getSession(sessionId);
    
    if (!sessionInfo || !sessionInfo.isActive || sessionInfo.expiresAt < new Date()) {
      if (sessionInfo) {
        await this.terminateSession(sessionId, 'expired');
      }
      return null;
    }

    // Check for suspicious activity
    const suspicious = await this.detectSuspiciousActivity(sessionInfo, userAgent, ipAddress);
    
    if (suspicious) {
      await this.terminateSession(sessionId, 'suspicious_activity');
      await this.logSecurityEvent(sessionInfo.userId, 'SESSION_SUSPICIOUS', {
        session_id: sessionId,
        reason: 'Device or location changed',
        old_ip: sessionInfo.deviceInfo.ipAddress,
        new_ip: ipAddress,
        old_ua: sessionInfo.deviceInfo.userAgent,
        new_ua: userAgent,
      });
      throw new UnauthorizedException('Session terminated due to suspicious activity');
    }

    // Update last active time
    sessionInfo.lastActiveAt = new Date();
    await this.storeSession(sessionInfo);

    return sessionInfo;
  }

  /**
   * Terminate a specific session
   */
  async terminateSession(sessionId: string, reason: string = 'manual'): Promise<void> {
    const sessionInfo = await this.getSession(sessionId);
    
    if (sessionInfo) {
      // Mark as inactive in Redis
      sessionInfo.isActive = false;
      await this.storeSession(sessionInfo);
      
      // Remove from Redis after a short delay (for audit purposes)
      setTimeout(() => this.redis.del(`session:${sessionId}`), 5000);
      
      // Update user's active sessions
      await this.updateUserActiveSessions(sessionInfo.userId);
      
      // Log termination
      await this.logSecurityEvent(sessionInfo.userId, 'SESSION_TERMINATED', {
        session_id: sessionId,
        reason,
      });
    }
  }

  /**
   * Terminate all sessions for a user
   */
  async terminateAllUserSessions(userId: string, excludeSessionId?: string): Promise<number> {
    const sessionIds = await this.getUserSessionIds(userId);
    let terminatedCount = 0;

    for (const sessionId of sessionIds) {
      if (sessionId !== excludeSessionId) {
        await this.terminateSession(sessionId, 'terminate_all');
        terminatedCount++;
      }
    }

    await this.logSecurityEvent(userId, 'ALL_SESSIONS_TERMINATED', {
      terminated_count: terminatedCount,
      excluded_session: excludeSessionId,
    });

    return terminatedCount;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const sessionIds = await this.getUserSessionIds(userId);
    const sessions: SessionInfo[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session && session.isActive && session.expiresAt > new Date()) {
        sessions.push(session);
      } else if (session) {
        // Clean up expired session
        await this.terminateSession(sessionId, 'expired');
      }
    }

    return sessions.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
  }

  /**
   * Trust a device for a user
   */
  async trustDevice(userId: string, deviceFingerprint: string): Promise<void> {
    const deviceTrustDays = await this.securitySettings.getSetting<number>('session_security.trusted_device_duration_days');
    const key = `trusted_device:${userId}:${deviceFingerprint}`;
    const expirationSeconds = deviceTrustDays * 24 * 60 * 60;
    
    await this.redis.setex(key, expirationSeconds, JSON.stringify({
      trusted_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + expirationSeconds * 1000).toISOString(),
    }));

    await this.logSecurityEvent(userId, 'DEVICE_TRUSTED', {
      device_fingerprint: deviceFingerprint,
      expires_in_days: deviceTrustDays,
    });
  }

  /**
   * Remove device trust
   */
  async untrustDevice(userId: string, deviceFingerprint: string): Promise<void> {
    const key = `trusted_device:${userId}:${deviceFingerprint}`;
    await this.redis.del(key);

    await this.logSecurityEvent(userId, 'DEVICE_UNTRUSTED', {
      device_fingerprint: deviceFingerprint,
    });
  }

  /**
   * Get trusted devices for a user
   */
  async getTrustedDevices(userId: string): Promise<Array<{
    fingerprint: string;
    trustedAt: Date;
    expiresAt: Date;
  }>> {
    const pattern = `trusted_device:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    const devices = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        const fingerprint = key.split(':').pop()!;
        
        devices.push({
          fingerprint,
          trustedAt: new Date(parsed.trusted_at),
          expiresAt: new Date(parsed.expires_at),
        });
      }
    }

    return devices;
  }

  /**
   * Get session statistics for a user
   */
  async getSessionStats(userId: string, days: number = 30): Promise<{
    totalSessions: number;
    activeSessions: number;
    uniqueDevices: number;
    uniqueIPs: number;
    suspiciousActivity: number;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        user_id: userId,
        action: { in: ['SESSION_CREATED', 'SESSION_SUSPICIOUS'] },
        created_at: { gte: since },
      },
    });

    const activeSessions = await this.getUserSessions(userId);
    const sessionCreations = auditLogs.filter(log => log.action === 'SESSION_CREATED');
    const suspiciousActivities = auditLogs.filter(log => log.action === 'SESSION_SUSPICIOUS');

    const uniqueDevices = new Set(
      sessionCreations.map(log => (log.details as any)?.device_fingerprint).filter(Boolean)
    ).size;

    const uniqueIPs = new Set(
      sessionCreations.map(log => (log.details as any)?.ip_address).filter(Boolean)
    ).size;

    return {
      totalSessions: sessionCreations.length,
      activeSessions: activeSessions.length,
      uniqueDevices,
      uniqueIPs,
      suspiciousActivity: suspiciousActivities.length,
    };
  }

  private async storeSession(sessionInfo: SessionInfo): Promise<void> {
    const sessionTTLHours = await this.securitySettings.getSetting<number>('session_security.session_timeout_hours');
    const sessionTTL = sessionTTLHours * 60 * 60; // Convert to seconds
    
    const key = `session:${sessionInfo.sessionId}`;
    await this.redis.setex(key, sessionTTL, JSON.stringify({
      ...sessionInfo,
      createdAt: sessionInfo.createdAt.toISOString(),
      lastActiveAt: sessionInfo.lastActiveAt.toISOString(),
      expiresAt: sessionInfo.expiresAt.toISOString(),
    }));

    // Also maintain a set of active sessions per user
    const userSessionsKey = `user_sessions:${sessionInfo.userId}`;
    await this.redis.sadd(userSessionsKey, sessionInfo.sessionId);
    await this.redis.expire(userSessionsKey, sessionTTL);
  }

  private async getSession(sessionId: string): Promise<SessionInfo | null> {
    const key = `session:${sessionId}`;
    const data = await this.redis.get(key);
    
    if (!data) return null;

    const parsed = JSON.parse(data);
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      lastActiveAt: new Date(parsed.lastActiveAt),
      expiresAt: new Date(parsed.expiresAt),
    };
  }

  private async getUserSessionIds(userId: string): Promise<string[]> {
    const key = `user_sessions:${userId}`;
    return this.redis.smembers(key);
  }

  private async updateUserActiveSessions(userId: string): Promise<void> {
    const activeSessions = await this.getUserSessions(userId);
    const activeSessionsData = activeSessions.map(session => ({
      sessionId: session.sessionId,
      deviceInfo: session.deviceInfo,
      lastActiveAt: session.lastActiveAt,
    }));

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        active_sessions: activeSessionsData,
      },
    });
  }

  private async enforceConcurrentSessionLimits(userId: string): Promise<void> {
    const maxConcurrentSessions = await this.securitySettings.getSetting<number>('session_security.max_concurrent_sessions');
    const sessions = await this.getUserSessions(userId);
    
    if (sessions.length > maxConcurrentSessions) {
      // Terminate oldest sessions
      const sessionsToTerminate = sessions
        .sort((a, b) => a.lastActiveAt.getTime() - b.lastActiveAt.getTime())
        .slice(0, sessions.length - maxConcurrentSessions);

      for (const session of sessionsToTerminate) {
        await this.terminateSession(session.sessionId, 'session_limit_exceeded');
      }
    }
  }

  private createDeviceFingerprint(
    userAgent: string,
    additionalData?: Partial<DeviceFingerprint>,
  ): DeviceFingerprint {
    const fingerprintData = {
      userAgent,
      acceptLanguage: additionalData?.acceptLanguage || '',
      acceptEncoding: additionalData?.acceptEncoding || '',
      timezone: additionalData?.timezone || '',
      screenResolution: additionalData?.screenResolution || '',
      colorDepth: additionalData?.colorDepth || 0,
      platform: additionalData?.platform || '',
    };

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(fingerprintData))
      .digest('hex');

    return {
      ...fingerprintData,
      hash,
    };
  }

  private parseDeviceInfo(userAgent: string): {
    userAgent: string;
    platform?: string;
    browser?: string;
  } {
    // Simple user agent parsing - in production, use a library like 'ua-parser-js'
    const platform = userAgent.includes('Windows') ? 'Windows' :
                    userAgent.includes('Mac') ? 'Mac' :
                    userAgent.includes('Linux') ? 'Linux' :
                    userAgent.includes('Android') ? 'Android' :
                    userAgent.includes('iOS') ? 'iOS' : 'Unknown';

    const browser = userAgent.includes('Chrome') ? 'Chrome' :
                   userAgent.includes('Firefox') ? 'Firefox' :
                   userAgent.includes('Safari') ? 'Safari' :
                   userAgent.includes('Edge') ? 'Edge' : 'Unknown';

    return {
      userAgent,
      platform,
      browser,
    };
  }

  private async isDeviceTrusted(userId: string, deviceFingerprint: string): Promise<boolean> {
    const key = `trusted_device:${userId}:${deviceFingerprint}`;
    const data = await this.redis.get(key);
    return !!data;
  }

  private async detectSuspiciousActivity(
    session: SessionInfo,
    currentUserAgent: string,
    currentIpAddress: string,
  ): Promise<boolean> {
    // Check if user agent changed significantly
    if (session.deviceInfo.userAgent !== currentUserAgent) {
      // Allow minor changes (version updates) but not major changes
      const oldUA = session.deviceInfo.userAgent.toLowerCase();
      const newUA = currentUserAgent.toLowerCase();
      
      const oldBrowser = this.parseDeviceInfo(oldUA).browser;
      const newBrowser = this.parseDeviceInfo(newUA).browser;
      
      if (oldBrowser !== newBrowser) {
        return true; // Different browser is suspicious
      }
    }

    // Check if IP address changed (simple check - in production, use GeoIP)
    if (session.deviceInfo.ipAddress !== currentIpAddress) {
      // For now, just log this but don't consider it suspicious
      // In production, you might check if it's a different country/region
    }

    return false;
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
          entity_type: 'SESSION',
          entity_id: details.session_id || null,
          details,
          ip_address: details.ip_address || null,
          user_agent: details.user_agent || null,
        },
      });
    } catch (error) {
      console.error('Failed to log session security event:', error);
    }
  }
}