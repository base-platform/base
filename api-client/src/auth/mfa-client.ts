import { BaseApiClient } from '../core/base-client';
import { RequestOptions } from '../types';

export interface MFASetupResponse {
  secret: string;
  qrCode: string;
  backupCodes?: string[];
}

export interface MFAEnableRequest {
  token: string;
  secret: string;
}

export interface MFAVerifyRequest {
  token: string;
}

export interface MFABackupCodesResponse {
  backupCodes: string[];
}

export interface MFAStatus {
  enabled: boolean;
  hasBackupCodes: boolean;
  lastUsed?: string;
}

/**
 * Client for Multi-Factor Authentication operations
 */
export class MFAClient extends BaseApiClient {
  /**
   * Set up MFA for the current user
   */
  async setup(options?: RequestOptions): Promise<MFASetupResponse> {
    return this.get<MFASetupResponse>('/auth/mfa/setup', options);
  }

  /**
   * Enable MFA with TOTP token verification
   */
  async enable(data: MFAEnableRequest, options?: RequestOptions): Promise<{ backupCodes: string[] }> {
    return this.post<{ backupCodes: string[] }>('/auth/mfa/enable', data, options);
  }

  /**
   * Verify MFA token
   */
  async verify(data: MFAVerifyRequest, options?: RequestOptions): Promise<{ valid: boolean }> {
    return this.post<{ valid: boolean }>('/auth/mfa/verify', data, options);
  }

  /**
   * Disable MFA for the current user
   */
  async disable(password: string, options?: RequestOptions): Promise<void> {
    // Use POST method instead of DELETE with body, as DELETE typically doesn't support request body
    await this.post('/auth/mfa/disable', { password }, options);
  }

  /**
   * Generate new backup codes
   */
  async generateBackupCodes(password: string, options?: RequestOptions): Promise<MFABackupCodesResponse> {
    return this.post<MFABackupCodesResponse>('/auth/mfa/backup-codes', { password }, options);
  }

  /**
   * Get MFA status for the current user
   */
  async getStatus(options?: RequestOptions): Promise<MFAStatus> {
    return this.get<MFAStatus>('/auth/mfa/status', options);
  }
}