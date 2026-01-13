/**
 * TypeScript test for GTFS Parser
 * Run with: npx tsx test-parser-ts.ts
 */

import { runAllParserTests } from './src/core/gtfs-parser-test';

console.log('Starting GTFS Parser TypeScript Tests...\n');

try {
  runAllParserTests();
  console.log('All TypeScript tests passed! ✅\n');
} catch (error) {
  console.error('Test failed:', error);
  process.exit(1);
}
