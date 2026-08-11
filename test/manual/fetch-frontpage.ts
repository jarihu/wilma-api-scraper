/**
 * Login and Retrieve Front Page
 * Logs in to Wilma and saves the landing page HTML for debugging
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { WilmaHttpClient, WilmaAuthClient, ChildParser } from '../../src/index';

const args = process.argv.slice(2);
const baseUrl = args[0] || 'https://ouka.inschool.fi';
const username = args[1] || '';
const password = args[2] || '';

if (!username || !password) {
  console.error('Usage: npx ts-node test/fetch-frontpage.ts <baseUrl> <username> <password>');
  process.exit(1);
}

async function fetchFrontPage() {
  console.log('='.repeat(80));
  console.log('WILMA FRONT PAGE RETRIEVAL');
  console.log('='.repeat(80));
  console.log();

  try {
    // Step 1: Create HTTP client
    console.log('Step 1: Creating HTTP client...');
    const httpClient = WilmaHttpClient.create();
    const client = httpClient.getClient();
    console.log('✓ HTTP client created');
    console.log();

    // Step 2: Create auth client
    console.log('Step 2: Creating authentication client...');
    const authClient = new WilmaAuthClient(client, { baseUrl });
    console.log('✓ Auth client created');
    console.log();

    // Step 3: Login
    console.log('Step 3: Logging in...');
    const loginSuccess = await authClient.login(username, password);
    if (!loginSuccess) {
      console.error('✗ Login failed');
      process.exit(1);
    }
    console.log('✓ Login successful');
    console.log();

    // Step 4: Fetch front page
    console.log('Step 4: Fetching front page...');
    const frontPageRes = await client.get(baseUrl);
    
    if (frontPageRes.status !== 200) {
      console.error(`✗ Failed to fetch front page: ${frontPageRes.status}`);
      process.exit(1);
    }
    
    const html = frontPageRes.data;
    console.log(`✓ Front page retrieved (${html.length} characters)`);
    console.log();

    // Step 5: Save HTML to file
    console.log('Step 5: Saving HTML to file...');
    const outputPath = join(__dirname, '../json/frontpage.html');
    writeFileSync(outputPath, html, 'utf-8');
    console.log(`✓ Saved to: ${outputPath}`);
    console.log();

    // Step 6: Parse children
    console.log('Step 6: Parsing children from HTML...');
    const children = ChildParser.extractChildEntries(html);
    console.log(`✓ Found ${children.length} children:`);
    
    children.forEach((child, i) => {
      const schoolInfo = ChildParser.extractChildSchoolAndClass(html, child.id);
      console.log(`  ${i + 1}. ${child.name || '(no name)'} (ID: ${child.id})`);
      console.log(`     School: ${schoolInfo.schoolName || '(not found)'}`);
      console.log(`     Class: ${schoolInfo.className || '(not found)'}`);
    });
    console.log();

    // Step 7: Logout
    console.log('Step 7: Logging out...');
    await authClient.logout();
    console.log('✓ Logout successful');
    console.log();

    console.log('='.repeat(80));
    console.log('SUCCESS');
    console.log('='.repeat(80));
    console.log(`Front page HTML saved to: ${outputPath}`);
    console.log(`Found ${children.length} children with school information`);

  } catch (error: any) {
    console.error('✗ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

fetchFrontPage();
