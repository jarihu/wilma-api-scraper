/**
 * Debug Login Test - Detailed debugging for Wilma authentication
 */

import {
  WilmaHttpClient,
  WilmaAuthClient,
} from '../../src/index';

const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('Usage: npx ts-node test/login-debug.ts <baseUrl> <username> <password>');
  process.exit(1);
}

const [baseUrl, username, password] = args;

async function debugLogin() {
  try {
    console.log('=== STEP 1: Create HTTP Client ===');
    const httpClient = WilmaHttpClient.create();
    const client = httpClient.getClient();
    console.log('✓ HTTP client created\n');

    console.log('=== STEP 2: Fetch Token ===');
    const tokenRes = await client.get(`${baseUrl}/token`, {
      headers: { 'User-Agent': WilmaHttpClient.userAgent() }
    });
    
    console.log('Token response status:', tokenRes.status);
    console.log('Token response data:', JSON.stringify(tokenRes.data, null, 2));
    console.log('Set-Cookie headers:', tokenRes.headers['set-cookie']);
    
    const setCookie = tokenRes.headers['set-cookie'];
    let sessionValue: string | undefined;
    let sessionCookieName: string = 'JSESSIONID';
    
    if (Array.isArray(setCookie)) {
      console.log('\nCookies found:');
      setCookie.forEach(cookie => console.log('  -', cookie));
      
      let sessionCookie = setCookie.find((cookie) => cookie.startsWith('Wilma2LoginID='));
      if (sessionCookie) {
        const match = sessionCookie.match(/Wilma2LoginID=([^;]+)/);
        sessionValue = match ? match[1] : undefined;
        sessionCookieName = 'Wilma2LoginID';
        console.log('\nUsing Wilma2LoginID cookie');
      } else {
        sessionCookie = setCookie.find((cookie) => cookie.startsWith('Wilma2SID='));
        if (sessionCookie) {
          const match = sessionCookie.match(/Wilma2SID=([^;]+)/);
          sessionValue = match ? match[1] : undefined;
          sessionCookieName = 'Wilma2SID';
          console.log('\nUsing Wilma2SID cookie');
        } else {
          sessionCookie = setCookie.find((cookie) => cookie.startsWith('JSESSIONID='));
          if (sessionCookie) {
            const match = sessionCookie.match(/JSESSIONID=([^;]+)/);
            sessionValue = match ? match[1] : undefined;
            sessionCookieName = 'JSESSIONID';
            console.log('\nUsing JSESSIONID cookie');
          }
        }
      }
    }
    
    if (!sessionValue) {
      console.error('\n✗ Failed to extract session cookie');
      process.exit(1);
    }
    
    const token = tokenRes.data?.Wilma2LoginID || tokenRes.data?.token || '';
    console.log('Session value:', sessionValue?.substring(0, 50) + '...');
    console.log('Token:', token.substring(0, 50) + '...');
    console.log('✓ Token fetched successfully\n');

    console.log('=== STEP 3: Attempt Login (JSON) ===');
    const loginData = {
      Login: username,
      Password: password
    };
    
    console.log('Login URL:', `${baseUrl}/login`);
    console.log('Login data:', { Login: username, Password: '*'.repeat(password.length) });
    console.log('Note: Cookie jar handling cookies automatically (no manual Cookie header)');
    
    const loginRes = await client.post(`${baseUrl}/login`, loginData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': WilmaHttpClient.userAgent()
      },
      maxRedirects: 0,
      validateStatus: () => true
    });
    
    console.log('\nLogin response status:', loginRes.status);
    console.log('Login response headers:', JSON.stringify(loginRes.headers, null, 2));
    console.log('Login response data (first 500 chars):', 
      typeof loginRes.data === 'string' 
        ? loginRes.data.substring(0, 500)
        : JSON.stringify(loginRes.data).substring(0, 500)
    );
    
    if (loginRes.status === 302 || loginRes.status === 303) {
      console.log('\n✓ Login successful (redirect detected)');
      console.log('Redirect location:', loginRes.headers['location']);
    } else if (loginRes.status === 200) {
      console.log('\n✓ Login successful (200 OK)');
    } else {
      console.log('\n✗ Login failed - unexpected status:', loginRes.status);
    }

  } catch (error) {
    console.error('\n=== ERROR ===');
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

debugLogin();
