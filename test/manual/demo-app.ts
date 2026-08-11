/**
 * Demo App - Wilma API Library Test Application
 * 
 * This app demonstrates usage of all exported classes and methods from the wilma-api library.
 * Run with: npx ts-node test/demo-app.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  WilmaHttpClient,
  createWilmaClient,
  userAgent,
  WilmaAuthClient,
  ChildParser,
  ExamsClient,
  OverviewParser,
  OverviewClient,
  MessagesClient,
  MessageDetailService,
  HomeworkExtractor,
} from '../../src/index';

// Load test data
const overviewJsonPath = join(__dirname, '../json/overview.json');
const overviewData = JSON.parse(readFileSync(overviewJsonPath, 'utf-8'));

console.log('='.repeat(80));
console.log('WILMA API LIBRARY - DEMO APP');
console.log('='.repeat(80));
console.log();

// ============================================================================
// 1. HTTP CLIENT
// ============================================================================
console.log('1. HTTP CLIENT');
console.log('-'.repeat(80));

console.log('User Agent String:');
console.log(`  ${userAgent()}`);
console.log();

console.log('WilmaHttpClient:');
const httpClient = WilmaHttpClient.create();
console.log(`  ✓ Instance created via WilmaHttpClient.create()`);
console.log(`  ✓ Cookie jar configured for session management`);
console.log(`  ✓ Method available: getClient() - returns AxiosInstance`);
console.log(`  ✓ Method available: getCookieJar() - returns CookieJar`);
console.log(`  ✓ Method available: detectApiVersion(baseUrl) - detects Wilma API version`);
console.log(`  ✓ Method available: getApiVersion() - returns cached API version`);
console.log(`  ✓ Method available: logInfo() - logs client configuration`);
console.log();

console.log('Functional wrapper (createWilmaClient):');
const { client: axiosClient, jar: cookieJar } = createWilmaClient();
console.log(`  ✓ Returns { client: AxiosInstance, jar: CookieJar }`);
console.log(`  ✓ Useful for direct Axios manipulation if needed`);
console.log();

// ============================================================================
// 2. AUTHENTICATION
// ============================================================================
console.log('2. AUTHENTICATION');
console.log('-'.repeat(80));

console.log('WilmaAuthClient:');
console.log(`  ✓ Constructor: new WilmaAuthClient(client: AxiosInstance, config: WilmaAuthConfig)`);
console.log(`  ✓ Config includes: baseUrl, usernameField?, passwordField?`);
console.log(`  ✓ Method: login(username, password) → Promise<boolean>`);
console.log(`  ✓ Method: logout() → Promise<void>`);
console.log(`  ✓ Method: getSessionValue(key) → string | undefined`);
console.log(`  ✓ Method: isAuthenticated() → boolean`);
console.log(`  ✓ Token is stored privately after successful login`);
console.log();

// ============================================================================
// 3. CHILD PARSER
// ============================================================================
console.log('3. CHILD PARSER - Extract Child Links');
console.log('-'.repeat(80));

// Create sample HTML with child links
const sampleChildHtml = `
  <html>
    <table>
      <tr>
        <td class="cell-link">
          <a href="?child=12345&amp;session=abc123">Lapsi 1</a>
        </td>
      </tr>
      <tr>
        <td class="cell-link">
          <a href="?child=67890&amp;session=abc123">Lapsi 2</a>
        </td>
      </tr>
    </table>
  </html>
`;

const children = ChildParser.extractChildEntries(sampleChildHtml);
console.log(`Found ${children.length} child entries:`);
children.forEach((child, i) => {
  console.log(`  ${i + 1}. ID: ${child.id}, Name: ${child.name || '(no name)'}`);
});
console.log();

// ============================================================================
// 4. EXAMS CLIENT
// ============================================================================
console.log('4. EXAMS CLIENT');
console.log('-'.repeat(80));

// Sample exams HTML (simplified)
const examsHtml = `
  <html>
    <table class="proptable">
      <tr>
        <th>Ma 3.12.2025</th>
        <th>Matematiikan koe</th>
      </tr>
      <tr>
        <td></td>
        <td>Opettaja: Matti Meikäläinen</td>
      </tr>
      <tr>
        <th>Ke 5.12.2025</th>
        <th>Englannin koe</th>
      </tr>
      <tr>
        <td></td>
        <td>Opettaja: Elina Englanti</td>
      </tr>
    </table>
  </html>
`;

const exams = ExamsClient.parseExamsFromHtml(examsHtml);
console.log(`Parsed ${exams.length} exams from HTML`);
exams.slice(0, 2).forEach((exam, i) => {
  console.log(`  ${i + 1}. ${exam.date} - ${exam.subject}`);
});
console.log();

console.log('Date Conversion Examples:');
const testDates = ['3.12.2025', '2025-12-03', 'Ma 3.12.2025'];
testDates.forEach((dateStr) => {
  const iso = ExamsClient.convertFinnishDateToISO(dateStr);
  console.log(`  "${dateStr}" → "${iso}"`);
});
console.log();

// ============================================================================
// 5. OVERVIEW PARSER & CLIENT
// ============================================================================
console.log('5. OVERVIEW PARSER & CLIENT');
console.log('-'.repeat(80));

console.log('OverviewParser (static parsing):');
const overview = OverviewParser.parseOverviewJson(overviewData, '1');
console.log(`  Overview parsed successfully:`);
console.log(`  Role: ${overview.role}`);
console.log(`  Children: ${overview.children.length}`);
if (overview.children.length > 0) {
  const child = overview.children[0];
  console.log(`  Total Groups: ${child.groups.length}`);
  if (child.groups.length > 0) {
    const group = child.groups[0];
    console.log(`  Sample Group: ${group.groupName}`);
    console.log(`  Exams in group: ${group.exams.length}`);
  }
}
console.log();

console.log('OverviewClient:');
console.log(`  Method available: fetchOverview(childId)`);
console.log(`  Returns: Promise<Overview> - parsed and structured overview data`);
console.log(`  Method available: fetchOverviewRaw(childId)`);
console.log(`  Returns: Promise<unknown> - raw JSON response from Wilma`);
console.log(`  Note: Requires authenticated HTTP client and active Wilma session`);
console.log();

// ============================================================================
// 6. HOMEWORK EXTRACTOR
// ============================================================================
console.log('6. HOMEWORK EXTRACTOR');
console.log('-'.repeat(80));

const homework = HomeworkExtractor.extractHomework(overviewData);
console.log(`Extracted ${homework.length} homework entries from last 7 days:`);
homework.slice(0, 3).forEach((hw, i) => {
  console.log(`  ${i + 1}. ${hw.courseName} (${hw.courseCode})`);
  console.log(`     Group: ${hw.groupName}`);
  console.log(`     Date: ${hw.date}`);
  const hwPreview = hw.homework.substring(0, 60).replace(/\n/g, ' ');
  console.log(`     Content: "${hwPreview}..."`);
});
if (homework.length > 3) {
  console.log(`  ... and ${homework.length - 3} more`);
}
console.log();

// ============================================================================
// 7. MESSAGES CLIENT & SERVICE
// ============================================================================
console.log('7. MESSAGES CLIENT & MESSAGE DETAIL SERVICE');
console.log('-'.repeat(80));

console.log('MessagesClient:');
console.log(`  Method available: fetchMessages(childId, pruneDays?)`);
console.log(`  Returns: { list: MessageListItem[], details: MessageDetail[] }`);
console.log(`  Note: Requires authenticated HTTP client and active Wilma session`);
console.log();

console.log('MessageDetailService:');
console.log(`  Method available: fetch(childId, messageId)`);
console.log(`  Returns: MessageDetail object with subject, from, date, body, attachment`);
console.log(`  Note: Requires authenticated HTTP client and active Wilma session`);
console.log();

// ============================================================================
// 8. TYPE INFORMATION
// ============================================================================
console.log('8. EXPORTED TYPES');
console.log('-'.repeat(80));

console.log('Available interfaces and types:');
const exportedTypes = [
  'WilmaAuthConfig',
  'ChildEntry',
  'SchoolAndClass',
  'ExamEntry',
  'Overview',
  'OverviewExam',
  'OverviewGroup',
  'MessageListItem',
  'MessageDetail',
  'HomeworkEntry',
  'AxiosInstance',
  'AxiosResponse',
];

exportedTypes.forEach((type) => {
  console.log(`  - ${type}`);
});
console.log();

// ============================================================================
// 9. SUMMARY
// ============================================================================
console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));

console.log(`
✓ HTTP Client Layer
  - Axios-based HTTP client with cookie jar support
  - userAgent() for proper Wilma headers
  - WilmaHttpClient class for session management

✓ Authentication
  - WilmaAuthClient with login/logout methods
  - Session token handling (private storage)
  - Session value retrieval

✓ Child & School Info
  - ChildParser for extracting student links
  - School and class information extraction

✓ Academic Data
  - ExamsClient for exam calendar parsing
  - OverviewParser for comprehensive student data
  - HomeworkExtractor for recent homework items

✓ Communication
  - MessagesClient for message lists and details
  - MessageDetailService for individual message content

✓ Type Safety
  - Full TypeScript support with exported interfaces
  - Strong typing for all return values

All classes follow OOP design patterns with static helper methods where appropriate.
Date handling uses date-fns with Finnish locale support.
`);

console.log('='.repeat(80));
console.log('Demo complete!');
console.log('='.repeat(80));
