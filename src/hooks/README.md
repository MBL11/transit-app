# React Hooks for Transit Adapter

React hooks to easily use the Transit Adapter in your components.

## Available Hooks

### `useAdapter()`

Main hook to access the transit adapter. Automatically initializes the database.

```tsx
import { useAdapter } from './hooks';

function MyComponent() {
  const { adapter, loading, error } = useAdapter();

  if (loading) return <Text>Initializing...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;

  // Use adapter methods
  const loadData = async () => {
    const stops = await adapter.loadStops();
    const routes = await adapter.loadRoutes();
  };

  return <Button onPress={loadData}>Load Data</Button>;
}
```

**Returns:**
- `adapter: ParisAdapter | null` - The adapter instance
- `loading: boolean` - True while initializing
- `error: Error | null` - Error if initialization failed

---

### `useAdapterData()`

Check if the adapter has data in the database. Useful for showing an initial import screen.

```tsx
import { useAdapterData } from './hooks';

function App() {
  const { hasData, loading } = useAdapterData();

  if (loading) return <LoadingScreen />;
  if (!hasData) return <ImportDataScreen />;

  return <MainApp />;
}
```

**Returns:**
- `hasData: boolean` - True if database has data
- `loading: boolean` - True while checking

---

### `useStops()`

Load all stops from the adapter.

```tsx
import { useStops } from './hooks';

function StopsScreen() {
  const { stops, loading, error, refresh } = useStops();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <FlatList
      data={stops}
      renderItem={({ item }) => <StopCard stop={item} />}
      onRefresh={refresh}
      refreshing={loading}
    />
  );
}
```

**Returns:**
- `stops: Stop[]` - Array of stops
- `loading: boolean` - True while loading
- `error: Error | null` - Error if loading failed
- `refresh: () => Promise<void>` - Function to reload stops

---

### `useRoutes()`

Load all routes from the adapter.

```tsx
import { useRoutes } from './hooks';

function RoutesScreen() {
  const { routes, loading, error, refresh } = useRoutes();

  return (
    <FlatList
      data={routes}
      renderItem={({ item }) => (
        <LineCard
          name={item.shortName}
          description={item.longName}
          color={item.color}
        />
      )}
      onRefresh={refresh}
      refreshing={loading}
    />
  );
}
```

**Returns:**
- `routes: Route[]` - Array of routes
- `loading: boolean` - True while loading
- `error: Error | null` - Error if loading failed
- `refresh: () => Promise<void>` - Function to reload routes

---

### `useDepartures(stopId)`

Get next departures for a specific stop.

```tsx
import { useDepartures } from './hooks';

function StopDetailsScreen({ route }) {
  const { stopId } = route.params;
  const { departures, loading, error, refresh } = useDepartures(stopId);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <View>
      <Text>Next Departures:</Text>
      {departures.map(dep => (
        <View key={dep.tripId}>
          <Text>Line {dep.routeShortName} → {dep.headsign}</Text>
          <Text>{dep.departureTime.toLocaleTimeString()}</Text>
          {dep.isRealtime && <Badge>Real-time</Badge>}
        </View>
      ))}
      <Button onPress={refresh}>Refresh</Button>
    </View>
  );
}
```

**Parameters:**
- `stopId: string | null` - The stop ID to get departures for

**Returns:**
- `departures: NextDeparture[]` - Array of next departures
- `loading: boolean` - True while loading
- `error: Error | null` - Error if loading failed
- `refresh: () => Promise<void>` - Function to reload departures

---

## Complete Example

```tsx
import React from 'react';
import { View, Text, FlatList, Button } from 'react-native';
import { useAdapter, useStops, useDepartures } from './hooks';

function TransitApp() {
  const { adapter, loading: adapterLoading } = useAdapter();
  const { stops, loading: stopsLoading } = useStops();
  const [selectedStop, setSelectedStop] = React.useState(null);

  if (adapterLoading) {
    return <Text>Initializing adapter...</Text>;
  }

  return (
    <View>
      <Text>Config: {adapter.config.cityName}</Text>

      <FlatList
        data={stops}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Button
            title={item.name}
            onPress={() => setSelectedStop(item.id)}
          />
        )}
        ListEmptyComponent={
          stopsLoading ? <Text>Loading stops...</Text> : <Text>No stops</Text>
        }
      />

      {selectedStop && <DeparturesView stopId={selectedStop} />}
    </View>
  );
}

function DeparturesView({ stopId }) {
  const { departures, loading, refresh } = useDepartures(stopId);

  return (
    <View>
      <Button onPress={refresh} title="Refresh" />
      {loading ? (
        <Text>Loading departures...</Text>
      ) : (
        departures.map(dep => (
          <Text key={dep.tripId}>
            {dep.routeShortName} → {dep.headsign} at{' '}
            {dep.departureTime.toLocaleTimeString()}
          </Text>
        ))
      )}
    </View>
  );
}

export default TransitApp;
```

## Architecture

```
Component
    ↓
useAdapter() / useStops() / useRoutes() / useDepartures()
    ↓
ParisAdapter
    ↓
SQLite Database
```

## Notes

- All hooks automatically handle loading and error states
- The adapter is a singleton (only one instance created)
- Database is initialized automatically on first use
- Use `refresh()` functions to manually reload data
- Hooks use React's `useEffect` to load data automatically

## Related Files

- `src/adapters/paris/paris-adapter.ts` - Adapter implementation
- `src/core/database.ts` - Database operations
- `src/core/types/adapter.ts` - TypeScript interfaces
