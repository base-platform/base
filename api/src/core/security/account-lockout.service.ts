import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma/prisma.service';
import { SecuritySettingsService } from '../config/security-settings.service';
import { User } from '@prisma/client';

@Injectable()
export class AccountLockoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly securitySettings: SecuritySettingsService,
  ) {}

  /**
   * Check if account is currently locked
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        account_locked_until: true,
        is_active: true,
      },
    });

    if (!user || !user.is_active) {
      return true; // Treat inactive or non-existent users as locked
    }

    if (!user.account_locked_until) {
      return false;
    }

    // Check if lockout period has expired
    if (new Date() > user.account_locked_until) {
      // Clear the lockout
      await this.clearLockout(userId);
      return false;
    }

    return true;
  }

  /**
   * Check if account is locked by email
   */
  async isAccountLockedByEmail(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        account_locked_until: true,
        is_active: true,
      },
    });

    if (!user || !user.is_active) {
      return true;
    }

    if (!user.account_locked_until) {
      return false;
    }

    if (new Date() > user.account_locked_until) {
      await this.clearLockout(user.id);
      return false;
    }

    return true;
  }

  /**
   * Record a failed login attempt
   */
  async recordFailedAttempt(email: string): Promise<{
    isLocked: boolean;
    attemptsRemaining: number;
    lockoutUntil?: Date;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    const maxFailedAttempts = await this.securitySettings.getSetting<number>('account_lockout.max_failed_attempts');
    const lockoutDuration = await this.securitySettings.getSetting<number>('account_lockout.lockout_duration_minutes');
    const attemptWindowMinutes = await this.securitySettings.getSetting<number>('account_lockout.reset_window_minutes');

    if (!user) {
      // Don't reveal if user exists
      return {
        isLocked: false,
        attemptsRemaining: maxFailedAttempts,
      };
    }

    // Check if we should reset the attempt counter (outside the window)
    const shouldResetAttempts = user.last_failed_login && 
      new Date().getTime() - user.last_failed_login.getTime() > 
      attemptWindowMinutes * 60 * 1000;

    const currentAttempts = shouldResetAttempts ? 1 : user.failed_login_attempts + 1;
    
    // Check if account should be locked
    const shouldLock = currentAttempts >= maxFailedAttempts;
    const lockoutUntil = shouldLock 
      ? new Date(Date.now() + lockoutDuration * 60 * 1000)
      : undefined;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: currentAttempts,
        last_failed_login: new Date(),
        account_locked_until: lockoutUntil,
      },
    });

    // Log the failed attempt for audit
    await this.logSecurityEvent(user.id, 'FAILED_LOGIN', {
      attempt: currentAttempts,
      locked: shouldLock,
    });

    return {
      isLocked: shouldLock,
      attemptsRemaining: Math.max(0, maxFailedAttempts - currentAttempts),
      lockoutUntil,
    };
  }

  /**
   * Clear failed login attempts on successful login
   */
  async clearFailedAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failed_login_attempts: 0,
        last_failed_login: null,
        account_locked_until: null,
      },
    });
  }

  /**
   * Clear account lockout (admin action)
   */
  async clearLockout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failed_login_attempts: 0,
        account_locked_until: null,
        last_failed_login: null,
      },
    });

    await this.logSecurityEvent(userId, 'LOCKOUT_CLEARED', {});
  }

  /**
   * Manually lock an account (admin action)
   */
  async lockAccount(userId: string, reason?: string, durationMinutes?: number): Promise<void> {
    const defaultLockoutDuration = await this.securitySettings.getSetting<number>('account_lockout.lockout_duration_minutes');
    const lockDuration = durationMinutes || defaultLockoutDuration;
    const lockoutUntil = new Date(Date.now() + lockDuration * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        account_locked_until: lockoutUntil,
      },
    });

    await this.logSecurityEvent(userId, 'ACCOUNT_LOCKED', {
      reason,
      duration: lockDuration,
    });
  }

  /**
   * Get lockout status for a user
   */
  async getLockoutStatus(userId: string): Promise<{
    isLocked: boolean;
    failedAttempts: number;
    lockoutUntil?: Date;
    lastFailedLogin?: Date;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        failed_login_attempts: true,
        account_locked_until: true,
        last_failed_login: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isLocked = user.account_locked_until && 
                    new Date() < user.account_locked_until;

    return {
      isLocked: !!isLocked,
      failedAttempts: user.failed_login_attempts,
      lockoutUntil: user.account_locked_until || undefined,
      lastFailedLogin: user.last_failed_login || undefined,
    };
  }

  /**
   * Log security events to audit log
   */
  private async logSecurityEvent(
    userId: string,
    action: string,
    details: any,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          user_id: userId,
          action,
          entity_type: 'USER_SECURITY',
          entity_id: userId,
          details,
          ip_address: null, // This should be passed from the request context
          user_agent: null, // This should be passed from the request context
        },
      });
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Failed to log security event:', error);
    }
  }
}