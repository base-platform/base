import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../core/database/prisma/prisma.service';
import { AccountLockoutService } from '../core/security/account-lockout.service';
import { MfaService } from '../core/security/mfa.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto, LoginDto, CreateApiKeyDto } from './dto/auth.dto';
import { LoginWithMfaDto } from './dto/mfa.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private lockoutService: AccountLockoutService,
    private mfaService: MfaService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          { username: dto.username },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password_hash: hashedPassword,
        username: dto.username,
        first_name: dto.firstName,
        last_name: dto.lastName,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(dto: LoginDto) {
    // First check if account is locked
    const isLocked = await this.lockoutService.isAccountLockedByEmail(dto.email);
    if (isLocked) {
      throw new ForbiddenException('Account is locked due to multiple failed login attempts. Please try again later.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password_hash) {
      // Record failed attempt even if user doesn't exist (prevent user enumeration)
      await this.lockoutService.recordFailedAttempt(dto.email);
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);

    if (!passwordValid) {
      // Record failed login attempt
      const lockoutResult = await this.lockoutService.recordFailedAttempt(dto.email);
      
      if (lockoutResult.isLocked) {
        throw new ForbiddenException('Account has been locked due to multiple failed login attempts.');
      }
      
      throw new UnauthorizedException(
        lockoutResult.attemptsRemaining > 0 
          ? `Invalid credentials. ${lockoutResult.attemptsRemaining} attempts remaining.`
          : 'Invalid credentials'
      );
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Check if MFA is enabled
    const mfaEnabled = await this.mfaService.isMfaEnabled(user.id);
    
    if (mfaEnabled) {
      // Return a partial response indicating MFA is required
      return {
        requiresMfa: true,
        tempToken: await this.generateTempToken(user.id, user.email),
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    }

    // Clear failed attempts on successful login
    await this.lockoutService.clearFailedAttempts(user.id);

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    // First, decode the refresh token to get the user ID
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('JWT_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = payload.sub;
    if (!userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find all refresh tokens for this user
    const tokens = await this.prisma.refreshToken.findMany({
      where: { user_id: userId },
      include: { user: true },
    });

    if (!tokens || tokens.length === 0) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if any of the stored hashed tokens match the provided token
    let validToken = null;
    for (const token of tokens) {
      const isValid = await bcrypt.compare(refreshToken, token.token_hash);
      if (isValid) {
        validToken = token;
        break;
      }
    }

    if (!validToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (validToken.expires_at < new Date()) {
      await this.prisma.refreshToken.delete({
        where: { id: validToken.id },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    const newTokens = await this.generateTokens(validToken.user.id, validToken.user.email);
    await this.updateRefreshToken(validToken.user.id, newTokens.refreshToken);

    return newTokens;
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { user_id: userId },
    });
    return { message: 'Logged out successfully' };
  }

  async createApiKey(userId: string, dto: CreateApiKeyDto) {
    const apiKey = uuidv4();
    const hashedKey = await bcrypt.hash(apiKey, 10);

    const key = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        key_hash: hashedKey,
        key_prefix: apiKey.substring(0, 8),
        user_id: userId,
        permissions: dto.permissions || [],
        expires_at: dto.expiresAt,
      },
    });

    return {
      id: key.id,
      name: key.name,
      key: apiKey,
      expiresAt: key.expires_at,
    };
  }

  async revokeApiKey(userId: string, keyId: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: {
        id: keyId,
        user_id: userId,
      },
    });

    if (!key) {
      throw new UnauthorizedException('API key not found');
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { status: 'revoked' },
    });

    return { message: 'API key revoked successfully' };
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    
    // Delete old refresh tokens for this user
    await this.prisma.refreshToken.deleteMany({
      where: { user_id: userId },
    });

    // Create new refresh token
    await this.prisma.refreshToken.create({
      data: {
        token_hash: hashedToken,
        user_id: userId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  }

  private async generateTempToken(userId: string, email: string): Promise<string> {
    const payload = { sub: userId, email, temp: true };
    
    return this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: '10m', // Temporary token expires in 10 minutes
    });
  }

  async loginWithMfa(tempToken: string, mfaToken: string) {
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(tempToken, {
        secret: this.config.get('JWT_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired temporary token');
    }

    if (!payload.temp) {
      throw new UnauthorizedException('Invalid temporary token');
    }

    const userId = payload.sub;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('User not found or disabled');
    }

    // Verify MFA token
    const mfaResult = await this.mfaService.verifyMfaToken(userId, mfaToken);
    
    if (!mfaResult.isValid) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    // Clear failed attempts on successful MFA login
    await this.lockoutService.clearFailedAttempts(userId);

    const tokens = await this.generateTokens(userId, user.email);
    await this.updateRefreshToken(userId, tokens.refreshToken);

    await this.prisma.user.update({
      where: { id: userId },
      data: { last_login_at: new Date() },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}