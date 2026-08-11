/**
 * Login Test - Wilma Authentication Test with Detailed Debugging
 * 
 * Tests the login functionality with actual Wilma server.
 * Run with: npx ts-node test/login-test-debug.ts <baseUrl> <username> <password>
 */

import {
  WilmaHttpClient,
  WilmaAuthClient,
} from '../../src/index';

// Get credentials from command line
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('Usage: npx ts-node test/login-test-debug.ts <baseUrl> <username> <password>');
  process.exit(1);
}

const [baseUrl, username, password] = args;

console.log('='.repeat(80));
console.log('WILMA LOGIN TEST (DEBUG)');
console.log('='.repeat(80));
console.log();

async function testLogin() {
  try {
    console.log('Step 1: Creating HTTP client...');
    const httpClient = WilmaHttpClient.create();
    const client = httpClient.getClient();
    console.log('✓ HTTP client created');
    console.log();

    console.log('Step 2: Fetching token manually...');
    const tokenRes = await client.get(`${baseUrl}/index_json`);
    console.log(`   Token response status: ${tokenRes.status}`);
    console.log(`   SessionID: ${tokenRes.data?.SessionID?.substring(0, 50)}...`);
    
    if (!tokenRes.data?.SessionID) {
      console.error('✗ No SessionID in token response!');
      return;
    }
    console.log('✓ SessionID obtained');
    console.log();

    console.log('Step 3: Creating authentication client...');
    const authClient = new WilmaAuthClient(client, {
      baseUrl: baseUrl,
    });
    console.log('✓ Auth client created');
    console.log();

    console.log('Step 4: Attempting login...');
    const loginSuccess = await authClient.login(username, password);
    console.log(`   Login result: ${loginSuccess}`);
    
    if (loginSuccess) {
      console.log('✓ Login successful!');
      console.log();
      console.log('='.repeat(80));
      console.log('TEST RESULT: ✓ PASSED');
      console.log('='.repeat(80));
    } else {
      console.log('✗ Login failed');
      console.log();
      console.log('='.repeat(80));
      console.log('TEST RESULT: ✗ FAILED');
      console.log('='.repeat(80));
      process.exit(1);
    }

  } catch (error: any) {
    console.error('✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testLogin();
