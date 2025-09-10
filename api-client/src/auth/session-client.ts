import { BaseApiClient } from '../core/base-client';
import { RequestOptions } from '../types';

export interface Session {
  id: string;
  userId: string;
  userAgent: string;
  ipAddress: string;
  fingerprint?: string;
  isActive: boolean;
  isTrusted: boolean;
  lastActivity: string;
  expiresAt: string;
  createdAt: string;
  location?: {
    city?: string;
    country?: string;
    region?: string;
  };
}

export interface CreateSessionRequest {
  fingerprint?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface SessionStats {
  activeSessions: number;
  trustedDevices: number;
  recentActivity: Array<{
    action: string;
    timestamp: string;
    ipAddress: string;
  }>;
}

export interface TrustedDevice {
  fingerprint: string;
  name?: string;
  userAgent: string;
  lastUsed: string;
  trustedAt: string;
}

/**
 * Client for Session management operations
 */
export class SessionClient extends BaseApiClient {
  /**
   * Get all sessions for the current user
   */
  async getSessions(options?: RequestOptions): Promise<Session[]> {
    return this.get<Session[]>('/auth/sessions', options);
  }

  /**
   * Create a new session
   */
  async createSession(data: CreateSessionRequest, options?: RequestOptions): Promise<Session> {
    return this.post<Session>('/auth/sessions', data, options);
  }

  /**
   * Get current session
   */
  async getCurrentSession(options?: RequestOptions): Promise<Session> {
    return this.get<Session>('/auth/sessions/current', options);
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string, options?: RequestOptions): Promise<void> {
    await this.delete(`/auth/sessions/${sessionId}`, options);
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllSessions(options?: RequestOptions): Promise<void> {
    await this.delete('/auth/sessions', options);
  }

  /**
   * Get session statistics
   */
  async getSessionStats(options?: RequestOptions): Promise<SessionStats> {
    return this.get<SessionStats>('/auth/sessions/stats', options);
  }

  /**
   * Get trusted devices
   */
  async getTrustedDevices(options?: RequestOptions): Promise<TrustedDevice[]> {
    return this.get<TrustedDevice[]>('/auth/sessions/trusted-devices', options);
  }

  /**
   * Trust current device
   */
  async trustDevice(deviceName?: string, options?: RequestOptions): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>('/auth/sessions/trust-device', { deviceName }, options);
  }

  /**
   * Remove trusted device
   */
  async removeTrustedDevice(fingerprint: string, options?: RequestOptions): Promise<void> {
    await this.delete(`/auth/sessions/trusted-devices/${fingerprint}`, options);
  }
}