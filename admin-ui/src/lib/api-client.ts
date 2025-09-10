import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Type definitions
export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive?: boolean;
  emailVerified?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Entity {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  schema: any;
  version?: number;
  is_active?: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  _count?: {
    entity_records: number;
  };
}

export interface EntityRecord {
  id: string;
  entityId: string;
  data: any;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key?: string;
  keyPrefix?: string;
  permissions?: string[];
  rateLimit?: number;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  success?: boolean;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

export interface ProblemDetail {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

export interface DashboardStats {
  totalEntities: {
    value: number;
    change: string;
    percentage: number;
  };
  totalApiKeys: {
    value: number;
    change: string;
    percentage: number;
  };
  totalFunctions: {
    value: number;
    change: string;
    percentage: number;
  };
  totalUsers: {
    value: number;
    change: string;
    percentage: number;
  };
}

export interface DashboardActivity {
  action: string;
  entity: string;
  time: string;
  user: string;
}

export interface DashboardApiUsage {
  date: string;
  requests: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recentActivity: DashboardActivity[];
  apiUsage: DashboardApiUsage[];
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface CreateEntityRequest {
  name: string;
  displayName: string;
  description?: string;
  schema: any;
  permissions?: any;
  settings?: any;
  isPublic?: boolean;
}

export interface UpdateEntityRequest {
  displayName?: string;
  description?: string;
  schema?: any;
  permissions?: any;
  settings?: any;
  isPublic?: boolean;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions?: string[];
  expiresAt?: string;
  rateLimit?: number;
}

export interface CreateUserRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  sendInvite?: boolean;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface InviteUserRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
}

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface DatabaseHealth {
  status: 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'error';
  lastConnected?: string;
  lastError?: string;
  reconnectAttempts: number;
  uptime?: number;
}

// Token Storage utility
export class TokenStorage {
  private static TOKEN_KEY = 'access_token';
  private static REFRESH_TOKEN_KEY = 'refresh_token';
  private static SESSION_EXPIRY_KEY = 'session_expiry';
  private static LAST_ACTIVITY_KEY = 'last_activity';

  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      // Check if token is expired before returning it
      if (this.isSessionExpired()) {
        this.clear();
        return null;
      }
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  static setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
      this.updateSessionExpiry();
      this.updateLastActivity();
    }
  }

  static getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  static setRefreshToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
    }
  }

  static updateSessionExpiry(): void {
    if (typeof window !== 'undefined') {
      const sessionDurationMs = this.getSessionDuration();
      const expiryTime = Date.now() + sessionDurationMs;
      localStorage.setItem(this.SESSION_EXPIRY_KEY, expiryTime.toString());
    }
  }

  static updateLastActivity(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.LAST_ACTIVITY_KEY, Date.now().toString());
    }
  }

  static isSessionExpired(): boolean {
    if (typeof window !== 'undefined') {
      const expiryTime = localStorage.getItem(this.SESSION_EXPIRY_KEY);
      if (!expiryTime) return false;
      
      const now = Date.now();
      const expiry = parseInt(expiryTime, 10);
      
      return now > expiry;
    }
    return false;
  }

  static getSessionDuration(): number {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('session_duration_ms');
      if (stored) {
        return parseInt(stored, 10);
      }
    }
    // Default to 8 hours if not configured
    return 8 * 60 * 60 * 1000;
  }

  static getRemainingSessionTime(): number {
    if (typeof window !== 'undefined') {
      const expiryTime = localStorage.getItem(this.SESSION_EXPIRY_KEY);
      if (!expiryTime) return 0;
      
      const now = Date.now();
      const expiry = parseInt(expiryTime, 10);
      
      return Math.max(0, expiry - now);
    }
    return 0;
  }

  static clear(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.SESSION_EXPIRY_KEY);
      localStorage.removeItem(this.LAST_ACTIVITY_KEY);
    }
  }
}

// API Client Class
export class ApiClient {
  private _axios: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string, config?: AxiosRequestConfig) {
    this.baseURL = baseURL;
    this._axios = axios.create({
      baseURL,
      timeout: 30000,
      withCredentials: true,
      ...config,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
    });

    // Request interceptor to add auth token
    this.axios.interceptors.request.use((config) => {
      const token = TokenStorage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          TokenStorage.clear();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Static factory methods
  static create(baseURL: string, config?: AxiosRequestConfig): ApiClient {
    return new ApiClient(baseURL, config);
  }

  static createForBrowser(config?: AxiosRequestConfig): ApiClient {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    return new ApiClient(baseURL, { withCredentials: true, ...config });
  }

  static createForNode(config?: AxiosRequestConfig): ApiClient {
    const baseURL = process.env.API_URL || 'http://localhost:3001/api/v1';
    return new ApiClient(baseURL, { withCredentials: false, ...config });
  }

  // Public getter for axios instance (for backward compatibility)
  get axios(): AxiosInstance {
    return this._axios;
  }

  // Token management
  setAccessToken(token: string | null): void {
    if (token) {
      TokenStorage.setToken(token);
      this._axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      TokenStorage.clear();
      delete this._axios.defaults.headers.common['Authorization'];
    }
  }

  getAccessToken(): string | null {
    return TokenStorage.getToken();
  }

  setApiKey(key: string | null): void {
    if (key) {
      this._axios.defaults.headers.common['X-API-Key'] = key;
    } else {
      delete this._axios.defaults.headers.common['X-API-Key'];
    }
  }

  getApiKey(): string | null {
    return this._axios.defaults.headers.common['X-API-Key'] as string || null;
  }

  // Auth methods
  auth = (() => {
    const client = this;
    return {
      login: async (data: LoginRequest): Promise<AuthResponse> => {
        const response = await client._axios.post<AuthResponse>('/auth/login', data);
        const { accessToken, refreshToken } = response.data;
        TokenStorage.setToken(accessToken);
        if (refreshToken) {
          TokenStorage.setRefreshToken(refreshToken);
        }
        client.setAccessToken(accessToken);
        return response.data;
      },

      register: async (data: RegisterRequest): Promise<AuthResponse> => {
        const response = await client._axios.post<AuthResponse>('/auth/register', data);
        const { accessToken, refreshToken } = response.data;
        TokenStorage.setToken(accessToken);
        if (refreshToken) {
          TokenStorage.setRefreshToken(refreshToken);
        }
        client.setAccessToken(accessToken);
        return response.data;
      },

      logout: async (): Promise<void> => {
        try {
          await client._axios.post('/auth/logout');
        } finally {
          TokenStorage.clear();
          client.setAccessToken(null);
        }
      },

      refreshToken: async (): Promise<AuthResponse> => {
        const refreshToken = TokenStorage.getRefreshToken();
        const response = await client._axios.post<AuthResponse>('/auth/refresh', {
          refreshToken,
        });
        const { accessToken } = response.data;
        TokenStorage.setToken(accessToken);
        client.setAccessToken(accessToken);
        return response.data;
      },
    };
  })();

  // Entity methods
  entities = (() => {
    const client = this;
    return {
      list: async (params?: any): Promise<Entity[]> => {
        const response = await client._axios.get<Entity[]>('/entities', { 
          params: {
            ...params,
            include_count: true
          }
        });
        return response.data;
      },

      get: async (id: string): Promise<Entity> => {
        const response = await client._axios.get<Entity>(`/entities/${id}`);
        return response.data;
      },

      create: async (data: CreateEntityRequest): Promise<Entity> => {
        const response = await client._axios.post<Entity>('/entities', data);
        return response.data;
      },

      update: async (id: string, data: UpdateEntityRequest): Promise<Entity> => {
        const response = await client._axios.put<Entity>(`/entities/${id}`, data);
        return response.data;
      },

      delete: async (id: string): Promise<void> => {
        await client._axios.delete(`/entities/${id}`);
      },

      validateData: async (id: string, data: any): Promise<ValidationResult> => {
        const response = await client._axios.post<ValidationResult>(`/entities/${id}/validate`, data);
        return response.data;
      },

      // Records sub-client
      records: (entityId: string) => ({
        list: async (params?: any): Promise<PaginatedResponse<EntityRecord>> => {
          const response = await client._axios.get<PaginatedResponse<EntityRecord>>(
            `/entities/${entityId}/records`,
            { params }
          );
          return response.data;
        },

        get: async (recordId: string): Promise<EntityRecord> => {
          const response = await client._axios.get<EntityRecord>(
            `/entities/${entityId}/records/${recordId}`
          );
          return response.data;
        },

        create: async (data: any): Promise<EntityRecord> => {
          const response = await client._axios.post<EntityRecord>(
            `/entities/${entityId}/records`,
            data
          );
          return response.data;
        },

        update: async (recordId: string, data: any): Promise<EntityRecord> => {
          const response = await client._axios.put<EntityRecord>(
            `/entities/${entityId}/records/${recordId}`,
            data
          );
          return response.data;
        },

        delete: async (recordId: string): Promise<void> => {
          await client._axios.delete(`/entities/${entityId}/records/${recordId}`);
        },

        bulkCreate: async (records: any[]): Promise<any> => {
          const response = await client._axios.post(
            `/entities/${entityId}/records/bulk`,
            { records }
          );
          return response.data;
        },
      }),
    };
  })();

  // API Key methods
  apiKeys = (() => {
    const client = this;
    return {
      list: async (): Promise<ApiKey[]> => {
        const response = await client._axios.get<ApiKey[]>('/api-keys');
        return response.data;
      },

      create: async (data: CreateApiKeyRequest): Promise<ApiKey> => {
        const response = await client._axios.post<ApiKey>('/api-keys', data);
        return response.data;
      },

      revoke: async (id: string): Promise<void> => {
        await client._axios.delete(`/api-keys/${id}`);
      },
    };
  })();

  // User management methods
  users = (() => {
    const client = this;
    return {
      list: async (params?: any): Promise<PaginatedResponse<User>> => {
        const response = await client._axios.get<PaginatedResponse<User>>('/admin/users', { params });
        return response.data;
      },

      get: async (id: string): Promise<User> => {
        const response = await client._axios.get<User>(`/admin/users/${id}`);
        return response.data;
      },

      create: async (data: CreateUserRequest): Promise<User> => {
        const response = await client._axios.post<User>('/admin/users', data);
        return response.data;
      },

      update: async (id: string, data: UpdateUserRequest): Promise<User> => {
        const response = await client._axios.put<User>(`/admin/users/${id}`, data);
        return response.data;
      },

      delete: async (id: string): Promise<void> => {
        await client._axios.delete(`/admin/users/${id}`);
      },

      invite: async (data: InviteUserRequest): Promise<{ message: string; inviteId?: string }> => {
        const response = await client._axios.post<{ message: string; inviteId?: string }>('/admin/users/invite', data);
        return response.data;
      },

      getCurrentUser: async (): Promise<User> => {
        const response = await client._axios.get<User>('/auth/me');
        return response.data;
      },

      updateCurrentUser: async (data: Partial<UpdateUserRequest>): Promise<User> => {
        const response = await client._axios.put<User>('/auth/me', data);
        return response.data;
      },
    };
  })();

  // Dashboard methods
  dashboard = (() => {
    const client = this;
    return {
        getStats: async (): Promise<DashboardResponse> => {
        const response = await client._axios.get<DashboardResponse>('/dashboard');
        return response.data;
      },
    };
  })();

  // Health methods
  health = (() => {
    const client = this;
    return {
      getDatabaseHealth: async (): Promise<DatabaseHealth> => {
        const response = await client._axios.get<DatabaseHealth>('/health/database');
        return response.data;
      },
      
      getSystemHealth: async (): Promise<{ status: string; timestamp: string; database: DatabaseHealth }> => {
        const response = await client._axios.get('/health');
        return response.data;
      },
    };
  })();
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

// Create the singleton instance for the frontend app
export const apiClient = ApiClient.create(API_BASE_URL, {
  withCredentials: true,
  timeout: 30000,
});

// Create an alias for compatibility
export const appClient = apiClient;

// Set token from localStorage if available
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('access_token');
  if (token) {
    apiClient.setAccessToken(token);
  }
}