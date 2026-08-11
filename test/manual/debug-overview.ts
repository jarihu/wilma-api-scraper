/**
 * Debug script for overview endpoint issues
 * 
 * This script helps diagnose why overview data returns empty arrays
 * by logging the raw response and parsing steps.
 */

import { WilmaAuthClient } from '../../src/index';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  loadEnv({ path: path.resolve(__dirname, '../.env') });
}

// Configuration
const CONFIG = {
  baseUrl: process.argv[2] || process.env.WILMA_BASE_URL || 'https://ouka.inschool.fi',
  username: process.argv[3] || process.env.WILMA_USERNAME || '',
  password: process.argv[4] || process.env.WILMA_PASSWORD || '',
  childId: process.argv[5] || process.env.WILMA_CHILD_ID || '',
  usernameField: 'Login',
  passwordField: 'Password'
};

async function debugOverview() {
  console.log('=== Wilma Overview Debug Tool ===\n');
  
  if (!CONFIG.username || !CONFIG.password || !CONFIG.childId) {
    console.error('❌ Missing credentials. Provide via environment variables or command line:');
    console.error('   Environment: WILMA_USERNAME, WILMA_PASSWORD, WILMA_CHILD_ID');
    console.error('   Command line: npx tsx test/debug-overview.ts <baseUrl> <username> <password> <childId>');
    console.error('   Example: npx tsx test/debug-overview.ts https://ouka.inschool.fi user pass 12345');
    process.exit(1);
  }

  console.log(`🔗 Base URL: ${CONFIG.baseUrl}`);
  console.log(`👤 Child ID: ${CONFIG.childId}\n`);

  const auth = new WilmaAuthClient({ 
    baseUrl: CONFIG.baseUrl,
    usernameField: CONFIG.usernameField,
    passwordField: CONFIG.passwordField
  });

  try {
    // Step 1: Login
    console.log('📝 Step 1: Logging in...');
    await auth.login(CONFIG.username, CONFIG.password);
    console.log('✅ Login successful\n');

    // Step 2: Fetch raw overview data
    console.log('📝 Step 2: Fetching raw overview data...');
    const overviewClient = auth.overview();
    const rawData = await overviewClient.fetchOverviewRaw(CONFIG.childId);
    
    // Save raw response to file
    const outputPath = path.join(__dirname, '../json/debug-overview-response.json');
    fs.writeFileSync(outputPath, JSON.stringify(rawData, null, 2));
    console.log(`✅ Raw response saved to: ${outputPath}\n`);

    // Step 3: Analyze raw response structure
    console.log('📝 Step 3: Analyzing response structure...');
    const raw = rawData as any;
    
    console.log('Response keys:', Object.keys(raw));
    console.log(`  - Role: ${raw.Role || 'missing'}`);
    console.log(`  - AddAppt: ${raw.AddAppt !== undefined ? raw.AddAppt : 'missing'}`);
    console.log(`  - Schedule: ${Array.isArray(raw.Schedule) ? `Array[${raw.Schedule.length}]` : 'missing or not array'}`);
    console.log(`  - Groups: ${Array.isArray(raw.Groups) ? `Array[${raw.Groups.length}]` : 'missing or not array'}`);
    console.log();

    if (Array.isArray(raw.Schedule) && raw.Schedule.length > 0) {
      console.log('📅 Schedule array sample (first entry):');
      const firstSchedule = raw.Schedule[0];
      console.log(JSON.stringify(firstSchedule, null, 2).split('\n').slice(0, 15).join('\n'));
      console.log('  ...');
      console.log();
    }

    if (Array.isArray(raw.Groups) && raw.Groups.length > 0) {
      console.log('📚 Groups array sample (first entry):');
      const firstGroup = raw.Groups[0];
      console.log(JSON.stringify(firstGroup, null, 2).split('\n').slice(0, 20).join('\n'));
      console.log('  ...');
      console.log();
    }

    // Step 4: Fetch parsed overview data
    console.log('📝 Step 4: Fetching parsed overview data...');
    const overview = await overviewClient.fetchOverview(CONFIG.childId);
    console.log('Parsed overview:');
    console.log(JSON.stringify(overview, null, 2));
    console.log();

    // Step 5: Analysis summary
    console.log('📊 Analysis Summary:');
    console.log(`  - Raw Schedule entries: ${Array.isArray(raw.Schedule) ? raw.Schedule.length : 0}`);
    console.log(`  - Raw Groups entries: ${Array.isArray(raw.Groups) ? raw.Groups.length : 0}`);
    console.log(`  - Parsed schedule entries: ${overview.schedule?.length || 0}`);
    console.log(`  - Parsed groups: ${overview.groups?.length || 0}`);
    console.log();

    if (Array.isArray(raw.Groups) && raw.Groups.length > 0 && (!overview.groups || overview.groups.length === 0)) {
      console.log('⚠️  WARNING: Raw data has Groups, but parser returned empty!');
      console.log('   This indicates a parsing bug.');
    } else if (overview.groups && overview.groups.length > 0) {
      console.log('✅ SUCCESS: Groups parsed correctly!');
      const firstGroup = overview.groups[0];
      console.log(`   First group: ${firstGroup.name} (${firstGroup.courseCode})`);
      console.log(`   Homework entries: ${firstGroup.homework?.length || 0}`);
      console.log(`   Diary entries: ${firstGroup.diary?.length || 0}`);
      console.log(`   Exams: ${firstGroup.exams?.length || 0}`);
    }

    if (Array.isArray(raw.Schedule) && raw.Schedule.length > 0) {
      console.log('ℹ️  INFO: Schedule data is available and being parsed.');
      console.log(`   Schedule contains ${raw.Schedule.length} timetable entries.`);
      if (overview.schedule && overview.schedule.length > 0) {
        console.log(`   ✅ Successfully parsed ${overview.schedule.length} schedule entries.`);
      } else {
        console.log('   ⚠️  Schedule data exists but was not parsed.');
      }
    }

    // Step 6: Logout
    console.log('\n📝 Step 6: Logging out...');
    await auth.logout();
    console.log('✅ Logout successful\n');

  } catch (error: any) {
    console.error('\n❌ Error occurred:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('HTTP Status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2).substring(0, 500));
    }
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the debug tool
debugOverview();
