import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const args = process.argv.slice(2);
const baseUrl = args[0] || 'https://ouka.inschool.fi';
const username = args[1] || '';
const password = args[2] || '';

if (!username || !password) {
  console.error('Usage: npx ts-node test/login-raw.ts <baseUrl> <username> <password>');
  process.exit(1);
}

async function test() {
  const jar = new CookieJar();
  const client = axios.create();
  wrapper(client);
  (client as any).defaults.jar = jar;
  (client as any).defaults.withCredentials = true;

  try {
    // Step 1: Get SessionID
    console.log('1. Fetching SessionID from /index_json...');
    const tokenRes = await client.get(`${baseUrl}/index_json`);
    const sessionId = tokenRes.data?.SessionID;
    console.log(`   Status: ${tokenRes.status}`);
    console.log(`   SessionID: ${sessionId?.substring(0, 50)}...`);
    
    if (!sessionId) {
      console.error('   ✗ No SessionID in response!');
      console.log('   Response data:', JSON.stringify(tokenRes.data));
      return;
    }

    // Step 2: Login
    console.log('\n2. Sending login request...');
    const formData = new URLSearchParams();
    formData.append('Login', username);
    formData.append('Password', password);
    formData.append('SESSIONID', sessionId);

    const loginRes = await client.post(`${baseUrl}/login`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `enableAnalytics_56553=false; Wilma2LoginID=${sessionId}`
      },
      maxRedirects: 5,
      validateStatus: () => true
    });

    console.log(`   Status: ${loginRes.status}`);
    console.log(`   Headers:`, JSON.stringify(loginRes.headers, null, 2));
    
    if (loginRes.status === 200) {
      console.log('\n✓ Login successful!');
      console.log('   Response preview:', 
        typeof loginRes.data === 'string' 
          ? loginRes.data.substring(0, 200) 
          : JSON.stringify(loginRes.data).substring(0, 200)
      );
    } else {
      console.log('\n✗ Login failed');
      console.log('   Response preview:', 
        typeof loginRes.data === 'string' 
          ? loginRes.data.substring(0, 500) 
          : JSON.stringify(loginRes.data).substring(0, 500)
      );
      
      // Try to extract error message from HTML
      if (typeof loginRes.data === 'string' && loginRes.data.includes('<title>')) {
        const titleMatch = loginRes.data.match(/<title>([^<]+)<\/title>/);
        if (titleMatch) {
          console.log('   Title:', titleMatch[1]);
        }
      }
    }
  } catch (error: any) {
    console.error('✗ Error:', error.message);
  }
}

test();
