/**
 * Map Screen
 * Main screen displaying transit stops on an interactive map
 */

import React, { useState } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, Pressable } from 'react-native';
import { TransitMap } from '../components/map';
import { useStops, useAdapter } from '../hooks';
import { importGTFSData } from '../core/gtfs-importer';
import { SAMPLE_GTFS_DATA } from '../components/MapTest';
import type { Stop } from '../core/types/models';

export function MapScreen() {
  const { stops, loading, error, refresh } = useStops();
  const { adapter } = useAdapter();
  const [importing, setImporting] = useState(false);

  const handleStopPress = (stop: Stop) => {
    Alert.alert(
      stop.name,
      `Latitude: ${stop.lat.toFixed(4)}\nLongitude: ${stop.lon.toFixed(4)}`,
      [{ text: 'OK' }]
    );
  };

  const handleImport = async () => {
    if (!adapter) return;

    try {
      setImporting(true);
      await importGTFSData(SAMPLE_GTFS_DATA, adapter);
      await refresh();
      Alert.alert('Succès', 'Données réimportées avec succès');
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Erreur lors de l\'import');
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
      </View>
    );
  }

  // Map view
  return (
    <View style={styles.container}>
      <TransitMap stops={stops} onStopPress={handleStopPress} />

      {/* Temporary: Reimport button */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.importButton, importing && styles.importButtonDisabled]}
          onPress={handleImport}
          disabled={importing}
        >
          <Text style={styles.importButtonText}>
            {importing ? '⏳ Import...' : '🔄 Réimporter données'}
          </Text>
        </Pressable>
      </View>
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
  buttonContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
  },
  importButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  importButtonDisabled: {
    backgroundColor: '#999',
  },
  importButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
