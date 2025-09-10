import { BaseApiClient } from '../core/base-client';
import { RequestOptions, User } from '../types';

export type OAuthProvider = 'google' | 'github' | 'microsoft' | 'facebook';

export interface OAuthAccount {
  id: string;
  provider: OAuthProvider;
  providerAccountId: string;
  email?: string;
  name?: string;
  image?: string;
  linkedAt: string;
}

export interface OAuthAuthorizeResponse {
  authUrl: string;
}

export interface OAuthCallbackRequest {
  code: string;
  state: string;
  provider: OAuthProvider;
}

export interface OAuthLinkRequest {
  provider: OAuthProvider;
  code: string;
  state?: string;
}

/**
 * Client for OAuth authentication operations
 */
export class OAuthClient extends BaseApiClient {
  /**
   * Get OAuth authorization URL for a provider
   */
  async authorize(provider: OAuthProvider, options?: RequestOptions): Promise<OAuthAuthorizeResponse> {
    return this.get<OAuthAuthorizeResponse>(`/auth/oauth/authorize/${provider}`, options);
  }

  /**
   * Handle OAuth callback
   */
  async callback(data: OAuthCallbackRequest, options?: RequestOptions): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const response = await this.get<{ user: User; accessToken: string; refreshToken: string }>(
      '/auth/oauth/callback',
      {
        params: data,
        ...options
      }
    );

    // Automatically set the access token
    if (response.accessToken) {
      this.setAccessToken(response.accessToken);
    }

    return response;
  }

  /**
   * Link OAuth account to existing user
   */
  async linkAccount(data: OAuthLinkRequest, options?: RequestOptions): Promise<{ success: boolean; account: OAuthAccount }> {
    return this.post<{ success: boolean; account: OAuthAccount }>('/auth/oauth/link', data, options);
  }

  /**
   * Unlink OAuth account from user
   */
  async unlinkAccount(provider: OAuthProvider, options?: RequestOptions): Promise<void> {
    await this.delete(`/auth/oauth/${provider}/unlink`, options);
  }

  /**
   * Get linked OAuth accounts for current user
   */
  async getLinkedAccounts(options?: RequestOptions): Promise<OAuthAccount[]> {
    return this.get<OAuthAccount[]>('/auth/oauth/accounts', options);
  }
}