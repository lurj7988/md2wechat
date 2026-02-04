/**
 * Tests for Logger utility
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock chalk module
jest.mock('chalk', () => {
  return {
    __esModule: true,
    default: {
      blue: jest.fn((text: string) => text),
      green: jest.fn((text: string) => text),
      yellow: jest.fn((text: string) => text),
      red: jest.fn((text: string) => text),
      gray: jest.fn((text: string) => text),
      cyan: jest.fn((text: string) => text),
      bold: {
        cyan: jest.fn((text: string) => text)
      }
    }
  };
});

import { Logger } from '../../../src/cli/utils/logger';

describe('Logger', () => {
  let logger: Logger;
  let logSpy: any;
  let errorSpy: any;

  beforeEach(() => {
    logger = new Logger(false);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('info', () => {
    it('should log info message', () => {
      logger.info('Test info message');
      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('success', () => {
    it('should log success message', () => {
      logger.success('Test success message');
      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('warning', () => {
    it('should log warning message', () => {
      logger.warning('Test warning message');
      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log error message', () => {
      logger.error('Test error message');
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('should not log debug message when debug mode is disabled', () => {
      logger.debug('Test debug message');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should log debug message when debug mode is enabled', () => {
      logger.setDebugMode(true);
      logger.debug('Test debug message');
      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('title', () => {
    it('should log title message', () => {
      logger.title('Test Title');
      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('setDebugMode', () => {
    it('should enable debug mode', () => {
      logger.setDebugMode(true);
      logger.debug('Test debug message');
      expect(logSpy).toHaveBeenCalled();
    });

    it('should disable debug mode', () => {
      logger.setDebugMode(true);
      logger.setDebugMode(false);
      logger.debug('Test debug message');
      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe('Logger instance', () => {
    it('should have debug mode disabled by default', () => {
      const defaultLogger = new Logger();
      defaultLogger.debug('Should not appear');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should have debug mode enabled when created with true', () => {
      const debugLogger = new Logger(true);
      debugLogger.debug('Should appear');
      expect(logSpy).toHaveBeenCalled();
    });
  });
});
