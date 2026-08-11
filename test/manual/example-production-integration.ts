/**
 * Real-World Integration Example
 * Shows how to use error handling with the library in a production scenario
 */

import {
  WilmaAuthClient,
  WilmaError,
  WilmaAuthError,
  WilmaNetworkError,
  WilmaSessionError,
  WilmaValidationError,
  isWilmaAuthError,
  isWilmaNetworkError,
  isWilmaSessionError,
  isWilmaValidationError,
  HomeworkExtractor
} from '../../src/index';

/**
 * Production-ready error handler with user-friendly messages
 */
class ProdErrorHandler {
  static getErrorMessage(error: unknown): string {
    if (error instanceof WilmaValidationError) {
      return `Invalid ${error.field || 'input'}: ${error.message}`;
    }

    if (error instanceof WilmaSessionError) {
      return 'Your session has expired. Please log in again.';
    }

    if (error instanceof WilmaAuthError) {
      return 'Login failed. Please check your credentials.';
    }

    if (error instanceof WilmaNetworkError) {
      if (error.statusCode === 503) {
        return 'Wilma server is temporarily unavailable. Please try again later.';
      }
      return 'Network error. Please check your connection and try again.';
    }

    if (error instanceof WilmaError) {
      return `An error occurred: ${error.message}`;
    }

    return 'An unexpected error occurred. Please try again.';
  }

  static logError(error: unknown, context?: string): void {
    if (error instanceof WilmaError) {
      console.error({
        timestamp: new Date().toISOString(),
        context,
        error: error.toJSON(),
        originalError: error.originalError?.message
      });
    } else {
      console.error(error);
    }
  }
}

/**
 * Service layer with proper error handling
 */
class HomeworkService {
  constructor(private auth: WilmaAuthClient) {}

  /**
   * Fetch homework with automatic retry and error handling
   */
  async getHomework(childId: string, maxRetries = 3): Promise<any[]> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Validate input
        if (!childId || typeof childId !== 'string') {
          throw new WilmaValidationError('Child ID must be a non-empty string', 'childId');
        }

        // Fetch overview
        const rawOverview = await this.auth.overview().fetchOverviewRaw(childId);

        // Extract homework
        const homework = HomeworkExtractor.extractHomework(rawOverview);

        return homework;
      } catch (error) {
        // Handle session errors
        if (isWilmaSessionError(error)) {
          console.log('Session expired, re-authenticating...');
          // Trigger re-authentication
          throw error; // Let caller handle
        }

        // Retry network errors
        if (isWilmaNetworkError(error) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Don't retry other errors
        throw error;
      }
    }

    throw new WilmaNetworkError('Failed to fetch homework after retries', 503);
  }
}

/**
 * Example: Using the service with proper error handling
 */
async function exampleProductionUsage() {
  console.log('=== Production Example ===\n');

  let auth: WilmaAuthClient | null = null;

  try {
    // Validate configuration
    const baseUrl = process.env.WILMA_BASE_URL;
    if (!baseUrl) {
      throw new WilmaValidationError('Missing WILMA_BASE_URL environment variable', 'WILMA_BASE_URL');
    }

    // Create auth client
    auth = new WilmaAuthClient({ baseUrl });

    // Login with error handling
    try {
      const username = process.env.WILMA_USERNAME || '';
      const password = process.env.WILMA_PASSWORD || '';

      if (!username || !password) {
        throw new WilmaValidationError('Missing credentials', 'credentials');
      }

      await auth.login(username, password);
      console.log('✅ Logged in successfully\n');
    } catch (error) {
      if (isWilmaAuthError(error)) {
        console.error('❌ Authentication failed');
        console.error('Message:', ProdErrorHandler.getErrorMessage(error));
        throw error;
      }
      throw error;
    }

    // Use homework service
    const homeworkService = new HomeworkService(auth);

    try {
      const childId = 'child-123';
      const homework = await homeworkService.getHomework(childId);

      console.log(`✅ Fetched ${homework.length} homework items`);
      homework.slice(0, 2).forEach(hw => {
        console.log(`  - ${hw.courseName}: ${hw.homework.substring(0, 50)}...`);
      });
    } catch (error) {
      const message = ProdErrorHandler.getErrorMessage(error);
      console.error('❌', message);
      ProdErrorHandler.logError(error, 'getHomework');
    }
  } catch (error) {
    const message = ProdErrorHandler.getErrorMessage(error);
    console.error('❌ Fatal error:', message);
    ProdErrorHandler.logError(error, 'main');
    process.exit(1);
  } finally {
    // Always logout
    try {
      if (auth && auth.isAuthenticated()) {
        await auth.logout();
        console.log('\n✅ Logged out');
      }
    } catch (error) {
      ProdErrorHandler.logError(error, 'logout');
    }
  }
}

/**
 * Example: Circuit breaker pattern for resilience
 */
class CircuitBreaker<T> {
  private failureCount = 0;
  private lastFailureTime?: Date;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;

  constructor(failureThreshold = 3, resetTimeout = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
  }

  async execute<R>(
    operation: () => Promise<R>,
    fallback?: () => Promise<R>
  ): Promise<R> {
    // Check if circuit should reset
    if (this.lastFailureTime) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
      if (timeSinceLastFailure > this.resetTimeout) {
        this.failureCount = 0;
        this.lastFailureTime = undefined;
      }
    }

    // Circuit is open
    if (this.failureCount >= this.failureThreshold) {
      console.warn('⚠️ Circuit breaker is open');
      if (fallback) {
        return fallback();
      }
      throw new Error('Service temporarily unavailable (circuit breaker open)');
    }

    // Try operation
    try {
      const result = await operation();
      this.failureCount = 0;
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = new Date();

      if (isWilmaNetworkError(error)) {
        console.warn(`⚠️ Network error (${this.failureCount}/${this.failureThreshold})`);
      }

      throw error;
    }
  }
}

/**
 * Example: Using circuit breaker
 */
async function exampleCircuitBreaker() {
  console.log('\n=== Circuit Breaker Example ===\n');

  const auth = new WilmaAuthClient({ baseUrl: 'https://wilma.edu' });
  const breaker = new CircuitBreaker<any>(2, 5000);

  try {
    // Simulate multiple failures
    for (let i = 0; i < 4; i++) {
      try {
        const result = await breaker.execute(
          () => auth.overview().fetchOverview('child-123'),
          () => Promise.reject(new Error('Fallback also failed'))
        );
      } catch (error) {
        console.log(`Request ${i + 1}: ${ProdErrorHandler.getErrorMessage(error)}`);
      }
    }
  } catch (error) {
    ProdErrorHandler.logError(error, 'circuitBreaker');
  }
}

/**
 * Run examples (for testing/demonstration)
 */
async function runExamples() {
  console.log('\n' + '='.repeat(60));
  console.log('PRODUCTION INTEGRATION EXAMPLES');
  console.log('='.repeat(60) + '\n');

  // Note: These require environment variables or mock data
  // Uncomment to run with real credentials

  // await exampleProductionUsage();
  // await exampleCircuitBreaker();

  console.log('\nNote: Set WILMA_BASE_URL, WILMA_USERNAME, WILMA_PASSWORD to run');
  console.log('Examples available in this file for reference\n');
}

if (require.main === module) {
  runExamples().catch(console.error);
}

export { ProdErrorHandler, HomeworkService, CircuitBreaker, exampleProductionUsage };
