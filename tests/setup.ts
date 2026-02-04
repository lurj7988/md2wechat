/**
 * Jest setup file
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Mock chalk module globally
jest.mock('chalk', () => {
  const identity = (s: string) => s;
  return {
    __esModule: true,
    default: {
      blue: identity,
      green: identity,
      yellow: identity,
      red: identity,
      gray: identity,
      cyan: identity,
      bold: {
        cyan: identity
      }
    }
  };
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Increase timeout for async operations
jest.setTimeout(10000);
