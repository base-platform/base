import { BaseApiClient } from './core/base-client';
import { AuthClient } from './auth/auth-client';
import { MFAClient } from './auth/mfa-client';
import { OAuthClient } from './auth/oauth-client';
import { SessionClient } from './auth/session-client';
import { FileUploadClient } from './auth/file-upload-client';
import { ApiKeyManagementClient } from './auth/api-key-management-client';
import { UserRateLimitClient } from './auth/user-rate-limit-client';
import { EntitiesClient } from './entities/entities-client';
import { AdminUsersClient } from './admin/users-client';
import { AdminRateLimitClient } from './admin/rate-limit-client';
import { SecuritySettingsClient } from './admin/security-settings-client';
import { ApiConfig } from './types';

/**
 * Main API Client that combines all API modules
 */
export class ApiClient extends BaseApiClient {
  // Auth modules
  public readonly auth: AuthClient;
  public readonly mfa: MFAClient;
  public readonly oauth: OAuthClient;
  public readonly sessions: SessionClient;
  public readonly uploads: FileUploadClient;
  public readonly apiKeys: ApiKeyManagementClient;
  public readonly userRateLimits: UserRateLimitClient;
  
  // Core modules
  public readonly entities: EntitiesClient;
  
  // Admin modules
  public readonly admin: {
    users: AdminUsersClient;
    rateLimits: AdminRateLimitClient;
    security: SecuritySettingsClient;
  };

  constructor(config: ApiConfig) {
    super(config);
    
    // Initialize auth sub-clients
    this.auth = new AuthClient(config);
    this.mfa = new MFAClient(config);
    this.oauth = new OAuthClient(config);
    this.sessions = new SessionClient(config);
    this.uploads = new FileUploadClient(config);
    this.apiKeys = new ApiKeyManagementClient(config);
    this.userRateLimits = new UserRateLimitClient(config);
    
    // Initialize core modules
    this.entities = new EntitiesClient(config);
    
    // Initialize admin modules
    this.admin = {
      users: new AdminUsersClient(config),
      rateLimits: new AdminRateLimitClient(config),
      security: new SecuritySettingsClient(config),
    };
    
    // Share the token state across all clients
    this.syncTokens();
  }

  /**
   * Override setAccessToken to sync across all sub-clients
   */
  public setAccessToken(token: string | null): void {
    super.setAccessToken(token);
    
    // Sync auth modules
    this.auth.setAccessToken(token);
    this.mfa.setAccessToken(token);
    this.oauth.setAccessToken(token);
    this.sessions.setAccessToken(token);
    this.uploads.setAccessToken(token);
    this.apiKeys.setAccessToken(token);
    this.userRateLimits.setAccessToken(token);
    
    // Sync core modules
    this.entities.setAccessToken(token);
    
    // Sync admin modules
    this.admin.users.setAccessToken(token);
    this.admin.rateLimits.setAccessToken(token);
    this.admin.security.setAccessToken(token);
  }

  /**
   * Override setApiKey to sync across all sub-clients
   */
  public setApiKey(key: string | null): void {
    super.setApiKey(key);
    
    // Sync auth modules
    this.auth.setApiKey(key);
    this.mfa.setApiKey(key);
    this.oauth.setApiKey(key);
    this.sessions.setApiKey(key);
    this.uploads.setApiKey(key);
    this.apiKeys.setApiKey(key);
    this.userRateLimits.setApiKey(key);
    
    // Sync core modules
    this.entities.setApiKey(key);
    
    // Sync admin modules
    this.admin.users.setApiKey(key);
    this.admin.rateLimits.setApiKey(key);
    this.admin.security.setApiKey(key);
  }

  /**
   * Sync tokens across all sub-clients
   */
  private syncTokens(): void {
    const token = this.getAccessToken();
    const apiKey = this.getApiKey();
    
    if (token) {
      this.setAccessToken(token);
    }
    
    if (apiKey) {
      this.setApiKey(apiKey);
    }
  }

  /**
   * Create a new instance with default configuration
   */
  static create(baseUrl: string, options?: Partial<ApiConfig>): ApiClient {
    return new ApiClient({
      baseUrl,
      timeout: 30000,
      withCredentials: false,
      ...options,
    });
  }

  /**
   * Create a new instance for browser environment
   */
  static createForBrowser(options?: Partial<ApiConfig>): ApiClient {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
                    process.env.REACT_APP_API_URL || 
                    'http://localhost:3000/api/v1';
    
    return ApiClient.create(baseUrl, {
      withCredentials: true,
      ...options,
    });
  }

  /**
   * Create a new instance for Node.js environment
   */
  static createForNode(options?: Partial<ApiConfig>): ApiClient {
    const baseUrl = process.env.API_URL || 'http://localhost:3000/api/v1';
    
    return ApiClient.create(baseUrl, {
      withCredentials: false,
      ...options,
    });
  }
}

// Export a singleton instance for convenience
export const apiClient = ApiClient.createForBrowser();