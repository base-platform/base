# Base Platform API Client

A TypeScript API client for the Base Platform, providing a clean interface for interacting with all API endpoints.

## 📸 Screenshots

### Dashboard
[Dashboard](./docs/screenshots/dashboard.png)
*The main dashboard showing system metrics, API usage, and recent activity*

### API Explorer
[API Explorer](./docs/screenshots/api-explorer.png)
*Interactive API testing interface at `/api-management/explorer`*

### Entity Builder
[Entity Builder](./docs/screenshots/entity-builder.png)
*Visual entity creation and schema management at `/entities/builder`*

### User Management
[User Management](./docs/screenshots/user-management.png)
*Admin interface for managing users, roles, and permissions at `/users`*

### Security Settings
[Security Settings](./docs/screenshots/security-settings.png)
*Runtime security configuration at `/security`*

## Installation

```bash
npm install @base/api-client
# or
yarn add @base/api-client
```

## Quick Start

```typescript
import { ApiClient } from '@base/api-client';

// Create client instance
const client = ApiClient.create('http://localhost:3000/api/v1');

// Login
const { accessToken, user } = await client.auth.login({
  email: 'user@example.com',
  password: 'password123'
});

// Client automatically sets the token for subsequent requests
const entities = await client.entities.listEntities();
```

## Features

- 🔐 **Authentication**: JWT, OAuth2, MFA, and API key support
- 👥 **User Management**: Complete user lifecycle management (Admin)
- 📦 **Entity Management**: Full CRUD operations for dynamic entities
- 🔒 **Security**: MFA setup, sessions, trusted devices, security settings
- 📤 **File Upload**: Avatar, documents, chunked uploads with validation
- ⚡ **Rate Limiting**: User and global rate limit management
- 🎛️ **Admin Controls**: Users, rate limits, security settings management
- 🔄 **Automatic Token Management**: Handles token storage and refresh
- 📝 **TypeScript Support**: Full type definitions included
- 🌐 **Environment Agnostic**: Works in browser and Node.js
- 🛡️ **Error Handling**: Consistent error responses with RFC 7807

## Usage

### Creating a Client

```typescript
// For browser environments
import { ApiClient } from '@base/api-client';

const client = ApiClient.createForBrowser({
  timeout: 30000,
  headers: {
    'X-Custom-Header': 'value'
  }
});

// For Node.js environments
const client = ApiClient.createForNode({
  baseUrl: 'https://api.example.com/v1'
});

// Using the singleton instance (browser)
import { apiClient } from '@base/api-client';
await apiClient.auth.login({ email, password });
```

### Authentication

```typescript
// Login
const response = await client.auth.login({
  email: 'user@example.com',
  password: 'password123'
});

// Register
const newUser = await client.auth.register({
  email: 'newuser@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe'
});

// Logout
await client.auth.logout();

// Get profile
const profile = await client.auth.getProfile();

// Create API key
const apiKey = await client.auth.createApiKey({
  name: 'My API Key',
  permissions: ['read', 'write'],
  expiresAt: new Date('2025-12-31')
});

// Use API key
client.setApiKey(apiKey.key);
```

### Multi-Factor Authentication (MFA)

```typescript
// Setup MFA
const { secret, qrCode } = await client.mfa.setup();

// Enable MFA
const { backupCodes } = await client.mfa.enable({
  token: '123456', // TOTP token from authenticator app
  secret
});

// Verify MFA token
const { valid } = await client.mfa.verify({
  token: '123456'
});

// Get MFA status
const status = await client.mfa.getStatus();
```

### OAuth Integration

```typescript
// Get OAuth authorization URL
const { authUrl } = await client.oauth.authorize('google');

// Handle OAuth callback
const response = await client.oauth.callback({
  code: 'auth-code',
  state: 'state',
  provider: 'google'
});

// Link OAuth account
await client.oauth.linkAccount({
  provider: 'github',
  code: 'auth-code'
});

// Get linked accounts
const accounts = await client.oauth.getLinkedAccounts();
```

### Session Management

```typescript
// Get all sessions
const sessions = await client.sessions.getSessions();

// Get current session
const current = await client.sessions.getCurrentSession();

// Trust current device
await client.sessions.trustDevice('My Laptop');

// Get trusted devices
const devices = await client.sessions.getTrustedDevices();

// Revoke all other sessions
await client.sessions.revokeAllSessions();
```

### File Upload

```typescript
// Upload avatar
const avatar = await client.uploads.uploadAvatar(file);

// Upload document with metadata
const doc = await client.uploads.uploadDocument(file, {
  category: 'contracts',
  tags: ['important', '2024']
});

// Upload multiple files
const results = await client.uploads.uploadMultiple(files);

// Chunked upload for large files
await client.uploads.uploadChunked(
  largeFile,
  (progress) => console.log(`Progress: ${progress}%`)
);

// Get upload policy
const policy = await client.uploads.getUploadPolicy('document');
```

### Admin: User Management

```typescript
// List all users (admin only)
const users = await client.admin.users.getUsers({
  role: 'user',
  isActive: true,
  page: 1,
  limit: 20
});

// Create user
const newUser = await client.admin.users.createUser({
  email: 'user@example.com',
  password: 'secure123',
  role: 'user'
});

// Activate/deactivate user
await client.admin.users.deactivateUser(userId);
await client.admin.users.activateUser(userId);

// Get user statistics
const stats = await client.admin.users.getUserStats();
```

### Admin: Rate Limit Management

```typescript
// Get all rate limit rules
const rules = await client.admin.rateLimits.getRateLimits();

// Create rate limit rule
const rule = await client.admin.rateLimits.createRateLimit({
  name: 'api-strict',
  endpoint: '/api/v1/*',
  maxRequests: 100,
  windowMs: 60000,
  isActive: true
});

// Test rate limit
const test = await client.admin.rateLimits.testRateLimit(
  '/api/v1/users',
  'GET'
);

// Reload rate limits
await client.admin.rateLimits.reloadRateLimits();
```

### Admin: Security Settings

```typescript
// Get all security settings
const settings = await client.admin.security.getAllSettings();

// Update security setting
await client.admin.security.updateSetting(
  'password_min_length',
  12
);

// Export security settings
const exported = await client.admin.security.exportSettings();

// Import security settings
await client.admin.security.importSettings({
  password_min_length: 12,
  mfa_required: true,
  session_timeout: 3600000
});
```

### API Key Management

```typescript
// Create API key with options
const apiKey = await client.apiKeys.createApiKey({
  name: 'Production Key',
  permissions: ['read:entities', 'write:entities'],
  expiresAt: new Date('2025-12-31'),
  rateLimit: 1000,
  allowedIps: ['192.168.1.0/24']
});

// Rotate API key
const rotated = await client.apiKeys.rotateApiKey(keyId);

// Get usage statistics
const usage = await client.apiKeys.getUsageStats(keyId);

// Check keys needing rotation
const needRotation = await client.apiKeys.getKeysNeedingRotation();
```

### Entity Management

```typescript
// List entities
const entities = await client.entities.listEntities({
  isActive: true,
  page: 1,
  limit: 10
});

// Create entity
const entity = await client.entities.createEntity({
  name: 'products',
  displayName: 'Products',
  description: 'Product catalog',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      price: { type: 'number' }
    },
    required: ['name', 'price']
  }
});

// Update entity
await client.entities.updateEntity(entity.id, {
  displayName: 'Product Catalog'
});

// Delete entity
await client.entities.deleteEntity(entity.id);
```

### Dynamic Resources (Resource-First Pattern)

```typescript
// Create a product (assuming 'products' entity exists)
const product = await client.entities.createDynamicRecord('products', {
  name: 'Laptop',
  price: 999.99,
  category: 'Electronics'
});

// List products with filters
const products = await client.entities.listDynamicRecords('products', {
  page: 1,
  limit: 20,
  filter: { category: 'Electronics' },
  sort: 'price',
  order: 'desc'
});

// Update a product
await client.entities.updateDynamicRecord('products', product.id, {
  price: 899.99
});

// Bulk create
const result = await client.entities.bulkCreateDynamicRecords('products', [
  { name: 'Mouse', price: 29.99 },
  { name: 'Keyboard', price: 79.99 }
]);

// Validate data before creating
const validation = await client.entities.validateDynamicData('products', {
  name: 'Test',
  price: -10 // Invalid
});

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### Token Management

```typescript
import { TokenStorage } from '@base/api-client';

// Store tokens
TokenStorage.storeAuthTokens(accessToken, refreshToken);

// Check authentication
if (TokenStorage.isAuthenticated()) {
  // User is logged in
}

// Clear all tokens
TokenStorage.clearAll();

// Manual token management
client.setAccessToken('your-jwt-token');
client.setApiKey('your-api-key');
```

### Error Handling

```typescript
import { ProblemDetail } from '@base/api-client';

try {
  await client.entities.createEntity(data);
} catch (error) {
  if (error.status === 400) {
    // Validation error
    const problem = error as ProblemDetail;
    console.error('Validation failed:', problem.detail);
    console.error('Errors:', problem.errors);
  } else if (error.status === 401) {
    // Unauthorized
    console.error('Please login');
  } else {
    // Other error
    console.error('Request failed:', error.message);
  }
}
```

### Advanced Usage

```typescript
// Custom request options
const entities = await client.entities.listEntities(
  { isActive: true },
  {
    timeout: 5000,
    headers: { 'X-Request-ID': 'custom-id' },
    signal: abortController.signal // Cancellable request
  }
);

// File upload
const formData = new FormData();
formData.append('file', file);

const result = await client.entities.importEntityData(
  entityId,
  file,
  { timeout: 60000 }
);

// File download
const blob = await client.entities.exportEntityData(
  entityId,
  'csv'
);

// Save the file
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'export.csv';
a.click();
```

## API Reference

### Main Client

- `ApiClient` - Main client with all modules

### Authentication & Security Clients

- `AuthClient` - Core authentication operations
- `MFAClient` - Multi-factor authentication
- `OAuthClient` - OAuth2 integration
- `SessionClient` - Session management
- `ApiKeyManagementClient` - API key operations
- `UserRateLimitClient` - User-specific rate limits
- `FileUploadClient` - File upload operations

### Core Clients

- `EntitiesClient` - Entity and record management

### Admin Clients

- `AdminUsersClient` - User management (admin only)
- `AdminRateLimitClient` - Rate limit configuration
- `SecuritySettingsClient` - Security settings management

### Base Class

- `BaseApiClient` - Base class for custom extensions

### Types

All TypeScript types are exported from the main package:

```typescript
import {
  User,
  Entity,
  EntityRecord,
  ApiKey,
  PaginatedResponse,
  ApiConfig,
  RequestOptions,
  ProblemDetail
} from '@base/api-client';
```

## Environment Variables

The client automatically detects and uses these environment variables:

- `NEXT_PUBLIC_API_URL` - API URL for Next.js apps
- `REACT_APP_API_URL` - API URL for Create React App
- `API_URL` - API URL for Node.js environments

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests (106 tests, 100% pass rate)
npm test

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Development mode (watch)
npm run dev

# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Full CI pipeline
npm run test:ci
```

### Test Suite

The API client includes a comprehensive test suite with **106 tests achieving 100% pass rate**:

- **Unit Tests**: 85+ tests covering individual client methods and error scenarios
- **Integration Tests**: Complete workflow testing across multiple modules  
- **Mock Infrastructure**: Robust axios mocking and test data factories
- **Error Handling**: Comprehensive testing of error scenarios and edge cases
- **Token Management**: Tests for authentication token synchronization

Run the test suite to verify all functionality:

```bash
# Quick test run
npm test

# With detailed coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

### Architecture

The client follows a modular architecture with:

- **BaseApiClient**: Core HTTP functionality with error handling, retries, and interceptors
- **Main ApiClient**: Orchestrates all sub-clients with token synchronization
- **Specialized Clients**: Domain-specific clients for auth, entities, admin operations
- **TypeScript**: Full type safety with comprehensive type definitions

## License

MIT