/**
 * Version Detection Test
 * Demonstrates API version detection and logging
 */

import { WilmaHttpClient } from '../../src/index';

const baseUrl = process.argv[2] || 'https://ouka.inschool.fi';

async function testVersionDetection() {
  console.log('='.repeat(80));
  console.log('WILMA API VERSION DETECTION TEST');
  console.log('='.repeat(80));
  console.log();

  try {
    const httpClient = WilmaHttpClient.create();

    console.log('Step 1: Detect API version...');
    const version = await httpClient.detectApiVersion(baseUrl);
    console.log(`✓ API Version: ${version}`);
    console.log();

    console.log('Step 2: Get cached API version...');
    const cachedVersion = httpClient.getApiVersion();
    console.log(`✓ Cached Version: ${cachedVersion}`);
    console.log();

    console.log('Step 3: Log client configuration...');
    httpClient.logInfo();
    console.log();

    console.log('Step 4: Test version caching (second call should not log)...');
    const version2 = await httpClient.detectApiVersion(baseUrl);
    console.log(`✓ Retrieved: ${version2}`);
    console.log();

    console.log('='.repeat(80));
    console.log('TEST RESULT: ✓ PASSED');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

testVersionDetection();
