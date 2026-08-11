# Wilma API Tests

## Structure

```
test/
├── fixtures/                  Test data shared across test files
│   └── overview.json          Real Wilma overview JSON response
├── manual/                    Manual scripts for local debugging (not part of test suite)
├── auth.test.ts               WilmaAuthClient constructor and service accessors
├── errors.test.ts             Error classes, type guards, and chaining
├── exports.test.ts            Public API export verification
├── homework.test.ts           HomeworkExtractor date parsing and filtering
├── logger.test.ts             Logger level management and output
├── messages-detail-helper.test.ts  MessageDetailService HTML parsing
├── overview.test.ts           OverviewClient JSON and HTML fallback flows
├── parser.test.ts             ChildParser HTML extraction from landing page
└── retry.test.ts              withRetry backoff, success, and failure behavior
```

## Running Tests

```bash
npm test              # All tests
npx vitest --run      # Single run
npx vitest            # Watch mode
npx vitest --coverage # With coverage report
```

The manual scripts in `test/manual/` are not part of the automated test suite. They are development utilities that require real Wilma credentials (set in `.env`, see `.env.example`).
