import { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

/**
 * Factory for creating mock responses
 */
export class MockFactory {
  /**
   * Create a successful axios response
   */
  static createResponse<T>(data: T, status = 200): AxiosResponse<T> {
    return {
      data,
      status,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    };
  }

  /**
   * Create an error response
   */
  static createErrorResponse(status: number, message: string, details?: any) {
    // Create the transformed error that BaseApiClient would return
    const transformedError = {
      statusCode: status,
      message,
      error: status >= 500 ? 'Internal Server Error' : 'Bad Request',
      details
    };
    
    // Also create the axios error structure for compatibility
    const error: any = new Error(message);
    error.response = {
      status,
      data: {
        statusCode: status,
        message,
        error: status >= 500 ? 'Internal Server Error' : 'Bad Request',
        details
      },
      statusText: status >= 500 ? 'Internal Server Error' : 'Bad Request',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    };
    error.isAxiosError = true;
    
    // Return the transformed error directly since BaseApiClient might not transform it in tests
    return transformedError;
  }

  /**
   * Create a network error (no response)
   */
  static createNetworkError(message = 'Network Error') {
    // Return the transformed error that BaseApiClient would return for network errors
    return {
      statusCode: 0,
      message: 'Network error - server may be unreachable',
      error: 'NETWORK_ERROR',
    };
  }

  /**
   * Create mock user data
   */
  static createUser(overrides = {}) {
    return {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      isActive: true,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create mock auth response
   */
  static createAuthResponse(overrides = {}) {
    return {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: this.createUser(),
      ...overrides
    };
  }

  /**
   * Create mock entity
   */
  static createEntity(overrides = {}) {
    return {
      id: 'entity-123',
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
      },
      version: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create mock entity record
   */
  static createEntityRecord(overrides = {}) {
    return {
      id: 'record-123',
      entityId: 'entity-123',
      data: {
        name: 'Test Product',
        price: 99.99
      },
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create mock API key
   */
  static createApiKey(overrides = {}) {
    return {
      id: 'key-123',
      name: 'Test API Key',
      key: 'sk_test_1234567890',
      status: 'active',
      permissions: ['read', 'write'],
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create paginated response
   */
  static createPaginatedResponse<T>(data: T[], page = 1, limit = 10, total = 100) {
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasPreviousPage: page > 1,
        hasNextPage: page < Math.ceil(total / limit)
      }
    };
  }

  /**
   * Create MFA setup response
   */
  static createMFASetup(overrides = {}) {
    return {
      secret: 'JBSWY3DPEHPK3PXP',
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
      ...overrides
    };
  }

  /**
   * Create session
   */
  static createSession(overrides = {}) {
    return {
      id: 'session-123',
      userId: 'user-123',
      userAgent: 'Mozilla/5.0',
      ipAddress: '192.168.1.1',
      fingerprint: 'fp-123',
      isActive: true,
      isTrusted: false,
      lastActivity: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create rate limit rule
   */
  static createRateLimitRule(overrides = {}) {
    return {
      name: 'api-default',
      endpoint: '/api/v1/*',
      method: 'GET',
      maxRequests: 100,
      windowMs: 60000,
      isActive: true,
      priority: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create security setting
   */
  static createSecuritySetting(overrides = {}) {
    return {
      key: 'password_min_length',
      value: 8,
      type: 'number',
      category: 'authentication',
      description: 'Minimum password length',
      defaultValue: 8,
      validation: {
        min: 6,
        max: 128
      },
      ...overrides
    };
  }
}