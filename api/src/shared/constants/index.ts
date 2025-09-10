// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  API_USER: 'api_user',
} as const;

// API Key status
export const API_KEY_STATUS = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
} as const;

// Function runtimes
export const FUNCTION_RUNTIMES = {
  JAVASCRIPT: 'javascript',
  PYTHON: 'python',
  TYPESCRIPT: 'typescript',
} as const;

// Execution status
export const EXECUTION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
} as const;

// Cache keys
export const CACHE_KEYS = {
  USER: 'user',
  ENTITY: 'entity',
  SCHEMA: 'schema',
  API_KEY: 'api_key',
  RATE_LIMIT: 'rate_limit',
} as const;

// Default pagination
export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// Validation limits
export const VALIDATION_LIMITS = {
  EMAIL_MAX_LENGTH: 255,
  USERNAME_MAX_LENGTH: 100,
  NAME_MAX_LENGTH: 255,
  DESCRIPTION_MAX_LENGTH: 1000,
  PASSWORD_MIN_LENGTH: 8,
  API_KEY_NAME_MAX_LENGTH: 255,
} as const;

// Error types
export const ERROR_TYPES = {
  VALIDATION_ERROR: 'https://api.example.com/errors/validation-error',
  AUTHENTICATION_ERROR: 'https://api.example.com/errors/authentication-error',
  AUTHORIZATION_ERROR: 'https://api.example.com/errors/authorization-error',
  NOT_FOUND_ERROR: 'https://api.example.com/errors/not-found-error',
  CONFLICT_ERROR: 'https://api.example.com/errors/conflict-error',
  RATE_LIMIT_ERROR: 'https://api.example.com/errors/rate-limit-error',
  INTERNAL_ERROR: 'https://api.example.com/errors/internal-error',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    API_KEYS: '/auth/api-keys',
  },
  ENTITIES: {
    BASE: '/entities',
    RECORDS: '/entities/:id/records',
    DYNAMIC: '/api/dynamic/:name',
  },
  FUNCTIONS: {
    BASE: '/functions',
    EXECUTE: '/functions/:id/execute',
  },
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
  },
  SYSTEM: {
    HEALTH: '/health',
    METRICS: '/metrics',
    SETTINGS: '/system/settings',
  },
} as const;

// Regex patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,30}$/,
  ENTITY_NAME: /^[a-z0-9_]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;

// Default schemas
export const DEFAULT_SCHEMAS = {
  ENTITY: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
      },
    },
    required: ['name'],
  },
} as const;

// Rate limiting defaults
export const RATE_LIMITS = {
  DEFAULT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },
  API_KEY: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 1000,
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5,
  },
} as const;