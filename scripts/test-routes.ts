#!/usr/bin/env npx ts-node
/**
 * Route Testing Script for İzmir Transit App
 *
 * Tests routing algorithm against real GTFS data.
 * Run with: npx ts-node scripts/test-routes.ts
 *
 * NOTE: This script requires the app to be running or
 * needs to be executed in the React Native environment.
 *
 * For testing in the app, add this console command in a debug screen:
 */

// Test routes to verify against Google Maps
const TEST_ROUTES = {
  daytime: [
    // 1. İZBAN direct
    { from: 'Halkapınar', to: 'Alsancak Gar', expected: { min: 5, max: 10 }, mode: 'İZBAN' },

    // 2. Metro M1 direct
    { from: 'Fahrettin Altay', to: 'Konak', expected: { min: 10, max: 15 }, mode: 'M1 Metro' },

    // 3. Ferry direct
    { from: 'Konak İskele', to: 'Karşıyaka İskele', expected: { min: 18, max: 25 }, mode: 'Ferry' },

    // 4. Metro + İZBAN transfer
    { from: 'Bornova', to: 'Mavişehir', expected: { min: 25, max: 40 }, mode: 'M1 + İZBAN' },

    // 5. Long İZBAN
    { from: 'Aliağa', to: 'Şirinyer', expected: { min: 60, max: 90 }, mode: 'İZBAN' },

    // 6. Metro full line
    { from: 'Fahrettin Altay', to: 'Bornova', expected: { min: 20, max: 30 }, mode: 'M1 Metro' },

    // 7. Tram T1
    { from: 'Alaybey', to: 'Ataşehir', expected: { min: 12, max: 20 }, mode: 'T1 Tram' },

    // 8. Bus
    { from: 'Konak', to: 'Buca', expected: { min: 15, max: 35 }, mode: 'Bus 303/417' },

    // 9. Multi-modal (Metro + Ferry)
    { from: 'Fahrettin Altay', to: 'Karşıyaka', expected: { min: 35, max: 55 }, mode: 'M1 + Ferry' },

    // 10. İZBAN + Metro
    { from: 'Menemen', to: 'Konak', expected: { min: 40, max: 60 }, mode: 'İZBAN + M1' },
  ],

  nighttime: [
    // Night buses (Baykuş) - only run 00:00-05:00
    { from: 'Konak', to: 'Bornova', expected: { min: 25, max: 50 }, mode: 'Baykuş 930', time: '02:00' },
    { from: 'Konak', to: 'Buca', expected: { min: 30, max: 55 }, mode: 'Baykuş 940', time: '02:00' },
    { from: 'Konak', to: 'Çiğli', expected: { min: 40, max: 70 }, mode: 'Baykuş 920', time: '02:00' },
    { from: 'Konak', to: 'Karşıyaka', expected: { min: 30, max: 50 }, mode: 'Baykuş 910', time: '02:00' },
    // No service expected
    { from: 'Fahrettin Altay', to: 'Üçkuyular', expected: { min: 999, max: 999 }, mode: 'No service (walk only)', time: '03:00' },
  ],
};

// Comparison format for documentation
console.log('='.repeat(80));
console.log('İZMİR TRANSIT APP - ROUTE TESTING REFERENCE');
console.log('='.repeat(80));
console.log('');
console.log('DAYTIME ROUTES (08:00-23:00):');
console.log('-'.repeat(80));
console.log('| # | From → To                          | Expected    | Mode               |');
console.log('|---|------------------------------------ |-------------|--------------------| ');

TEST_ROUTES.daytime.forEach((route, i) => {
  const fromTo = `${route.from} → ${route.to}`.padEnd(35);
  const expected = `${route.expected.min}-${route.expected.max} min`.padEnd(11);
  const mode = route.mode.padEnd(18);
  console.log(`| ${(i + 1).toString().padStart(1)} | ${fromTo} | ${expected} | ${mode} |`);
});

console.log('');
console.log('NIGHTTIME ROUTES (00:00-05:00):');
console.log('-'.repeat(80));
console.log('| # | From → To                          | Expected    | Mode               |');
console.log('|---|------------------------------------ |-------------|--------------------| ');

TEST_ROUTES.nighttime.forEach((route, i) => {
  const fromTo = `${route.from} → ${route.to}`.padEnd(35);
  const expected = route.expected.min === 999
    ? 'No transit'.padEnd(11)
    : `${route.expected.min}-${route.expected.max} min`.padEnd(11);
  const mode = route.mode.padEnd(18);
  console.log(`| ${(i + 1).toString().padStart(1)} | ${fromTo} | ${expected} | ${mode} |`);
});

console.log('');
console.log('='.repeat(80));
console.log('HOW TO TEST:');
console.log('='.repeat(80));
console.log('');
console.log('1. Build and install the APK:');
console.log('   npx eas build --platform android --profile preview');
console.log('');
console.log('2. Open the app and go to "Itinéraire" (Route) screen');
console.log('');
console.log('3. For each route above:');
console.log('   a. Enter the "From" location');
console.log('   b. Enter the "To" location');
console.log('   c. Set the time (daytime: 08:00, nighttime: 02:00)');
console.log('   d. Tap "Rechercher" (Search)');
console.log('   e. Compare the result with the expected values above');
console.log('');
console.log('4. Check if:');
console.log('   ✓ Duration is within the expected range');
console.log('   ✓ The correct mode of transport is used');
console.log('   ✓ Nighttime routes show Baykuş buses only');
console.log('   ✓ "No service" cases show walking only or error');
console.log('');
console.log('5. Report any discrepancies for fixing');
console.log('');

export { TEST_ROUTES };
