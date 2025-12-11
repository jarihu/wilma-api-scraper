# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2025-12-09

### Fixed

- **CRITICAL**: Fixed `overview().fetchOverview()` returning empty arrays. The parser was looking for non-existent field `GroupName` instead of `Name`, and was not parsing the `Schedule` array at all.
- Overview parser now correctly extracts both Schedule (timetable) and Groups (courses with homework/exams) arrays from the Wilma API response.

### Changed

- **BREAKING**: `Overview` interface structure changed:
  - Removed: `children: Array<{ childName: string; groups: OverviewGroup[] }>`
  - Added: `schedule: ScheduleEntry[]` and `groups: OverviewGroup[]` (flattened structure)
- **BREAKING**: `OverviewGroup` interface now includes full course data:
  - Added: `id`, `courseId`, `name`, `caption`, `courseName`, `courseCode`, `startDate`, `endDate`
  - Added: `homework: HomeworkEntry[]` and `diary: DiaryEntry[]`
  - Changed: `groupName` → `name`, `teachers` now includes `id` field

### Added

- New `ScheduleEntry` interface for timetable data with day, start/end times, and groups
- `scheduleId` and `dateArray` fields in `ScheduleEntry` for identifying schedule templates and specific class dates
- New `HomeworkEntry` and `DiaryEntry` interfaces for structured homework and lesson note data
- New `Teacher` interface with `id`, `name`, and `code` fields
- Debug script `test/debug-overview.ts` for troubleshooting overview endpoint issues
- Comprehensive documentation in `OVERVIEW_FIX.md` explaining the changes

### Migration Guide

```typescript
// Before (0.4.0)
const overview = await auth.overview().fetchOverview(childId);
const groups = overview.children[0]?.groups || [];

// After (0.5.0)
const overview = await auth.overview().fetchOverview(childId);
const groups = overview.groups;           // Direct access
const schedule = overview.schedule;       // New: timetable data
const homework = groups[0].homework;      // New: direct homework access
```

## [0.4.0] - 2025-12-07

### Removed

- **BREAKING**: Deprecated `WilmaAuthClient` dual-constructor pattern. The legacy constructor accepting separate `WilmaHttpClient` and config arguments has been removed. Use the modern constructor with only a config object: `new WilmaAuthClient({ baseUrl })`. The HTTP client is now managed internally and transparently.
- Removed "Advanced API" examples from documentation showing manual `WilmaHttpClient` instantiation. The library now provides a unified, simplified API via `WilmaAuthClient` with optional custom `httpClient` configuration for advanced users.

### Changed

- Simplified `WilmaAuthClient` constructor to accept only a configuration object. HTTP client management is now completely internal.
- Updated documentation to focus on single unified API pattern instead of showing dual patterns.

## [0.3.0] - 2025-12-07

### Added

- Class-based services across the library: `WilmaHttpClient`, `ExamsClient`, `MessagesClient`, `MessageDetailService`, `OverviewParser`, `ChildParser`
- Static helpers on classes for parsing and filtering (exams, overview, child parsing)

### Changed

- Refactored exams, messages, overview, and parser modules to object-oriented APIs
- `createWilmaClient` now wraps the new `WilmaHttpClient`
- Index exports updated to class-based API only
- Date parsing now uses `date-fns` for reliability and locale support

### Removed

- Deprecated functional exports for auth, exams, messages, and parsing

## [0.2.0] - 2025-12-07

### Added

- New `WilmaAuthClient` class for object-oriented authentication
- `WilmaAuthConfig` interface for client configuration
- Methods: `isAuthenticated()`, `getSessionValue()`, `getToken()`

### Changed

- Redesigned authentication API from functional to object-oriented
- Simplified login method - now only requires username, password, and baseUrl
- Automatic token fetching within login method
- Session and token state management moved to class properties

### Deprecated

- `getToken()` function - use `WilmaAuthClient` instead
- `login()` function - use `WilmaAuthClient` instead
- `logout()` function - use `WilmaAuthClient` instead

## [0.1.0] - 2025-12-07

### Added

- Initial release
- Authentication and session management
- Exam calendar fetching and parsing
- Messages and messaging detail retrieval
- Student overview information parsing
- HTTP client with cookie jar support
- Full TypeScript support with type definitions
- Logout feature

