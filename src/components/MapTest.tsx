/**
 * Map Test Component
 * Tests the TransitMap with real data
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { TransitMap } from './map';
import { useAdapterData, useDepartures, useStops } from '../hooks';
import { importGTFSToDatabase } from '../core/gtfs-importer';
import * as db from '../core/database';
import type { Stop } from '../core/types/models';

// Sample GTFS data with metro and bus lines
const SAMPLE_DATA = {
  stops: `stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station
STOP001,Gare du Nord,48.8809,2.3553,0,
STOP002,Châtelet,48.8584,2.3470,0,
STOP003,République,48.8673,2.3636,0,
STOP004,Nation,48.8484,2.3966,0,
STOP005,Bastille,48.8532,2.3689,0,
STOP006,Opéra,48.8708,2.3315,0,
STOP007,Concorde,48.8654,2.3212,0,`,

  routes: `route_id,route_short_name,route_long_name,route_type,route_color,route_text_color
M1,1,Métro Ligne 1,1,FFCD00,000000
M4,4,Métro Ligne 4,1,A0006E,FFFFFF
M14,14,Métro Ligne 14,1,62259D,FFFFFF
B21,21,Bus 21,3,82C8E6,000000
B38,38,Bus 38,3,82C8E6,000000`,

  trips: `route_id,service_id,trip_id,trip_headsign,direction_id,shape_id
M1,SERVICE1,T1,La Défense,0,
M4,SERVICE1,T2,Porte de Clignancourt,0,
M14,SERVICE1,T3,Olympiades,0,
B21,SERVICE1,T4,Gare Saint-Lazare,0,`,

  stopTimes: `trip_id,arrival_time,departure_time,stop_id,stop_sequence
T1,08:00:00,08:00:00,STOP001,1
T1,08:05:00,08:05:00,STOP002,2
T2,08:10:00,08:10:00,STOP003,3
T3,08:15:00,08:15:00,STOP004,4
T4,08:20:00,08:20:00,STOP005,5`,
};

export function MapTest() {
  const [importing, setImporting] = useState(false);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [showMap, setShowMap] = useState(false);
  const { hasData } = useAdapterData();
  const { stops } = useStops();
  const { departures, loading: departuresLoading } = useDepartures(
    selectedStop?.id || null
  );

  const importData = async () => {
    setImporting(true);
    try {
      await db.dropAllTables();
      await importGTFSToDatabase(SAMPLE_DATA);
      setShowMap(true);
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setImporting(false);
    }
  };

  const handleStopPress = (stop: Stop) => {
    setSelectedStop(stop);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="p-4 bg-blue-500">
        <Text className="text-2xl font-bold text-white">Transit Map Test</Text>
        <Text className="text-white mt-1">
          {hasData ? '✅ Données chargées' : '❌ Pas de données'}
        </Text>
      </View>

      {/* Controls */}
      {!showMap && (
        <View className="p-4 gap-3">
          <Pressable
            onPress={importData}
            disabled={importing}
            className={`p-4 rounded-lg ${
              importing ? 'bg-gray-300' : 'bg-green-500'
            }`}
          >
            <Text className="text-white font-semibold text-center">
              {importing ? 'Import en cours...' : '📦 Importer les données'}
            </Text>
          </Pressable>

          {hasData && (
            <Pressable
              onPress={() => setShowMap(true)}
              className="p-4 rounded-lg bg-blue-500"
            >
              <Text className="text-white font-semibold text-center">
                🗺️ Afficher la carte
              </Text>
            </Pressable>
          )}

          {/* Info */}
          <View className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Text className="font-bold mb-2">ℹ️ Données de test:</Text>
            <Text className="text-sm">• 7 arrêts (Paris)</Text>
            <Text className="text-sm">• 3 lignes métro (1, 4, 14)</Text>
            <Text className="text-sm">• 2 lignes bus (21, 38)</Text>
            <Text className="text-sm mt-2 text-gray-600">
              Cliquez sur un marqueur pour voir les détails
            </Text>
          </View>
        </View>
      )}

      {/* Map */}
      {showMap && (
        <>
          <TransitMap stops={stops} onStopPress={handleStopPress} />

          {/* Back button */}
          <View className="absolute top-20 right-4">
            <Pressable
              onPress={() => {
                setShowMap(false);
                setSelectedStop(null);
              }}
              className="bg-white p-3 rounded-full shadow-lg"
            >
              <Text className="text-lg">❌</Text>
            </Pressable>
          </View>

          {/* Selected stop details */}
          {selectedStop && (
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
              <ScrollView className="max-h-48">
                <View className="p-4">
                  <Text className="text-xl font-bold text-blue-600 mb-2">
                    {selectedStop.name}
                  </Text>
                  <Text className="text-sm text-gray-600 mb-3">
                    📍 {selectedStop.lat.toFixed(4)}, {selectedStop.lon.toFixed(4)}
                  </Text>

                  {departuresLoading ? (
                    <Text className="text-gray-500">Chargement des départs...</Text>
                  ) : departures.length > 0 ? (
                    <>
                      <Text className="font-semibold mb-2">
                        Prochains départs:
                      </Text>
                      {departures.map((dep, i) => (
                        <View key={i} className="mb-2 p-2 bg-gray-50 rounded">
                          <Text className="font-medium">
                            {dep.routeShortName} → {dep.headsign}
                          </Text>
                          <Text className="text-sm text-gray-600">
                            {dep.departureTime.toLocaleTimeString()}
                          </Text>
                        </View>
                      ))}
                    </>
                  ) : (
                    <Text className="text-gray-500">
                      Aucun départ prévu pour cet arrêt
                    </Text>
                  )}
                </View>
              </ScrollView>
            </View>
          )}
        </>
      )}
    </View>
  );
}
