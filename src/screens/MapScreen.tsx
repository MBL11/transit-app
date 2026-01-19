/**
 * Map Screen
 * Main screen displaying transit stops on an interactive map with bottom sheet
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TransitMap } from '../components/map';
import { BottomSheet } from '../components/ui/BottomSheet';
import { StopDetailsSheet } from '../components/transit/StopDetailsSheet';
import { AlertBanner } from '../components/transit/AlertBanner';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { useStops, useAlerts } from '../hooks';
import { useAdapter } from '../hooks/useAdapter';
import type { Stop, Route } from '../core/types/models';
import type { NextDeparture } from '../core/types/adapter';
import type { MapStackParamList } from '../navigation/MapStackNavigator';
import * as db from '../core/database';

type Props = NativeStackScreenProps<MapStackParamList, 'MapView'>;

export function MapScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { stops, loading, error } = useStops();
  const { adapter } = useAdapter();
  const { alerts } = useAlerts();
  const [importing, setImporting] = useState(false);

  // Filter severe/warning alerts for badge
  const severeAlerts = alerts.filter(a => a.severity === 'severe' || a.severity === 'warning');

  // Bottom sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [stopRoutes, setStopRoutes] = useState<Route[]>([]);
  const [stopDepartures, setStopDepartures] = useState<NextDeparture[]>([]);
  const [loadingStopData, setLoadingStopData] = useState(false);

  console.log('[MapScreen] Render - stops:', stops.length, 'loading:', loading, 'error:', error);

  // Load stop details when a stop is selected
  useEffect(() => {
    if (selectedStop && adapter) {
      loadStopDetails(selectedStop.id);
    }
  }, [selectedStop, adapter]);

  const loadStopDetails = async (stopId: string) => {
    try {
      setLoadingStopData(true);
      console.log('[MapScreen] Loading details for stop:', stopId);

      // Load routes for this stop
      const routes = await db.getRoutesByStopId(stopId);
      setStopRoutes(routes);

      // Load next departures
      const departures = await adapter!.getNextDepartures(stopId);
      setStopDepartures(departures);

      console.log('[MapScreen] Loaded', routes.length, 'routes and', departures.length, 'departures');
    } catch (err) {
      console.error('[MapScreen] Error loading stop details:', err);
      Alert.alert(t('common.error'), t('common.unableToLoad') + ' ' + t('transit.stopDetails', { defaultValue: 'stop details' }));
    } finally {
      setLoadingStopData(false);
    }
  };

  const handleStopPress = (stop: Stop) => {
    setSelectedStop(stop);
    setSheetVisible(true);
  };

  const handleSheetClose = () => {
    setSheetVisible(false);
    // Clear data after animation
    setTimeout(() => {
      setSelectedStop(null);
      setStopRoutes([]);
      setStopDepartures([]);
    }, 300);
  };

  const handleLinePress = (routeId: string) => {
    // Close sheet and navigate to Lines tab with the selected route
    setSheetVisible(false);
    console.log('[MapScreen] Line pressed:', routeId);
    // TODO: Navigate to Lines tab and show route details
  };

  const handleImportData = async () => {
    try {
      setImporting(true);
      console.log('[MapScreen] Starting data import...');

      // Clear existing data first to remove old timestamps
      db.clearAllData();

      // Generate dynamic times (always in the future)
      const now = new Date();
      const generateFutureTime = (offsetMinutes: number): string => {
        const time = new Date(now.getTime() + offsetMinutes * 60000);
        const hours = time.getHours().toString().padStart(2, '0');
        const minutes = time.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}:00`;
      };

      // Sample GTFS data
      const routes = [
        { id: 'M1', shortName: 'M1', longName: 'Métro 1', type: 1, color: 'FFCD00', textColor: '000000' },
        { id: 'M4', shortName: 'M4', longName: 'Métro 4', type: 1, color: 'BC1A8D', textColor: 'FFFFFF' },
        { id: 'M14', shortName: 'M14', longName: 'Métro 14', type: 1, color: '62259D', textColor: 'FFFFFF' },
        { id: 'B21', shortName: 'B21', longName: 'Bus 21', type: 3, color: '82C8E6', textColor: '000000' },
        { id: 'B38', shortName: 'B38', longName: 'Bus 38', type: 3, color: 'FF7E2E', textColor: '000000' },
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
        { id: 'TRIP004', routeId: 'M4', serviceId: 'WD', headsign: 'Mairie de Montrouge', directionId: 1, shapeId: undefined },
        { id: 'TRIP005', routeId: 'B21', serviceId: 'WD', headsign: 'Gare Saint-Lazare', directionId: 0, shapeId: undefined },
      ];

      // Generate stop times with future timestamps
      const stopTimes = [
        // M1 - Direction Château de Vincennes
        { tripId: 'TRIP001', arrivalTime: generateFutureTime(2), departureTime: generateFutureTime(2), stopId: 'STOP001', stopSequence: 1 },
        { tripId: 'TRIP001', arrivalTime: generateFutureTime(7), departureTime: generateFutureTime(7), stopId: 'STOP002', stopSequence: 2 },
        { tripId: 'TRIP001', arrivalTime: generateFutureTime(12), departureTime: generateFutureTime(12), stopId: 'STOP003', stopSequence: 3 },
        { tripId: 'TRIP001', arrivalTime: generateFutureTime(17), departureTime: generateFutureTime(17), stopId: 'STOP005', stopSequence: 4 },

        // M1 - Direction La Défense
        { tripId: 'TRIP002', arrivalTime: generateFutureTime(5), departureTime: generateFutureTime(5), stopId: 'STOP003', stopSequence: 1 },
        { tripId: 'TRIP002', arrivalTime: generateFutureTime(10), departureTime: generateFutureTime(10), stopId: 'STOP002', stopSequence: 2 },
        { tripId: 'TRIP002', arrivalTime: generateFutureTime(15), departureTime: generateFutureTime(15), stopId: 'STOP001', stopSequence: 3 },

        // M4 - Direction Porte de Clignancourt
        { tripId: 'TRIP003', arrivalTime: generateFutureTime(3), departureTime: generateFutureTime(3), stopId: 'STOP002', stopSequence: 1 },
        { tripId: 'TRIP003', arrivalTime: generateFutureTime(8), departureTime: generateFutureTime(8), stopId: 'STOP005', stopSequence: 2 },
        { tripId: 'TRIP003', arrivalTime: generateFutureTime(13), departureTime: generateFutureTime(13), stopId: 'STOP006', stopSequence: 3 },

        // M4 - Direction Mairie de Montrouge
        { tripId: 'TRIP004', arrivalTime: generateFutureTime(6), departureTime: generateFutureTime(6), stopId: 'STOP006', stopSequence: 1 },
        { tripId: 'TRIP004', arrivalTime: generateFutureTime(11), departureTime: generateFutureTime(11), stopId: 'STOP005', stopSequence: 2 },
        { tripId: 'TRIP004', arrivalTime: generateFutureTime(16), departureTime: generateFutureTime(16), stopId: 'STOP002', stopSequence: 3 },

        // Bus 21
        { tripId: 'TRIP005', arrivalTime: generateFutureTime(4), departureTime: generateFutureTime(4), stopId: 'STOP005', stopSequence: 1 },
        { tripId: 'TRIP005', arrivalTime: generateFutureTime(9), departureTime: generateFutureTime(9), stopId: 'STOP004', stopSequence: 2 },
      ];

      // Import using database functions
      await db.insertRoutes(routes);
      await db.insertStops(stops);
      await db.insertTrips(trips);
      await db.insertStopTimes(stopTimes);

      Alert.alert(t('common.success'), t('common.dataImported'));
      console.log('[MapScreen] Data imported successfully');

      // Reload page
      if (adapter) {
        await adapter.initialize();
      }
    } catch (err) {
      console.error('[MapScreen] Import error:', err);
      Alert.alert(t('common.error'), t('common.importFailed'));
    } finally {
      setImporting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <ScreenContainer edges={[]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>{t('transit.loadingStops')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <ScreenContainer edges={[]}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{t('transit.loadingError')}</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Empty state
  if (stops.length === 0) {
    return (
      <ScreenContainer edges={[]}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyText}>{t('transit.noStopsAvailable')}</Text>
          <TouchableOpacity
            style={styles.importButton}
            onPress={handleImportData}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.importButtonText}>{t('common.importData')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // Map view
  return (
    <ScreenContainer edges={[]}>
      <View style={styles.container}>
        <TransitMap stops={stops} onStopPress={handleStopPress} />

        {/* Floating Header */}
        <View style={[styles.floatingHeader, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.headerTitle}>{t('tabs.map')}</Text>
        </View>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <View style={[styles.alertsContainer, { top: insets.top + 68 }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.alertsContent}
          >
            {alerts.slice(0, 5).map(alert => (
              <View key={alert.id} style={styles.alertItem}>
                <AlertBanner
                  alert={alert}
                  compact
                  onPress={() => navigation.navigate('Alerts')}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Reimport button (floating) */}
      <TouchableOpacity
        style={[styles.reimportButton, { top: insets.top + 68 }]}
        onPress={handleImportData}
        disabled={importing}
      >
        {importing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.reimportButtonText}>🔄</Text>
        )}
      </TouchableOpacity>

      {/* Alerts Badge */}
      {severeAlerts.length > 0 && (
        <TouchableOpacity
          style={[styles.alertsBadge, { top: insets.top + 68 }]}
          onPress={() => navigation.navigate('Alerts')}
        >
          <Text style={styles.alertsBadgeText}>⚠️ {severeAlerts.length}</Text>
        </TouchableOpacity>
      )}

      {/* Bottom Sheet */}
      <BottomSheet
        visible={sheetVisible}
        onClose={handleSheetClose}
        snapPoints={['40%', '70%', '90%']}
      >
        <StopDetailsSheet
          stop={selectedStop}
          routes={stopRoutes}
          departures={stopDepartures}
          loading={loadingStopData}
          onLinePress={handleLinePress}
          onClose={handleSheetClose}
        />
      </BottomSheet>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
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
  reimportButton: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reimportButtonText: {
    fontSize: 24,
  },
  alertsBadge: {
    position: 'absolute',
    right: 72,
    backgroundColor: '#DC143C',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  alertsBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  alertsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  alertsContent: {
    paddingHorizontal: 16,
  },
  alertItem: {
    width: 300,
    marginRight: 12,
  },
});
