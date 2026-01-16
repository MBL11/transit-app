/**
 * Map Screen
 * Main screen displaying transit stops on an interactive map
 */

import React, { useState } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { TransitMap } from '../components/map';
import { useStops } from '../hooks';
import { useAdapter } from '../hooks/useAdapter';
import type { Stop } from '../core/types/models';
import * as db from '../core/database';

export function MapScreen() {
  const { stops, loading, error } = useStops();
  const { adapter } = useAdapter();
  const [importing, setImporting] = useState(false);

  console.log('[MapScreen] Render - stops:', stops.length, 'loading:', loading, 'error:', error);

  const handleStopPress = (stop: Stop) => {
    Alert.alert(
      stop.name,
      `Latitude: ${stop.lat.toFixed(4)}\nLongitude: ${stop.lon.toFixed(4)}`,
      [{ text: 'OK' }]
    );
  };

  const handleImportData = async () => {
    try {
      setImporting(true);
      console.log('[MapScreen] Starting data import...');

      // Sample GTFS data
      const routes = [
        { id: 'M1', shortName: 'M1', longName: 'Métro 1', type: 1, color: '#FFCD00', textColor: '#000000' },
        { id: 'M4', shortName: 'M4', longName: 'Métro 4', type: 1, color: '#BC1A8D', textColor: '#FFFFFF' },
        { id: 'M14', shortName: 'M14', longName: 'Métro 14', type: 1, color: '#62259D', textColor: '#FFFFFF' },
        { id: 'B21', shortName: 'B21', longName: 'Bus 21', type: 3, color: '#82C8E6', textColor: '#000000' },
        { id: 'B38', shortName: 'B38', longName: 'Bus 38', type: 3, color: '#FF7E2E', textColor: '#000000' },
      ];

      const stops = [
        { id: 'STOP001', name: 'La Défense', lat: 48.8920, lon: 2.2380, locationType: 0, parentStation: undefined },
        { id: 'STOP002', name: 'Châtelet', lat: 48.8583, lon: 2.3470, locationType: 0, parentStation: undefined },
        { id: 'STOP003', name: 'Gare de Lyon', lat: 48.8444, lon: 2.3739, locationType: 0, parentStation: undefined },
        { id: 'STOP004', name: 'Saint-Lazare', lat: 48.8760, lon: 2.3260, locationType: 0, parentStation: undefined },
        { id: 'STOP005', name: 'République', lat: 48.8674, lon: 2.3637, locationType: 0, parentStation: undefined },
        { id: 'STOP006', name: 'Bastille', lat: 48.8530, lon: 2.3690, locationType: 0, parentStation: undefined },
        { id: 'STOP007', name: 'Nation', lat: 48.8480, lon: 2.3960, locationType: 0, parentStation: undefined },
      ];

      const trips = [
        { id: 'TRIP001', routeId: 'M1', serviceId: 'WD', headsign: 'Château de Vincennes', directionId: 0, shapeId: undefined },
        { id: 'TRIP002', routeId: 'M1', serviceId: 'WD', headsign: 'La Défense', directionId: 1, shapeId: undefined },
        { id: 'TRIP003', routeId: 'M4', serviceId: 'WD', headsign: 'Porte de Clignancourt', directionId: 0, shapeId: undefined },
        { id: 'TRIP004', routeId: 'B21', serviceId: 'WD', headsign: 'Gare Saint-Lazare', directionId: 0, shapeId: undefined },
      ];

      const stopTimes = [
        { tripId: 'TRIP001', arrivalTime: '08:30:00', departureTime: '08:30:00', stopId: 'STOP001', stopSequence: 1 },
        { tripId: 'TRIP001', arrivalTime: '08:45:00', departureTime: '08:45:00', stopId: 'STOP002', stopSequence: 2 },
        { tripId: 'TRIP001', arrivalTime: '09:00:00', departureTime: '09:00:00', stopId: 'STOP003', stopSequence: 3 },
        { tripId: 'TRIP002', arrivalTime: '10:00:00', departureTime: '10:00:00', stopId: 'STOP003', stopSequence: 1 },
        { tripId: 'TRIP002', arrivalTime: '10:15:00', departureTime: '10:15:00', stopId: 'STOP001', stopSequence: 2 },
      ];

      // Import using database functions
      await db.insertRoutes(routes);
      await db.insertStops(stops);
      await db.insertTrips(trips);
      await db.insertStopTimes(stopTimes);

      Alert.alert('Succès', 'Données importées avec succès!');
      console.log('[MapScreen] Data imported successfully');

      // Reload page
      if (adapter) {
        await adapter.initialize();
      }
    } catch (err) {
      console.error('[MapScreen] Import error:', err);
      Alert.alert('Erreur', 'Échec de l\'import des données');
    } finally {
      setImporting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement des arrêts...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Erreur de chargement</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
      </View>
    );
  }

  // Empty state
  if (stops.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyText}>Aucun arrêt disponible</Text>
        <TouchableOpacity
          style={styles.importButton}
          onPress={handleImportData}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.importButtonText}>Importer les données</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Map view
  return (
    <View style={styles.container}>
      <TransitMap stops={stops} onStopPress={handleStopPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#CC0000',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  importButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
