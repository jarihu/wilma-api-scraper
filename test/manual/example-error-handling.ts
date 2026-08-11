/**
 * Error Handling Example
 * Demonstrates how to use typed error classes for robust error handling
 */

import {
  WilmaAuthClient,
  WilmaError,
  WilmaAuthError,
  WilmaNetworkError,
  WilmaSessionError,
  isWilmaAuthError,
  isWilmaNetworkError,
  isWilmaSessionError
} from '../../src/index';

async function exampleBasicErrorHandling() {
  console.log('=== Example 1: Basic Error Handling ===\n');

  try {
    const auth = new WilmaAuthClient({ baseUrl: 'https://invalid-wilma.edu' });
    await auth.login('user', 'pass');
  } catch (error) {
    // Check for specific error types
    if (error instanceof WilmaAuthError) {
      console.log('❌ Authentication failed:', error.message);
      console.log('Error code:', error.code);
      console.log('Status code:', error.statusCode);
    } else if (error instanceof WilmaError) {
      console.log('❌ Wilma error:', error.message);
      console.log('Error code:', error.code);
    } else {
      console.log('❌ Unknown error:', error);
    }
  }
  console.log();
}

async function exampleTypeGuards() {
  console.log('=== Example 2: Using Type Guards ===\n');

  try {
    const auth = new WilmaAuthClient({ baseUrl: 'https://invalid.edu' });
    await auth.login('user', 'pass');
  } catch (error) {
    // Use type guards for cleaner code
    if (isWilmaAuthError(error)) {
      console.log('❌ Auth error - cannot login:', error.message);
    } else if (isWilmaNetworkError(error)) {
      console.log('❌ Network error:', error.message);
      console.log('Failed request:', error.method, error.url);
    } else if (isWilmaSessionError(error)) {
      console.log('❌ Session expired - please login again');
    } else if (error instanceof WilmaError) {
      console.log('❌ Wilma API error:', error.message);
    } else {
      console.log('❌ Unexpected error:', error);
    }
  }
  console.log();
}

async function exampleErrorSerialization() {
  console.log('=== Example 3: Serializing Errors for Logging ===\n');

  try {
    const auth = new WilmaAuthClient({ baseUrl: 'https://test.edu' });
    await auth.login('user', 'pass');
  } catch (error) {
    if (error instanceof WilmaError) {
      // Serialize for logging systems
      const errorLog = {
        timestamp: new Date().toISOString(),
        context: 'login_attempt',
        error: error.toJSON()
      };
      console.log('📋 Error log:', JSON.stringify(errorLog, null, 2));
    }
  }
  console.log();
}

async function exampleErrorChaining() {
  console.log('=== Example 4: Error Chaining for Debugging ===\n');

  // Simulating error chaining
  try {
    try {
      // Simulate low-level error
      throw new Error('Connection refused');
    } catch (originalErr) {
      // Wrap in WilmaError with context
      const wilmaError = new WilmaNetworkError(
        'Failed to authenticate with Wilma server',
        503,
        originalErr as Error,
        'POST',
        'https://wilma.edu/login'
      );

      throw wilmaError;
    }
  } catch (error) {
    if (error instanceof WilmaNetworkError) {
      console.log('❌ Network error:', error.message);
      console.log('Request: ' + error.method + ' ' + error.url);
      console.log('Root cause:', error.originalError?.message);
    }
  }
  console.log();
}

async function exampleSessionHandling() {
  console.log('=== Example 5: Session Error Handling ===\n');

  const auth = new WilmaAuthClient({ baseUrl: 'https://wilma.edu' });

  try {
    // Simulate checking if session is valid
    if (!auth.isAuthenticated()) {
      throw new WilmaSessionError('Please login first');
    }

    // Try to fetch data
    // const overview = await auth.overview().fetchOverview('child-id');
  } catch (error) {
    if (isWilmaSessionError(error)) {
      console.log('⚠️ Session issue:', error.message);
      console.log('Please re-authenticate');
    }
  }
  console.log();
}

async function exampleErrorFiltering() {
  console.log('=== Example 6: Filtering Errors ===\n');

  const errors: WilmaError[] = [
    new WilmaAuthError('Invalid credentials', 401),
    new WilmaNetworkError('Timeout', 504),
    new WilmaSessionError('Session expired'),
    new WilmaAuthError('Token invalid', 401)
  ];

  // Filter authentication errors
  const authErrors = errors.filter(isWilmaAuthError);
  console.log('🔍 Auth errors found:', authErrors.length);
  authErrors.forEach(err => {
    console.log('  -', err.message, `(${err.statusCode})`);
  });

  // Filter network errors
  const networkErrors = errors.filter(isWilmaNetworkError);
  console.log('\n🔍 Network errors found:', networkErrors.length);
  networkErrors.forEach(err => {
    console.log('  -', err.message, `(${err.statusCode})`);
  });
  console.log();
}

async function runAllExamples() {
  console.log('\n' + '='.repeat(60));
  console.log('ERROR HANDLING EXAMPLES - Wilma API Library');
  console.log('='.repeat(60) + '\n');

  // Note: These examples catch errors gracefully for demonstration
  await exampleBasicErrorHandling();
  await exampleTypeGuards();
  await exampleErrorSerialization();
  await exampleErrorChaining();
  await exampleSessionHandling();
  await exampleErrorFiltering();

  console.log('='.repeat(60));
  console.log('All examples completed!');
  console.log('='.repeat(60) + '\n');
}

// Run examples
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  exampleBasicErrorHandling,
  exampleTypeGuards,
  exampleErrorSerialization,
  exampleErrorChaining,
  exampleSessionHandling,
  exampleErrorFiltering
};
