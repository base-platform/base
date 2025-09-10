import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma/prisma.service';
import { SecuritySettingsService } from '../config/security-settings.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto-js';

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export interface MfaVerificationResult {
  isValid: boolean;
  remainingBackupCodes?: number;
}

@Injectable()
export class MfaService {
  private readonly appName: string;
  private readonly encryptionKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly securitySettings: SecuritySettingsService,
  ) {
    this.appName = this.config.get<string>('APP_NAME', 'API Platform');
    this.encryptionKey = this.config.get<string>('MFA_ENCRYPTION_KEY') || 
                       this.config.get<string>('JWT_SECRET', 'default-key');
  }

  /**
   * Generate MFA setup for a user
   */
  async setupMfa(userId: string): Promise<MfaSetupResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, mfa_enabled: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.mfa_enabled) {
      throw new BadRequestException('MFA is already enabled for this user');
    }

    // Get MFA settings
    const secretLength = await this.securitySettings.getSetting<number>('mfa.secret_length');
    const backupCodesCount = await this.securitySettings.getSetting<number>('mfa.backup_codes_count');

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${this.appName} (${user.email})`,
      issuer: this.appName,
      length: secretLength,
    });

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(backupCodesCount);
    const encryptedBackupCodes = this.encryptBackupCodes(backupCodes);

    // Store encrypted secret and backup codes (temporarily)
    const encryptedSecret = this.encrypt(secret.base32);
    
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfa_secret: encryptedSecret,
        mfa_backup_codes: encryptedBackupCodes,
        mfa_enabled: false, // Not enabled until verified
      },
    });

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url!,
      qrCodeDataUrl,
      backupCodes,
    };
  }

  /**
   * Verify and enable MFA
   */
  async enableMfa(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfa_secret: true, mfa_enabled: true },
    });

    if (!user || !user.mfa_secret) {
      throw new BadRequestException('MFA setup not found. Please setup MFA first.');
    }

    if (user.mfa_enabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    // Get window tolerance setting
    const windowTolerance = await this.securitySettings.getSetting<number>('mfa.window_tolerance_seconds');
    const window = Math.ceil(windowTolerance / 30); // Convert seconds to time steps (30s each)

    // Decrypt secret
    const secret = this.decrypt(user.mfa_secret);
    
    // Verify token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window,
    });

    if (!verified) {
      throw new BadRequestException('Invalid MFA token');
    }

    // Enable MFA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfa_enabled: true,
        mfa_verified_at: new Date(),
      },
    });

    // Log security event
    await this.logSecurityEvent(userId, 'MFA_ENABLED', {});

    return true;
  }

  /**
   * Verify MFA token
   */
  async verifyMfaToken(userId: string, token: string): Promise<MfaVerificationResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        mfa_enabled: true, 
        mfa_secret: true, 
        mfa_backup_codes: true 
      },
    });

    if (!user || !user.mfa_enabled || !user.mfa_secret) {
      throw new UnauthorizedException('MFA is not enabled for this user');
    }

    // Get window tolerance setting
    const windowTolerance = await this.securitySettings.getSetting<number>('mfa.window_tolerance_seconds');
    const window = Math.ceil(windowTolerance / 30); // Convert seconds to time steps (30s each)

    // First try TOTP verification
    const secret = this.decrypt(user.mfa_secret);
    const totpVerified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window,
    });

    if (totpVerified) {
      return { isValid: true };
    }

    // If TOTP fails, try backup codes
    if (user.mfa_backup_codes && Array.isArray(user.mfa_backup_codes)) {
      const encryptedCodes = user.mfa_backup_codes as string[];
      const backupCodes = encryptedCodes.map(code => this.decrypt(code));
      
      const codeIndex = backupCodes.findIndex(code => code === token);
      
      if (codeIndex !== -1) {
        // Remove used backup code
        const updatedCodes = encryptedCodes.filter((_, index) => index !== codeIndex);
        
        await this.prisma.user.update({
          where: { id: userId },
          data: { mfa_backup_codes: updatedCodes },
        });

        // Log backup code usage
        await this.logSecurityEvent(userId, 'MFA_BACKUP_CODE_USED', {
          remaining_codes: updatedCodes.length,
        });

        return { 
          isValid: true, 
          remainingBackupCodes: updatedCodes.length 
        };
      }
    }

    // Log failed verification
    await this.logSecurityEvent(userId, 'MFA_VERIFICATION_FAILED', {});

    return { isValid: false };
  }

  /**
   * Disable MFA
   */
  async disableMfa(userId: string, token: string): Promise<boolean> {
    // Verify current MFA token before disabling
    const verification = await this.verifyMfaToken(userId, token);
    
    if (!verification.isValid) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfa_enabled: false,
        mfa_secret: null,
        mfa_backup_codes: null,
        mfa_verified_at: null,
      },
    });

    // Log security event
    await this.logSecurityEvent(userId, 'MFA_DISABLED', {});

    return true;
  }

  /**
   * Generate new backup codes
   */
  async generateNewBackupCodes(userId: string, token: string): Promise<string[]> {
    // Verify current MFA token
    const verification = await this.verifyMfaToken(userId, token);
    
    if (!verification.isValid) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    const backupCodesCount = await this.securitySettings.getSetting<number>('mfa.backup_codes_count');
    const newBackupCodes = this.generateBackupCodes(backupCodesCount);
    const encryptedCodes = this.encryptBackupCodes(newBackupCodes);

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfa_backup_codes: encryptedCodes },
    });

    // Log security event
    await this.logSecurityEvent(userId, 'MFA_BACKUP_CODES_REGENERATED', {});

    return newBackupCodes;
  }

  /**
   * Check if user has MFA enabled
   */
  async isMfaEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfa_enabled: true },
    });

    return user?.mfa_enabled || false;
  }

  /**
   * Get MFA status
   */
  async getMfaStatus(userId: string): Promise<{
    enabled: boolean;
    backupCodesCount: number;
    lastVerified?: Date;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        mfa_enabled: true, 
        mfa_backup_codes: true,
        mfa_verified_at: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const backupCodesCount = user.mfa_backup_codes 
      ? (user.mfa_backup_codes as string[]).length 
      : 0;

    return {
      enabled: user.mfa_enabled,
      backupCodesCount,
      lastVerified: user.mfa_verified_at || undefined,
    };
  }

  /**
   * Reset MFA (admin only)
   */
  async resetMfa(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfa_enabled: false,
        mfa_secret: null,
        mfa_backup_codes: null,
        mfa_verified_at: null,
      },
    });

    // Log security event
    await this.logSecurityEvent(userId, 'MFA_RESET_BY_ADMIN', {});
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-digit backup code
      const code = Math.random().toString().slice(2, 10);
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Encrypt backup codes
   */
  private encryptBackupCodes(codes: string[]): string[] {
    return codes.map(code => this.encrypt(code));
  }

  /**
   * Encrypt data
   */
  private encrypt(text: string): string {
    return crypto.AES.encrypt(text, this.encryptionKey).toString();
  }

  /**
   * Decrypt data
   */
  private decrypt(encryptedText: string): string {
    const bytes = crypto.AES.decrypt(encryptedText, this.encryptionKey);
    return bytes.toString(crypto.enc.Utf8);
  }

  /**
   * Log security events
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
          entity_type: 'USER_MFA',
          entity_id: userId,
          details,
          ip_address: null,
          user_agent: null,
        },
      });
    } catch (error) {
      console.error('Failed to log MFA security event:', error);
    }
  }
}