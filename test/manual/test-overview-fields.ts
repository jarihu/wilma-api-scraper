/**
 * Test Overview Schedule Fields
 * Verify scheduleId and dateArray are correctly parsed
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { OverviewParser } from '../../src/overview';

const overviewJsonPath = join(__dirname, '../json/overview.json');
const rawData = JSON.parse(readFileSync(overviewJsonPath, 'utf-8'));

console.log('='.repeat(80));
console.log('OVERVIEW SCHEDULE FIELDS TEST');
console.log('='.repeat(80));
console.log();

const parsed = OverviewParser.parseOverviewJson(rawData, 'test-child-id');

console.log(`Total Schedule Entries: ${parsed.schedule.length}`);
console.log();

// Show first 3 schedule entries with new fields
console.log('First 3 Schedule Entries:');
console.log('-'.repeat(80));

parsed.schedule.slice(0, 3).forEach((entry, i) => {
  console.log(`\n${i + 1}. Schedule Entry:`);
  console.log(`   Schedule ID: ${entry.scheduleId}`);
  console.log(`   Day: ${entry.day}`);
  console.log(`   Time: ${entry.start} - ${entry.end}`);
  console.log(`   Class: ${entry.class}`);
  console.log(`   Date Array: ${JSON.stringify(entry.dateArray)}`);
  console.log(`   Groups: ${entry.groups.length} group(s)`);
  
  if (entry.groups.length > 0) {
    entry.groups.forEach((group, j) => {
      console.log(`      ${j + 1}. ${group.shortCaption} (ID: ${group.id})`);
    });
  }
});

console.log();
console.log('='.repeat(80));
console.log('VERIFICATION');
console.log('='.repeat(80));

// Verify all entries have scheduleId and dateArray
const missingScheduleId = parsed.schedule.filter(e => !e.scheduleId || e.scheduleId === 0);
const missingDateArray = parsed.schedule.filter(e => !Array.isArray(e.dateArray));

console.log(`\n✓ Entries with scheduleId: ${parsed.schedule.length - missingScheduleId.length}/${parsed.schedule.length}`);
console.log(`✓ Entries with dateArray: ${parsed.schedule.length - missingDateArray.length}/${parsed.schedule.length}`);

if (missingScheduleId.length > 0) {
  console.log(`\n⚠ Warning: ${missingScheduleId.length} entries missing scheduleId`);
}

if (missingDateArray.length > 0) {
  console.log(`\n⚠ Warning: ${missingDateArray.length} entries missing dateArray`);
}
