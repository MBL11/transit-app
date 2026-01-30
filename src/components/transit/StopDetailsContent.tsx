/**
 * Stop Details Content
 * Reusable component for displaying stop details (used in both screen and bottom sheet)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { DepartureRow, type Departure } from './DepartureRow';
import { getStopById, getRoutesByStopId } from '../../core/database';
import type { Stop, Route } from '../../core/types/models';
import { useAdapter } from '../../hooks/useAdapter';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';

interface StopDetailsContentProps {
  stopId: string;
  onLinePress?: (routeId: string) => void;
}

// Mock departures for testing
const getMockDepartures = (): Departure[] => [
  { routeShortName: '35', routeColor: '#0066CC', headsign: 'Konak', departureTime: new Date(Date.now() + 3*60000), isRealtime: false, delay: 0 },
  { routeShortName: '35', routeColor: '#0066CC', headsign: 'Karşıyaka', departureTime: new Date(Date.now() + 7*60000), isRealtime: false, delay: 0 },
  { routeShortName: 'M1', routeColor: '#D61C1F', headsign: 'Fahrettin Altay', departureTime: new Date(Date.now() + 5*60000), isRealtime: false, delay: 0 },
  { routeShortName: 'İZBAN', routeColor: '#005BBB', headsign: 'Aliağa', departureTime: new Date(Date.now() + 12*60000), isRealtime: false, delay: 0 },
];

export function StopDetailsContent({ stopId, onLinePress }: StopDetailsContentProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { adapter } = useAdapter();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    }, 30000);

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
      if (adapter) {
        const departuresData = await adapter.getNextDepartures(stopId);

        // Convert to Departure format
        const formattedDepartures: Departure[] = departuresData.map((dep) => ({
          routeShortName: dep.routeShortName || dep.routeId || 'Unknown',
          routeColor: dep.routeColor || '#CCCCCC',
          routeType: dep.routeType,
          headsign: dep.headsign,
          departureTime: dep.departureTime,
          isRealtime: dep.isRealtime,
          delay: dep.delay,
        }));

        // Use mock data if no real data available (for testing)
        setDepartures(formattedDepartures.length > 0 ? formattedDepartures : getMockDepartures());
      } else {
        setDepartures(getMockDepartures());
      }
    } catch (err) {
      console.error('[StopDetailsContent] Error loading stop data:', err);
      setError(err instanceof Error ? err : new Error(t('transit.loadingError')));
    } finally {
      setLoading(false);
    }
  };

  // Refresh only departures (for pull-to-refresh and auto-refresh)
  const refreshDepartures = async () => {
    if (!adapter) return;
    try {
      // Get departures from adapter (real-time or theoretical)
      const departuresData = await adapter.getNextDepartures(stopId);

      // Convert to Departure format
      const formattedDepartures: Departure[] = departuresData.map((dep) => ({
        routeShortName: dep.routeShortName || dep.routeId || 'Unknown',
        routeColor: dep.routeColor || '#CCCCCC',
        routeType: dep.routeType,
        headsign: dep.headsign,
        departureTime: dep.departureTime,
        isRealtime: dep.isRealtime,
        delay: dep.delay,
      }));

      // Use mock data if no real data available (for testing)
      setDepartures(formattedDepartures.length > 0 ? formattedDepartures : getMockDepartures());
    } catch (err) {
      console.error('[StopDetailsContent] Error refreshing departures:', err);
    }
  };

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshDepartures();
    setRefreshing(false);
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  // Error state
  if (error || !stop) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>{t('transit.loadingError')}</Text>
        <Text style={styles.errorMessage}>
          {error?.message || t('transit.stopNotFound')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
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
                onPress={() => onLinePress?.(route.id)}
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
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
      padding: 20,
      minHeight: 200,
    },
    header: {
      backgroundColor: colors.background,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    stopName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    linesSection: {
      backgroundColor: colors.background,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
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
      backgroundColor: colors.background,
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
      color: colors.textSecondary,
    },
    realtimeBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    realtimeBadgeActive: {
      backgroundColor: colors.isDark ? '#1B4D1B' : '#E8F5E9',
    },
    realtimeBadgeInactive: {
      backgroundColor: colors.backgroundSecondary,
    },
    realtimeBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    emptyContainer: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
    },
    errorIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.error,
      marginBottom: 8,
    },
    errorMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
