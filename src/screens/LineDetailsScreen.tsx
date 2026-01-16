/**
 * Line Details Screen
 * Displays details of a transit line and all its stops
 */

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StopCard } from '../components/transit/StopCard';
import { getRouteById, getStopsByRouteId } from '../core/database';
import type { Route, Stop } from '../core/types/models';
import type { LinesStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<LinesStackParamList, 'LineDetails'>;

// Map GTFS route types to display names
const getRouteTypeLabel = (type: number): string => {
  switch (type) {
    case 0: return 'Tram';
    case 1: return 'Métro';
    case 2: return 'RER';
    case 3: return 'Bus';
    default: return 'Train';
  }
};

export function LineDetailsScreen({ route, navigation }: Props) {
  const { routeId } = route.params;
  const [lineRoute, setLineRoute] = useState<Route | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadLineData();
  }, [routeId]);

  const loadLineData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [routeData, stopsData] = await Promise.all([
        getRouteById(routeId),
        getStopsByRouteId(routeId),
      ]);

      if (!routeData) {
        throw new Error('Ligne non trouvée');
      }

      setLineRoute(routeData);
      setStops(stopsData);
    } catch (err) {
      console.error('[LineDetailsScreen] Error loading line data:', err);
      setError(err instanceof Error ? err : new Error('Erreur de chargement'));
    } finally {
      setLoading(false);
    }
  };

  const handleStopPress = (stop: Stop) => {
    navigation.navigate('StopDetails', { stopId: stop.id });
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
  if (error || !lineRoute) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Erreur de chargement</Text>
        <Text style={styles.errorMessage}>
          {error?.message || 'Ligne non trouvée'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with line badge */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* Line badge */}
          <View style={[styles.lineBadge, { backgroundColor: lineRoute.color }]}>
            <Text style={[styles.lineBadgeText, { color: lineRoute.textColor }]}>
              {lineRoute.shortName}
            </Text>
          </View>

          {/* Line info */}
          <View style={styles.lineInfo}>
            <Text style={styles.lineName}>{lineRoute.longName}</Text>
            <Text style={styles.lineType}>{getRouteTypeLabel(lineRoute.type)}</Text>
          </View>
        </View>
      </View>

      {/* Stops section */}
      <View style={styles.stopsSection}>
        <Text style={styles.sectionTitle}>
          Arrêts desservis : <Text style={styles.stopCount}>({stops.length})</Text>
        </Text>

        {stops.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun arrêt trouvé</Text>
          </View>
        ) : (
          <FlatList
            data={stops}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <StopCard
                stopName={item.name}
                lines={[lineRoute.shortName]}
                onPress={() => handleStopPress(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineBadge: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineBadgeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  lineInfo: {
    flex: 1,
    marginLeft: 16,
  },
  lineName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
  },
  lineType: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  stopsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  stopCount: {
    fontWeight: 'normal',
    color: '#666',
  },
  listContent: {
    padding: 12,
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
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
