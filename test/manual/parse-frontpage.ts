/**
 * Front Page Parser Test
 * Test existing parser methods against real frontpage.html
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { ChildParser } from '../../src/index';

const frontpageHtmlPath = join(__dirname, '../json/frontpage.html');
const html = readFileSync(frontpageHtmlPath, 'utf-8');

console.log('='.repeat(80));
console.log('FRONT PAGE PARSER TEST');
console.log('='.repeat(80));
console.log();

console.log('Test File: frontpage.html');
console.log(`File Size: ${html.length} characters`);
console.log();

// Test 1: Extract children
console.log('Test 1: Extract Child Entries');
console.log('-'.repeat(80));

const children = ChildParser.extractChildEntries(html);
console.log(`Found ${children.length} children:`);
console.log();

children.forEach((child, i) => {
  console.log(`${i + 1}. Child Entry:`);
  console.log(`   ID: ${child.id}`);
  console.log(`   Name: ${child.name || '(null)'}`);
});
console.log();

// Test 2: Extract school and class for each child
console.log('Test 2: Extract School and Class Information');
console.log('-'.repeat(80));

const childDetails = children.map(child => {
  const schoolInfo = ChildParser.extractChildSchoolAndClass(html, child.id);
  return {
    ...child,
    ...schoolInfo
  };
});

childDetails.forEach((child, i) => {
  console.log(`${i + 1}. Student Details:`);
  console.log(`   ID: ${child.id}`);
  console.log(`   Name: ${child.name || '(null)'}`);
  console.log(`   School: ${child.schoolName || '(null)'}`);
  console.log(`   Class: ${child.className || '(null)'}`);
  console.log();
});

// Test 3: Summary
console.log('='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));

const validChildren = childDetails.filter(c => c.name && c.schoolName && c.className);
console.log(`Valid children (with all info): ${validChildren.length}`);

if (validChildren.length > 0) {
  console.log('\nValid Children Details:');
  validChildren.forEach((child, i) => {
    console.log(`${i + 1}. ${child.name} - ${child.schoolName}, Class ${child.className}`);
  });
}

console.log();
console.log(`✓ Test completed successfully`);
console.log('='.repeat(80));
