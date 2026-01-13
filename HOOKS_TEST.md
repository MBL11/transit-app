# Testing React Hooks for Transit Adapter

## Quick Test

### Step 1: Update App.tsx

Replace your `App.tsx` content with:

```tsx
import { HooksTest } from './src/components/HooksTest';

export default function App() {
  return <HooksTest />;
}
```

### Step 2: Run Expo

```bash
npx expo start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- Scan QR code for physical device

### Step 3: Test the Hooks

In the app, you'll see:

1. **Import Data button** - Click to import sample GTFS data
2. **5 Test sections** - Each testing a different hook:
   - 1️⃣ `useAdapterData()` - Shows if DB has data
   - 2️⃣ `useAdapter()` - Shows adapter config
   - 3️⃣ `useStops()` - Lists all stops (click one)
   - 4️⃣ `useRoutes()` - Lists all routes with colors
   - 5️⃣ `useDepartures()` - Shows departures for selected stop
3. **Log section** - Real-time log of what's happening

### Expected Result

After clicking "Import Data":

```
📦 Importing sample data...
✅ Data imported successfully

1️⃣ useAdapterData: hasData=true

2️⃣ useAdapter: ✅ Adapter ready
   City: Paris
   Timezone: Europe/Paris
   Center: 48.8566,2.3522

3️⃣ useStops: ✅ Loaded 5 stops
   - Gare du Nord (STOP001)
   - Châtelet (STOP002)
   - République (STOP003)
   - Nation (STOP004)
   - Bastille (STOP005)

4️⃣ useRoutes: ✅ Loaded 3 routes
   - 1: Métro Ligne 1
   - 14: Métro Ligne 14
   - 91: Bus 91

[Click on Gare du Nord]
   Selected: Gare du Nord

5️⃣ useDepartures(STOP001): ✅ 1 departures
   - 1 → La Défense at 8:00:00
```

## Test Sample Data

### 5 Stops
- Gare du Nord (48.8809, 2.3553)
- Châtelet (48.8584, 2.3470)
- République (48.8673, 2.3636)
- Nation (48.8484, 2.3966)
- Bastille (48.8532, 2.3689)

### 3 Routes
- Ligne 1 (Métro, yellow #FFCD00)
- Ligne 14 (Métro, purple #62259D)
- Bus 91 (blue #82C8E6)

### 3 Trips
- Ligne 1 → La Défense
- Ligne 1 → Château de Vincennes
- Ligne 14 → Olympiades

### Stop Times
- 08:00 Gare du Nord (Ligne 1 → La Défense)
- 08:05 Châtelet
- 08:10 République
- 09:00 Nation (Ligne 1 → Vincennes)
- 09:05 République
- 10:00 Gare du Nord (Ligne 14)

## What Each Hook Tests

### useAdapterData()
✅ Checks if database has data
✅ Returns `hasData: boolean`
✅ Shows loading state

### useAdapter()
✅ Initializes adapter
✅ Returns adapter instance
✅ Shows config (city, timezone, center)
✅ Error handling

### useStops()
✅ Loads all stops from DB
✅ Shows stop names and coordinates
✅ Clickable stops
✅ Refresh button works
✅ Loading and error states

### useRoutes()
✅ Loads all routes from DB
✅ Shows route names and colors
✅ Color-coded borders
✅ Route types displayed

### useDepartures(stopId)
✅ Gets next departures for selected stop
✅ Shows route, headsign, time
✅ Real-time vs scheduled indicator
✅ Updates when stop changes

## Visual Test

The test UI has color-coded sections:
- 🔵 Blue = useAdapterData
- 🟢 Green = useAdapter
- 🟡 Yellow = useStops
- 🟣 Purple = useRoutes
- 🔴 Red = useDepartures

Each section shows:
- Hook name
- Loading spinner (while loading)
- Error message (if error)
- Success data (when loaded)

## Troubleshooting

### "No data" showing
👉 Click "Import Data" button first

### Departures not showing
👉 Click on a stop first (in useStops section)

### Error: "Failed to load stops"
👉 Database not initialized
👉 Check console logs
👉 Try clicking "Import Data" again

### App crashes
👉 Check Metro bundler logs
👉 Run `npx expo start --clear`
👉 Check that all dependencies installed: `npm install`

## Next Steps After Testing

If all hooks work:

✅ Adapter is fully functional
✅ Database is working
✅ Hooks are ready to use
✅ Ready for Step 6: Map with stops

Now you can use these hooks in real screens:

```tsx
// In any component
import { useStops, useRoutes, useDepartures } from './src/hooks';

function MyScreen() {
  const { stops } = useStops();
  const { routes } = useRoutes();

  return (
    <FlatList
      data={stops}
      renderItem={({ item }) => <StopCard stop={item} />}
    />
  );
}
```

## Files

- `src/components/HooksTest.tsx` - Test component
- `src/hooks/useAdapter.ts` - All hooks
- `App.tsx` - Replace with test component
