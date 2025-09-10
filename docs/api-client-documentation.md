# API Client Documentation

## Table of Contents
1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Configuration](#configuration)
5. [Architecture](#architecture)
6. [Authentication](#authentication)
7. [Core API Methods](#core-api-methods)
8. [Entity Management](#entity-management)
9. [Record Operations](#record-operations)
10. [API Key Management](#api-key-management)
11. [Error Handling](#error-handling)
12. [TypeScript Support](#typescript-support)
13. [Advanced Usage](#advanced-usage)
14. [Browser vs Node.js](#browser-vs-nodejs)
15. [Request Interceptors](#request-interceptors)
16. [Response Transformers](#response-transformers)
17. [Retry Logic](#retry-logic)
18. [Testing](#testing)
19. [Best Practices](#best-practices)
20. [API Reference](#api-reference)

---

## Overview

The API Client is a TypeScript library that provides a type-safe, feature-rich interface for interacting with the Base Platform API. It abstracts away the complexity of HTTP requests, authentication, and error handling while providing a clean, intuitive API for both browser and Node.js environments.

### Key Features

- 🔒 **Multi-Authentication Support** - JWT tokens and API keys
- 📦 **TypeScript First** - Full type definitions and IntelliSense support
- 🌐 **Universal** - Works in browsers and Node.js
- 🔄 **Automatic Retry** - Configurable retry logic with exponential backoff
- 🎯 **Request Interceptors** - Modify requests before sending
- 📊 **Response Transformers** - Transform responses after receiving
- 💾 **Token Management** - Automatic token storage and refresh
- 🚨 **Comprehensive Error Handling** - RFC 7807 compliant error responses
- 🏗️ **Modular Architecture** - Separate clients for different API domains
- ⚡ **Optimized Bundle Size** - Tree-shakeable exports

---

## Installation

### NPM
```bash
npm install @base/api-client
```

### Yarn
```bash
yarn add @base/api-client
```

### PNPM
```bash
pnpm add @base/api-client
```

### CDN (Browser)
```html
<script src="https://unpkg.com/@base/api-client/dist/browser.min.js"></script>
<script>
  const client = BaseApiClient.createForBrowser();
</script>
```

---

## Quick Start

### Browser Usage

```typescript
import { createForBrowser } from '@base/api-client';

// Create client instance
const client = createForBrowser({
  baseURL: 'https://api.example.com/api/v1'
});

// Login
const { user, accessToken } = await client.auth.login({
  email: 'user@example.com',
  password: 'password123'
});

// List entities
const entities = await client.entities.list();

// Create a record
const record = await client.entities.records('products').create({
  name: 'iPhone 15',
  price: 999,
  inStock: true
});
```

### Node.js Usage

```typescript
import { createForNode } from '@base/api-client';

// Create client with API key
const client = createForNode({
  baseURL: 'https://api.example.com/api/v1',
  apiKey: 'sk_live_abc123...'
});

// Perform operations
const entities = await client.entities.list();
```

### Using the Singleton (Browser Only)

```typescript
import { apiClient } from '@base/api-client';

// The singleton is pre-configured for browser use
await apiClient.auth.login({
  email: 'user@example.com',
  password: 'password123'
});
```

---

## Configuration

### Client Configuration Options

```typescript
interface ApiClientConfig {
  // Required
  baseURL: string;                    // API base URL
  
  // Authentication
  apiKey?: string;                    // API key for authentication
  token?: string;                     // JWT token (if already available)
  
  // Request Configuration
  timeout?: number;                   // Request timeout in ms (default: 30000)
  headers?: Record<string, string>;   // Additional headers
  
  // Retry Configuration
  retry?: {
    enabled?: boolean;               // Enable retry (default: true)
    maxAttempts?: number;           // Max retry attempts (default: 3)
    delay?: number;                 // Initial delay in ms (default: 1000)
    maxDelay?: number;              // Max delay in ms (default: 30000)
    factor?: number;                // Exponential factor (default: 2)
    retryOn?: number[];             // Status codes to retry on
  };
  
  // Token Storage (Browser only)
  storage?: {
    enabled?: boolean;              // Enable token storage (default: true)
    prefix?: string;                // Storage key prefix (default: 'api_')
    storage?: Storage;              // Storage type (default: localStorage)
  };
  
  // Interceptors
  onRequest?: (config: AxiosRequestConfig) => AxiosRequestConfig;
  onResponse?: (response: AxiosResponse) => AxiosResponse;
  onError?: (error: AxiosError) => Promise<any>;
}
```

### Configuration Examples

#### Basic Configuration
```typescript
const client = createForBrowser({
  baseURL: 'https://api.example.com/api/v1',
  timeout: 10000
});
```

#### With Custom Headers
```typescript
const client = createForBrowser({
  baseURL: 'https://api.example.com/api/v1',
  headers: {
    'X-Custom-Header': 'value',
    'X-Client-Version': '1.0.0'
  }
});
```

#### With Retry Configuration
```typescript
const client = createForBrowser({
  baseURL: 'https://api.example.com/api/v1',
  retry: {
    enabled: true,
    maxAttempts: 5,
    delay: 2000,
    retryOn: [408, 429, 500, 502, 503, 504]
  }
});
```

#### With Custom Storage (Browser)
```typescript
const client = createForBrowser({
  baseURL: 'https://api.example.com/api/v1',
  storage: {
    enabled: true,
    prefix: 'myapp_',
    storage: sessionStorage  // Use sessionStorage instead of localStorage
  }
});
```

#### With Interceptors
```typescript
const client = createForBrowser({
  baseURL: 'https://api.example.com/api/v1',
  onRequest: (config) => {
    console.log('Request:', config);
    config.headers['X-Request-ID'] = generateRequestId();
    return config;
  },
  onResponse: (response) => {
    console.log('Response:', response);
    return response;
  },
  onError: async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh
      await refreshToken();
      return client.request(error.config);
    }
    throw error;
  }
});
```

---

## Architecture

### Client Structure

```
ApiClient
├── AuthClient          # Authentication operations
├── EntitiesClient      # Entity management
│   └── RecordsClient   # Record operations (dynamic)
├── ApiKeysClient       # API key management
├── UsersClient         # User management
├── FunctionsClient     # Function operations
└── AnalyticsClient     # Analytics operations
```

### Class Hierarchy

```typescript
// Base client with shared functionality
abstract class BaseApiClient {
  protected axios: AxiosInstance;
  protected config: ApiClientConfig;
  
  constructor(config: ApiClientConfig) {
    this.config = config;
    this.axios = this.createAxiosInstance();
    this.setupInterceptors();
  }
}

// Main client combining all sub-clients
class ApiClient extends BaseApiClient {
  public auth: AuthClient;
  public entities: EntitiesClient;
  public apiKeys: ApiKeysClient;
  public users: UsersClient;
  public functions: FunctionsClient;
  public analytics: AnalyticsClient;
  
  constructor(config: ApiClientConfig) {
    super(config);
    this.auth = new AuthClient(this.axios);
    this.entities = new EntitiesClient(this.axios);
    // ... initialize other clients
  }
}
```

---

## Authentication

### Login with Email/Password

```typescript
const response = await client.auth.login({
  email: 'user@example.com',
  password: 'password123'
});

console.log(response);
// {
//   user: { id: '...', email: '...', name: '...', role: '...' },
//   accessToken: 'eyJ...',
//   refreshToken: 'eyJ...'
// }
```

### Register New User

```typescript
const response = await client.auth.register({
  email: 'newuser@example.com',
  password: 'SecurePassword123!',
  name: 'John Doe',
  role: 'user'  // Optional, defaults to 'user'
});

// Auto-login after registration
console.log('Logged in as:', response.user);
```

### Using API Keys

```typescript
// Create client with API key
const client = createForNode({
  baseURL: 'https://api.example.com/api/v1',
  apiKey: process.env.API_KEY
});

// API key is automatically added to headers
const entities = await client.entities.list();
```

### Token Management

```typescript
// Get current token
const token = client.auth.getToken();

// Set token manually
client.auth.setToken('eyJ...');

// Clear token (logout)
client.auth.clearToken();

// Check if authenticated
const isAuthenticated = client.auth.isAuthenticated();

// Get current user
const user = client.auth.getCurrentUser();
```

### Token Refresh

```typescript
// Manual refresh
const newTokens = await client.auth.refreshToken();

// Automatic refresh on 401 (configured via interceptor)
const client = createForBrowser({
  baseURL: 'https://api.example.com/api/v1',
  onError: async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      
      try {
        await client.auth.refreshToken();
        return client.request(error.config);
      } catch (refreshError) {
        client.auth.logout();
        window.location.href = '/login';
      }
    }
    throw error;
  }
});
```

### OAuth Integration

```typescript
// Initiate OAuth flow
const authUrl = client.auth.getOAuthUrl({
  provider: 'google',
  redirectUri: 'https://app.example.com/auth/callback'
});

window.location.href = authUrl;

// Handle OAuth callback
const response = await client.auth.handleOAuthCallback({
  provider: 'google',
  code: urlParams.get('code'),
  state: urlParams.get('state')
});
```

---

## Core API Methods

### Entity Operations

#### List Entities
```typescript
// Basic listing
const entities = await client.entities.list();

// With pagination
const entities = await client.entities.list({
  page: 2,
  limit: 20
});

// With filtering
const entities = await client.entities.list({
  where: {
    isPublic: true,
    createdBy: 'user-id'
  }
});

// With sorting
const entities = await client.entities.list({
  orderBy: {
    createdAt: 'desc'
  }
});

// Combined
const entities = await client.entities.list({
  where: { isPublic: true },
  orderBy: { name: 'asc' },
  page: 1,
  limit: 10
});
```

#### Get Single Entity
```typescript
const entity = await client.entities.get('entity-id');

console.log(entity);
// {
//   id: 'entity-id',
//   name: 'products',
//   displayName: 'Products',
//   schema: { ... },
//   permissions: { ... },
//   ...
// }
```

#### Create Entity
```typescript
const entity = await client.entities.create({
  name: 'products',
  displayName: 'Products',
  description: 'Product catalog',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1 },
      price: { type: 'number', minimum: 0 },
      description: { type: 'string' },
      inStock: { type: 'boolean' },
      tags: {
        type: 'array',
        items: { type: 'string' }
      }
    },
    required: ['name', 'price']
  },
  permissions: {
    create: ['admin', 'editor'],
    read: ['admin', 'editor', 'viewer'],
    update: ['admin', 'editor'],
    delete: ['admin']
  },
  isPublic: false
});
```

#### Update Entity
```typescript
const updated = await client.entities.update('entity-id', {
  displayName: 'Product Catalog',
  description: 'Updated description',
  permissions: {
    read: ['admin', 'editor', 'viewer', 'user']
  }
});
```

#### Delete Entity
```typescript
await client.entities.delete('entity-id');
```

#### Validate Data Against Schema
```typescript
const isValid = await client.entities.validateData('entity-id', {
  name: 'Test Product',
  price: 99.99
});

if (!isValid.valid) {
  console.error('Validation errors:', isValid.errors);
}
```

---

## Record Operations

### Dynamic Record Client

```typescript
// Get record client for specific entity
const productsClient = client.entities.records('products');

// Now use it like a dedicated client
const products = await productsClient.list();
const product = await productsClient.get('product-id');
```

### List Records

```typescript
// Basic listing
const records = await client.entities.records('products').list();

// With pagination
const records = await client.entities.records('products').list({
  page: 2,
  limit: 50
});

// With filtering (JSONB queries)
const records = await client.entities.records('products').list({
  where: {
    inStock: true,
    price: { $gte: 100, $lte: 500 }
  }
});

// With text search
const records = await client.entities.records('products').list({
  search: 'iPhone',
  searchFields: ['name', 'description']
});

// With sorting
const records = await client.entities.records('products').list({
  orderBy: {
    price: 'desc',
    name: 'asc'
  }
});

// With field selection
const records = await client.entities.records('products').list({
  select: ['id', 'name', 'price']
});

// Complex query
const records = await client.entities.records('products').list({
  where: {
    inStock: true,
    price: { $gte: 100 },
    tags: { $contains: 'electronics' }
  },
  search: 'phone',
  orderBy: { price: 'asc' },
  page: 1,
  limit: 20,
  select: ['id', 'name', 'price', 'inStock']
});
```

### Get Single Record

```typescript
const record = await client.entities.records('products').get('record-id');

// With field selection
const record = await client.entities.records('products').get('record-id', {
  select: ['name', 'price']
});
```

### Create Record

```typescript
const record = await client.entities.records('products').create({
  name: 'iPhone 15 Pro',
  price: 1199,
  description: 'Latest iPhone with A17 Pro chip',
  inStock: true,
  tags: ['electronics', 'mobile', 'apple']
});
```

### Update Record

```typescript
// Full update
const updated = await client.entities.records('products').update('record-id', {
  name: 'iPhone 15 Pro Max',
  price: 1299,
  inStock: false
});

// Partial update
const updated = await client.entities.records('products').patch('record-id', {
  price: 1099,
  inStock: true
});
```

### Delete Record

```typescript
await client.entities.records('products').delete('record-id');

// Soft delete (if configured)
await client.entities.records('products').softDelete('record-id');
```

### Bulk Operations

```typescript
// Bulk create
const results = await client.entities.records('products').bulkCreate([
  { name: 'Product 1', price: 100 },
  { name: 'Product 2', price: 200 },
  { name: 'Product 3', price: 300 }
]);

// Bulk update
const results = await client.entities.records('products').bulkUpdate([
  { id: 'id1', data: { price: 110 } },
  { id: 'id2', data: { price: 210 } },
  { id: 'id3', data: { price: 310 } }
]);

// Bulk delete
await client.entities.records('products').bulkDelete([
  'record-id-1',
  'record-id-2',
  'record-id-3'
]);
```

### Advanced Queries

```typescript
// Query with aggregation
const results = await client.entities.records('orders').query({
  aggregate: {
    sum: ['total'],
    avg: ['total'],
    count: true
  },
  groupBy: ['status'],
  having: {
    sum_total: { $gte: 10000 }
  }
});

// Query with joins (if supported)
const results = await client.entities.records('orders').query({
  include: {
    customer: true,
    items: {
      include: {
        product: true
      }
    }
  }
});

// Raw query (advanced users)
const results = await client.entities.records('products').rawQuery({
  filter: { category: 'electronics' },
  sort: [{ field: 'price', order: 'desc' }],
  limit: 10,
  offset: 0
});
```

### Import/Export

```typescript
// Export records
const exportData = await client.entities.records('products').export({
  format: 'csv',  // or 'json', 'xlsx'
  where: { inStock: true }
});

// Download export
const blob = new Blob([exportData], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'products.csv';
a.click();

// Import records
const file = document.getElementById('file-input').files[0];
const formData = new FormData();
formData.append('file', file);

const result = await client.entities.records('products').import(formData, {
  format: 'csv',
  mode: 'upsert',  // or 'create', 'update'
  mapping: {
    'Product Name': 'name',
    'Product Price': 'price',
    'In Stock': 'inStock'
  }
});
```

---

## API Key Management

### List API Keys

```typescript
const apiKeys = await client.apiKeys.list();

console.log(apiKeys);
// [
//   {
//     id: 'key-id',
//     name: 'Production Key',
//     keyPrefix: 'sk_live_',
//     permissions: ['read', 'write'],
//     lastUsedAt: '2024-01-01T00:00:00Z',
//     createdAt: '2024-01-01T00:00:00Z'
//   }
// ]
```

### Create API Key

```typescript
const apiKey = await client.apiKeys.create({
  name: 'Production API Key',
  permissions: ['entities:read', 'entities:write', 'records:read', 'records:write'],
  expiresAt: '2025-01-01T00:00:00Z',  // Optional
  rateLimit: 10000  // Requests per hour
});

console.log('Save this key securely:', apiKey.key);
// Note: The full key is only returned once during creation
```

### Revoke API Key

```typescript
await client.apiKeys.revoke('key-id');
```

### Regenerate API Key

```typescript
const newKey = await client.apiKeys.regenerate('key-id');
console.log('New key:', newKey.key);
```

---

## Error Handling

### Error Response Format (RFC 7807)

```typescript
interface ApiError {
  type: string;        // Error type URI
  title: string;       // Short error description
  status: number;      // HTTP status code
  detail?: string;     // Detailed error message
  instance?: string;   // Specific instance of the error
  traceId?: string;    // Request trace ID
  violations?: Array<{
    field: string;     // Field that caused the error
    message: string;   // Validation error message
  }>;
}
```

### Handling Errors

```typescript
try {
  const entity = await client.entities.create({
    name: 'invalid name!',  // Invalid characters
    schema: {}  // Invalid schema
  });
} catch (error) {
  if (error.response) {
    // API returned an error response
    const apiError = error.response.data as ApiError;
    
    console.error(`Error ${apiError.status}: ${apiError.title}`);
    console.error('Detail:', apiError.detail);
    
    // Handle validation errors
    if (apiError.violations) {
      apiError.violations.forEach(violation => {
        console.error(`Field '${violation.field}': ${violation.message}`);
      });
    }
    
    // Handle specific error types
    switch (apiError.status) {
      case 400:
        // Bad request - validation error
        break;
      case 401:
        // Unauthorized - redirect to login
        break;
      case 403:
        // Forbidden - insufficient permissions
        break;
      case 404:
        // Not found
        break;
      case 429:
        // Rate limited
        const retryAfter = error.response.headers['retry-after'];
        console.log(`Rate limited. Retry after ${retryAfter} seconds`);
        break;
      case 500:
        // Server error
        break;
    }
  } else if (error.request) {
    // Request was made but no response received
    console.error('Network error:', error.message);
  } else {
    // Error in setting up the request
    console.error('Request error:', error.message);
  }
}
```

### Custom Error Handler

```typescript
class ApiErrorHandler {
  static handle(error: any): never {
    if (error.response?.status === 401) {
      // Token expired or invalid
      store.dispatch(logoutAction());
      router.push('/login');
      throw new Error('Session expired. Please login again.');
    }
    
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to perform this action.');
    }
    
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      throw new Error(`Rate limited. Please try again in ${retryAfter} seconds.`);
    }
    
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    
    throw new Error('An unexpected error occurred. Please try again.');
  }
}

// Usage
try {
  await client.entities.delete('entity-id');
} catch (error) {
  ApiErrorHandler.handle(error);
}
```

---

## TypeScript Support

### Type Definitions

```typescript
// Entity types
interface Entity {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  schema: JsonSchema;
  permissions: EntityPermissions;
  settings: Record<string, any>;
  isPublic: boolean;
  isSystem: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateEntityDto {
  name: string;
  displayName: string;
  description?: string;
  schema: JsonSchema;
  permissions?: EntityPermissions;
  settings?: Record<string, any>;
  isPublic?: boolean;
}

// Record types
interface EntityRecord<T = any> {
  id: string;
  entityId: string;
  data: T;
  version: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Generic record operations
interface RecordsClient<T = any> {
  list(params?: ListParams): Promise<PaginatedResponse<EntityRecord<T>>>;
  get(id: string): Promise<EntityRecord<T>>;
  create(data: T): Promise<EntityRecord<T>>;
  update(id: string, data: T): Promise<EntityRecord<T>>;
  delete(id: string): Promise<void>;
}
```

### Using with Custom Types

```typescript
// Define your data types
interface Product {
  name: string;
  price: number;
  description?: string;
  inStock: boolean;
  tags: string[];
}

// Create typed client
const productsClient = client.entities.records<Product>('products');

// Now all operations are type-safe
const product = await productsClient.create({
  name: 'iPhone 15',
  price: 999,
  inStock: true,
  tags: ['electronics', 'mobile']
  // TypeScript will enforce the Product interface
});

// Type-safe responses
const products = await productsClient.list();
products.data.forEach(record => {
  console.log(record.data.name);  // TypeScript knows this is a string
  console.log(record.data.price); // TypeScript knows this is a number
});
```

### Generic API Client

```typescript
// Create a generic wrapper for better type safety
class TypedApiClient<TEntities extends Record<string, any>> {
  constructor(private client: ApiClient) {}
  
  records<K extends keyof TEntities>(entity: K) {
    return this.client.entities.records<TEntities[K]>(entity as string);
  }
}

// Define your entity types
interface MyEntities {
  products: Product;
  users: User;
  orders: Order;
}

// Create typed client
const typedClient = new TypedApiClient<MyEntities>(client);

// Fully type-safe operations
const products = await typedClient.records('products').list();
const users = await typedClient.records('users').list();
// TypeScript knows the exact type of each entity's data
```

---

## Advanced Usage

### Request Queuing

```typescript
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private concurrency = 3;
  
  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.process();
    });
  }
  
  private async process() {
    if (this.processing) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.concurrency);
      await Promise.all(batch.map(fn => fn()));
    }
    
    this.processing = false;
  }
}

// Usage
const queue = new RequestQueue();

// Queue multiple requests
const results = await Promise.all([
  queue.add(() => client.entities.list()),
  queue.add(() => client.entities.get('id1')),
  queue.add(() => client.entities.get('id2'))
]);
```

### Caching

```typescript
class CachedApiClient {
  private cache = new Map<string, { data: any; expires: number }>();
  
  constructor(private client: ApiClient) {}
  
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 60000
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    
    const data = await fetcher();
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
    
    return data;
  }
  
  invalidate(pattern?: string) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

// Usage
const cachedClient = new CachedApiClient(client);

// Cached request
const entities = await cachedClient.get(
  'entities:list',
  () => client.entities.list(),
  300000  // Cache for 5 minutes
);

// Invalidate cache
cachedClient.invalidate('entities');
```

### Batch Operations

```typescript
class BatchProcessor {
  constructor(
    private client: ApiClient,
    private batchSize: number = 100
  ) {}
  
  async processBatch<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
      
      // Optional: Add delay between batches
      if (i + this.batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }
}

// Usage
const processor = new BatchProcessor(client);

const products = Array.from({ length: 1000 }, (_, i) => ({
  name: `Product ${i}`,
  price: Math.random() * 1000
}));

const created = await processor.processBatch(
  products,
  batch => client.entities.records('products').bulkCreate(batch)
);
```

### WebSocket Integration

```typescript
class RealtimeClient {
  private ws: WebSocket;
  private listeners = new Map<string, Set<Function>>();
  
  constructor(private client: ApiClient) {
    this.connect();
  }
  
  private connect() {
    const token = this.client.auth.getToken();
    this.ws = new WebSocket(`wss://api.example.com/ws?token=${token}`);
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.emit(message.type, message.data);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      // Reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
    };
  }
  
  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }
  
  off(event: string, handler: Function) {
    this.listeners.get(event)?.delete(handler);
  }
  
  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(handler => handler(data));
  }
  
  subscribe(entity: string, recordId?: string) {
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      entity,
      recordId
    }));
  }
  
  unsubscribe(entity: string, recordId?: string) {
    this.ws.send(JSON.stringify({
      type: 'unsubscribe',
      entity,
      recordId
    }));
  }
}

// Usage
const realtime = new RealtimeClient(client);

// Subscribe to entity changes
realtime.subscribe('products');

// Listen for updates
realtime.on('record.created', (data) => {
  console.log('New record:', data);
});

realtime.on('record.updated', (data) => {
  console.log('Updated record:', data);
});

realtime.on('record.deleted', (data) => {
  console.log('Deleted record:', data);
});
```

---

## Browser vs Node.js

### Browser-Specific Features

```typescript
// Browser client with localStorage
const browserClient = createForBrowser({
  baseURL: 'https://api.example.com/api/v1',
  storage: {
    enabled: true,
    storage: localStorage
  }
});

// Automatic token persistence
await browserClient.auth.login({ email, password });
// Token is automatically saved to localStorage

// On page refresh, token is restored
const token = localStorage.getItem('api_token');
if (token) {
  browserClient.auth.setToken(token);
}

// File uploads with progress
const formData = new FormData();
formData.append('file', file);

await browserClient.upload('/upload', formData, {
  onUploadProgress: (progressEvent) => {
    const percentCompleted = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    console.log(`Upload progress: ${percentCompleted}%`);
  }
});
```

### Node.js-Specific Features

```typescript
// Node.js client with environment variables
const nodeClient = createForNode({
  baseURL: process.env.API_URL,
  apiKey: process.env.API_KEY,
  // No localStorage in Node.js
  storage: { enabled: false }
});

// File operations
import fs from 'fs';
import FormData from 'form-data';

const form = new FormData();
form.append('file', fs.createReadStream('data.csv'));

await nodeClient.entities.records('products').import(form);

// Streaming large datasets
import { pipeline } from 'stream/promises';

const stream = await nodeClient.entities.records('products').stream();
await pipeline(
  stream,
  fs.createWriteStream('products.jsonl')
);
```

### Universal Code

```typescript
// Code that works in both environments
import { createClient } from '@base/api-client';

const client = createClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com/api/v1',
  // Detect environment
  storage: {
    enabled: typeof window !== 'undefined'
  }
});

// Use environment-agnostic features
const entities = await client.entities.list();
```

---

## Request Interceptors

### Adding Request Interceptors

```typescript
// Add authentication header
client.interceptors.request.use((config) => {
  const token = getTokenFromSomewhere();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add request ID
client.interceptors.request.use((config) => {
  config.headers['X-Request-ID'] = generateUUID();
  return config;
});

// Log requests
client.interceptors.request.use((config) => {
  console.log(`${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Add timestamp
client.interceptors.request.use((config) => {
  config.params = {
    ...config.params,
    _t: Date.now()
  };
  return config;
});
```

### Removing Interceptors

```typescript
// Store interceptor ID
const interceptorId = client.interceptors.request.use((config) => {
  // ... interceptor logic
  return config;
});

// Remove interceptor
client.interceptors.request.eject(interceptorId);
```

---

## Response Transformers

### Transform Response Data

```typescript
// Add response interceptor
client.interceptors.response.use(
  (response) => {
    // Transform dates
    if (response.data) {
      transformDates(response.data);
    }
    
    // Add metadata
    response.data._metadata = {
      requestId: response.headers['x-request-id'],
      serverTime: response.headers['date'],
      cached: response.headers['x-cache'] === 'HIT'
    };
    
    return response;
  },
  (error) => {
    // Transform error response
    if (error.response?.data) {
      error.response.data = {
        ...error.response.data,
        timestamp: new Date().toISOString()
      };
    }
    return Promise.reject(error);
  }
);

// Recursive date transformer
function transformDates(obj: any) {
  if (obj === null || obj === undefined) return;
  
  if (typeof obj === 'string' && isISODate(obj)) {
    return new Date(obj);
  }
  
  if (Array.isArray(obj)) {
    obj.forEach(item => transformDates(item));
  } else if (typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      obj[key] = transformDates(obj[key]);
    });
  }
  
  return obj;
}
```

### Custom Response Wrapper

```typescript
class ApiResponse<T> {
  constructor(
    public data: T,
    public status: number,
    public headers: Record<string, string>,
    public meta?: any
  ) {}
  
  get isSuccess(): boolean {
    return this.status >= 200 && this.status < 300;
  }
  
  get isError(): boolean {
    return this.status >= 400;
  }
}

// Wrap responses
client.interceptors.response.use((response) => {
  return new ApiResponse(
    response.data,
    response.status,
    response.headers,
    {
      requestId: response.headers['x-request-id'],
      duration: response.headers['x-response-time']
    }
  );
});
```

---

## Retry Logic

### Default Retry Configuration

```typescript
const client = createForBrowser({
  baseURL: 'https://api.example.com/api/v1',
  retry: {
    enabled: true,
    maxAttempts: 3,
    delay: 1000,      // Start with 1 second
    maxDelay: 30000,  // Max 30 seconds
    factor: 2,        // Exponential backoff factor
    retryOn: [408, 429, 500, 502, 503, 504]
  }
});
```

### Custom Retry Logic

```typescript
class RetryHandler {
  async execute<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts?: number;
      delay?: number;
      factor?: number;
      shouldRetry?: (error: any, attempt: number) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      delay = 1000,
      factor = 2,
      shouldRetry = this.defaultShouldRetry
    } = options;
    
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
          throw error;
        }
        
        const waitTime = Math.min(
          delay * Math.pow(factor, attempt - 1),
          30000
        );
        
        console.log(`Retry attempt ${attempt} after ${waitTime}ms`);
        await this.sleep(waitTime);
      }
    }
    
    throw lastError;
  }
  
  private defaultShouldRetry(error: any, attempt: number): boolean {
    if (!error.response) {
      // Network error - retry
      return true;
    }
    
    const status = error.response.status;
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    
    return retryableStatuses.includes(status);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const retry = new RetryHandler();

const entity = await retry.execute(
  () => client.entities.get('entity-id'),
  {
    maxAttempts: 5,
    shouldRetry: (error, attempt) => {
      // Custom retry logic
      if (error.response?.status === 429) {
        // Rate limited - check retry-after header
        const retryAfter = error.response.headers['retry-after'];
        if (retryAfter && parseInt(retryAfter) > 60) {
          // Don't retry if we need to wait more than 60 seconds
          return false;
        }
      }
      return true;
    }
  }
);
```

---

## Testing

### Mocking the Client

```typescript
// __mocks__/@base/api-client.ts
export const mockApiClient = {
  auth: {
    login: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn()
  },
  entities: {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    records: jest.fn(() => ({
      list: jest.fn(),
      get: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }))
  }
};

export const createForBrowser = jest.fn(() => mockApiClient);
export const createForNode = jest.fn(() => mockApiClient);
```

### Unit Testing

```typescript
// entity.service.test.ts
import { createForBrowser } from '@base/api-client';
import { EntityService } from './entity.service';

jest.mock('@base/api-client');

describe('EntityService', () => {
  let service: EntityService;
  let mockClient: any;
  
  beforeEach(() => {
    mockClient = createForBrowser();
    service = new EntityService(mockClient);
  });
  
  describe('getEntity', () => {
    it('should fetch entity by ID', async () => {
      const mockEntity = {
        id: 'entity-1',
        name: 'products',
        displayName: 'Products'
      };
      
      mockClient.entities.get.mockResolvedValue(mockEntity);
      
      const entity = await service.getEntity('entity-1');
      
      expect(mockClient.entities.get).toHaveBeenCalledWith('entity-1');
      expect(entity).toEqual(mockEntity);
    });
    
    it('should handle errors', async () => {
      mockClient.entities.get.mockRejectedValue(
        new Error('Entity not found')
      );
      
      await expect(service.getEntity('invalid-id'))
        .rejects
        .toThrow('Entity not found');
    });
  });
});
```

### Integration Testing

```typescript
// integration.test.ts
import { createForNode } from '@base/api-client';
import nock from 'nock';

describe('API Client Integration', () => {
  let client: any;
  
  beforeEach(() => {
    client = createForNode({
      baseURL: 'https://api.example.com/api/v1'
    });
  });
  
  afterEach(() => {
    nock.cleanAll();
  });
  
  it('should handle authentication flow', async () => {
    // Mock login endpoint
    nock('https://api.example.com')
      .post('/api/v1/auth/login')
      .reply(200, {
        user: { id: 'user-1', email: 'test@example.com' },
        accessToken: 'token-123',
        refreshToken: 'refresh-123'
      });
    
    // Mock protected endpoint
    nock('https://api.example.com', {
      reqheaders: {
        authorization: 'Bearer token-123'
      }
    })
      .get('/api/v1/entities')
      .reply(200, {
        data: [],
        meta: { total: 0 }
      });
    
    // Perform login
    const loginResponse = await client.auth.login({
      email: 'test@example.com',
      password: 'password'
    });
    
    expect(loginResponse.accessToken).toBe('token-123');
    
    // Make authenticated request
    const entities = await client.entities.list();
    expect(entities.data).toEqual([]);
  });
});
```

### E2E Testing

```typescript
// e2e.test.ts
import { createForNode } from '@base/api-client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

describe('API Client E2E', () => {
  let client: any;
  let testEntityId: string;
  
  beforeAll(async () => {
    client = createForNode({
      baseURL: process.env.TEST_API_URL!,
      apiKey: process.env.TEST_API_KEY!
    });
  });
  
  afterAll(async () => {
    // Cleanup
    if (testEntityId) {
      await client.entities.delete(testEntityId);
    }
  });
  
  it('should perform full CRUD cycle', async () => {
    // Create entity
    const entity = await client.entities.create({
      name: `test_entity_${Date.now()}`,
      displayName: 'Test Entity',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    });
    
    testEntityId = entity.id;
    expect(entity.id).toBeDefined();
    
    // Create record
    const record = await client.entities.records(entity.name).create({
      name: 'Test Record'
    });
    
    expect(record.data.name).toBe('Test Record');
    
    // Update record
    const updated = await client.entities.records(entity.name).update(record.id, {
      name: 'Updated Record'
    });
    
    expect(updated.data.name).toBe('Updated Record');
    
    // Delete record
    await client.entities.records(entity.name).delete(record.id);
    
    // Verify deletion
    await expect(
      client.entities.records(entity.name).get(record.id)
    ).rejects.toThrow();
  });
});
```

---

## Best Practices

### 1. Error Handling

```typescript
// Always wrap API calls in try-catch
async function safeApiCall<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    console.error('API call failed:', error);
    
    // Report to error tracking service
    errorReporter.report(error);
    
    // Return fallback value if provided
    return fallback;
  }
}

// Usage
const entities = await safeApiCall(
  () => client.entities.list(),
  { data: [], meta: { total: 0 } }
);
```

### 2. Request Deduplication

```typescript
class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();
  
  async execute<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // Check if request is already pending
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }
    
    // Create new request
    const promise = fn().finally(() => {
      this.pending.delete(key);
    });
    
    this.pending.set(key, promise);
    return promise;
  }
}

const deduplicator = new RequestDeduplicator();

// Multiple simultaneous calls will share the same request
const [entities1, entities2] = await Promise.all([
  deduplicator.execute('entities:list', () => client.entities.list()),
  deduplicator.execute('entities:list', () => client.entities.list())
]);
```

### 3. Optimistic Updates

```typescript
class OptimisticUpdateManager {
  async update<T>(
    getCurrentData: () => T,
    optimisticUpdate: (data: T) => T,
    apiCall: () => Promise<T>,
    onError: (error: any, originalData: T) => void
  ): Promise<T> {
    const originalData = getCurrentData();
    const optimisticData = optimisticUpdate(originalData);
    
    // Update UI immediately with optimistic data
    updateUI(optimisticData);
    
    try {
      const realData = await apiCall();
      updateUI(realData);
      return realData;
    } catch (error) {
      // Revert to original data on error
      updateUI(originalData);
      onError(error, originalData);
      throw error;
    }
  }
}
```

### 4. Pagination Helper

```typescript
class PaginationHelper {
  async *paginate<T>(
    fetcher: (page: number) => Promise<{ data: T[]; meta: { totalPages: number } }>,
    startPage: number = 1
  ): AsyncGenerator<T[], void, unknown> {
    let currentPage = startPage;
    let totalPages = Infinity;
    
    while (currentPage <= totalPages) {
      const response = await fetcher(currentPage);
      totalPages = response.meta.totalPages;
      
      yield response.data;
      
      currentPage++;
    }
  }
  
  async fetchAll<T>(
    fetcher: (page: number) => Promise<{ data: T[]; meta: { totalPages: number } }>
  ): Promise<T[]> {
    const allData: T[] = [];
    
    for await (const pageData of this.paginate(fetcher)) {
      allData.push(...pageData);
    }
    
    return allData;
  }
}

// Usage
const helper = new PaginationHelper();

// Fetch all pages
const allRecords = await helper.fetchAll(
  (page) => client.entities.records('products').list({ page, limit: 100 })
);

// Process pages as they arrive
for await (const records of helper.paginate(
  (page) => client.entities.records('products').list({ page })
)) {
  console.log(`Processing ${records.length} records`);
  await processRecords(records);
}
```

### 5. Connection Pool

```typescript
class ClientPool {
  private clients: ApiClient[] = [];
  private currentIndex = 0;
  
  constructor(urls: string[], config?: Partial<ApiClientConfig>) {
    this.clients = urls.map(url => 
      createForNode({ ...config, baseURL: url })
    );
  }
  
  getClient(): ApiClient {
    const client = this.clients[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.clients.length;
    return client;
  }
  
  async execute<T>(fn: (client: ApiClient) => Promise<T>): Promise<T> {
    const client = this.getClient();
    return fn(client);
  }
}

// Usage with multiple API endpoints
const pool = new ClientPool([
  'https://api1.example.com/api/v1',
  'https://api2.example.com/api/v1',
  'https://api3.example.com/api/v1'
]);

const entities = await pool.execute(
  client => client.entities.list()
);
```

---

## API Reference

### Main Client

```typescript
class ApiClient {
  constructor(config: ApiClientConfig);
  
  // Sub-clients
  auth: AuthClient;
  entities: EntitiesClient;
  apiKeys: ApiKeysClient;
  users: UsersClient;
  functions: FunctionsClient;
  analytics: AnalyticsClient;
  
  // Direct request methods
  request<T = any>(config: AxiosRequestConfig): Promise<T>;
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  
  // Interceptors
  interceptors: {
    request: AxiosInterceptorManager<AxiosRequestConfig>;
    response: AxiosInterceptorManager<AxiosResponse>;
  };
}
```

### AuthClient

```typescript
class AuthClient {
  // Authentication
  login(credentials: LoginDto): Promise<TokenResponse>;
  register(data: RegisterDto): Promise<TokenResponse>;
  logout(): Promise<void>;
  
  // Token management
  refreshToken(): Promise<TokenResponse>;
  getToken(): string | null;
  setToken(token: string): void;
  clearToken(): void;
  isAuthenticated(): boolean;
  
  // User profile
  getProfile(): Promise<User>;
  updateProfile(data: UpdateProfileDto): Promise<User>;
  changePassword(data: ChangePasswordDto): Promise<void>;
  
  // OAuth
  getOAuthUrl(params: OAuthParams): string;
  handleOAuthCallback(params: OAuthCallbackParams): Promise<TokenResponse>;
  
  // Password reset
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
  
  // Email verification
  sendVerificationEmail(): Promise<void>;
  verifyEmail(token: string): Promise<void>;
}
```

### EntitiesClient

```typescript
class EntitiesClient {
  // Entity CRUD
  list(params?: ListParams): Promise<PaginatedResponse<Entity>>;
  get(id: string): Promise<Entity>;
  create(data: CreateEntityDto): Promise<Entity>;
  update(id: string, data: UpdateEntityDto): Promise<Entity>;
  delete(id: string): Promise<void>;
  
  // Schema operations
  getSchema(id: string): Promise<JsonSchema>;
  validateData(id: string, data: any): Promise<ValidationResult>;
  
  // Records sub-client
  records<T = any>(entityId: string): RecordsClient<T>;
}
```

### RecordsClient

```typescript
class RecordsClient<T = any> {
  // CRUD operations
  list(params?: RecordListParams): Promise<PaginatedResponse<EntityRecord<T>>>;
  get(id: string, params?: GetParams): Promise<EntityRecord<T>>;
  create(data: T): Promise<EntityRecord<T>>;
  update(id: string, data: T): Promise<EntityRecord<T>>;
  patch(id: string, data: Partial<T>): Promise<EntityRecord<T>>;
  delete(id: string): Promise<void>;
  
  // Bulk operations
  bulkCreate(records: T[]): Promise<BulkResult>;
  bulkUpdate(updates: BulkUpdate<T>[]): Promise<BulkResult>;
  bulkDelete(ids: string[]): Promise<BulkResult>;
  
  // Query operations
  query(query: QueryParams): Promise<QueryResult<T>>;
  search(search: string, params?: SearchParams): Promise<PaginatedResponse<EntityRecord<T>>>;
  
  // Import/Export
  import(data: FormData, options?: ImportOptions): Promise<ImportResult>;
  export(params?: ExportParams): Promise<Blob>;
  
  // Streaming (Node.js only)
  stream(params?: StreamParams): Promise<ReadableStream>;
}
```

---

## Conclusion

The API Client library provides a comprehensive, type-safe, and efficient way to interact with the Base Platform API. With support for both browser and Node.js environments, automatic token management, retry logic, and extensive TypeScript support, it simplifies API integration while maintaining flexibility for advanced use cases.

For more information and updates, visit the [GitHub repository](https://github.com/your-org/api-client) or check the [API documentation](https://api.example.com/docs).