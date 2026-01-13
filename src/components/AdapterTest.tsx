/**
 * Adapter Test Component
 * Add this to App.tsx to test the Paris Adapter in Expo
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { parisAdapter } from '../adapters/paris';
import { importGTFSToDatabase } from '../core/gtfs-importer';
import * as db from '../core/database';

// Sample test data
const SAMPLE_DATA = {
  stops: `stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station
STOP001,Gare du Nord,48.8809,2.3553,0,
STOP002,Châtelet,48.8584,2.3470,0,
STOP003,République,48.8673,2.3636,0,`,

  routes: `route_id,route_short_name,route_long_name,route_type,route_color,route_text_color
ROUTE001,1,Métro Ligne 1,1,FFCD00,000000
ROUTE002,14,Métro Ligne 14,1,62259D,FFFFFF
ROUTE003,91,Bus 91,3,82C8E6,000000`,

  trips: `route_id,service_id,trip_id,trip_headsign,direction_id,shape_id
ROUTE001,SERVICE1,TRIP001,La Défense,0,SHAPE001
ROUTE001,SERVICE1,TRIP002,Château de Vincennes,1,SHAPE002`,

  stopTimes: `trip_id,arrival_time,departure_time,stop_id,stop_sequence
TRIP001,08:00:00,08:00:00,STOP001,1
TRIP001,08:05:00,08:05:00,STOP002,2
TRIP001,08:10:00,08:10:00,STOP003,3`,
};

export function AdapterTest() {
  const [log, setLog] = useState<string[]>(['Adapter Test Ready']);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    setLog((prev) => [...prev, message]);
    console.log(message);
  };

  const clearLog = () => {
    setLog(['Log cleared']);
  };

  const runTest = async () => {
    setLoading(true);
    clearLog();

    try {
      // Test 1: Import data
      addLog('📦 Importing sample data...');
      await db.dropAllTables();
      await importGTFSToDatabase(SAMPLE_DATA);
      addLog('✅ Data imported');

      // Test 2: Initialize adapter
      addLog('🔧 Initializing adapter...');
      await parisAdapter.initialize();
      addLog('✅ Adapter initialized');

      // Test 3: Config
      addLog(`📍 City: ${parisAdapter.config.cityName}`);
      addLog(`🌍 Timezone: ${parisAdapter.config.timezone}`);

      // Test 4: Load stops
      addLog('🚏 Loading stops...');
      const stops = await parisAdapter.loadStops();
      addLog(`✅ Loaded ${stops.length} stops`);
      if (stops[0]) {
        addLog(`   Sample: ${stops[0].name}`);
      }

      // Test 5: Load routes
      addLog('🚇 Loading routes...');
      const routes = await parisAdapter.loadRoutes();
      addLog(`✅ Loaded ${routes.length} routes`);
      if (routes[0]) {
        addLog(`   Sample: ${routes[0].shortName} - ${routes[0].longName}`);
      }

      // Test 6: Next departures
      if (stops[0]) {
        addLog(`⏰ Getting departures for ${stops[0].name}...`);
        const departures = await parisAdapter.getNextDepartures(stops[0].id);
        addLog(`✅ Found ${departures.length} departures`);
        if (departures[0]) {
          addLog(`   ${departures[0].routeShortName} → ${departures[0].headsign}`);
        }
      }

      addLog('');
      addLog('🎉 ALL TESTS PASSED!');
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 p-4 bg-white">
      <Text className="text-2xl font-bold mb-4">Paris Adapter Test</Text>

      <View className="flex-row gap-2 mb-4">
        <Pressable
          onPress={runTest}
          disabled={loading}
          className={`px-4 py-2 rounded ${loading ? 'bg-gray-300' : 'bg-blue-500'}`}
        >
          <Text className="text-white font-semibold">
            {loading ? 'Running...' : 'Run Test'}
          </Text>
        </Pressable>

        <Pressable onPress={clearLog} className="px-4 py-2 rounded bg-gray-500">
          <Text className="text-white font-semibold">Clear Log</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 border border-gray-300 rounded p-2 bg-gray-50">
        {log.map((line, i) => (
          <Text key={i} className="font-mono text-sm mb-1">
            {line}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}
