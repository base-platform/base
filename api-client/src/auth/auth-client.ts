import { BaseApiClient } from '../core/base-client';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  ApiKey,
  CreateApiKeyRequest,
  RequestOptions,
} from '../types';

export class AuthClient extends BaseApiClient {
  /**
   * Login with email and password
   */
  async login(data: LoginRequest, options?: RequestOptions): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>('/auth/login', data, options);
    
    // Automatically set the access token
    if (response.accessToken) {
      this.setAccessToken(response.accessToken);
    }
    
    return response;
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest, options?: RequestOptions): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>('/auth/register', data, options);
    
    // Automatically set the access token
    if (response.accessToken) {
      this.setAccessToken(response.accessToken);
    }
    
    return response;
  }

  /**
   * Logout the current user
   */
  async logout(options?: RequestOptions): Promise<void> {
    try {
      await this.post('/auth/logout', undefined, options);
    } finally {
      // Always clear the token, even if the logout request fails
      this.setAccessToken(null);
    }
  }

  /**
   * Refresh the access token
   */
  async refresh(refreshToken: string, options?: RequestOptions): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>(
      '/auth/refresh',
      { refreshToken },
      options
    );
    
    // Update the access token
    if (response.accessToken) {
      this.setAccessToken(response.accessToken);
    }
    
    return response;
  }

  /**
   * Get the current user's profile
   */
  async getProfile(options?: RequestOptions): Promise<User> {
    return this.get<User>('/auth/profile', options);
  }

  /**
   * Update the current user's profile
   */
  async updateProfile(data: Partial<User>, options?: RequestOptions): Promise<User> {
    return this.put<User>('/auth/profile', data, options);
  }

  /**
   * Change password
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
    options?: RequestOptions
  ): Promise<void> {
    await this.post('/auth/change-password', {
      currentPassword,
      newPassword,
    }, options);
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string, options?: RequestOptions): Promise<void> {
    await this.post('/auth/forgot-password', { email }, options);
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    token: string,
    newPassword: string,
    options?: RequestOptions
  ): Promise<void> {
    await this.post('/auth/reset-password', {
      token,
      newPassword,
    }, options);
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string, options?: RequestOptions): Promise<void> {
    await this.post('/auth/verify-email', { token }, options);
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(options?: RequestOptions): Promise<void> {
    await this.post('/auth/resend-verification', undefined, options);
  }

  /**
   * List API keys for the current user
   */
  async listApiKeys(options?: RequestOptions): Promise<ApiKey[]> {
    return this.get<ApiKey[]>('/auth/api-keys', options);
  }

  /**
   * Create a new API key
   */
  async createApiKey(data: CreateApiKeyRequest, options?: RequestOptions): Promise<ApiKey> {
    return this.post<ApiKey>('/auth/api-keys', data, options);
  }

  /**
   * Get API key by ID
   */
  async getApiKeyById(keyId: string, options?: RequestOptions): Promise<ApiKey> {
    return this.get<ApiKey>(`/auth/api-keys/${keyId}`, options);
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(keyId: string, options?: RequestOptions): Promise<void> {
    await this.post(`/auth/api-keys/${keyId}/revoke`, undefined, options);
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(keyId: string, options?: RequestOptions): Promise<void> {
    await this.delete(`/auth/api-keys/${keyId}`, options);
  }

  /**
   * Validate the current access token
   */
  async validateToken(options?: RequestOptions): Promise<boolean> {
    try {
      await this.get('/auth/validate', options);
      return true;
    } catch {
      return false;
    }
  }
}