/**
 * Custom error classes for Wilma API
 * Provides typed, structured error handling throughout the library
 */

/**
 * Base error class for all Wilma API errors
 * Extends Error with structured error information
 */
export class WilmaError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode?: number,
    originalError?: Error
  ) {
    super(message);
    this.name = 'WilmaError';
    this.code = code;
    this.statusCode = statusCode;
    this.originalError = originalError;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, WilmaError.prototype);
  }

  /**
   * Serialize error to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode
    };
  }
}

/**
 * Authentication-related errors
 * Thrown when login fails, session expires, or token is invalid
 */
export class WilmaAuthError extends WilmaError {
  constructor(message: string, statusCode?: number, originalError?: Error) {
    super(message, 'AUTH_ERROR', statusCode, originalError);
    this.name = 'WilmaAuthError';
    Object.setPrototypeOf(this, WilmaAuthError.prototype);
  }
}

/**
 * Network/HTTP errors
 * Thrown when HTTP requests fail due to network issues or server errors
 */
export class WilmaNetworkError extends WilmaError {
  public readonly method?: string;
  public readonly url?: string;

  constructor(
    message: string,
    statusCode?: number,
    originalError?: Error,
    method?: string,
    url?: string
  ) {
    super(message, 'NETWORK_ERROR', statusCode, originalError);
    this.name = 'WilmaNetworkError';
    this.method = method;
    this.url = url;
    Object.setPrototypeOf(this, WilmaNetworkError.prototype);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      method: this.method,
      url: this.url
    };
  }
}

/**
 * Parsing/data validation errors
 * Thrown when response data cannot be parsed or is invalid
 */
export class WilmaParseError extends WilmaError {
  public readonly dataType?: string;

  constructor(message: string, originalError?: Error, dataType?: string) {
    super(message, 'PARSE_ERROR', undefined, originalError);
    this.name = 'WilmaParseError';
    this.dataType = dataType;
    Object.setPrototypeOf(this, WilmaParseError.prototype);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      dataType: this.dataType
    };
  }
}

/**
 * Invalid argument/configuration errors
 * Thrown when arguments or configuration are invalid
 */
export class WilmaValidationError extends WilmaError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'WilmaValidationError';
    this.field = field;
    Object.setPrototypeOf(this, WilmaValidationError.prototype);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      field: this.field
    };
  }
}

/**
 * Session/token errors
 * Thrown when session has expired or is no longer valid
 */
export class WilmaSessionError extends WilmaAuthError {
  constructor(message: string = 'Session expired or invalid') {
    super(message);
    this.name = 'WilmaSessionError';
    Object.setPrototypeOf(this, WilmaSessionError.prototype);
  }
}

/**
 * API compatibility/version errors
 * Thrown when Wilma API version is not supported
 */
export class WilmaApiVersionError extends WilmaError {
  public readonly detectedVersion?: string;
  public readonly supportedVersions?: string[];

  constructor(
    message: string,
    detectedVersion?: string,
    supportedVersions?: string[]
  ) {
    super(message, 'API_VERSION_ERROR');
    this.name = 'WilmaApiVersionError';
    this.detectedVersion = detectedVersion;
    this.supportedVersions = supportedVersions;
    Object.setPrototypeOf(this, WilmaApiVersionError.prototype);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      detectedVersion: this.detectedVersion,
      supportedVersions: this.supportedVersions
    };
  }
}

/**
 * Type guard to check if error is a WilmaError
 */
export function isWilmaError(error: unknown): error is WilmaError {
  return error instanceof WilmaError;
}

/**
 * Type guard to check if error is a WilmaAuthError
 */
export function isWilmaAuthError(error: unknown): error is WilmaAuthError {
  return error instanceof WilmaAuthError;
}

/**
 * Type guard to check if error is a WilmaNetworkError
 */
export function isWilmaNetworkError(error: unknown): error is WilmaNetworkError {
  return error instanceof WilmaNetworkError;
}

/**
 * Type guard to check if error is a WilmaParseError
 */
export function isWilmaParseError(error: unknown): error is WilmaParseError {
  return error instanceof WilmaParseError;
}

/**
 * Type guard to check if error is a WilmaSessionError
 */
export function isWilmaSessionError(error: unknown): error is WilmaSessionError {
  return error instanceof WilmaSessionError;
}

/**
 * Type guard to check if error is a WilmaValidationError
 */
export function isWilmaValidationError(error: unknown): error is WilmaValidationError {
  return error instanceof WilmaValidationError;
}

/**
 * Type guard to check if error is a WilmaApiVersionError
 */
export function isWilmaApiVersionError(error: unknown): error is WilmaApiVersionError {
  return error instanceof WilmaApiVersionError;
}
