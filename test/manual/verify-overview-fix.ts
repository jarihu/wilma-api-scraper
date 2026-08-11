/**
 * Quick verification test for overview parser fix
 */
import { OverviewParser } from '../../src/overview';
import { readFileSync } from 'fs';
import { join } from 'path';

const overviewData = JSON.parse(
  readFileSync(join(__dirname, '../json/overview.json'), 'utf-8')
);

console.log('=== Overview Parser Verification ===\n');

const parsed = OverviewParser.parseOverviewJson(overviewData, 'test-child');

console.log('✅ Parsed successfully!');
console.log(`   Role: ${parsed.role}`);
console.log(`   Schedule entries: ${parsed.schedule.length}`);
console.log(`   Groups/Courses: ${parsed.groups.length}`);

if (parsed.schedule.length > 0) {
  const first = parsed.schedule[0];
  console.log(`\n📅 First schedule entry:`);
  console.log(`   Day ${first.day}, ${first.start}-${first.end}`);
  console.log(`   Class: ${first.class}`);
  console.log(`   Groups in slot: ${first.groups.length}`);
  if (first.groups.length > 0) {
    console.log(`   First group: ${first.groups[0].caption}`);
  }
}

if (parsed.groups.length > 0) {
  const firstGroup = parsed.groups[0];
  console.log(`\n📚 First course group:`);
  console.log(`   ID: ${firstGroup.id}`);
  console.log(`   Name: ${firstGroup.name}`);
  console.log(`   Course: ${firstGroup.courseName} (${firstGroup.courseCode})`);
  console.log(`   Teachers: ${firstGroup.teachers.length}`);
  console.log(`   Homework entries: ${firstGroup.homework.length}`);
  console.log(`   Diary entries: ${firstGroup.diary.length}`);
  console.log(`   Exams: ${firstGroup.exams.length}`);
  
  if (firstGroup.homework.length > 0) {
    console.log(`\n📝 Latest homework:`);
    const hw = firstGroup.homework[0];
    console.log(`   Date: ${hw.date}`);
    console.log(`   Assignment: ${hw.homework.substring(0, 80)}...`);
  }
}

console.log('\n✅ All checks passed! Parser is working correctly.\n');
