/**
 * Stop Details Screen
 * Displays stop information and next departures
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { BannerAdComponent } from '../components/ads/BannerAd';
import { DepartureRow, type Departure } from '../components/transit/DepartureRow';
import { useNetwork } from '../contexts/NetworkContext';
import { getStopById, getRoutesByStopId, getNextDepartures, type TheoreticalDeparture } from '../core/database';
import type { Stop, Route } from '../core/types/models';
import type { LinesStackParamList } from '../navigation/types';
import { parisAdapter } from '../adapters/paris/paris-adapter';

type Props = NativeStackScreenProps<LinesStackParamList, 'StopDetails'>;

// Mock departures for testing
const getMockDepartures = (): Departure[] => [
  { routeShortName: '1', routeColor: '#FFCD00', headsign: 'La Défense', departureTime: new Date(Date.now() + 3*60000), isRealtime: false, delay: 0 },
  { routeShortName: '1', routeColor: '#FFCD00', headsign: 'Château de Vincennes', departureTime: new Date(Date.now() + 7*60000), isRealtime: false, delay: 0 },
  { routeShortName: '4', routeColor: '#A0006E', headsign: 'Porte de Clignancourt', departureTime: new Date(Date.now() + 5*60000), isRealtime: false, delay: 0 },
  { routeShortName: '14', routeColor: '#62259D', headsign: 'Olympiades', departureTime: new Date(Date.now() + 12*60000), isRealtime: false, delay: 0 },
];

export function StopDetailsScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { stopId } = route.params;
  const { isOffline } = useNetwork();
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

      const [stopData, routesData] = await Promise.all([
        getStopById(stopId),
        getRoutesByStopId(stopId),
      ]);

      if (!stopData) {
        throw new Error(t('transit.stopNotFound'));
      }

      setStop(stopData);
      setRoutes(routesData);

      // Get departures from adapter (real-time or theoretical)
      const departuresData = await parisAdapter.getNextDepartures(stopId);

      // Convert to Departure format
      const formattedDepartures: Departure[] = departuresData.map((dep) => ({
        routeShortName: dep.routeShortName,
        routeColor: dep.routeColor || '#CCCCCC',
        headsign: dep.headsign,
        departureTime: dep.departureTime,
        isRealtime: dep.isRealtime,
        delay: dep.delay,
      }));

      // Use mock data if no real data available (for testing)
      setDepartures(formattedDepartures.length > 0 ? formattedDepartures : getMockDepartures());
    } catch (err) {
      console.error('[StopDetailsScreen] Error loading stop data:', err);
      setError(err instanceof Error ? err : new Error(t('transit.loadingError')));
    } finally {
      setLoading(false);
    }
  };

  // Refresh only departures (for pull-to-refresh and auto-refresh)
  const refreshDepartures = async () => {
    try {
      // Get departures from adapter (real-time or theoretical)
      const departuresData = await parisAdapter.getNextDepartures(stopId);

      // Convert to Departure format
      const formattedDepartures: Departure[] = departuresData.map((dep) => ({
        routeShortName: dep.routeShortName,
        routeColor: dep.routeColor || '#CCCCCC',
        headsign: dep.headsign,
        departureTime: dep.departureTime,
        isRealtime: dep.isRealtime,
        delay: dep.delay,
      }));

      // Use mock data if no real data available (for testing)
      setDepartures(formattedDepartures.length > 0 ? formattedDepartures : getMockDepartures());
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
      <ScreenContainer>
        <ScreenHeader title={t('common.loading')} showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Error state
  if (error || !stop) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('transit.stops')} showBack />
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{t('transit.loadingError')}</Text>
          <Text style={styles.errorMessage}>
            {error?.message || t('transit.stopNotFound')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader title={stop.name} showBack />
      <OfflineBanner visible={isOffline} />
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
        </View>

        {/* Lines serving this stop */}
        {routes.length > 0 && (
          <View style={styles.linesSection}>
            <Text style={styles.sectionTitle}>{t('transit.linesServing')}</Text>
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
            <View style={styles.titleRow}>
              <Text style={styles.sectionTitle}>
                {t('transit.nextDepartures')} <Text style={styles.departureCount}>({departures.length})</Text>
              </Text>
              {departures.length > 0 && (
                <View style={[
                  styles.realtimeBadge,
                  departures.some(d => d.isRealtime) ? styles.realtimeBadgeActive : styles.realtimeBadgeInactive
                ]}>
                  <Text style={styles.realtimeBadgeText}>
                    {departures.some(d => d.isRealtime) ? `🔴 ${t('transit.realtime')}` : `⏱️ ${t('transit.theoretical')}`}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {departures.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('transit.noDepartures')}</Text>
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

      {/* Banner Ad */}
      <BannerAdComponent />
      </View>
    </ScreenContainer>
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  departureCount: {
    fontWeight: 'normal',
    color: '#666',
  },
  realtimeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  realtimeBadgeActive: {
    backgroundColor: '#E8F5E9',
  },
  realtimeBadgeInactive: {
    backgroundColor: '#F5F5F5',
  },
  realtimeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111',
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
