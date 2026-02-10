/**
 * Test script for Map Identity Summary
 * Validates summary generation logic with test cases
 */

import { generateMapSummary, TEST_CASES } from '../lib/map-identity-summary';

console.log('\n🧪 Testing Map Identity Summary Generator');
console.log('==========================================\n');

let passedTests = 0;
let failedTests = 0;

for (const testCase of TEST_CASES) {
  const result = generateMapSummary(testCase.places);
  const passed = result === testCase.expected;
  
  if (passed) {
    passedTests++;
    console.log(`✅ ${testCase.name}`);
  } else {
    failedTests++;
    console.log(`❌ ${testCase.name}`);
    console.log(`   Expected: "${testCase.expected}"`);
    console.log(`   Got:      "${result}"`);
  }
}

console.log('\n==========================================');
console.log(`📊 Results: ${passedTests} passed, ${failedTests} failed`);
console.log('==========================================\n');

if (failedTests > 0) {
  process.exit(1);
}
