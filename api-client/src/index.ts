// Main client
export { ApiClient, apiClient } from './client';

// Base classes
export { BaseApiClient } from './core/base-client';

// Auth clients
export { AuthClient } from './auth/auth-client';
export { MFAClient } from './auth/mfa-client';
export { OAuthClient } from './auth/oauth-client';
export { SessionClient } from './auth/session-client';
export { FileUploadClient } from './auth/file-upload-client';
export { ApiKeyManagementClient } from './auth/api-key-management-client';
export { UserRateLimitClient } from './auth/user-rate-limit-client';

// Core clients
export { EntitiesClient } from './entities/entities-client';

// Admin clients
export { AdminUsersClient } from './admin/users-client';
export { AdminRateLimitClient } from './admin/rate-limit-client';
export { SecuritySettingsClient } from './admin/security-settings-client';

// Types
export * from './types';

// Utilities
export { buildQueryString, parseQueryString } from './utils/query';
export { TokenStorage } from './utils/token-storage';

// Version
export const VERSION = '1.0.0';