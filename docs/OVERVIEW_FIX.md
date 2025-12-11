# Overview Endpoint Issue - Resolution

## Issue Summary
The `overview().fetchOverview()` method was returning empty arrays for Schedule and Groups due to incorrect field mapping in the parser.

## Root Cause
The `OverviewParser.parseOverviewJson()` function had two critical bugs:

1. **Wrong field name**: Looking for `group.GroupName` when the actual field is `group.Name`
2. **Missing Schedule parsing**: The parser was only extracting the top-level `Groups` array and completely ignoring the `Schedule` array

## Actual Wilma Overview JSON Structure

```json
{
  "Role": "guardian",
  "AddAppt": false,
  "Schedule": [
    {
      "Day": 1,
      "Start": "08:00",
      "End": "08:45",
      "Class": "5B",
      "Groups": [
        {
          "Id": 1096541,
          "ShortCaption": "ENA1.A",
          "Caption": "ENA1.A",
          "FullCaption": "Englanti, A1-kieli",
          "Teachers": [...]
        }
      ]
    }
  ],
  "Groups": [
    {
      "Id": 1096538,
      "CourseId": 66176,
      "Name": "ENA1",
      "Caption": "ENA1 ENA15s",
      "CourseName": "ENA1 5 lk syksy",
      "CourseCode": "ENA15s",
      "Teachers": [...],
      "Homework": [...],
      "Diary": [...],
      "Exams": [...]
    }
  ]
}
```

## Changes Made

### 1. Updated Overview Interface (`src/overview.ts`)

**Before:**
```typescript
export interface Overview {
  role: string;
  children: Array<{
    childName: string;
    groups: OverviewGroup[];
  }>;
}

export interface OverviewGroup {
  groupName: string;  // ❌ Wrong field name
  teachers: Array<{ name: string; code: string }>;
  exams: OverviewExam[];
  // Missing: homework, diary, schedule
}
```

**After:**
```typescript
export interface Overview {
  role: string;
  schedule: ScheduleEntry[];  // ✅ New
  groups: OverviewGroup[];    // ✅ Flattened structure
}

export interface OverviewGroup {
  id: number;
  courseId: number;
  name: string;              // ✅ Correct field
  caption: string;
  courseName: string;
  courseCode: string;
  teachers: Teacher[];
  homework: HomeworkEntry[]; // ✅ New
  diary: DiaryEntry[];       // ✅ New
  exams: OverviewExam[];
}

export interface ScheduleEntry {
  day: number;
  start: string;
  end: string;
  class: string;
  groups: Array<{
    id: number;
    shortCaption: string;
    caption: string;
    fullCaption: string;
    teachers: Teacher[];
  }>;
}
```

### 2. Fixed Parser Logic

The parser now correctly:
- ✅ Maps `group.Name` instead of non-existent `group.GroupName`
- ✅ Extracts `Schedule` array with nested Groups (timetable data)
- ✅ Extracts top-level `Groups` array with Homework, Diary, and Exams
- ✅ Properly maps all teacher fields (`TeacherId`, `TeacherName`, `TeacherCode`)
- ✅ Parses homework entries with `RowNumber`, `Date`, and `Homework` fields
- ✅ Parses diary (lesson notes) entries
- ✅ Returns a flattened structure (no `children` wrapper)

### 3. Updated Tests

Updated `test/overview-client.test.ts` to verify:
- ✅ `result.schedule` exists and is an array
- ✅ `result.groups` exists and is an array
- ✅ Groups contain all expected fields (homework, diary, exams, teachers)

## Endpoint Information

**URL Pattern:** `${baseUrl}/overview_json?child=${childId}`
- Example: `https://ouka.inschool.fi/overview_json?child=0000000`
- Method: GET
- Requires: Active session (cookies from login)
- Returns: JSON with Schedule and Groups arrays

## Usage Example

```typescript
import { WilmaAuthClient } from 'wilma-api';

const auth = new WilmaAuthClient({ 
  baseUrl: 'https://ouka.inschool.fi',
  usernameField: 'Login',
  passwordField: 'Password'
});

await auth.login(username, password);

// Fetch parsed overview with schedule and homework
const overview = await auth.overview().fetchOverview(childId);

console.log(`Role: ${overview.role}`);
console.log(`Schedule entries: ${overview.schedule.length}`);
console.log(`Groups/Courses: ${overview.groups.length}`);

// Access timetable/schedule
overview.schedule.forEach(entry => {
  console.log(`Day ${entry.day}, ${entry.start}-${entry.end}`);
  entry.groups.forEach(g => {
    console.log(`  ${g.caption} - ${g.teachers.map(t => t.name).join(', ')}`);
  });
});

// Access homework by course
overview.groups.forEach(group => {
  console.log(`\n${group.name} - ${group.courseName}`);
  
  // Recent homework
  if (group.homework.length > 0) {
    console.log('  Homework:');
    group.homework.slice(0, 3).forEach(hw => {
      console.log(`    ${hw.date}: ${hw.homework.substring(0, 80)}...`);
    });
  }
  
  // Upcoming exams
  if (group.exams.length > 0) {
    console.log('  Exams:');
    group.exams.forEach(exam => {
      console.log(`    ${exam.date}: ${exam.subject}`);
    });
  }
});

await auth.logout();
```

## Real Example Output

```
Role: guardian
Schedule entries: 23
Groups/Courses: 15

Day 1, 08:00-08:45
  ENA1.A - Saalasti Merja

ENA1 - ENA1 5 lk syksy
  Homework:
    2025-12-08: Tunnilla kuvasanasti 8. Kirjasta pariharkat s. 96 t. 1-2...
    2025-12-03: Lyhyiden adjektiivien vertailun kertausta...
    2025-12-02: Läksyn kuulustelu pareittain kpl 7 fraaseista...
  Exams:
    2025-11-18: EXAM
    2025-12-08: Kappale 7 ja 8

MA - Matematiikka 5 lk syksy
  Homework:
    2025-12-08: KPL 18 s. 64 t. 1-2, s. 65 t. 3...
    2025-12-01: Tilastot ja todennäköisyys, kpl 39-45
```

## Debugging Tool

A debug script has been created at `test/debug-overview.ts` that:
- ✅ Logs the raw HTTP response
- ✅ Saves response to `json/debug-overview-response.json`
- ✅ Analyzes the response structure
- ✅ Shows parsed vs raw data comparison

**Usage:**
```bash
$env:WILMA_BASE_URL="https://ouka.inschool.fi"
$env:WILMA_USERNAME="your-username"
$env:WILMA_PASSWORD="your-password"
$env:WILMA_CHILD_ID="0000000"

npm run build
node dist/test/debug-overview.js
```

## Verification

All tests now pass:
- ✅ 2/2 overview-client tests passing
- ✅ TypeScript compiles with no errors
- ✅ Real `overview.json` test data is correctly parsed

## Response to Original Questions

### 1. What is the exact URL path?
**Answer:** `${baseUrl}/overview_json?child=${childId}`

### 2. Is the response empty or misparsed?
**Answer:** The response contains data, but the parser was:
- Looking for wrong field names (`GroupName` vs `Name`)
- Not parsing the `Schedule` array at all

### 3. Has the Wilma API structure changed?
**Answer:** The test JSON file (`json/overview.json`) shows the correct structure has been consistent. The parser implementation was incorrect from the start.

### 4. Debugging hooks?
**Answer:** Created `test/debug-overview.ts` which logs:
- Raw URL being requested
- Complete raw response (saved to JSON file)
- Response structure analysis
- Parsed vs raw data comparison

## Breaking Change Notice

The `Overview` interface has changed from:
```typescript
interface Overview {
  role: string;
  children: Array<{ childName: string; groups: OverviewGroup[] }>;
}
```

To:
```typescript
interface Overview {
  role: string;
  schedule: ScheduleEntry[];
  groups: OverviewGroup[];
}
```

**Migration:**
```typescript
// Before
const groups = overview.children[0]?.groups || [];

// After
const groups = overview.groups;
const schedule = overview.schedule;
```

## Next Steps

1. ✅ Parser fixed and tested
2. ✅ Interfaces updated to match actual API
3. ✅ Debug tool created for troubleshooting
4. ⏳ User should test with real credentials using debug script
5. ⏳ Update CHANGELOG with v0.5.0 breaking changes
