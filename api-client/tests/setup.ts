// Test setup file - Jest configuration

// Extend Jest matchers if needed
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidResponse(): R;
      toHaveAuthHeader(): R;
    }
  }
}

// Export an empty object to make this a module
export {};