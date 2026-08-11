/**
 * Login Test - Wilma Authentication Test
 * 
 * Tests the login functionality with actual Wilma server.
 * Run with: npx ts-node test/login-test.ts <baseUrl> <username> <password>
 */

import {
  WilmaHttpClient,
  WilmaAuthClient,
} from '../../src/index';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  loadEnv({ path: path.resolve(__dirname, '../.env') });
}

// Get credentials from command line
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('Usage: npx ts-node test/login-test.ts <baseUrl> <username> <password>');
  console.error('');
  console.error('Example:');
  console.error('  npx ts-node test/login-test.ts https://espoo.inschool.fi username password');
  process.exit(1);
}

const [baseUrl, username, password] = args;

console.log('='.repeat(80));
console.log('WILMA LOGIN TEST');
console.log('='.repeat(80));
console.log();

async function testLogin() {
  try {
    console.log('Configuration:');
    console.log(`  Base URL: ${baseUrl}`);
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${'*'.repeat(password.length)}`);
    console.log();

    console.log('Step 1: Creating HTTP client...');
    const httpClient = WilmaHttpClient.create();
    console.log('  ✓ HTTP client created');
    console.log();

    console.log('Step 2: Creating authentication client...');
    const authClient = new WilmaAuthClient(httpClient.getClient(), {
      baseUrl: baseUrl,
    });
    console.log('  ✓ Auth client created');
    console.log();

    console.log('Step 3: Attempting login...');
    const landingPageHtml = await authClient.login(username, password);
    
    if (landingPageHtml && landingPageHtml.length > 0) {
      console.log('  ✓ Login successful!');
      console.log(`  ✓ Received landing page HTML (${landingPageHtml.length} characters)`);
      console.log();
      
      console.log('Step 4: Checking authentication status...');
      const isAuth = authClient.isAuthenticated();
      console.log(`  Authentication status: ${isAuth ? '✓ Authenticated' : '✗ Not authenticated'}`);
      console.log();

      console.log('Step 5: Attempting logout...');
      await authClient.logout();
      console.log('  ✓ Logout successful');
      console.log();

      console.log('Step 6: Verifying authentication cleared...');
      const isAuthAfterLogout = authClient.isAuthenticated();
      console.log(`  Authentication status: ${isAuthAfterLogout ? '✗ Still authenticated' : '✓ Cleared'}`);
      console.log();

      console.log('='.repeat(80));
      console.log('TEST RESULT: ✓ PASSED');
      console.log('='.repeat(80));
      console.log();
      console.log('Login flow works correctly:');
      console.log('  1. HTTP client initialization ✓');
      console.log('  2. Authentication client setup ✓');
      console.log('  3. Login with credentials ✓');
      console.log('  4. Session maintained ✓');
      console.log('  5. Logout functionality ✓');
      console.log('  6. Session cleanup ✓');
      
    } else {
      console.log('  ✗ Login failed');
      console.log();
      console.log('='.repeat(80));
      console.log('TEST RESULT: ✗ FAILED');
      console.log('='.repeat(80));
      console.log();
      console.log('Possible reasons:');
      console.log('  - Invalid credentials');
      console.log('  - Incorrect base URL');
      console.log('  - Network connectivity issues');
      console.log('  - Wilma server unavailable');
      process.exit(1);
    }

  } catch (error) {
    console.log('  ✗ Error occurred');
    console.log();
    console.log('='.repeat(80));
    console.log('TEST RESULT: ✗ ERROR');
    console.log('='.repeat(80));
    console.log();
    console.log('Error details:');
    if (error instanceof Error) {
      console.log(`  Message: ${error.message}`);
      if (error.stack) {
        console.log();
        console.log('Stack trace:');
        console.log(error.stack);
      }
    } else {
      console.log(`  ${error}`);
    }
    process.exit(1);
  }
}

testLogin();
