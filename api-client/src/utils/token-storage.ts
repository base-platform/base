/**
 * Token storage utility for browser and Node.js environments
 */
export class TokenStorage {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly API_KEY_KEY = 'api_key';

  /**
   * Check if running in browser
   */
  private static isBrowser(): boolean {
    return typeof globalThis !== 'undefined' && 
           typeof (globalThis as any).localStorage !== 'undefined';
  }

  /**
   * Get access token from storage
   */
  static getAccessToken(): string | null {
    if (!this.isBrowser()) return null;
    return (globalThis as any).localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Set access token in storage
   */
  static setAccessToken(token: string): void {
    if (!this.isBrowser()) return;
    (globalThis as any).localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  /**
   * Remove access token from storage
   */
  static removeAccessToken(): void {
    if (!this.isBrowser()) return;
    (globalThis as any).localStorage.removeItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Get refresh token from storage
   */
  static getRefreshToken(): string | null {
    if (!this.isBrowser()) return null;
    return (globalThis as any).localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Set refresh token in storage
   */
  static setRefreshToken(token: string): void {
    if (!this.isBrowser()) return;
    (globalThis as any).localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  /**
   * Remove refresh token from storage
   */
  static removeRefreshToken(): void {
    if (!this.isBrowser()) return;
    (globalThis as any).localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Get API key from storage
   */
  static getApiKey(): string | null {
    if (!this.isBrowser()) return null;
    return (globalThis as any).localStorage.getItem(this.API_KEY_KEY);
  }

  /**
   * Set API key in storage
   */
  static setApiKey(key: string): void {
    if (!this.isBrowser()) return;
    (globalThis as any).localStorage.setItem(this.API_KEY_KEY, key);
  }

  /**
   * Remove API key from storage
   */
  static removeApiKey(): void {
    if (!this.isBrowser()) return;
    (globalThis as any).localStorage.removeItem(this.API_KEY_KEY);
  }

  /**
   * Clear all tokens from storage
   */
  static clearAll(): void {
    this.removeAccessToken();
    this.removeRefreshToken();
    this.removeApiKey();
  }

  /**
   * Store auth response tokens
   */
  static storeAuthTokens(accessToken: string, refreshToken?: string): void {
    this.setAccessToken(accessToken);
    if (refreshToken) {
      this.setRefreshToken(refreshToken);
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}