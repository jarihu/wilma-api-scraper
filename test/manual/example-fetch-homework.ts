/**
 * Complete Example: Fetching Homework using Simple API
 * 
 * This example demonstrates the complete flow for fetching homework data
 * from Wilma using the new simplified API.
 */

import {
  WilmaAuthClient,
  HomeworkExtractor,
  type HomeworkEntry
} from '../../src/index';

async function fetchHomework() {
  const baseUrl = 'https://your-wilma-server.edu';
  const username = 'your-username';
  const password = 'your-password';
  const childId = 'your-child-id';

  // Step 1: Create auth client (HTTP client is managed internally)
  const auth = new WilmaAuthClient({ baseUrl });

  try {
    // Step 2: Login
    await auth.login(username, password);
    console.log('✓ Logged in successfully');

    // Step 3: Fetch raw overview data using built-in service accessor
    const rawOverview = await auth.overview().fetchOverviewRaw(childId);
    console.log('✓ Overview data fetched');

    // Step 4: Extract homework from last 7 days
    const homework: HomeworkEntry[] = HomeworkExtractor.extractHomework(rawOverview);
    console.log(`✓ Found ${homework.length} homework entries from last 7 days\n`);

    // Display homework
    if (homework.length === 0) {
      console.log('No homework found in the last 7 days.');
    } else {
      homework.forEach((hw, index) => {
        console.log(`${index + 1}. ${hw.courseName} (${hw.courseCode})`);
        console.log(`   Group: ${hw.groupName}`);
        console.log(`   Date: ${hw.date}`);
        console.log(`   Homework: ${hw.homework}`);
        console.log();
      });
    }

    // Alternative: Fetch and parse in one call
    const overview = await auth.overview().fetchOverview(childId);
    console.log(`Overview role: ${overview.role}`);
    console.log(`Total groups: ${overview.groups.length || 0}`);
    console.log(`Total schedule entries: ${overview.schedule.length || 0}`);

    // Also works with other services
    const exams = await auth.exams().fetchCalendar(childId);
    console.log(`\n✓ Found ${exams.length} exams`);

    const { list } = await auth.messages().fetchMessages(childId);
    console.log(`✓ Found ${list.length} messages`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Step 5: Logout
    await auth.logout();
    console.log('\n✓ Logged out');
  }
}

// Run the example
if (require.main === module) {
  fetchHomework().catch(console.error);
}

export { fetchHomework };
