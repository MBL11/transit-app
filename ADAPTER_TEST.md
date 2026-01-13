# Testing Paris Adapter

## 📋 Available Tests

### 1. Configuration Test (✅ Works in Node.js)

Tests the adapter configuration without requiring React Native/Expo.

```bash
npx tsx test-adapter-config.ts
```

**What it tests:**
- ✅ City configuration (name, timezone, currency)
- ✅ Locales (default: fr, supported: fr, en)
- ✅ Geographic bounds (bounding box, center, zoom)
- ✅ Data source info (IDFM)
- ✅ GTFS URLs (static feed, realtime API)
- ✅ Transport types mapping (métro, bus, tram, RER)
- ✅ TypeScript type safety

**Results:**
```
✅ ALL CONFIGURATION TESTS PASSED!

Configuration Summary:
  City: Paris
  Timezone: Europe/Paris
  Center: 48.8566, 2.3522
  Locales: fr, en
  Data: Île-de-France Mobilités (IDFM)
```

### 2. Full Adapter Test (📱 Requires Expo app)

Tests all adapter methods with SQLite database.

**Option A: Using Test Component in App**

1. Import the test component in `App.tsx`:

```tsx
import { AdapterTest } from './src/components/AdapterTest';

export default function App() {
  return <AdapterTest />;
}
```

2. Run the Expo app:

```bash
npx expo start
```

3. Press "i" for iOS simulator or "a" for Android emulator

4. Tap "Run Test" button in the app

**What it tests:**
- ✅ Import sample GTFS data to SQLite
- ✅ Initialize adapter
- ✅ Load stops from database
- ✅ Load routes from database
- ✅ Load trips from database
- ✅ Get next departures for a stop
- ✅ Configuration access
- ✅ Data source metadata

**Option B: Manual Testing in App**

Add this code to your `App.tsx`:

```tsx
import { useEffect } from 'react';
import { parisAdapter } from './src/adapters/paris';
import { importGTFSToDatabase } from './src/core/gtfs-importer';

export default function App() {
  useEffect(() => {
    async function testAdapter() {
      try {
        // Import sample data
        await importGTFSToDatabase({
          stops: SAMPLE_STOPS_CSV,
          routes: SAMPLE_ROUTES_CSV,
          trips: SAMPLE_TRIPS_CSV,
          stopTimes: SAMPLE_STOP_TIMES_CSV,
        });

        // Initialize adapter
        await parisAdapter.initialize();

        // Load data
        const stops = await parisAdapter.loadStops();
        const routes = await parisAdapter.loadRoutes();

        console.log('Stops:', stops.length);
        console.log('Routes:', routes.length);

        // Get departures
        if (stops[0]) {
          const departures = await parisAdapter.getNextDepartures(stops[0].id);
          console.log('Departures:', departures);
        }
      } catch (error) {
        console.error('Test failed:', error);
      }
    }

    testAdapter();
  }, []);

  return <View><Text>Check console logs</Text></View>;
}
```

## 🧪 Sample Test Data

The adapter tests use sample Paris data:

**Stops (3):**
- Gare du Nord (48.8809, 2.3553)
- Châtelet (48.8584, 2.3470)
- République (48.8673, 2.3636)

**Routes (3):**
- Ligne 1 (Métro, #FFCD00 yellow)
- Ligne 14 (Métro, #62259D purple)
- Bus 91 (#82C8E6 blue)

**Trips (2):**
- Ligne 1 → La Défense
- Ligne 1 → Château de Vincennes

**Stop Times (3):**
- 08:00 Gare du Nord
- 08:05 Châtelet
- 08:10 République

## 📊 Expected Test Results

### Configuration Test
```
✅ Basic config valid
✅ Locales valid
✅ Geographic config valid
✅ Data source valid
✅ GTFS URLs valid
✅ Transport types valid
✅ Types are correctly defined
```

### Full Adapter Test (in Expo)
```
📦 Importing sample data...
✅ Data imported
🔧 Initializing adapter...
✅ Adapter initialized
📍 City: Paris
🌍 Timezone: Europe/Paris
🚏 Loading stops...
✅ Loaded 3 stops
   Sample: Gare du Nord
🚇 Loading routes...
✅ Loaded 3 routes
   Sample: 1 - Métro Ligne 1
⏰ Getting departures for Gare du Nord...
✅ Found 1 departures
   1 → La Défense

🎉 ALL TESTS PASSED!
```

## 🔍 What Gets Tested

### Adapter Interface Compliance

| Method | Tested | Description |
|--------|--------|-------------|
| `config` | ✅ | City configuration |
| `getDataSource()` | ✅ | Data source metadata |
| `getLastUpdate()` | ✅ | Last update timestamp |
| `loadStops()` | ✅ | Load all stops from DB |
| `loadRoutes()` | ✅ | Load all routes from DB |
| `loadTrips()` | ✅ | Load all trips from DB |
| `loadStopTimes()` | ✅ | Load all stop times from DB |
| `loadShapes()` | ⏳ | Load shapes (optional) |
| `getNextDepartures()` | ✅ | Get next departures (static) |
| `getAlerts()` | ⏳ | Get service alerts (planned) |

### Data Validation

- ✅ Stops have valid GPS coordinates
- ✅ Routes have colors and names
- ✅ Trips link to routes
- ✅ Stop times link to stops and trips
- ✅ Times are in HH:MM:SS format
- ✅ All IDs are present

## 🚨 Troubleshooting

### "Transform failed" error
This means you're trying to run Expo/React Native code in Node.js. Use the config test instead:
```bash
npx tsx test-adapter-config.ts
```

### "Database is empty" warning
This is expected on first run. The adapter will warn you but won't crash. Import data first:
```typescript
await importGTFSToDatabase({ stops, routes, trips, stopTimes });
```

### No departures found
- Check that stop_times exist for the stop
- Verify the current time is before departure times
- Sample data uses 08:00-09:10, so test in the morning or change times

## 📝 Next Steps

After tests pass:

1. **Download real IDFM data** - Get the full Paris GTFS
2. **Parse and import** - Use `importGTFSFromURLs()`
3. **Test with real data** - Verify with thousands of stops
4. **Add real-time** - Integrate SIRI-Lite API (step 10)
5. **Add alerts** - Integrate disruptions API (step 13)

## 📖 Related Files

- `src/adapters/paris/paris-adapter.ts` - Adapter implementation
- `src/adapters/paris/config.ts` - Configuration
- `src/core/gtfs-importer.ts` - Data import
- `src/core/database.ts` - SQLite operations
- `test-adapter-config.ts` - Config test (Node.js)
- `src/components/AdapterTest.tsx` - Test component (Expo)
