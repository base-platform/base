import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { ApiConfig, RequestOptions, ErrorResponse, ProblemDetail } from '../types';

export interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  maxRetryDelay?: number;
  retryCondition?: (error: AxiosError) => boolean;
  onRetry?: (retryCount: number, error: AxiosError) => void;
}

export class BaseApiClient {
  protected client: AxiosInstance;
  protected accessToken: string | null = null;
  protected apiKey: string | null = null;
  private retryConfig: RetryConfig;

  constructor(config: ApiConfig & { retry?: RetryConfig }) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      withCredentials: config.withCredentials || false,
    });

    this.retryConfig = {
      maxRetries: config.retry?.maxRetries ?? 3,
      retryDelay: config.retry?.retryDelay ?? 1000,
      maxRetryDelay: config.retry?.maxRetryDelay ?? 30000,
      retryCondition: config.retry?.retryCondition ?? this.defaultRetryCondition,
      onRetry: config.retry?.onRetry,
    };

    this.setupInterceptors();
  }

  /**
   * Set the access token for authenticated requests
   */
  public setAccessToken(token: string | null): void {
    this.accessToken = token;
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  /**
   * Set the API key for authenticated requests
   */
  public setApiKey(key: string | null): void {
    this.apiKey = key;
    if (key) {
      this.client.defaults.headers.common['X-API-Key'] = key;
    } else {
      delete this.client.defaults.headers.common['X-API-Key'];
    }
  }

  /**
   * Get the current access token
   */
  public getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Get the current API key
   */
  public getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add timestamp to requests
        config.headers['X-Request-Time'] = new Date().toISOString();
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor with retry logic
    this.client.interceptors.response.use(
      (response) => {
        // Successful response
        return response;
      },
      async (error: AxiosError) => {
        const config: any = error.config;
        
        // Initialize retry count
        if (!config.__retryCount) {
          config.__retryCount = 0;
        }
        
        // Check if we should retry
        if (
          config.__retryCount < this.retryConfig.maxRetries! &&
          this.retryConfig.retryCondition!(error)
        ) {
          config.__retryCount++;
          
          // Calculate delay with exponential backoff
          const delay = Math.min(
            this.retryConfig.retryDelay! * Math.pow(2, config.__retryCount - 1),
            this.retryConfig.maxRetryDelay!
          );
          
          // Add jitter to prevent thundering herd
          const jitteredDelay = delay + Math.random() * 1000;
          
          // Call onRetry callback if provided
          if (this.retryConfig.onRetry) {
            this.retryConfig.onRetry(config.__retryCount, error);
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, jitteredDelay));
          
          // Retry the request
          return this.client(config);
        }
        
        // Handle errors
        const errorResponse = this.handleError(error);
        return Promise.reject(errorResponse);
      }
    );
  }

  /**
   * Default retry condition
   */
  private defaultRetryCondition(error: AxiosError): boolean {
    // Retry on network errors
    if (!error.response) {
      return true;
    }
    
    // Retry on 5xx errors
    if (error.response.status >= 500) {
      return true;
    }
    
    // Retry on specific 4xx errors
    if (error.response.status === 429 || error.response.status === 408) {
      return true;
    }
    
    // Don't retry on other errors
    return false;
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError): ErrorResponse | ProblemDetail {
    if (error.response) {
      // Server responded with error
      const data = error.response.data as any;
      
      // Check if it's a Problem Detail response (RFC 7807)
      if (data.type && data.title && data.status) {
        return data as ProblemDetail;
      }

      // Standard error response
      return {
        statusCode: error.response.status,
        message: data.message || error.message,
        error: data.error || error.code,
        details: data.details || data.errors,
      };
    } else if (error.request) {
      // Request was made but no response (likely network or connection error)
      const isTimeout = error.code === 'ECONNABORTED';
      const isNetworkError = error.code === 'ERR_NETWORK' || error.code === 'ENOTFOUND';
      const isDatabaseError = error.message?.toLowerCase().includes('database') || 
                             error.message?.toLowerCase().includes('connection');
      
      return {
        statusCode: 0,
        message: isTimeout ? 'Request timeout' : 
                 isNetworkError ? 'Network error - server may be unreachable' :
                 isDatabaseError ? 'Database connection error' :
                 'No response from server',
        error: isTimeout ? 'TIMEOUT_ERROR' : 
               isNetworkError ? 'NETWORK_ERROR' :
               isDatabaseError ? 'DATABASE_ERROR' :
               'CONNECTION_ERROR',
      };
    } else {
      // Something else happened
      return {
        statusCode: 0,
        message: error.message,
        error: 'REQUEST_ERROR',
      };
    }
  }

  /**
   * Make a GET request
   */
  protected async get<T>(url: string, options?: RequestOptions): Promise<T> {
    const config: AxiosRequestConfig = {
      params: options?.params,
      headers: options?.headers,
      timeout: options?.timeout,
      signal: options?.signal,
      responseType: options?.responseType,
    };

    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * Make a POST request
   */
  protected async post<T>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: options?.headers,
      timeout: options?.timeout,
      signal: options?.signal,
    };

    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a PUT request
   */
  protected async put<T>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: options?.headers,
      timeout: options?.timeout,
      signal: options?.signal,
    };

    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a PATCH request
   */
  protected async patch<T>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: options?.headers,
      timeout: options?.timeout,
      signal: options?.signal,
    };

    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a DELETE request
   */
  protected async delete<T>(url: string, options?: RequestOptions): Promise<T> {
    const config: AxiosRequestConfig = {
      params: options?.params,
      headers: options?.headers,
      timeout: options?.timeout,
      signal: options?.signal,
    };

    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  /**
   * Check if the API is healthy
   */
  public async checkHealth(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check database health
   */
  public async checkDatabaseHealth(): Promise<any> {
    return this.get('/health/database');
  }

  /**
   * Upload a file
   */
  protected async upload<T>(url: string, formData: FormData, options?: RequestOptions): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...options?.headers,
      },
      timeout: options?.timeout || 60000, // Longer timeout for uploads
      signal: options?.signal,
    };

    const response = await this.client.post<T>(url, formData, config);
    return response.data;
  }

  /**
   * Download a file
   */
  protected async download(url: string, options?: RequestOptions): Promise<Blob> {
    const config: AxiosRequestConfig = {
      responseType: 'blob',
      headers: options?.headers,
      timeout: options?.timeout || 60000, // Longer timeout for downloads
      signal: options?.signal,
    };

    const response = await this.client.get<Blob>(url, config);
    return response.data;
  }
}