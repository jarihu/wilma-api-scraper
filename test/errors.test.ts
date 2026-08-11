import { describe, it, expect } from 'vitest';
import {
  WilmaError,
  WilmaAuthError,
  WilmaNetworkError,
  WilmaParseError,
  WilmaValidationError,
  WilmaSessionError,
  WilmaApiVersionError,
  isWilmaError,
  isWilmaAuthError,
  isWilmaNetworkError,
  isWilmaParseError,
  isWilmaSessionError
} from '../src/errors';

describe('Error Classes', () => {
  describe('WilmaError', () => {
    it('should create error with message and code', () => {
      const error = new WilmaError('Test error', 'TEST_CODE', 500);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('WilmaError');
      expect(error instanceof Error).toBe(true);
    });

    it('should have default code', () => {
      const error = new WilmaError('Test error');
      expect(error.code).toBe('UNKNOWN_ERROR');
    });

    it('should serialize to JSON', () => {
      const error = new WilmaError('Test error', 'TEST_CODE', 500);
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'WilmaError',
        message: 'Test error',
        code: 'TEST_CODE',
        statusCode: 500
      });
    });

    it('should work with instanceof check', () => {
      const error = new WilmaError('Test');
      expect(error instanceof WilmaError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('WilmaAuthError', () => {
    it('should have AUTH_ERROR code', () => {
      const error = new WilmaAuthError('Auth failed', 401);

      expect(error.code).toBe('AUTH_ERROR');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('WilmaAuthError');
      expect(error instanceof WilmaAuthError).toBe(true);
      expect(error instanceof WilmaError).toBe(true);
    });

    it('should work with instanceof check', () => {
      const error = new WilmaAuthError('Test');
      expect(error instanceof WilmaAuthError).toBe(true);
      expect(error instanceof WilmaError).toBe(true);
    });
  });

  describe('WilmaNetworkError', () => {
    it('should have NETWORK_ERROR code and include request details', () => {
      const error = new WilmaNetworkError(
        'Network failed',
        503,
        undefined,
        'GET',
        'https://wilma.edu/api'
      );

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBe(503);
      expect(error.method).toBe('GET');
      expect(error.url).toBe('https://wilma.edu/api');
      expect(error.name).toBe('WilmaNetworkError');
    });

    it('should serialize with request details', () => {
      const error = new WilmaNetworkError(
        'Network failed',
        503,
        undefined,
        'POST',
        'https://wilma.edu/login'
      );
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'WilmaNetworkError',
        message: 'Network failed',
        code: 'NETWORK_ERROR',
        statusCode: 503,
        method: 'POST',
        url: 'https://wilma.edu/login'
      });
    });
  });

  describe('WilmaParseError', () => {
    it('should have PARSE_ERROR code and data type', () => {
      const error = new WilmaParseError('Cannot parse JSON', undefined, 'overview');

      expect(error.code).toBe('PARSE_ERROR');
      expect(error.dataType).toBe('overview');
      expect(error.name).toBe('WilmaParseError');
    });

    it('should serialize with data type', () => {
      const error = new WilmaParseError('Parse failed', undefined, 'homework');
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'WilmaParseError',
        message: 'Parse failed',
        code: 'PARSE_ERROR',
        statusCode: undefined,
        dataType: 'homework'
      });
    });
  });

  describe('WilmaValidationError', () => {
    it('should have VALIDATION_ERROR code and field name', () => {
      const error = new WilmaValidationError('Invalid baseUrl', 'baseUrl');

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.field).toBe('baseUrl');
      expect(error.name).toBe('WilmaValidationError');
    });

    it('should serialize with field name', () => {
      const error = new WilmaValidationError('Invalid username', 'username');
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'WilmaValidationError',
        message: 'Invalid username',
        code: 'VALIDATION_ERROR',
        statusCode: undefined,
        field: 'username'
      });
    });
  });

  describe('WilmaSessionError', () => {
    it('should extend WilmaAuthError', () => {
      const error = new WilmaSessionError();

      expect(error.code).toBe('AUTH_ERROR');
      expect(error.name).toBe('WilmaSessionError');
      expect(error instanceof WilmaSessionError).toBe(true);
      expect(error instanceof WilmaAuthError).toBe(true);
      expect(error instanceof WilmaError).toBe(true);
    });

    it('should have default message', () => {
      const error = new WilmaSessionError();
      expect(error.message).toBe('Session expired or invalid');
    });

    it('should accept custom message', () => {
      const error = new WilmaSessionError('Custom session error');
      expect(error.message).toBe('Custom session error');
    });
  });

  describe('WilmaApiVersionError', () => {
    it('should include version information', () => {
      const error = new WilmaApiVersionError(
        'Unsupported API version',
        '2.0',
        ['3.0', '4.0']
      );

      expect(error.code).toBe('API_VERSION_ERROR');
      expect(error.detectedVersion).toBe('2.0');
      expect(error.supportedVersions).toEqual(['3.0', '4.0']);
      expect(error.name).toBe('WilmaApiVersionError');
    });

    it('should serialize with version details', () => {
      const error = new WilmaApiVersionError(
        'Unsupported',
        '1.0',
        ['2.0', '3.0']
      );
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'WilmaApiVersionError',
        message: 'Unsupported',
        code: 'API_VERSION_ERROR',
        statusCode: undefined,
        detectedVersion: '1.0',
        supportedVersions: ['2.0', '3.0']
      });
    });
  });

  describe('Type Guards', () => {
    it('isWilmaError should identify WilmaError instances', () => {
      const error = new WilmaError('test');
      const authError = new WilmaAuthError('test');
      const nativeError = new Error('test');

      expect(isWilmaError(error)).toBe(true);
      expect(isWilmaError(authError)).toBe(true);
      expect(isWilmaError(nativeError)).toBe(false);
      expect(isWilmaError('string')).toBe(false);
      expect(isWilmaError(null)).toBe(false);
    });

    it('isWilmaAuthError should identify WilmaAuthError instances', () => {
      const authError = new WilmaAuthError('test');
      const sessionError = new WilmaSessionError();
      const parseError = new WilmaParseError('test');

      expect(isWilmaAuthError(authError)).toBe(true);
      expect(isWilmaAuthError(sessionError)).toBe(true);
      expect(isWilmaAuthError(parseError)).toBe(false);
    });

    it('isWilmaNetworkError should identify WilmaNetworkError instances', () => {
      const networkError = new WilmaNetworkError('test');
      const authError = new WilmaAuthError('test');

      expect(isWilmaNetworkError(networkError)).toBe(true);
      expect(isWilmaNetworkError(authError)).toBe(false);
    });

    it('isWilmaParseError should identify WilmaParseError instances', () => {
      const parseError = new WilmaParseError('test');
      const validationError = new WilmaValidationError('test');

      expect(isWilmaParseError(parseError)).toBe(true);
      expect(isWilmaParseError(validationError)).toBe(false);
    });

    it('isWilmaSessionError should identify WilmaSessionError instances', () => {
      const sessionError = new WilmaSessionError();
      const authError = new WilmaAuthError('test');

      expect(isWilmaSessionError(sessionError)).toBe(true);
      expect(isWilmaSessionError(authError)).toBe(false);
    });
  });

  describe('Error chaining', () => {
    it('should preserve original error', () => {
      const originalError = new Error('Original network issue');
      const wilmaError = new WilmaNetworkError(
        'Network failed',
        503,
        originalError
      );

      expect(wilmaError.originalError).toBe(originalError);
      expect(wilmaError.originalError?.message).toBe('Original network issue');
    });

    it('should allow error stacking for debugging', () => {
      try {
        try {
          throw new Error('Low-level error');
        } catch (err) {
          throw new WilmaNetworkError(
            'Failed to fetch data',
            500,
            err as Error,
            'GET',
            'https://wilma.edu/api'
          );
        }
      } catch (err) {
        expect(isWilmaNetworkError(err)).toBe(true);
        if (isWilmaNetworkError(err)) {
          expect(err.originalError?.message).toBe('Low-level error');
          expect(err.url).toBe('https://wilma.edu/api');
        }
      }
    });
  });
});
