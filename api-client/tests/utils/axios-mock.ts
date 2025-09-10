import axios from 'axios';
import { MockFactory } from './mock-factory';

// Get mocked axios - this will be the mocked version from jest.setup.js
const mockedAxios = axios as jest.Mocked<typeof axios>;

/**
 * Axios mock helper for tests
 */
export class AxiosMock {
  private static instance: AxiosMock;
  private mockInstance: jest.Mocked<any>;
  
  private constructor() {
    // Get the global mock instance that BaseApiClient will use
    this.mockInstance = (global as any).__mockAxiosInstance();
  }
  
  static getInstance(): AxiosMock {
    if (!this.instance) {
      this.instance = new AxiosMock();
    }
    return this.instance;
  }
  
  /**
   * Get mocked axios instance - this is what BaseApiClient uses
   */
  getMockedInstance() {
    return this.mockInstance;
  }
  
  /**
   * Mock successful GET request
   */
  mockGet<T>(url: string | RegExp, data: T, status = 200) {
    const response = MockFactory.createResponse(data, status);
    this.mockInstance.get.mockImplementation((requestUrl: string) => {
      if (this.matchesUrl(requestUrl, url)) {
        return Promise.resolve(response);
      }
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} });
    });
    return this.mockInstance;
  }
  
  /**
   * Mock successful POST request
   */
  mockPost<T>(url: string | RegExp, data: T, status = 200) {
    const response = MockFactory.createResponse(data, status);
    this.mockInstance.post.mockImplementation((requestUrl: string) => {
      if (this.matchesUrl(requestUrl, url)) {
        return Promise.resolve(response);
      }
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} });
    });
    return this.mockInstance;
  }
  
  /**
   * Mock successful PUT request
   */
  mockPut<T>(url: string | RegExp, data: T, status = 200) {
    const response = MockFactory.createResponse(data, status);
    this.mockInstance.put.mockImplementation((requestUrl: string) => {
      if (this.matchesUrl(requestUrl, url)) {
        return Promise.resolve(response);
      }
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} });
    });
    return this.mockInstance;
  }
  
  /**
   * Mock successful DELETE request
   */
  mockDelete(url: string | RegExp, status = 204) {
    const response = MockFactory.createResponse(null, status);
    this.mockInstance.delete.mockImplementation((requestUrl: string) => {
      if (this.matchesUrl(requestUrl, url)) {
        return Promise.resolve(response);
      }
      return Promise.resolve({ data: null, status: 204, statusText: 'No Content', headers: {}, config: {} });
    });
    return this.mockInstance;
  }
  
  /**
   * Mock error response
   */
  mockError(method: 'get' | 'post' | 'put' | 'delete', url: string | RegExp, status: number, message: string) {
    const error = MockFactory.createErrorResponse(status, message);
    this.mockInstance[method].mockImplementation((requestUrl: string) => {
      if (this.matchesUrl(requestUrl, url)) {
        return Promise.reject(error);
      }
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} });
    });
    return this.mockInstance;
  }
  
  /**
   * Mock network error
   */
  mockNetworkError(method: 'get' | 'post' | 'put' | 'delete', url: string | RegExp) {
    const error = MockFactory.createNetworkError();
    this.mockInstance[method].mockImplementation((requestUrl: string) => {
      if (this.matchesUrl(requestUrl, url)) {
        return Promise.reject(error);
      }
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} });
    });
    return this.mockInstance;
  }
  
  /**
   * Mock multiple requests
   */
  mockMultiple(mocks: Array<{
    method: 'get' | 'post' | 'put' | 'delete';
    url: string | RegExp;
    response?: any;
    error?: { status: number; message: string };
    networkError?: boolean;
  }>) {
    mocks.forEach(mock => {
      if (mock.networkError) {
        this.mockNetworkError(mock.method, mock.url);
      } else if (mock.error) {
        this.mockError(mock.method, mock.url, mock.error.status, mock.error.message);
      } else {
        switch (mock.method) {
          case 'get':
            this.mockGet(mock.url, mock.response);
            break;
          case 'post':
            this.mockPost(mock.url, mock.response);
            break;
          case 'put':
            this.mockPut(mock.url, mock.response);
            break;
          case 'delete':
            this.mockDelete(mock.url);
            break;
        }
      }
    });
    return this.mockInstance;
  }
  
  /**
   * Reset all mocks
   */
  reset() {
    jest.clearAllMocks();
    // Re-get the global mock instance
    this.mockInstance = (global as any).__mockAxiosInstance();
  }
  
  /**
   * Check if URL matches pattern
   */
  private matchesUrl(requestUrl: string, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      return requestUrl === pattern || requestUrl.endsWith(pattern) || requestUrl.includes(pattern);
    }
    return pattern.test(requestUrl);
  }
  
  /**
   * Get call history for a method
   */
  getCallHistory(method: 'get' | 'post' | 'put' | 'delete') {
    return this.mockInstance[method].mock.calls;
  }
  
  /**
   * Verify a call was made
   */
  verifyCall(method: 'get' | 'post' | 'put' | 'delete', url: string, times = 1) {
    const calls = this.mockInstance[method].mock.calls;
    const matchingCalls = calls.filter((call: any) => call[0] === url);
    expect(matchingCalls).toHaveLength(times);
  }
}

// Export singleton instance
export const axiosMock = AxiosMock.getInstance();
export { mockedAxios };