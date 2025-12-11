# Wilma API Library - Complete Feature Summary

## Overview

The wilma-api is a comprehensive TypeScript library for interacting with the Wilma school information system. It provides object-oriented APIs for authentication, student data extraction, homework tracking, and message management.

**Current Version:** 0.1.0  
**Latest Update:** Homework extraction feature with 22 comprehensive unit tests

---

## Core Features

### 1. HTTP Client Layer (`src/http.ts`)
- **WilmaHttpClient** - Axios wrapper with cookie jar support for session persistence
- **userAgent()** - Proper User-Agent string for Wilma compatibility
- **createWilmaClient()** - Functional helper for creating HTTP client instances

**Key Methods:**
- `WilmaHttpClient.create()` - Factory method for new instances
- `getClient()` - Returns underlying Axios instance
- `getCookieJar()` - Access to session cookie management

### 2. Authentication (`src/auth.ts`)
- **WilmaAuthClient** - Handles login/logout and session management
- Token-based authentication with private token storage
- Session value management for maintaining Wilma sessions

**Key Methods:**
- `login(username, password)` - Authenticate with Wilma server
- `logout()` - Terminate session
- `isAuthenticated()` - Check current authentication status
- `getSessionValue(key)` - Retrieve session data

**Configuration:**
```typescript
const config: WilmaAuthConfig = {
  baseUrl: 'https://school.wilma.fi',
  usernameField: 'Login',      // optional
  passwordField: 'Password'     // optional
};
const auth = new WilmaAuthClient(httpClient.getClient(), config);
```

### 3. Child Parser (`src/parser.ts`)
- Extract student/child information from landing page HTML
- Parse school and class information for each student

**Interfaces:**
- `ChildEntry` - { id, name }
- `SchoolAndClass` - { schoolName, className }

**Key Methods:**
- `ChildParser.extractChildEntries(html)` - Extract child links
- `ChildParser.extractChildSchoolAndClass(html, childId)` - Get school info

### 4. Exams (`src/exams.ts`)
- Fetch and parse exam calendars from printable Wilma pages
- Support for multiple date formats (ISO, Finnish with/without weekday)
- Date-fns integration for reliable date handling

**Interface:**
```typescript
interface ExamEntry {
  date: string;           // original format
  dateIso: string;        // ISO 8601
  subject: string;
  teachers: string[];
  summary: string;
  description: string | null;
}
```

**Key Methods:**
- `ExamsClient.fetchCalendar(childId)` - Fetch exam calendar
- `ExamsClient.parseExamsFromHtml(html)` - Parse HTML to entries
- `ExamsClient.convertFinnishDateToISO(date)` - Date conversion
- `ExamsClient.filterFutureExams(exams)` - Filter future exams only

### 5. Overview Parser (`src/overview.ts`)
- Parse Wilma overview JSON API responses
- Extract role, children, groups, and exam information
- Comprehensive student academic data structure

**Interfaces:**
```typescript
interface Overview {
  role: string;
  children: Array<{
    childName: string;
    groups: OverviewGroup[];
  }>;
}

interface OverviewGroup {
  groupName: string;
  teachers: Array<{ name: string; code: string }>;
  exams: OverviewExam[];
}

interface OverviewExam {
  date: string;
  dateIso: string;
  subject: string;
  teachers: string[];
  summary: string;
  description: string | null;
}
```

**Key Methods:**
- `OverviewParser.parseOverviewJson(data, childId)` - Parse overview response
- `OverviewParser.convertFinnishDateToISO(date)` - Date conversion

### 6. Homework Extractor (`src/homework.ts`) - **NEW**
- Extract recent homework from overview JSON (last 7 days)
- Multi-format date parsing (ISO, Finnish, with day names)
- Normalized homework entries with course and group metadata

**Interface:**
```typescript
interface HomeworkEntry {
  courseId: number;
  courseName: string;
  courseCode: string;
  groupName: string;
  date: string;           // original format
  dateIso: string;        // ISO 8601
  homework: string;       // homework text
}
```

**Key Methods:**
- `HomeworkExtractor.extractHomework(responseData)` - Extract recent homework

**Features:**
- Filters to entries from last 7 days (inclusive)
- Extracts latest homework per course group
- Supports multiple date formats with Finnish locale
- Full type safety with validation

### 7. Messages (`src/messages.ts` & `src/messages_detail_helper.ts`)
- Fetch message lists and details
- Parse HTML message pages for content extraction

**Interfaces:**
```typescript
interface MessageListItem {
  id: string;
  from: string;
  subject: string;
  date: string;
}

interface MessageDetail {
  subject: string;
  from: string;
  date: string;
  body: string;
  hasAttachment: boolean;
}
```

**Key Methods:**
- `MessagesClient.fetchMessages(childId, pruneDays?)` - Get messages
- `MessageDetailService.fetch(childId, messageId)` - Get message content

---

## Testing

### Smoke Tests (`test/smoke.test.ts`)
- 11 tests validating all core exports
- HTTP client initialization and helpers
- Method signatures and return types

### Homework Tests (`test/homework.test.ts`)
- 22 comprehensive unit tests
- Edge cases: empty data, invalid dates, boundary conditions
- Date range filtering validation
- Multiple format support testing
- Output structure validation

### Demo App (`test/demo-app.ts`)
- Interactive demonstration of all library features
- Loads real data from `json/overview.json`
- Shows method usage and output examples
- Run with: `npx ts-node test/demo-app.ts`

**Test Results:** ✅ 33/33 tests passing

---

## Architecture & Design

### Object-Oriented Design
- All modules implemented as classes with static helper methods
- Private property encapsulation for security (e.g., token storage)
- Factory methods for clean instance creation

### Date Handling
- **date-fns** library for reliable date manipulation
- Finnish locale (`fi`) support for date parsing
- UTC noon timestamp consistency across all date conversions
- Supports formats: `yyyy-MM-dd`, `d.M.yyyy`, `EEE d.M.yyyy`

### Type Safety
- Full TypeScript 5.9.3 strict mode compilation
- Exported interfaces for all public data structures
- No `any` types; proper type validation throughout

### Dependencies
- **axios** (1.13.2) - HTTP requests with cookie jar support
- **cheerio** (1.1.2) - HTML parsing and DOM manipulation
- **date-fns** (3.6.0) - Date formatting and manipulation
- **tough-cookie** (6.0.5) - Cookie jar for session persistence

---

## Public API Exports

```typescript
// HTTP utilities
export { WilmaHttpClient, createWilmaClient, userAgent }
export type { WilmaAuthConfig }

// Authentication
export { WilmaAuthClient }

// Parsers
export { ChildParser }
export type { ChildEntry, SchoolAndClass }

// Exams
export { ExamsClient }
export type { ExamEntry }

// Overview
export { OverviewParser }
export type { Overview, OverviewExam, OverviewGroup }

// Messages
export { MessagesClient, MessageDetailService }
export type { MessageListItem, MessageDetail }

// Homework (NEW)
export { HomeworkExtractor }
export type { HomeworkEntry }

// Third-party types
export type { AxiosInstance, AxiosResponse }
```

---

## Getting Started

### Installation
```bash
npm install wilma-api
```

### Basic Usage
```typescript
import {
  WilmaHttpClient,
  WilmaAuthClient,
  OverviewParser,
  HomeworkExtractor,
} from 'wilma-api';

// Create HTTP client
const http = WilmaHttpClient.create();

// Authenticate
const auth = new WilmaAuthClient(http.getClient(), {
  baseUrl: 'https://school.wilma.fi'
});
await auth.login('username', 'password');

// Get overview data
const response = await http.getClient().get('/api/overview');
const overview = OverviewParser.parseOverviewJson(response.data, 'childId');

// Extract recent homework
const homework = HomeworkExtractor.extractHomework(response.data);
console.log(homework);
```

---

## Build & Test

### Build
```bash
npm run build
```

### Test
```bash
npm test
```

### Demo
```bash
npx ts-node test/demo-app.ts
```

---

## Changelog

### v0.3.0 - Complete OOP Refactor + Homework Extraction
- ✅ Complete refactor from functional to class-based OOP
- ✅ HomeworkExtractor for recent homework (last 7 days)
- ✅ 22 comprehensive homework unit tests
- ✅ Integrated date-fns with Finnish locale
- ✅ UTC noon timestamp standardization
- ✅ Removed deprecated functional exports
- ✅ Private token storage in WilmaAuthClient
- ✅ Demo app for feature validation

### v0.2.0 - Authentication Enhancement
- ✅ Added logout functionality
- ✅ Improved token handling

### v0.1.0 - Initial Release
- ✅ HTTP client with cookie jar support
- ✅ Child parser and school/class extraction
- ✅ Exam calendar parsing
- ✅ Overview JSON parser
- ✅ Message client and detail service
- ✅ Full TypeScript support

---

## File Structure

```
wilma-api/
├── src/
│   ├── index.ts              # Public API exports
│   ├── http.ts               # HTTP client wrapper
│   ├── auth.ts               # Authentication
│   ├── parser.ts             # Child/school parser
│   ├── exams.ts              # Exam parsing
│   ├── overview.ts           # Overview parser
│   ├── homework.ts           # Homework extraction (NEW)
│   ├── messages.ts           # Messages client
│   └── messages_detail_helper.ts  # Message details
├── test/
│   ├── smoke.test.ts         # Core functionality tests (11 tests)
│   ├── homework.test.ts      # Homework extraction tests (22 tests)
│   ├── demo-app.ts           # Interactive demo application (NEW)
│   └── README.md             # Demo app documentation (NEW)
├── json/
│   └── overview.json         # Sample data for testing
├── dist/                     # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc
└── .npmignore
```

---

## License

MIT

## Support

For issues or questions, refer to the demo app (`npx ts-node test/demo-app.ts`) for usage examples.
