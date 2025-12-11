# wilma-api

Pure TypeScript, class-based library for Wilma school information system API interaction and parsing.

## Features

- Class-based services: `WilmaHttpClient`, `WilmaAuthClient`, `ExamsClient`, `MessagesClient`, `OverviewClient`, `MessageDetailService`, `OverviewParser`, `ChildParser`, `HomeworkExtractor`
- Automatic token/session management via `WilmaAuthClient`
- Exam calendar fetching and parsing with helpers to filter future exams
- Messages listing with printable-detail parsing and attachment detection
- Student overview fetching and parsing from JSON responses
- Homework extraction from overview data (last 7 days)
- Cookie jar support for persistent sessions
- Full TypeScript types for all APIs

## Installation

```bash
npm install wilma-api
```

## Quick Start

**Simple API (Recommended):**

```typescript
import { WilmaAuthClient, HomeworkExtractor } from 'wilma-api';

const auth = new WilmaAuthClient({
  baseUrl: 'https://your-wilma-server.edu'
});

// Login
await auth.login('username', 'password');

// Get children with school and class info (automatically parsed during login)
const children = auth.getChildren();
children.forEach(child => {
  console.log(`${child.name} - ${child.schoolName}, Class: ${child.className}`);
});

// Or get a specific child
const child = auth.getChild('child-id');
console.log(`School: ${child?.schoolName}, Class: ${child?.className}`);

// Use built-in service accessors
const overview = await auth.overview().fetchOverview('child-id');
const rawOverview = await auth.overview().fetchOverviewRaw('child-id');
const homework = HomeworkExtractor.extractHomework(rawOverview);

const exams = await auth.exams().fetchCalendar('child-id');
const upcoming = auth.exams().constructor.filterFutureExams(exams);

const { list, details } = await auth.messages().fetchMessages('child-id');

// Logout
await auth.logout();
```

## Authentication

const auth = new WilmaAuthClient({
  baseUrl: 'https://your-wilma-server.edu',
  usernameField: 'Login',   // optional override
  passwordField: 'Password' // optional override
});

await auth.login('username', 'password');

if (auth.isAuthenticated()) {
  console.log('Session', auth.getSessionValue());
}

// Access services through the auth client
const exams = await auth.exams().fetchCalendar('child-id');
const messages = await auth.messages().fetchMessages('child-id');
const overview = await auth.overview().fetchOverview('child-id');

await auth.logout();
```

### WilmaAuthClient methods

- `login(username, password)` → authenticate user and parse child information
- `logout()` → end session
- `getChildren()` → get all children with school and class info (available after login)
- `getChild(childId)` → get specific child by ID with school and class info
- `getSessionValue()` → current session ID (if any)
- `getToken()` → current auth token (if any)
- `isAuthenticated()` → boolean
- `getHttpClient()` → get underlying Axios instance
- `exams()` → get ExamsClient instance
- `messages()` → get MessagesClient instance
- `overview()` → get OverviewClient instance

### Child Information

After successful login, child information (name, school, class) is automatically extracted and available:

```typescript
const auth = new WilmaAuthClient({ baseUrl: 'https://your-wilma-server.edu' });
await auth.login('username', 'password');

// Get all children
const children = auth.getChildren();
// Returns: Array<{ id: string; name: string | null; schoolName: string | null; className: string | null }>

// Get specific child
const child = auth.getChild('123456');
console.log(`${child.name} attends ${child.schoolName}, class ${child.className}`);
```

## Exams

**Simple API:**
```typescript
import { WilmaAuthClient } from 'wilma-api';

const auth = new WilmaAuthClient({ baseUrl: 'https://your-wilma-server.edu' });
await auth.login('username', 'password');

const exams = await auth.exams().fetchCalendar('child-id');
const { ExamsClient } = require('wilma-api');
const future = ExamsClient.filterFutureExams(exams);
```

- `fetchCalendar(childId)` → fetch printable calendar and parse exams
- `ExamsClient.parseExamsFromHtml(html)` → parse from raw HTML
- `ExamsClient.convertFinnishDateToISO(date)` → Finnish date to ISO
- `ExamsClient.filterFutureExams(exams)` → keep future exams only

## Messages

**Simple API:**
```typescript
import { WilmaAuthClient } from 'wilma-api';

const auth = new WilmaAuthClient({ baseUrl: 'https://your-wilma-server.edu' });
await auth.login('username', 'password');

const { list, details } = await auth.messages().fetchMessages('child-id', 7);
```

- `fetchMessages(childId, pruneDays?)` → list recent messages and printable details
- Uses `MessageDetailService` internally to parse printable message pages

## Overview

**Simple API:**
```typescript
import { WilmaAuthClient, HomeworkExtractor } from 'wilma-api';

const auth = new WilmaAuthClient({ baseUrl: 'https://your-wilma-server.edu' });
await auth.login('username', 'password');

// Fetch parsed overview with schedule and groups
const overview = await auth.overview().fetchOverview('child-id');
console.log(`Role: ${overview.role}`);
console.log(`Schedule entries: ${overview.schedule.length}`);
console.log(`Groups/Courses: ${overview.groups.length}`);

// Access homework from groups
overview.groups.forEach(group => {
  console.log(`${group.name}: ${group.homework.length} assignments`);
});

// Or use raw data for homework extraction
const rawData = await auth.overview().fetchOverviewRaw('child-id');
const homework = HomeworkExtractor.extractHomework(rawData);
```

### Overview Response Structure

```typescript
interface Overview {
  role: string;                    // User role (e.g., "guardian")
  schedule: ScheduleEntry[];       // Timetable/schedule data
  groups: OverviewGroup[];         // Courses with homework/exams/diary
}

interface OverviewGroup {
  id: number;
  courseId: number;
  name: string;                    // Course name (e.g., "ENA1")
  caption: string;                 // Short caption
  courseName: string;              // Full course name
  courseCode: string;              // Course code
  startDate: string;               // ISO date
  endDate: string;                 // ISO date
  teachers: Teacher[];             // Course teachers
  homework: HomeworkEntry[];       // Homework assignments
  diary: DiaryEntry[];            // Lesson notes
  exams: OverviewExam[];          // Upcoming exams
}

interface ScheduleEntry {
  scheduleId: number;             // Schedule template ID
  day: number;                    // Day of week (1 = Monday)
  start: string;                  // Start time "08:00"
  end: string;                    // End time "08:45"
  class: string;                  // Class name "5B"
  dateArray: string[];            // Specific dates ["2025-12-01", "2025-12-08", ...]
  groups: Array<{                 // Groups in this time slot
    id: number;
    shortCaption: string;
    caption: string;
    fullCaption: string;
    teachers: Teacher[];
  }>;
}
```

### OverviewClient methods

- `fetchOverview(childId)` → fetch and parse overview data
- `fetchOverviewRaw(childId)` → fetch raw JSON without parsing

### OverviewParser (static utilities)

- `OverviewParser.parseOverviewJson(response, childId)` → parse raw response to structured overview
- `OverviewParser.convertFinnishDateToISO(date)` → convert Finnish date to ISO

### HomeworkExtractor

- `HomeworkExtractor.extractHomework(overviewData)` → extract homework from last 7 days

## Child parsing

```typescript
import { ChildParser } from 'wilma-api';

const entries = ChildParser.extractChildEntries(html);
const schoolAndClass = ChildParser.extractChildSchoolAndClass(html, 'child-id');
```

## HTTP utilities

**Note:** Most users don't need to use these directly. The simple API (`new WilmaAuthClient({ baseUrl })`) handles HTTP client creation automatically.

**For advanced use cases:**

- `WilmaHttpClient` → class with Axios + cookie jar; `getClient()` and `getCookieJar()`
- `createWilmaClient()` → helper returning `{ client, jar }`
- `userAgent()` → helper for UA string (also available as `WilmaHttpClient.userAgent()`)

```typescript
// Only needed for custom HTTP client configuration
import { WilmaHttpClient, WilmaAuthClient } from 'wilma-api';

const http = new WilmaHttpClient();
const auth = new WilmaAuthClient(http.getClient(), { baseUrl });
// Or pass custom client to config
const auth2 = new WilmaAuthClient({ 
  baseUrl, 
## API Design

This library provides a unified API using `WilmaAuthClient` as the main facade. It manages the HTTP client internally and provides service accessors (`.exams()`, `.messages()`, `.overview()`).

For advanced use cases requiring custom HTTP client configuration, you can pass a custom `httpClient` in the config:

```typescript
import { WilmaHttpClient, WilmaAuthClient } from 'wilma-api';

const http = new WilmaHttpClient();
const auth = new WilmaAuthClient({
  baseUrl: 'https://your-wilma-server.edu',
  httpClient: http.getClient()
});
```

## License

MIT

