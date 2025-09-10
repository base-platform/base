// Database entities
export interface User {
  id: string;
  email: string;
  username?: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'user' | 'api_user';
  is_active: boolean;
  email_verified: boolean;
  email_verified_at?: Date;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Entity {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  schema: any;
  version: number;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface EntityRecord {
  id: string;
  entity_id: string;
  data: any;
  metadata?: any;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ApiKey {
  id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  user_id: string;
  status: 'active' | 'revoked' | 'expired';
  permissions: any[];
  rate_limit?: number;
  expires_at?: Date;
  last_used_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface FunctionEntity {
  id: string;
  name: string;
  description?: string;
  code: string;
  runtime: 'javascript' | 'python' | 'typescript';
  timeout: number;
  memory: number;
  env_vars?: any;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

// API response types
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// JWT payload
export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

// Request context
export interface RequestContext {
  user?: User;
  apiKey?: ApiKey;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Validation schemas
export interface JsonSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: any;
}

// Error types
export interface ErrorDetail {
  code: string;
  message: string;
  field?: string;
  context?: any;
}

export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  timestamp?: string;
  errors?: ErrorDetail[];
}

// Configuration
export interface DatabaseConfig {
  url: string;
  logLevel?: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface AppConfig {
  port: number;
  environment: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
}