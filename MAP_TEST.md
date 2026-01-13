# Testing Transit Map

## 🗺️ Step 6: Map with Stops

Interactive map showing transit stops using react-native-maps.

## 📦 Installation

react-native-maps is already installed:
```bash
npx expo install react-native-maps
```

## 🚀 Quick Test

### Option 1: Using MapTest Component

1. **Copy test file to App.tsx**:
```bash
cp App-test-map.tsx App.tsx
```

2. **Run Expo**:
```bash
npx expo start --clear
```

3. **In the app**:
   - Click "📦 Importer les données"
   - Click "🗺️ Afficher la carte"
   - Explore the map with 7 stops
   - Click on markers to see details

### Option 2: Direct Integration

```tsx
import { TransitMap } from './src/components/map';

function MyScreen() {
  return (
    <TransitMap
      onStopPress={(stop) => {
        console.log('Stop pressed:', stop.name);
      }}
    />
  );
}
```

## 🎨 Features

### TransitMap Component

**What it displays**:
- Interactive map centered on Paris (48.8566, 2.3522)
- Stop markers with icons (🚇 metro, 🚌 bus)
- Color-coded by transport type:
  - 🔵 Metro (dark blue)
  - 🟢 Bus (green)
  - 🔴 Tram (red)
  - 🟣 RER (purple)
- Info overlay (number of stops and lines)
- Selected stop details at bottom

**Props**:
```tsx
interface TransitMapProps {
  onStopPress?: (stop: Stop) => void;
}
```

**Filtering** (to avoid performance issues):
- ✅ Metro lines (type = 1) - All lines
- ✅ Bus lines (type = 3) - Only main lines (< 100)
- ✅ Limited to 500 stops max
- ❌ Tram (type = 0) - Not shown yet
- ❌ RER (type = 2) - Not shown yet

### StopMarker Component

Custom marker component with:
- Transport type icon
- Color based on route type
- Larger when selected
- Optional label on selection

**Props**:
```tsx
interface StopMarkerProps {
  stop: Stop;
  isSelected?: boolean;
  routeType?: number; // 1=metro, 3=bus, etc.
}
```

## 📊 Test Data

**7 Stops**:
- Gare du Nord
- Châtelet
- République
- Nation
- Bastille
- Opéra
- Concorde

**3 Metro Lines**:
- Ligne 1 (yellow)
- Ligne 4 (purple)
- Ligne 14 (purple)

**2 Bus Lines**:
- Bus 21
- Bus 38

## 🎯 What Gets Tested

### Map Display
- ✅ Map renders centered on Paris
- ✅ Markers appear at correct coordinates
- ✅ Info overlay shows counts
- ✅ User location button works
- ✅ Zoom and pan work smoothly

### Interactions
- ✅ Clicking marker selects stop
- ✅ Selected marker changes color/size
- ✅ Stop details appear at bottom
- ✅ Next departures load when available
- ✅ Multiple clicks work correctly

### Performance
- ✅ 7 stops load instantly
- ✅ 500 stops limit prevents lag
- ✅ Smooth animations
- ✅ No memory leaks

## 📱 Expected Result

### Initial View
```
Map centered on Paris
7 markers visible (orange 🚇 icons)
Top overlay:
  "7 arrêts"
  "3 lignes métro"
  "2 lignes bus"
```

### After Clicking Marker
```
Selected marker turns blue and larger
Bottom panel appears:
  "Gare du Nord"
  "📍 48.8809, 2.3553"
  "Prochains départs:"
  "1 → La Défense"
  "08:00:00"
```

## 🎨 Visual Design

### Markers
- **Default**: Orange circle with 🚇
- **Selected**: Blue circle (larger)
- **Shadow**: Drop shadow for depth

### Info Overlay (Top)
- White rounded badges
- Semi-transparent background
- Shows live counts

### Stop Details (Bottom)
- White panel, rounded top corners
- Scrollable if many departures
- Stop name in blue
- Coordinates in gray
- Departures with route → headsign

### Colors
- Primary: `#0066CC` (blue)
- Selected: `#0066CC` (blue)
- Default: `#FF6600` (orange)
- Metro: `#003366` (dark blue)
- Bus: `#00AA55` (green)
- Tram: `#CC0000` (red)
- RER: `#7B68EE` (purple)

## ⚙️ Configuration

### Map Settings
```tsx
initialRegion={{
  latitude: 48.8566,  // Paris center
  longitude: 2.3522,
  latitudeDelta: 0.15,  // Zoom level (smaller = more zoomed)
  longitudeDelta: 0.15,
}}
```

### Filtering Logic
```tsx
// Metro: all lines (type 1)
if (route.type === 1) return true;

// Bus: only main lines (type 3, number < 100)
if (route.type === 3) {
  const lineNumber = parseInt(route.shortName);
  return !isNaN(lineNumber) && lineNumber < 100;
}
```

## 🐛 Troubleshooting

### Map not showing
**Problem**: Black screen or "Google Maps not supported"
**Solution**:
- On iOS: Works out of the box
- On Android: May need Google Maps API key
- Use `PROVIDER_GOOGLE` prop

### No markers visible
**Problem**: Markers don't appear
**Solution**:
1. Check if data imported: Click "Import Data"
2. Verify coordinates are valid (Paris area)
3. Check console for errors

### Markers too small
**Solution**: Adjust marker size in styles:
```tsx
marker: {
  width: 40,  // Increase from 32
  height: 40, // Increase from 32
}
```

### Performance issues with many stops
**Solution**: Already limited to 500 stops
To reduce further:
```tsx
const filteredStops = stops.slice(0, 200); // 200 instead of 500
```

### Map not centered on Paris
**Solution**: Check initialRegion coordinates
```tsx
latitude: 48.8566,   // Must be this
longitude: 2.3522,   // Must be this
```

## 📋 Files Created

```
src/components/map/
├── TransitMap.tsx      # Main map component
├── StopMarker.tsx      # Custom marker
└── index.ts            # Exports

src/components/
└── MapTest.tsx         # Test component

App-test-map.tsx        # Test app entry
MAP_TEST.md            # This file
```

## 🚀 Next Steps

After map works:

1. **Add filters** - Toggle metro/bus/tram visibility
2. **Cluster markers** - Group nearby stops
3. **Real-time updates** - Show live vehicle positions
4. **Search on map** - Find stops by name
5. **Route lines** - Draw routes on map
6. **User location** - Center on current position

## 💡 Usage in Real App

```tsx
import { TransitMap } from './src/components/map';
import { useState } from 'react';

function TransitApp() {
  const [selectedStop, setSelectedStop] = useState(null);

  return (
    <View style={{ flex: 1 }}>
      <TransitMap onStopPress={setSelectedStop} />

      {selectedStop && (
        <StopDetailsSheet stop={selectedStop} />
      )}
    </View>
  );
}
```

## 📖 Related Documentation

- React Native Maps: https://github.com/react-native-maps/react-native-maps
- HOOKS_TEST.md - Testing hooks
- ADAPTER_TEST.md - Testing adapter
- src/hooks/README.md - Using hooks
