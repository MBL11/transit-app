/**
 * Stop Details Screen
 * Displays stop information and next departures
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DepartureRow, type Departure } from '../components/transit/DepartureRow';
import { getStopById, getRoutesByStopId, getNextDepartures, type TheoreticalDeparture } from '../core/database';
import type { Stop, Route } from '../core/types/models';
import type { LinesStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<LinesStackParamList, 'StopDetails'>;

export function StopDetailsScreen({ route, navigation }: Props) {
  const { stopId } = route.params;
  const [stop, setStop] = useState<Stop | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initial load
  useEffect(() => {
    loadStopData();
  }, [stopId]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshDepartures();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [stopId]);

  const loadStopData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [stopData, routesData, departuresData] = await Promise.all([
        getStopById(stopId),
        getRoutesByStopId(stopId),
        getNextDepartures(stopId, 20),
      ]);

      if (!stopData) {
        throw new Error('Arrêt non trouvé');
      }

      setStop(stopData);
      setRoutes(routesData);

      // Convert TheoreticalDeparture to Departure (add isRealtime and delay)
      const formattedDepartures: Departure[] = departuresData.map((dep: TheoreticalDeparture) => ({
        ...dep,
        isRealtime: false, // Theoretical data for now
        delay: 0, // No delays in theoretical data
      }));

      setDepartures(formattedDepartures);
    } catch (err) {
      console.error('[StopDetailsScreen] Error loading stop data:', err);
      setError(err instanceof Error ? err : new Error('Erreur de chargement'));
    } finally {
      setLoading(false);
    }
  };

  // Refresh only departures (for pull-to-refresh and auto-refresh)
  const refreshDepartures = async () => {
    try {
      const departuresData = await getNextDepartures(stopId, 20);

      const formattedDepartures: Departure[] = departuresData.map((dep: TheoreticalDeparture) => ({
        ...dep,
        isRealtime: false,
        delay: 0,
      }));

      setDepartures(formattedDepartures);
    } catch (err) {
      console.error('[StopDetailsScreen] Error refreshing departures:', err);
    }
  };

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDepartures();
    setRefreshing(false);
  }, [stopId]);

  // Navigate to line details
  const handleLinePress = (routeId: string) => {
    navigation.navigate('LineDetails', { routeId });
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  // Error state
  if (error || !stop) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Erreur de chargement</Text>
        <Text style={styles.errorMessage}>
          {error?.message || 'Arrêt non trouvé'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0066CC']}
            tintColor="#0066CC"
          />
        }
      >
        {/* Stop header */}
        <View style={styles.header}>
          <Text style={styles.stopName}>{stop.name}</Text>
          <Text style={styles.coordinates}>
            {stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
          </Text>
        </View>

        {/* Lines serving this stop */}
        {routes.length > 0 && (
          <View style={styles.linesSection}>
            <Text style={styles.sectionTitle}>Lignes desservant cet arrêt</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.linesBadgeContainer}
            >
              {routes.map((route) => (
                <Pressable
                  key={route.id}
                  onPress={() => handleLinePress(route.id)}
                  style={({ pressed }) => [
                    styles.lineBadge,
                    { backgroundColor: route.color },
                    pressed && styles.lineBadgePressed,
                  ]}
                >
                  <Text style={[styles.lineBadgeText, { color: route.textColor }]}>
                    {route.shortName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Next departures section */}
        <View style={styles.departuresSection}>
          <View style={styles.departureSectionHeader}>
            <Text style={styles.sectionTitle}>
              Prochains passages <Text style={styles.departureCount}>({departures.length})</Text>
            </Text>
          </View>

          {departures.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun passage prévu</Text>
            </View>
          ) : (
            <View>
              {departures.map((departure, index) => (
                <DepartureRow key={`${departure.routeShortName}-${index}`} departure={departure} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  stopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
  },
  coordinates: {
    fontSize: 13,
    color: '#999',
    marginTop: 6,
  },
  linesSection: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
  },
  linesBadgeContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  lineBadge: {
    minWidth: 48,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  lineBadgePressed: {
    opacity: 0.7,
  },
  lineBadgeText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  departureSectionHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  departuresSection: {
    backgroundColor: 'white',
    marginTop: 8,
    minHeight: 200,
  },
  departureCount: {
    fontWeight: 'normal',
    color: '#666',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
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
});
