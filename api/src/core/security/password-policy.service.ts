import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma/prisma.service';
import { SecuritySettingsService } from '../config/security-settings.service';
import * as bcrypt from 'bcrypt';

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  preventUserInfo: boolean;
  passwordHistoryCount: number;
  passwordExpiryDays: number;
  minPasswordAge: number; // Minimum days before password can be changed
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number;
}

@Injectable()
export class PasswordPolicyService {
  private readonly commonPasswords: Set<string>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly securitySettings: SecuritySettingsService,
  ) {
    // Load common passwords list
    this.commonPasswords = new Set([
      'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', 'letmein',
      'dragon', 'master', 'admin', 'welcome', 'password123', 'passw0rd', 'p@ssw0rd',
      'iloveyou', 'sunshine', 'princess', 'football', 'baseball', 'superman',
      '!@#$%^&*', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890', 'password1',
      'changeme', 'hello123', 'welcome123', 'admin123', 'root', 'toor', 'pass',
      'temp', 'temporary', 'test', 'test123', 'demo', 'demo123', 'oracle',
      'postgres', 'mysql', 'mongodb', 'redis', 'docker', 'kubernetes',
    ]);
  }

  /**
   * Validate a password against the policy
   */
  async validatePassword(
    password: string,
    userInfo?: {
      email?: string;
      username?: string;
      firstName?: string;
      lastName?: string;
    },
  ): Promise<PasswordValidationResult> {
    // Load policy settings from database
    const policy = {
      minLength: await this.securitySettings.getSetting<number>('password_policy.min_length'),
      requireUppercase: await this.securitySettings.getSetting<boolean>('password_policy.require_uppercase'),
      requireLowercase: await this.securitySettings.getSetting<boolean>('password_policy.require_lowercase'),
      requireNumbers: await this.securitySettings.getSetting<boolean>('password_policy.require_numbers'),
      requireSpecialChars: await this.securitySettings.getSetting<boolean>('password_policy.require_special_chars'),
      preventCommonPasswords: await this.securitySettings.getSetting<boolean>('password_policy.prevent_common_passwords'),
      preventUserInfo: await this.securitySettings.getSetting<boolean>('password_policy.prevent_user_info'),
      passwordHistoryCount: await this.securitySettings.getSetting<number>('password_policy.password_history_count'),
      passwordExpiryDays: await this.securitySettings.getSetting<number>('password_policy.password_expiry_days'),
      minPasswordAge: await this.securitySettings.getSetting<number>('password_policy.min_password_age_days'),
    };

    const errors: string[] = [];
    let score = 0;
    const maxScore = 100;

    // Length check
    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    } else {
      score += 20;
      // Bonus points for extra length
      score += Math.min(10, (password.length - policy.minLength) * 2);
    }

    // Uppercase check
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (/[A-Z]/.test(password)) {
      score += 10;
    }

    // Lowercase check
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (/[a-z]/.test(password)) {
      score += 10;
    }

    // Number check
    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else if (/\d/.test(password)) {
      score += 10;
    }

    // Special character check
    const specialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
    if (policy.requireSpecialChars && !specialChars.test(password)) {
      errors.push('Password must contain at least one special character');
    } else if (specialChars.test(password)) {
      score += 15;
    }

    // Check for common passwords
    if (policy.preventCommonPasswords) {
      const lowerPassword = password.toLowerCase();
      if (this.commonPasswords.has(lowerPassword)) {
        errors.push('Password is too common. Please choose a more unique password');
        score = Math.max(0, score - 30);
      }
    }

    // Check for user information in password
    if (policy.preventUserInfo && userInfo) {
      const lowerPassword = password.toLowerCase();
      const userInfoParts = [
        userInfo.email?.split('@')[0],
        userInfo.username,
        userInfo.firstName,
        userInfo.lastName,
      ].filter(Boolean).map(s => s!.toLowerCase());

      for (const part of userInfoParts) {
        if (part && part.length > 2 && lowerPassword.includes(part)) {
          errors.push('Password should not contain personal information');
          score = Math.max(0, score - 20);
          break;
        }
      }
    }

    // Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password should not contain repeated characters');
      score = Math.max(0, score - 10);
    }

    // Check for sequential characters
    if (this.hasSequentialChars(password)) {
      errors.push('Password should not contain sequential characters');
      score = Math.max(0, score - 10);
    }

    // Calculate entropy bonus
    const entropy = this.calculateEntropy(password);
    score += Math.min(25, Math.floor(entropy / 4));

    // Determine strength
    let strength: 'weak' | 'medium' | 'strong' | 'very-strong';
    if (score < 30) strength = 'weak';
    else if (score < 50) strength = 'medium';
    else if (score < 75) strength = 'strong';
    else strength = 'very-strong';

    return {
      isValid: errors.length === 0,
      errors,
      strength,
      score: Math.min(maxScore, score),
    };
  }

  /**
   * Check if password was used before
   */
  async checkPasswordHistory(userId: string, newPassword: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password_history: true },
    });

    if (!user || !user.password_history || !Array.isArray(user.password_history)) {
      return true; // No history to check
    }

    const passwordHistoryCount = await this.securitySettings.getSetting<number>('password_policy.password_history_count');
    const history = user.password_history as string[];
    const recentPasswords = history.slice(-passwordHistoryCount);

    // Check if new password matches any in history
    for (const oldHash of recentPasswords) {
      if (await bcrypt.compare(newPassword, oldHash)) {
        return false; // Password was used before
      }
    }

    return true; // Password is new
  }

  /**
   * Add password to history
   */
  async addToPasswordHistory(userId: string, passwordHash: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password_history: true },
    });

    const passwordHistoryCount = await this.securitySettings.getSetting<number>('password_policy.password_history_count');
    const currentHistory = (user?.password_history as string[]) || [];
    const newHistory = [...currentHistory, passwordHash].slice(-passwordHistoryCount);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password_history: newHistory,
        password_changed_at: new Date(),
      },
    });
  }

  /**
   * Check if password needs to be changed
   */
  async isPasswordExpired(userId: string): Promise<boolean> {
    const passwordExpiryDays = await this.securitySettings.getSetting<number>('password_policy.password_expiry_days');
    
    if (passwordExpiryDays <= 0) {
      return false; // No expiry policy
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password_changed_at: true },
    });

    if (!user?.password_changed_at) {
      return true; // No record of password change
    }

    const daysSinceChange = Math.floor(
      (Date.now() - user.password_changed_at.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceChange >= passwordExpiryDays;
  }

  /**
   * Check if password can be changed (minimum age)
   */
  async canChangePassword(userId: string): Promise<{ canChange: boolean; reason?: string }> {
    const minPasswordAge = await this.securitySettings.getSetting<number>('password_policy.min_password_age_days');
    
    if (minPasswordAge <= 0) {
      return { canChange: true };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password_changed_at: true },
    });

    if (!user?.password_changed_at) {
      return { canChange: true }; // No previous change
    }

    const daysSinceChange = Math.floor(
      (Date.now() - user.password_changed_at.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceChange < minPasswordAge) {
      return {
        canChange: false,
        reason: `Password can only be changed once every ${minPasswordAge} day(s)`,
      };
    }

    return { canChange: true };
  }

  /**
   * Generate a strong random password
   */
  async generateStrongPassword(length: number = 16): Promise<string> {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    // Load policy settings
    const requireUppercase = await this.securitySettings.getSetting<boolean>('password_policy.require_uppercase');
    const requireLowercase = await this.securitySettings.getSetting<boolean>('password_policy.require_lowercase');
    const requireNumbers = await this.securitySettings.getSetting<boolean>('password_policy.require_numbers');
    const requireSpecialChars = await this.securitySettings.getSetting<boolean>('password_policy.require_special_chars');
    
    let allChars = '';
    let password = '';

    // Ensure at least one of each required type
    if (requireUppercase) {
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
      allChars += uppercase;
    }
    if (requireLowercase) {
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
      allChars += lowercase;
    }
    if (requireNumbers) {
      password += numbers[Math.floor(Math.random() * numbers.length)];
      allChars += numbers;
    }
    if (requireSpecialChars) {
      password += special[Math.floor(Math.random() * special.length)];
      allChars += special;
    }

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Calculate password entropy
   */
  private calculateEntropy(password: string): number {
    const charsets = {
      lowercase: 26,
      uppercase: 26,
      numbers: 10,
      special: 32,
      extended: 94,
    };

    let poolSize = 0;
    if (/[a-z]/.test(password)) poolSize += charsets.lowercase;
    if (/[A-Z]/.test(password)) poolSize += charsets.uppercase;
    if (/\d/.test(password)) poolSize += charsets.numbers;
    if (/[^a-zA-Z0-9]/.test(password)) poolSize += charsets.special;

    return password.length * Math.log2(poolSize);
  }

  /**
   * Check for sequential characters
   */
  private hasSequentialChars(password: string): boolean {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      'zyxwvutsrqponmlkjihgfedcba',
      '01234567890',
      '09876543210',
      'qwertyuiop',
      'poiuytrewq',
      'asdfghjkl',
      'lkjhgfdsa',
      'zxcvbnm',
      'mnbvcxz',
    ];

    const lowerPassword = password.toLowerCase();
    for (const seq of sequences) {
      for (let i = 0; i < lowerPassword.length - 2; i++) {
        const substr = lowerPassword.substring(i, i + 3);
        if (seq.includes(substr)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get password policy for client
   */
  async getPolicy(): Promise<PasswordPolicy> {
    return {
      minLength: await this.securitySettings.getSetting<number>('password_policy.min_length'),
      requireUppercase: await this.securitySettings.getSetting<boolean>('password_policy.require_uppercase'),
      requireLowercase: await this.securitySettings.getSetting<boolean>('password_policy.require_lowercase'),
      requireNumbers: await this.securitySettings.getSetting<boolean>('password_policy.require_numbers'),
      requireSpecialChars: await this.securitySettings.getSetting<boolean>('password_policy.require_special_chars'),
      preventCommonPasswords: await this.securitySettings.getSetting<boolean>('password_policy.prevent_common_passwords'),
      preventUserInfo: await this.securitySettings.getSetting<boolean>('password_policy.prevent_user_info'),
      passwordHistoryCount: await this.securitySettings.getSetting<number>('password_policy.password_history_count'),
      passwordExpiryDays: await this.securitySettings.getSetting<number>('password_policy.password_expiry_days'),
      minPasswordAge: await this.securitySettings.getSetting<number>('password_policy.min_password_age_days'),
    };
  }
}