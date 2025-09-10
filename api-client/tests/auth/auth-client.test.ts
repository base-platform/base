import { AuthClient } from '../../src/auth/auth-client';
import { axiosMock } from '../utils/axios-mock';
import { MockFactory } from '../utils/mock-factory';

describe('AuthClient', () => {
  let authClient: AuthClient;
  const baseUrl = 'http://localhost:3001/api/v1';

  beforeEach(() => {
    axiosMock.reset();
    authClient = new AuthClient({ baseUrl });
  });

  describe('Authentication', () => {
    describe('login', () => {
      it('should login successfully and set access token', async () => {
        const loginData = {
          email: 'user@example.com',
          password: 'password123',
        };
        const authResponse = MockFactory.createAuthResponse();
        
        axiosMock.mockPost('/auth/login', authResponse);

        const result = await authClient.login(loginData);
        
        expect(result).toEqual(authResponse);
        expect(authClient.getAccessToken()).toBe(authResponse.accessToken);
      });

      it('should handle login failure', async () => {
        const loginData = {
          email: 'invalid@example.com',
          password: 'wrong',
        };
        
        axiosMock.mockError('post', '/auth/login', 401, 'Invalid credentials');

        await expect(authClient.login(loginData)).rejects.toMatchObject({
          statusCode: 401,
          message: 'Invalid credentials',
        });
        
        expect(authClient.getAccessToken()).toBeNull();
      });

      it('should handle MFA required response', async () => {
        const loginData = {
          email: 'mfa@example.com',
          password: 'password123',
        };
        
        axiosMock.mockPost('/auth/login', {
          mfaRequired: true,
          tempToken: 'temp-token-123',
        });

        const result = await authClient.login(loginData);
        expect(result).toHaveProperty('mfaRequired', true);
      });
    });

    describe('register', () => {
      it('should register successfully and set access token', async () => {
        const registerData = {
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
        };
        const authResponse = MockFactory.createAuthResponse();
        
        axiosMock.mockPost('/auth/register', authResponse);

        const result = await authClient.register(registerData);
        
        expect(result).toEqual(authResponse);
        expect(authClient.getAccessToken()).toBe(authResponse.accessToken);
      });

      it('should handle registration failure', async () => {
        const registerData = {
          email: 'existing@example.com',
          password: 'password123',
        };
        
        axiosMock.mockError('post', '/auth/register', 409, 'User already exists');

        await expect(authClient.register(registerData)).rejects.toMatchObject({
          statusCode: 409,
          message: 'User already exists',
        });
      });
    });

    describe('logout', () => {
      it('should logout and clear access token', async () => {
        authClient.setAccessToken('test-token');
        axiosMock.mockPost('/auth/logout', {});

        await authClient.logout();
        
        expect(authClient.getAccessToken()).toBeNull();
      });

      it('should handle logout error gracefully', async () => {
        authClient.setAccessToken('test-token');
        axiosMock.mockError('post', '/auth/logout', 500, 'Server error');

        await expect(authClient.logout()).rejects.toMatchObject({
          statusCode: 500,
        });
        
        // Token should still be cleared
        expect(authClient.getAccessToken()).toBeNull();
      });
    });

    describe('refresh', () => {
      it('should refresh token successfully', async () => {
        const refreshToken = 'refresh-token-123';
        const newAuthResponse = MockFactory.createAuthResponse({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        });
        
        axiosMock.mockPost('/auth/refresh', newAuthResponse);

        const result = await authClient.refresh(refreshToken);
        
        expect(result).toEqual(newAuthResponse);
        expect(authClient.getAccessToken()).toBe(newAuthResponse.accessToken);
      });

      it('should handle invalid refresh token', async () => {
        const invalidToken = 'invalid-refresh-token';
        
        axiosMock.mockError('post', '/auth/refresh', 401, 'Invalid refresh token');

        await expect(authClient.refresh(invalidToken)).rejects.toMatchObject({
          statusCode: 401,
          message: 'Invalid refresh token',
        });
      });
    });
  });

  describe('Profile Management', () => {
    describe('getProfile', () => {
      it('should get user profile', async () => {
        const user = MockFactory.createUser();
        axiosMock.mockGet('/auth/profile', user);

        const result = await authClient.getProfile();
        expect(result).toEqual(user);
      });

      it('should handle unauthorized access', async () => {
        axiosMock.mockError('get', '/auth/profile', 401, 'Unauthorized');

        await expect(authClient.getProfile()).rejects.toMatchObject({
          statusCode: 401,
          message: 'Unauthorized',
        });
      });
    });

    describe('updateProfile', () => {
      it('should update profile successfully', async () => {
        const updates = {
          firstName: 'Updated',
          lastName: 'Name',
        };
        const updatedUser = MockFactory.createUser(updates);
        
        axiosMock.mockPut('/auth/profile', updatedUser);

        const result = await authClient.updateProfile(updates);
        expect(result).toEqual(updatedUser);
      });

      it('should handle validation errors', async () => {
        const invalidUpdates = {
          email: 'invalid-email',
        };
        
        axiosMock.mockError('put', '/auth/profile', 400, 'Invalid email format');

        await expect(authClient.updateProfile(invalidUpdates))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid email format',
          });
      });
    });
  });

  describe('Password Management', () => {
    describe('changePassword', () => {
      it('should change password successfully', async () => {
        axiosMock.mockPost('/auth/change-password', {});

        await expect(
          authClient.changePassword('oldPassword', 'newPassword')
        ).resolves.toBeUndefined();
      });

      it('should handle incorrect current password', async () => {
        axiosMock.mockError('post', '/auth/change-password', 400, 'Current password is incorrect');

        await expect(
          authClient.changePassword('wrongPassword', 'newPassword')
        ).rejects.toMatchObject({
          statusCode: 400,
          message: 'Current password is incorrect',
        });
      });
    });

    describe('requestPasswordReset', () => {
      it('should request password reset successfully', async () => {
        axiosMock.mockPost('/auth/forgot-password', {});

        await expect(
          authClient.requestPasswordReset('user@example.com')
        ).resolves.toBeUndefined();
      });

      it('should handle non-existent email gracefully', async () => {
        // Usually returns success to prevent email enumeration
        axiosMock.mockPost('/auth/forgot-password', {});

        await expect(
          authClient.requestPasswordReset('nonexistent@example.com')
        ).resolves.toBeUndefined();
      });
    });

    describe('resetPassword', () => {
      it('should reset password successfully', async () => {
        axiosMock.mockPost('/auth/reset-password', {});

        await expect(
          authClient.resetPassword('reset-token-123', 'newPassword')
        ).resolves.toBeUndefined();
      });

      it('should handle invalid or expired token', async () => {
        axiosMock.mockError('post', '/auth/reset-password', 400, 'Invalid or expired token');

        await expect(
          authClient.resetPassword('invalid-token', 'newPassword')
        ).rejects.toMatchObject({
          statusCode: 400,
          message: 'Invalid or expired token',
        });
      });
    });
  });

  describe('Email Verification', () => {
    describe('verifyEmail', () => {
      it('should verify email successfully', async () => {
        axiosMock.mockPost('/auth/verify-email', { verified: true });

        await expect(
          authClient.verifyEmail('verification-token-123')
        ).resolves.toBeUndefined();
      });

      it('should handle invalid verification token', async () => {
        axiosMock.mockError('post', '/auth/verify-email', 400, 'Invalid verification token');

        await expect(
          authClient.verifyEmail('invalid-token')
        ).rejects.toMatchObject({
          statusCode: 400,
          message: 'Invalid verification token',
        });
      });
    });

    describe('resendVerificationEmail', () => {
      it('should resend verification email', async () => {
        axiosMock.mockPost('/auth/resend-verification', { sent: true });

        await expect(
          authClient.resendVerificationEmail()
        ).resolves.toBeUndefined();
      });

      it('should handle already verified email', async () => {
        axiosMock.mockError('post', '/auth/resend-verification', 400, 'Email already verified');

        await expect(
          authClient.resendVerificationEmail()
        ).rejects.toMatchObject({
          statusCode: 400,
          message: 'Email already verified',
        });
      });
    });
  });

  describe('API Key Management', () => {
    describe('listApiKeys', () => {
      it('should list API keys', async () => {
        const apiKeys = [
          MockFactory.createApiKey({ name: 'Key 1' }),
          MockFactory.createApiKey({ name: 'Key 2' }),
        ];
        
        axiosMock.mockGet('/auth/api-keys', apiKeys);

        const result = await authClient.listApiKeys();
        expect(result).toEqual(apiKeys);
        expect(result).toHaveLength(2);
      });
    });

    describe('createApiKey', () => {
      it('should create API key successfully', async () => {
        const createRequest = {
          name: 'Production API Key',
          permissions: ['read', 'write'],
          expiresAt: new Date('2025-12-31'),
        };
        const apiKey = MockFactory.createApiKey({
          ...createRequest,
          key: 'sk_live_123456', // Only returned on creation
        });
        
        axiosMock.mockPost('/auth/api-keys', apiKey);

        const result = await authClient.createApiKey(createRequest);
        expect(result).toEqual(apiKey);
        expect(result.key).toBeDefined();
      });

      it('should handle duplicate API key name', async () => {
        const createRequest = {
          name: 'Existing Key',
          permissions: ['read'],
        };
        
        axiosMock.mockError('post', '/auth/api-keys', 409, 'API key with this name already exists');

        await expect(authClient.createApiKey(createRequest))
          .rejects.toMatchObject({
            statusCode: 409,
            message: 'API key with this name already exists',
          });
      });
    });

    describe('getApiKeyById', () => {
      it('should get API key by ID', async () => {
        const apiKey = MockFactory.createApiKey();
        axiosMock.mockGet(`/auth/api-keys/${apiKey.id}`, apiKey);

        const result = await authClient.getApiKeyById(apiKey.id);
        expect(result).toEqual(apiKey);
      });

      it('should handle non-existent API key', async () => {
        const keyId = 'non-existent-key';
        axiosMock.mockError('get', `/auth/api-keys/${keyId}`, 404, 'API key not found');

        await expect(authClient.getApiKeyById(keyId))
          .rejects.toMatchObject({
            statusCode: 404,
            message: 'API key not found',
          });
      });
    });

    describe('revokeApiKey', () => {
      it('should revoke API key successfully', async () => {
        const keyId = 'key-123';
        axiosMock.mockPost(`/auth/api-keys/${keyId}/revoke`, {});

        await expect(authClient.revokeApiKey(keyId))
          .resolves.toBeUndefined();
      });

      it('should handle already revoked key', async () => {
        const keyId = 'key-123';
        axiosMock.mockError('post', `/auth/api-keys/${keyId}/revoke`, 400, 'API key already revoked');

        await expect(authClient.revokeApiKey(keyId))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'API key already revoked',
          });
      });
    });

    describe('deleteApiKey', () => {
      it('should delete API key successfully', async () => {
        const keyId = 'key-123';
        axiosMock.mockDelete(`/auth/api-keys/${keyId}`);

        await expect(authClient.deleteApiKey(keyId))
          .resolves.toBeUndefined();
      });

      it('should handle deletion of non-existent key', async () => {
        const keyId = 'non-existent';
        axiosMock.mockError('delete', `/auth/api-keys/${keyId}`, 404, 'API key not found');

        await expect(authClient.deleteApiKey(keyId))
          .rejects.toMatchObject({
            statusCode: 404,
            message: 'API key not found',
          });
      });
    });
  });

  describe('Token Validation', () => {
    describe('validateToken', () => {
      it('should return true for valid token', async () => {
        axiosMock.mockGet('/auth/validate', { valid: true });

        const result = await authClient.validateToken();
        expect(result).toBe(true);
      });

      it('should return false for invalid token', async () => {
        axiosMock.mockError('get', '/auth/validate', 401, 'Invalid token');

        const result = await authClient.validateToken();
        expect(result).toBe(false);
      });

      it('should return false for network errors', async () => {
        axiosMock.mockNetworkError('get', '/auth/validate');

        const result = await authClient.validateToken();
        expect(result).toBe(false);
      });
    });
  });
});