// Jest setup file

// Create a global mock instance that will be shared
let globalMockAxiosInstance;

// Mock axios module completely
jest.mock('axios', () => {
  // Create the shared mock instance
  globalMockAxiosInstance = {
    get: jest.fn(() => Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} })),
    post: jest.fn(() => Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} })),
    put: jest.fn(() => Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} })),
    patch: jest.fn(() => Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} })),
    delete: jest.fn(() => Promise.resolve({ data: null, status: 204, statusText: 'No Content', headers: {}, config: {} })),
    request: jest.fn(() => Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} })),
    interceptors: {
      request: {
        use: jest.fn(() => 0),
        eject: jest.fn(),
      },
      response: {
        use: jest.fn(() => 0),
        eject: jest.fn(),
      },
    },
    defaults: {
      headers: {
        common: {},
        get: {},
        post: {},
        put: {},
        patch: {},
        delete: {},
      },
    },
  };

  // Make sure axios.create() always returns the same shared instance
  const createFn = jest.fn(() => globalMockAxiosInstance);
  
  return {
    __esModule: true,
    default: {
      create: createFn,
      ...globalMockAxiosInstance,
    },
    create: createFn,
    ...globalMockAxiosInstance,
  };
});

// Export the global mock instance for tests to use
global.__mockAxiosInstance = () => globalMockAxiosInstance;

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Custom matchers
expect.extend({
  toBeValidResponse(received) {
    const pass = received && 
                  typeof received === 'object' &&
                  !received.error;
    
    return {
      pass,
      message: () => 
        pass 
          ? `Expected response not to be valid`
          : `Expected response to be valid, but got error: ${JSON.stringify(received?.error)}`
    };
  },
  
  toHaveAuthHeader(received) {
    const pass = received?.config?.headers?.Authorization?.startsWith('Bearer ') ||
                  received?.config?.headers?.['X-API-Key'];
    
    return {
      pass,
      message: () => 
        pass
          ? `Expected request not to have auth header`
          : `Expected request to have Authorization or X-API-Key header`
    };
  }
});

// Global test timeout
jest.setTimeout(10000);

// Mock console methods during tests to reduce noise
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  // Keep log for debugging
  log: console.log,
};