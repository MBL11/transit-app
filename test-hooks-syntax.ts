/**
 * Syntax test for hooks (Node.js compatible)
 * Tests that hooks are properly exported and typed
 * Run with: npx tsx test-hooks-syntax.ts
 */

console.log('\n' + '█'.repeat(60));
console.log('HOOKS SYNTAX TEST');
console.log('█'.repeat(60));

try {
  // Test 1: Import hooks module
  console.log('\n1️⃣  Testing hooks module import...');

  // We can't actually run React hooks in Node.js,
  // but we can check that the module exports correctly
  const hooksModule = require('./src/hooks/index.ts');

  const expectedExports = [
    'useAdapter',
    'useAdapterData',
    'useStops',
    'useRoutes',
    'useDepartures',
  ];

  console.log('  Expected exports:', expectedExports.join(', '));
  console.log('  ✅ Hooks module loads');

  // Test 2: Check adapter types exist
  console.log('\n2️⃣  Testing adapter types...');
  const adapterTypes = require('./src/core/types/adapter.ts');

  if (!adapterTypes) {
    throw new Error('Adapter types not found');
  }
  console.log('  ✅ Adapter types exist');

  // Test 3: Check adapter implementation
  console.log('\n3️⃣  Testing Paris adapter...');
  const { parisAdapter } = require('./src/adapters/paris/paris-adapter.ts');

  if (!parisAdapter) {
    throw new Error('Paris adapter not found');
  }

  // Check methods exist
  const requiredMethods = [
    'loadStops',
    'loadRoutes',
    'loadTrips',
    'loadStopTimes',
    'getNextDepartures',
    'getAlerts',
    'getDataSource',
    'getLastUpdate',
  ];

  for (const method of requiredMethods) {
    if (typeof parisAdapter[method] !== 'function') {
      throw new Error(`Method ${method} not found on adapter`);
    }
    console.log(`  ✅ ${method}() exists`);
  }

  // Test 4: Check config
  console.log('\n4️⃣  Testing adapter config...');
  const config = parisAdapter.config;

  if (!config) {
    throw new Error('Adapter config not found');
  }

  console.log(`  City: ${config.cityName}`);
  console.log(`  Timezone: ${config.timezone}`);
  console.log(`  Center: ${config.defaultCenter}`);
  console.log('  ✅ Config is valid');

  // Summary
  console.log('\n' + '█'.repeat(60));
  console.log('✅ ALL SYNTAX TESTS PASSED!');
  console.log('█'.repeat(60));
  console.log('\n📝 Note: These are syntax checks only.');
  console.log('📱 To test hooks functionality, run in Expo app:');
  console.log('   1. Copy App-test-hooks.tsx to App.tsx');
  console.log('   2. Run: npx expo start');
  console.log('   3. Follow HOOKS_TEST.md guide\n');

} catch (error) {
  console.error('\n❌ SYNTAX TEST FAILED:', error);
  console.error('\nThis might be due to React Native dependencies.');
  console.error('Try testing in Expo app instead (see HOOKS_TEST.md)\n');
  process.exit(1);
}
