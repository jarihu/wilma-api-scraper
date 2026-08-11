/**
 * Test New Login Flow
 * login() returns HTML, then parse children from it
 */

import { WilmaHttpClient, WilmaAuthClient, ChildParser } from '../../src/index';

const args = process.argv.slice(2);
const baseUrl = args[0] || 'https://ouka.inschool.fi';
const username = args[1] || '';
const password = args[2] || '';

if (!username || !password) {
  console.error('Usage: npx ts-node test/test-login-with-children.ts <baseUrl> <username> <password>');
  process.exit(1);
}

async function testLoginWithChildren() {
  console.log('='.repeat(80));
  console.log('TEST: Login Returns HTML + Parse Children');
  console.log('='.repeat(80));
  console.log();

  try {
    // Step 1: Create clients
    console.log('Step 1: Creating HTTP and auth clients...');
    const httpClient = WilmaHttpClient.create();
    const authClient = new WilmaAuthClient(httpClient.getClient(), { baseUrl });
    console.log('✓ Clients created');
    console.log();

    // Step 2: Login (now returns HTML)
    console.log('Step 2: Logging in...');
    const landingPageHtml = await authClient.login(username, password);
    console.log(`✓ Login successful, received ${landingPageHtml.length} characters of HTML`);
    console.log();

    // Step 3: Parse children from returned HTML
    console.log('Step 3: Parsing children from returned HTML...');
    const children = ChildParser.extractChildren(landingPageHtml);
    console.log(`✓ Found ${children.length} children:`);
    console.log();

    children.forEach((child, i) => {
      console.log(`${i + 1}. ${child.name}`);
      console.log(`   ID: ${child.id}`);
      console.log(`   School: ${child.schoolName}`);
      console.log(`   Class: ${child.className}`);
    });
    console.log();

    // Step 4: Logout
    console.log('Step 4: Logging out...');
    await authClient.logout();
    console.log('✓ Logout successful');
    console.log();

    console.log('='.repeat(80));
    console.log('✓ TEST PASSED');
    console.log('='.repeat(80));
    console.log();
    console.log('New workflow:');
    console.log('  1. authClient.login(user, pass) → returns landing page HTML');
    console.log('  2. ChildParser.extractChildren(html) → returns children array');
    console.log('  3. Each child has: id, name, schoolName, className');

  } catch (error: any) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

testLoginWithChildren();
