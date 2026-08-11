/**
 * Test New extractChildren Method
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { ChildParser } from '../../src/index';

const frontpageHtmlPath = join(__dirname, '../json/frontpage.html');
const html = readFileSync(frontpageHtmlPath, 'utf-8');

console.log('='.repeat(80));
console.log('TEST: extractChildren() Convenience Method');
console.log('='.repeat(80));
console.log();

console.log('Calling: ChildParser.extractChildren(html)');
console.log();

const children = ChildParser.extractChildren(html);

console.log(`Result: Array with ${children.length} children\n`);

children.forEach((child, i) => {
  console.log(`${i + 1}. ${child.name}`);
  console.log(`   ID: ${child.id}`);
  console.log(`   School: ${child.schoolName}`);
  console.log(`   Class: ${child.className}`);
  console.log();
});

console.log('='.repeat(80));
console.log('✓ Success! Single method call returns all information');
console.log('='.repeat(80));
