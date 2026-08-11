/**
 * Debug Login Response
 * Check what's returned from login POST
 */

import { WilmaHttpClient, WilmaAuthClient, ChildParser } from '../../src/index';

const args = process.argv.slice(2);
const baseUrl = args[0] || 'https://ouka.inschool.fi';
const username = args[1] || '';
const password = args[2] || '';

if (!username || !password) {
  console.error('Usage: npx ts-node test/debug-login.ts <baseUrl> <username> <password>');
  process.exit(1);
}

async function debugLogin() {
  console.log('='.repeat(80));
  console.log('DEBUG: Login Response Investigation');
  console.log('='.repeat(80));
  console.log();

  try {
    const httpClient = WilmaHttpClient.create();
    const client = httpClient.getClient();

    // Fetch token
    console.log('1. Fetching token...');
    const tokenRes = await client.get(`${baseUrl}/index_json`);
    const sessionId = tokenRes.data?.SessionID;
    console.log(`   ✓ SessionID: ${sessionId?.substring(0, 50)}...`);
    console.log();

    // Send login POST
    console.log('2. Sending login POST...');
    const formData = new URLSearchParams();
    formData.append('Login', username);
    formData.append('Password', password);
    formData.append('SESSIONID', sessionId);

    const loginRes = await client.post(`${baseUrl}/login`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `enableAnalytics_56553=false; Wilma2LoginID=${sessionId}`
      },
      maxRedirects: 0,
      validateStatus: () => true
    });

    console.log(`   Status: ${loginRes.status}`);
    console.log(`   Headers:`, JSON.stringify(loginRes.headers, null, 2).substring(0, 300));
    console.log(`   Body length: ${typeof loginRes.data === 'string' ? loginRes.data.length : 'not string'}`);
    
    if (loginRes.status >= 302 && loginRes.status <= 308) {
      console.log(`   Location: ${loginRes.headers.location}`);
      console.log(`   → Redirect detected, body is empty`);
    }
    console.log();

    // Fetch landing page with followRedirects
    console.log('3. Fetching landing page with maxRedirects: 5...');
    const landingRes = await client.get(baseUrl, {
      maxRedirects: 5,
      validateStatus: () => true
    });

    console.log(`   Status: ${landingRes.status}`);
    console.log(`   Body length: ${landingRes.data.length}`);
    
    if (landingRes.data.length > 0) {
      console.log('   ✓ HTML received');
      console.log();

      // Try parsing children
      console.log('4. Parsing children...');
      const children = ChildParser.extractChildren(landingRes.data);
      console.log(`   ✓ Found ${children.length} children`);
      
      if (children.length > 0) {
        console.log();
        children.forEach((child, i) => {
          console.log(`   ${i + 1}. ${child.name} - ${child.schoolName}, ${child.className}`);
        });
      }
    } else {
      console.log('   ✗ No HTML received!');
    }

  } catch (error: any) {
    console.error('✗ Error:', error.message);
  }
}

debugLogin();
