import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

export interface OAuthProvider {
  name: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
}

@Injectable()
export class OAuthService {
  private providers: Map<string, OAuthProvider> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Google OAuth provider
    const googleClientId = this.config.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = this.config.get('GOOGLE_CLIENT_SECRET');
    
    if (googleClientId && googleClientSecret) {
      this.providers.set('google', {
        name: 'Google',
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['openid', 'email', 'profile'],
      });
    }

    // GitHub OAuth provider
    const githubClientId = this.config.get('GITHUB_CLIENT_ID');
    const githubClientSecret = this.config.get('GITHUB_CLIENT_SECRET');
    
    if (githubClientId && githubClientSecret) {
      this.providers.set('github', {
        name: 'GitHub',
        clientId: githubClientId,
        clientSecret: githubClientSecret,
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        scopes: ['user:email'],
      });
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(provider: string, redirectUrl?: string): string {
    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new BadRequestException(`OAuth provider '${provider}' not configured`);
    }

    const state = crypto.randomBytes(32).toString('hex');
    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: redirectUrl || this.config.get('OAUTH_REDIRECT_URL', 'http://localhost:3001/auth/oauth/callback'),
      scope: providerConfig.scopes.join(' '),
      response_type: 'code',
      state,
    });

    // Store state for validation (you might want to use Redis for production)
    // For now, we'll validate it in the callback

    return `${providerConfig.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Handle OAuth callback and get user info
   */
  async handleCallback(provider: string, code: string, state?: string): Promise<OAuthUserInfo> {
    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new BadRequestException(`OAuth provider '${provider}' not configured`);
    }

    // Exchange code for access token
    const tokenResponse = await this.exchangeCodeForToken(providerConfig, code);
    
    // Get user info using access token
    const userInfo = await this.getUserInfo(providerConfig, tokenResponse.access_token);
    
    return {
      ...userInfo,
      provider,
    };
  }

  /**
   * Login or register user with OAuth
   */
  async loginWithOAuth(oauthUserInfo: OAuthUserInfo) {
    // Check if user exists with this OAuth provider
    const existingOAuthAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_provider_user_id: {
          provider: oauthUserInfo.provider,
          provider_user_id: oauthUserInfo.id,
        },
      },
      include: { user: true },
    });

    if (existingOAuthAccount) {
      // User exists, update last login and return tokens
      await this.prisma.user.update({
        where: { id: existingOAuthAccount.user_id },
        data: { last_login_at: new Date() },
      });

      const tokens = await this.generateTokens(existingOAuthAccount.user.id, existingOAuthAccount.user.email);
      return {
        ...tokens,
        user: {
          id: existingOAuthAccount.user.id,
          email: existingOAuthAccount.user.email,
          role: existingOAuthAccount.user.role,
        },
      };
    }

    // Check if user exists with same email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: oauthUserInfo.email },
    });

    if (existingUser) {
      // Link OAuth account to existing user
      await this.prisma.oAuthAccount.create({
        data: {
          provider: oauthUserInfo.provider,
          provider_user_id: oauthUserInfo.id,
          provider_email: oauthUserInfo.email,
          provider_name: oauthUserInfo.name,
          provider_avatar: oauthUserInfo.avatar,
          user_id: existingUser.id,
        },
      });

      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: { last_login_at: new Date() },
      });

      const tokens = await this.generateTokens(existingUser.id, existingUser.email);
      return {
        ...tokens,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          role: existingUser.role,
        },
      };
    }

    // Create new user
    const newUser = await this.prisma.user.create({
      data: {
        email: oauthUserInfo.email,
        first_name: oauthUserInfo.name.split(' ')[0] || oauthUserInfo.name,
        last_name: oauthUserInfo.name.split(' ').slice(1).join(' ') || '',
        username: `${oauthUserInfo.provider}_${oauthUserInfo.id}`,
        is_active: true,
        last_login_at: new Date(),
      },
    });

    // Link OAuth account to new user
    await this.prisma.oAuthAccount.create({
      data: {
        provider: oauthUserInfo.provider,
        provider_user_id: oauthUserInfo.id,
        provider_email: oauthUserInfo.email,
        provider_name: oauthUserInfo.name,
        provider_avatar: oauthUserInfo.avatar,
        user_id: newUser.id,
      },
    });

    const tokens = await this.generateTokens(newUser.id, newUser.email);
    return {
      ...tokens,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
    };
  }

  /**
   * Link OAuth account to existing user
   */
  async linkAccount(userId: string, oauthUserInfo: OAuthUserInfo) {
    // Check if this OAuth account is already linked to another user
    const existingOAuthAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_provider_user_id: {
          provider: oauthUserInfo.provider,
          provider_user_id: oauthUserInfo.id,
        },
      },
    });

    if (existingOAuthAccount) {
      if (existingOAuthAccount.user_id === userId) {
        throw new ConflictException('This OAuth account is already linked to your account');
      }
      throw new ConflictException('This OAuth account is already linked to another user');
    }

    // Link the account
    await this.prisma.oAuthAccount.create({
      data: {
        provider: oauthUserInfo.provider,
        provider_user_id: oauthUserInfo.id,
        provider_email: oauthUserInfo.email,
        provider_name: oauthUserInfo.name,
        provider_avatar: oauthUserInfo.avatar,
        user_id: userId,
      },
    });

    return { message: 'OAuth account linked successfully' };
  }

  /**
   * Unlink OAuth account
   */
  async unlinkAccount(userId: string, provider: string) {
    const oauthAccount = await this.prisma.oAuthAccount.findFirst({
      where: {
        user_id: userId,
        provider,
      },
    });

    if (!oauthAccount) {
      throw new BadRequestException('OAuth account not found');
    }

    // Check if user has password or other OAuth accounts
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        oauth_accounts: {
          where: { provider: { not: provider } },
        },
      },
    });

    if (!user?.password_hash && user?.oauth_accounts.length === 0) {
      throw new BadRequestException('Cannot unlink the only authentication method');
    }

    await this.prisma.oAuthAccount.delete({
      where: { id: oauthAccount.id },
    });

    return { message: 'OAuth account unlinked successfully' };
  }

  /**
   * Get linked OAuth accounts for user
   */
  async getLinkedAccounts(userId: string) {
    const accounts = await this.prisma.oAuthAccount.findMany({
      where: { user_id: userId },
      select: {
        provider: true,
        provider_email: true,
        provider_name: true,
        provider_avatar: true,
        created_at: true,
      },
    });

    return accounts;
  }

  private async exchangeCodeForToken(provider: OAuthProvider, code: string): Promise<any> {
    const tokenData = {
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.get('OAUTH_REDIRECT_URL', 'http://localhost:3001/auth/oauth/callback'),
    };

    const response = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams(tokenData),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to exchange code for token');
    }

    return response.json();
  }

  private async getUserInfo(provider: OAuthProvider, accessToken: string): Promise<Omit<OAuthUserInfo, 'provider'>> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
    };

    // GitHub requires User-Agent header
    if (provider.name === 'GitHub') {
      headers['User-Agent'] = 'API-Platform';
    }

    const response = await fetch(provider.userInfoUrl, { headers });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to fetch user info');
    }

    const data = await response.json();

    // Normalize user data based on provider
    if (provider.name === 'Google') {
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        avatar: data.picture,
      };
    }

    if (provider.name === 'GitHub') {
      // GitHub might not return email in user info, fetch from emails endpoint
      let email = data.email;
      if (!email) {
        const emailResponse = await fetch('https://api.github.com/user/emails', { headers });
        if (emailResponse.ok) {
          const emails = await emailResponse.json();
          const primaryEmail = emails.find((e: any) => e.primary && e.verified);
          email = primaryEmail?.email;
        }
      }

      return {
        id: data.id.toString(),
        email: email || `${data.login}@github.local`, // Fallback if no email
        name: data.name || data.login,
        avatar: data.avatar_url,
      };
    }

    throw new BadRequestException('Unsupported OAuth provider');
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
}