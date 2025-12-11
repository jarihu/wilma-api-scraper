# Error Handling Guide

The Wilma API library provides a comprehensive error handling system with typed error classes for robust error management.

## Error Class Hierarchy

```
Error (native)
└── WilmaError (base class)
    ├── WilmaAuthError
    │   └── WilmaSessionError
    ├── WilmaNetworkError
    ├── WilmaParseError
    ├── WilmaValidationError
    └── WilmaApiVersionError
```

## Error Classes

### WilmaError (Base)

Base error class for all Wilma API errors.

```typescript
throw new WilmaError('Something went wrong', 'CUSTOM_CODE', 500);

// Properties
error.message      // Error message
error.code         // Machine-readable error code
error.statusCode   // HTTP status code (optional)
error.originalError // Wrapped error (optional)
```

### WilmaAuthError

Authentication-related errors (login failures, invalid credentials, etc.)

```typescript
try {
  await auth.login('user', 'pass');
} catch (error) {
  if (error instanceof WilmaAuthError) {
    console.log('Login failed:', error.message);
    console.log('Status:', error.statusCode); // 401, 403, etc.
  }
}
```

### WilmaSessionError

Session expiration or invalid session errors. Extends `WilmaAuthError`.

```typescript
try {
  const data = await auth.overview().fetchOverview(childId);
} catch (error) {
  if (error instanceof WilmaSessionError) {
    console.log('Session expired - please login again');
    // Re-authenticate
  }
}
```

### WilmaNetworkError

Network/HTTP request failures.

```typescript
try {
  const data = await auth.overview().fetchOverview(childId);
} catch (error) {
  if (error instanceof WilmaNetworkError) {
    console.log('Request failed:', error.message);
    console.log('Method:', error.method);      // 'GET', 'POST', etc.
    console.log('URL:', error.url);
    console.log('Status:', error.statusCode);  // 500, 503, etc.
  }
}
```

### WilmaParseError

Data parsing or validation errors.

```typescript
try {
  const overview = await auth.overview().fetchOverview(childId);
} catch (error) {
  if (error instanceof WilmaParseError) {
    console.log('Cannot parse response:', error.message);
    console.log('Data type:', error.dataType); // 'overview', 'homework', etc.
  }
}
```

### WilmaValidationError

Invalid arguments or configuration errors.

```typescript
try {
  const auth = new WilmaAuthClient({ baseUrl: '' });
} catch (error) {
  if (error instanceof WilmaValidationError) {
    console.log('Invalid config:', error.message);
    console.log('Field:', error.field); // 'baseUrl', 'username', etc.
  }
}
```

### WilmaApiVersionError

API version compatibility errors.

```typescript
try {
  const http = new WilmaHttpClient();
  await http.detectApiVersion(baseUrl);
} catch (error) {
  if (error instanceof WilmaApiVersionError) {
    console.log('Unsupported API version:', error.detectedVersion);
    console.log('Supported:', error.supportedVersions); // ['3.0', '4.0']
  }
}
```

## Type Guards

Type guard functions help with type-safe error handling:

```typescript
import {
  isWilmaError,
  isWilmaAuthError,
  isWilmaNetworkError,
  isWilmaParseError,
  isWilmaSessionError
} from 'wilma-api';

try {
  // ...api call...
} catch (error) {
  if (isWilmaAuthError(error)) {
    // error is narrowed to WilmaAuthError
  } else if (isWilmaNetworkError(error)) {
    // error is narrowed to WilmaNetworkError
  }
}
```

## Error Handling Patterns

### Pattern 1: Basic Error Handling

```typescript
import { WilmaAuthClient, WilmaError } from 'wilma-api';

try {
  const auth = new WilmaAuthClient({ baseUrl });
  await auth.login(username, password);
} catch (error) {
  if (error instanceof WilmaError) {
    console.error('Wilma error:', {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode
    });
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Pattern 2: Specific Error Handling

```typescript
import { WilmaAuthClient, isWilmaAuthError, isWilmaNetworkError } from 'wilma-api';

try {
  const auth = new WilmaAuthClient({ baseUrl });
  await auth.login(username, password);
} catch (error) {
  if (isWilmaAuthError(error)) {
    // Handle auth error - show login form again
    console.log('Invalid credentials');
  } else if (isWilmaNetworkError(error)) {
    // Handle network error - retry or show offline message
    console.log('Network unavailable');
  } else {
    // Handle other errors
    console.log('Unknown error');
  }
}
```

### Pattern 3: Error Chaining

```typescript
import { WilmaNetworkError } from 'wilma-api';

try {
  try {
    // Low-level operation
    await axios.get(url);
  } catch (originalErr) {
    // Wrap with context
    throw new WilmaNetworkError(
      'Failed to fetch overview data',
      (originalErr as any).response?.status,
      originalErr as Error,
      'GET',
      url
    );
  }
} catch (error) {
  if (error instanceof WilmaNetworkError) {
    console.log('Root cause:', error.originalError?.message);
  }
}
```

### Pattern 4: Error Serialization for Logging

```typescript
import { WilmaError } from 'wilma-api';

try {
  // ...api call...
} catch (error) {
  if (error instanceof WilmaError) {
    const log = {
      timestamp: new Date().toISOString(),
      error: error.toJSON() // Serialize for logging
    };
    logger.error(log);
  }
}
```

### Pattern 5: Error Recovery

```typescript
import { WilmaAuthClient, isWilmaSessionError } from 'wilma-api';

async function getChildOverview(auth: WilmaAuthClient, childId: string) {
  try {
    return await auth.overview().fetchOverview(childId);
  } catch (error) {
    if (isWilmaSessionError(error)) {
      // Attempt recovery
      console.log('Session expired, re-authenticating...');
      await auth.login(username, password);
      // Retry
      return await auth.overview().fetchOverview(childId);
    }
    throw error;
  }
}
```

## Error Codes Reference

| Code | Error Class | Cause |
|------|-------------|-------|
| `AUTH_ERROR` | `WilmaAuthError` | Authentication failed |
| `SESSION_ERROR` | `WilmaSessionError` | Session expired or invalid |
| `NETWORK_ERROR` | `WilmaNetworkError` | HTTP request failed |
| `PARSE_ERROR` | `WilmaParseError` | Cannot parse response data |
| `VALIDATION_ERROR` | `WilmaValidationError` | Invalid argument or config |
| `API_VERSION_ERROR` | `WilmaApiVersionError` | Unsupported API version |
| `UNKNOWN_ERROR` | `WilmaError` | Unknown error |

## Best Practices

1. **Always catch errors** - Use try/catch or .catch() for all async operations
2. **Use type guards** - Prefer type guard functions over instanceof for cleaner code
3. **Preserve context** - Include original error when wrapping (`originalError` parameter)
4. **Log errors** - Use `.toJSON()` method for structured logging
5. **Provide user feedback** - Map error codes to user-friendly messages
6. **Handle retries** - Retry network errors with exponential backoff
7. **Don't suppress errors** - Always log or handle errors, never silently ignore

## Example: Complete Error Handler

```typescript
import { WilmaAuthClient, WilmaError, isWilmaSessionError } from 'wilma-api';

class ErrorHandler {
  static handle(error: unknown): string {
    if (!isWilmaError(error)) {
      return 'An unexpected error occurred';
    }

    switch (error.code) {
      case 'AUTH_ERROR':
        return 'Authentication failed. Please check your credentials.';
      case 'SESSION_ERROR':
        return 'Your session has expired. Please log in again.';
      case 'NETWORK_ERROR':
        return 'Network error. Please check your connection.';
      case 'PARSE_ERROR':
        return 'Failed to process server response.';
      case 'VALIDATION_ERROR':
        return `Invalid ${(error as any).field}: ${error.message}`;
      case 'API_VERSION_ERROR':
        return 'This Wilma API version is not supported.';
      default:
        return error.message;
    }
  }
}

// Usage
try {
  const auth = new WilmaAuthClient({ baseUrl });
  await auth.login(username, password);
} catch (error) {
  const userMessage = ErrorHandler.handle(error);
  showToast(userMessage);
}
```
