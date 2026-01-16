/**
 * Stop Details Screen
 * Displays stop information and next departures
 */

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DepartureRow, type Departure } from '../components/transit/DepartureRow';
import { getStopById, getRoutesByStopId, getNextDepartures, type TheoreticalDeparture } from '../core/database';
import type { Stop, Route } from '../core/types/models';
import type { LinesStackParamList } from '../navigation/LinesStackNavigator';

type Props = NativeStackScreenProps<LinesStackParamList, 'StopDetails'>;

export function StopDetailsScreen({ route, navigation }: Props) {
  const { stopId } = route.params;
  const [stop, setStop] = useState<Stop | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadStopData();
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
      {/* Stop header */}
      <View style={styles.header}>
        <Text style={styles.stopName}>{stop.name}</Text>
        <Text style={styles.stopId}>ID: {stop.id}</Text>
      </View>

      {/* Lines serving this stop */}
      {routes.length > 0 && (
        <View style={styles.linesSection}>
          <Text style={styles.sectionTitle}>Lignes desservies</Text>
          <View style={styles.linesBadgeContainer}>
            {routes.map((route) => (
              <View
                key={route.id}
                style={[styles.lineBadge, { backgroundColor: route.color }]}
              >
                <Text style={[styles.lineBadgeText, { color: route.textColor }]}>
                  {route.shortName}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Next departures section */}
      <View style={styles.departuresSection}>
        <Text style={styles.sectionTitle}>
          Prochains passages <Text style={styles.departureCount}>({departures.length})</Text>
        </Text>

        {departures.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun passage prévu</Text>
          </View>
        ) : (
          <FlatList
            data={departures}
            keyExtractor={(item, index) => `${item.routeShortName}-${index}`}
            renderItem={({ item }) => <DepartureRow departure={item} />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
  },
  stopId: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
    flexWrap: 'wrap',
    gap: 8,
  },
  lineBadge: {
    minWidth: 48,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  lineBadgeText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  departuresSection: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 8,
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
