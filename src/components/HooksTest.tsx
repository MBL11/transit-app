/**
 * Test Component for Transit Adapter Hooks
 * Tests all the hooks we just created
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import {
  useAdapter,
  useAdapterData,
  useStops,
  useRoutes,
  useDepartures,
} from '../hooks';
import { importGTFSToDatabase } from '../core/gtfs-importer';
import * as db from '../core/database';

// Sample GTFS data
const SAMPLE_DATA = {
  stops: `stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station
STOP001,Gare du Nord,48.8809,2.3553,0,
STOP002,Châtelet,48.8584,2.3470,0,
STOP003,République,48.8673,2.3636,0,
STOP004,Nation,48.8484,2.3966,0,
STOP005,Bastille,48.8532,2.3689,0,`,

  routes: `route_id,route_short_name,route_long_name,route_type,route_color,route_text_color
ROUTE001,1,Métro Ligne 1,1,FFCD00,000000
ROUTE002,14,Métro Ligne 14,1,62259D,FFFFFF
ROUTE003,91,Bus 91,3,82C8E6,000000`,

  trips: `route_id,service_id,trip_id,trip_headsign,direction_id,shape_id
ROUTE001,SERVICE1,TRIP001,La Défense,0,SHAPE001
ROUTE001,SERVICE1,TRIP002,Château de Vincennes,1,SHAPE002
ROUTE002,SERVICE1,TRIP003,Olympiades,0,SHAPE003`,

  stopTimes: `trip_id,arrival_time,departure_time,stop_id,stop_sequence
TRIP001,08:00:00,08:00:00,STOP001,1
TRIP001,08:05:00,08:05:00,STOP002,2
TRIP001,08:10:00,08:10:00,STOP003,3
TRIP002,09:00:00,09:00:00,STOP004,1
TRIP002,09:05:00,09:05:00,STOP003,2
TRIP003,10:00:00,10:00:00,STOP001,1`,
};

export function HooksTest() {
  const [log, setLog] = useState<string[]>(['🧪 Hooks Test Ready']);
  const [importing, setImporting] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  const addLog = (message: string) => {
    setLog((prev) => [...prev, message]);
    console.log(message);
  };

  const clearLog = () => {
    setLog(['Log cleared']);
    setSelectedStopId(null);
  };

  // Test 1: Import data
  const importData = async () => {
    setImporting(true);
    addLog('');
    addLog('📦 Importing sample data...');

    try {
      await db.dropAllTables();
      await importGTFSToDatabase(SAMPLE_DATA);
      addLog('✅ Data imported successfully');
    } catch (error) {
      addLog(`❌ Import failed: ${error}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="p-4 bg-blue-500">
          <Text className="text-2xl font-bold text-white">Hooks Test Suite</Text>
          <Text className="text-white mt-1">Testing all Transit Adapter hooks</Text>
        </View>

        {/* Buttons */}
        <View className="flex-row flex-wrap gap-2 p-4 bg-gray-100">
          <Pressable
            onPress={importData}
            disabled={importing}
            className={`px-4 py-2 rounded ${importing ? 'bg-gray-300' : 'bg-green-500'}`}
          >
            <Text className="text-white font-semibold">
              {importing ? 'Importing...' : '📦 Import Data'}
            </Text>
          </Pressable>

          <Pressable onPress={clearLog} className="px-4 py-2 rounded bg-gray-500">
            <Text className="text-white font-semibold">🗑️ Clear Log</Text>
          </Pressable>
        </View>

        {/* Tests */}
        <View className="p-4 gap-4">
          <TestUseAdapterData addLog={addLog} />
          <TestUseAdapter addLog={addLog} />
          <TestUseStops addLog={addLog} setSelectedStopId={setSelectedStopId} />
          <TestUseRoutes addLog={addLog} />
          {selectedStopId && (
            <TestUseDepartures stopId={selectedStopId} addLog={addLog} />
          )}
        </View>

        {/* Log */}
        <View className="p-4">
          <Text className="text-lg font-bold mb-2">📋 Log:</Text>
          <View className="border border-gray-300 rounded p-2 bg-gray-50">
            {log.map((line, i) => (
              <Text key={i} className="font-mono text-xs mb-1">
                {line}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Test useAdapterData hook
function TestUseAdapterData({ addLog }: { addLog: (msg: string) => void }) {
  const { hasData, loading } = useAdapterData();

  React.useEffect(() => {
    if (!loading) {
      addLog(`1️⃣ useAdapterData: hasData=${hasData}`);
    }
  }, [hasData, loading]);

  return (
    <View className="p-3 bg-blue-50 rounded border border-blue-200">
      <Text className="font-bold">1️⃣ useAdapterData()</Text>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text>Has Data: {hasData ? '✅ Yes' : '❌ No'}</Text>
      )}
    </View>
  );
}

// Test useAdapter hook
function TestUseAdapter({ addLog }: { addLog: (msg: string) => void }) {
  const { adapter, loading, error } = useAdapter();

  React.useEffect(() => {
    if (adapter && !loading) {
      addLog(`2️⃣ useAdapter: ✅ Adapter ready`);
      addLog(`   City: ${adapter.config.cityName}`);
      addLog(`   Timezone: ${adapter.config.timezone}`);
      addLog(`   Center: ${adapter.config.defaultCenter}`);
    }
  }, [adapter, loading]);

  return (
    <View className="p-3 bg-green-50 rounded border border-green-200">
      <Text className="font-bold">2️⃣ useAdapter()</Text>
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text className="text-red-500">Error: {error.message}</Text>
      ) : adapter ? (
        <View>
          <Text>✅ City: {adapter.config.cityName}</Text>
          <Text>✅ Timezone: {adapter.config.timezone}</Text>
        </View>
      ) : (
        <Text>No adapter</Text>
      )}
    </View>
  );
}

// Test useStops hook
function TestUseStops({
  addLog,
  setSelectedStopId,
}: {
  addLog: (msg: string) => void;
  setSelectedStopId: (id: string) => void;
}) {
  const { stops, loading, error, refresh } = useStops();

  React.useEffect(() => {
    if (stops.length > 0 && !loading) {
      addLog(`3️⃣ useStops: ✅ Loaded ${stops.length} stops`);
      stops.forEach((stop) => {
        addLog(`   - ${stop.name} (${stop.id})`);
      });
    }
  }, [stops, loading]);

  return (
    <View className="p-3 bg-yellow-50 rounded border border-yellow-200">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="font-bold">3️⃣ useStops()</Text>
        <Pressable
          onPress={refresh}
          className="px-2 py-1 bg-yellow-500 rounded"
        >
          <Text className="text-white text-xs">Refresh</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text className="text-red-500">Error: {error.message}</Text>
      ) : (
        <View>
          <Text>✅ Loaded {stops.length} stops</Text>
          {stops.slice(0, 3).map((stop) => (
            <Pressable
              key={stop.id}
              onPress={() => {
                setSelectedStopId(stop.id);
                addLog(`   Selected: ${stop.name}`);
              }}
              className="mt-1 p-2 bg-white rounded border border-gray-300"
            >
              <Text className="text-sm">{stop.name}</Text>
              <Text className="text-xs text-gray-500">
                {stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// Test useRoutes hook
function TestUseRoutes({ addLog }: { addLog: (msg: string) => void }) {
  const { routes, loading, error } = useRoutes();

  React.useEffect(() => {
    if (routes.length > 0 && !loading) {
      addLog(`4️⃣ useRoutes: ✅ Loaded ${routes.length} routes`);
      routes.forEach((route) => {
        addLog(`   - ${route.shortName}: ${route.longName}`);
      });
    }
  }, [routes, loading]);

  return (
    <View className="p-3 bg-purple-50 rounded border border-purple-200">
      <Text className="font-bold">4️⃣ useRoutes()</Text>
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text className="text-red-500">Error: {error.message}</Text>
      ) : (
        <View>
          <Text>✅ Loaded {routes.length} routes</Text>
          {routes.map((route) => (
            <View
              key={route.id}
              className="mt-1 p-2 bg-white rounded border"
              style={{ borderColor: route.color }}
            >
              <Text className="font-bold">{route.shortName}</Text>
              <Text className="text-xs">{route.longName}</Text>
              <Text className="text-xs text-gray-500">Color: {route.color}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Test useDepartures hook
function TestUseDepartures({
  stopId,
  addLog,
}: {
  stopId: string;
  addLog: (msg: string) => void;
}) {
  const { departures, loading, error } = useDepartures(stopId);

  React.useEffect(() => {
    if (departures.length > 0 && !loading) {
      addLog(`5️⃣ useDepartures(${stopId}): ✅ ${departures.length} departures`);
      departures.forEach((dep) => {
        addLog(`   - ${dep.routeShortName} → ${dep.headsign} at ${dep.departureTime.toLocaleTimeString()}`);
      });
    }
  }, [departures, loading, stopId]);

  return (
    <View className="p-3 bg-red-50 rounded border border-red-200">
      <Text className="font-bold">5️⃣ useDepartures({stopId})</Text>
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text className="text-red-500">Error: {error.message}</Text>
      ) : (
        <View>
          <Text>✅ {departures.length} departures</Text>
          {departures.map((dep, i) => (
            <View key={i} className="mt-1 p-2 bg-white rounded border border-gray-300">
              <Text className="font-bold">
                {dep.routeShortName} → {dep.headsign}
              </Text>
              <Text className="text-xs">
                {dep.departureTime.toLocaleTimeString()}
              </Text>
              <Text className="text-xs text-gray-500">
                {dep.isRealtime ? '🔴 Real-time' : '⚪ Scheduled'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
