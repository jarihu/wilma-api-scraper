# Error Handling Implementation Summary

## Overview

Implemented a comprehensive, typed error handling system for the Wilma API library that provides:

- **7 Custom Error Classes** with specific use cases
- **Type Guards** for safe error handling  
- **Error Chaining** for debugging context
- **Structured Logging** with JSON serialization

## Implementation Details

### Files Added

1. **`src/errors.ts`** (167 lines)
   - Base `WilmaError` class
   - 6 specialized error subclasses
   - 5 type guard functions
   - Comprehensive JSDoc documentation

2. **`test/errors.test.ts`** (330 lines)
   - 24 unit tests covering all error classes
   - Tests for type guards
   - Tests for error serialization
   - Tests for error chaining

3. **`docs/ERROR_HANDLING.md`** (Complete guide)
   - Error class reference
   - Usage patterns and examples
   - Best practices
   - Error code reference table

4. **`test/example-error-handling.ts`**
   - 6 practical examples
   - Different error handling patterns
   - Real-world scenarios

### Error Class Hierarchy

```
WilmaError (base)
├── WilmaAuthError
│   └── WilmaSessionError
├── WilmaNetworkError
├── WilmaParseError
├── WilmaValidationError
└── WilmaApiVersionError
```

## Error Classes

### 1. **WilmaError** (Base)
- Generic error class for all Wilma API errors
- Properties: `code`, `statusCode`, `originalError`
- Methods: `toJSON()`

### 2. **WilmaAuthError**
- Authentication failures (invalid credentials, login errors)
- Error code: `AUTH_ERROR`
- Extends: `WilmaError`

### 3. **WilmaSessionError** 
- Session expiration or invalid session
- Error code: `AUTH_ERROR` (inherits from WilmaAuthError)
- Extends: `WilmaAuthError`

### 4. **WilmaNetworkError**
- Network/HTTP request failures
- Error code: `NETWORK_ERROR`
- Properties: `method`, `url` (for request context)

### 5. **WilmaParseError**
- Response parsing or validation failures
- Error code: `PARSE_ERROR`
- Properties: `dataType` (e.g., 'overview', 'homework')

### 6. **WilmaValidationError**
- Invalid arguments or configuration
- Error code: `VALIDATION_ERROR`
- Properties: `field` (which field was invalid)

### 7. **WilmaApiVersionError**
- API version incompatibility
- Error code: `API_VERSION_ERROR`
- Properties: `detectedVersion`, `supportedVersions`

## Type Guards

Exported functions for safe type narrowing:

```typescript
isWilmaError(error)        // Checks instanceof WilmaError
isWilmaAuthError(error)    // Checks instanceof WilmaAuthError
isWilmaNetworkError(error) // Checks instanceof WilmaNetworkError
isWilmaParseError(error)   // Checks instanceof WilmaParseError
isWilmaSessionError(error) // Checks instanceof WilmaSessionError
```

## Features

### ✅ Proper Prototype Chain
- Uses `Object.setPrototypeOf()` for correct instanceof behavior
- All errors properly extend Error

### ✅ Error Chaining
- Preserves original errors via `originalError` property
- Allows debugging through error stack

### ✅ Structured Logging
- `.toJSON()` method serializes errors for logging systems
- Removes circular references
- Includes all relevant context

### ✅ Type Safety
- Full TypeScript support
- Type guards for pattern matching
- Proper error narrowing in catch blocks

### ✅ Comprehensive Documentation
- JSDoc on all classes and functions
- Complete guide in `docs/ERROR_HANDLING.md`
- Multiple usage examples
- Best practices documented

## Test Coverage

**66 total tests passing:**
- ✅ 24 error handling tests
- ✅ 22 homework tests
- ✅ 11 smoke tests  
- ✅ 7 simple API tests
- ✅ 2 overview client tests

**Error tests include:**
- Class instantiation
- Error properties and defaults
- instanceof checks
- JSON serialization
- Type guards
- Error chaining
- Full error scenarios

## Usage Example

```typescript
import { WilmaAuthClient, isWilmaAuthError, isWilmaNetworkError } from 'wilma-api';

try {
  const auth = new WilmaAuthClient({ baseUrl });
  await auth.login(username, password);
} catch (error) {
  if (isWilmaAuthError(error)) {
    console.error('Login failed:', error.message);
  } else if (isWilmaNetworkError(error)) {
    console.error('Network error:', error.message);
    console.error('Failed request:', error.method, error.url);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Integration with Existing Code

- ✅ Exports added to `src/index.ts`
- ✅ No breaking changes to existing API
- ✅ All existing tests still pass
- ✅ Build successful with no errors

## Next Steps (Optional)

The following could be implemented using these error classes:

1. **HTTP Interceptors** - Catch axios errors and wrap with WilmaNetworkError
2. **Validation** - Use WilmaValidationError for input validation
3. **Retry Logic** - Retry on WilmaNetworkError with exponential backoff
4. **Session Management** - Throw WilmaSessionError when token is invalid
5. **Logging Middleware** - Log all WilmaErrors with structured format

These would provide complete error handling throughout the library.

## Files Modified

- `src/index.ts` - Added error class exports
- `src/errors.ts` - New file (all error classes)
- `test/errors.test.ts` - New file (all tests)
- `test/example-error-handling.ts` - New file (examples)
- `docs/ERROR_HANDLING.md` - New file (documentation)

## Statistics

- **Error Classes**: 7
- **Type Guards**: 5
- **Lines of Code**: ~500 (src + tests + docs)
- **Test Cases**: 24
- **Examples**: 6
- **Documentation**: Complete guide + inline docs
