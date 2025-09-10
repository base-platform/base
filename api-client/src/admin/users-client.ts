import { BaseApiClient } from '../core/base-client';
import { RequestOptions, User, PaginatedResponse, UserFilters } from '../types';

export interface CreateUserRequest {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'user' | 'api_user';
  isActive?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'user' | 'api_user';
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  usersByRole: Record<string, number>;
  recentRegistrations: number;
  lastDayActive: number;
}

/**
 * Client for User management operations (Admin only)
 */
export class AdminUsersClient extends BaseApiClient {
  /**
   * Get all users with optional filters and pagination
   */
  async getUsers(filters?: UserFilters, options?: RequestOptions): Promise<PaginatedResponse<User>> {
    return this.get<PaginatedResponse<User>>('/admin/users', {
      params: filters,
      ...options
    });
  }

  /**
   * Get a user by ID
   */
  async getUserById(userId: string, options?: RequestOptions): Promise<User> {
    return this.get<User>(`/admin/users/${userId}`, options);
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserRequest, options?: RequestOptions): Promise<User> {
    return this.post<User>('/admin/users', data, options);
  }

  /**
   * Update a user
   */
  async updateUser(userId: string, data: UpdateUserRequest, options?: RequestOptions): Promise<User> {
    return this.put<User>(`/admin/users/${userId}`, data, options);
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string, options?: RequestOptions): Promise<void> {
    await this.delete(`/admin/users/${userId}`, options);
  }

  /**
   * Activate a user account
   */
  async activateUser(userId: string, options?: RequestOptions): Promise<User> {
    return this.post<User>(`/admin/users/${userId}/activate`, {}, options);
  }

  /**
   * Deactivate a user account
   */
  async deactivateUser(userId: string, options?: RequestOptions): Promise<User> {
    return this.post<User>(`/admin/users/${userId}/deactivate`, {}, options);
  }

  /**
   * Get user statistics overview
   */
  async getUserStats(options?: RequestOptions): Promise<UserStats> {
    return this.get<UserStats>('/admin/users/stats/overview', options);
  }

  /**
   * Reset user password (admin action)
   */
  async resetUserPassword(userId: string, newPassword: string, options?: RequestOptions): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/admin/users/${userId}/reset-password`, { newPassword }, options);
  }

  /**
   * Force verify user email
   */
  async verifyUserEmail(userId: string, options?: RequestOptions): Promise<User> {
    return this.post<User>(`/admin/users/${userId}/verify-email`, {}, options);
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeUserSessions(userId: string, options?: RequestOptions): Promise<{ revokedCount: number }> {
    return this.post<{ revokedCount: number }>(`/admin/users/${userId}/revoke-sessions`, {}, options);
  }

  /**
   * Export users data
   */
  async exportUsers(format: 'csv' | 'json' = 'json', filters?: UserFilters, options?: RequestOptions): Promise<Blob | any> {
    const response = await this.get(`/admin/users/export/${format}`, {
      params: filters,
      responseType: format === 'csv' ? 'blob' : 'json',
      ...options
    });
    return response;
  }

  /**
   * Import users from file
   */
  async importUsers(file: File, options?: RequestOptions): Promise<{ imported: number; errors?: any[] }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.post<{ imported: number; errors?: any[] }>('/admin/users/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...options
    });
  }
}