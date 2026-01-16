/**
 * Map Screen
 * Main screen displaying transit stops on an interactive map
 */

import React from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { TransitMap } from '../components/map';
import { useStops } from '../hooks';
import type { Stop } from '../core/types/models';

export function MapScreen() {
  const { stops, loading, error } = useStops();

  const handleStopPress = (stop: Stop) => {
    Alert.alert(
      stop.name,
      `Latitude: ${stop.lat.toFixed(4)}\nLongitude: ${stop.lon.toFixed(4)}`,
      [{ text: 'OK' }]
    );
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
  },
});
