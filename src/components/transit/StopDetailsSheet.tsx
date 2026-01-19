/**
 * StopDetailsSheet Component
 * Bottom sheet content for displaying stop details (compact format)
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { Stop, Route } from '../../core/types/models';
import type { NextDeparture } from '../../core/types/adapter';
import { DepartureRow } from './DepartureRow';
import { AlertBanner } from './AlertBanner';
import { useAlerts, useFavorites } from '../../hooks';
import { isStopAffected, isRouteAffected } from '../../adapters/paris/alerts';
import { useTranslation } from 'react-i18next';

interface StopDetailsSheetProps {
  stop: Stop | null;
  routes: Route[];
  departures: NextDeparture[];
  loading: boolean;
  onLinePress: (routeId: string) => void;
  onClose: () => void;
}

export function StopDetailsSheet({
  stop,
  routes,
  departures,
  loading,
  onLinePress,
  onClose,
}: StopDetailsSheetProps) {
  const { t } = useTranslation();
  const { alerts } = useAlerts();
  const { isFavorite, toggleStop } = useFavorites();

  if (!stop) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('common.selectStopOnMap')}</Text>
      </View>
    );
  }

  const hasRealtime = departures.some(d => d.isRealtime);

  // Find alerts affecting this stop or its routes
  const relevantAlerts = alerts.filter(alert => {
    const affectsStop = isStopAffected(stop.id, [alert]);
    const affectsRoutes = routes.some(route => isRouteAffected(route.id, [alert]));
    return affectsStop || affectsRoutes;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.stopName} numberOfLines={2}>
            {stop.name}
          </Text>
          {/* Lines serving this stop */}
          {routes.length > 0 && (
            <View style={styles.headerLinesContainer}>
              {routes.slice(0, 6).map((route) => (
                <View
                  key={route.id}
                  style={[
                    styles.headerLineBadge,
                    { backgroundColor: `#${route.color}` },
                  ]}
                >
                  <Text
                    style={[
                      styles.headerLineBadgeText,
                      { color: `#${route.textColor || 'FFFFFF'}` },
                    ]}
                  >
                    {route.shortName}
                  </Text>
                </View>
              ))}
              {routes.length > 6 && (
                <Text style={styles.moreLines}>+{routes.length - 6}</Text>
              )}
            </View>
          )}
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => toggleStop(stop)}
            style={styles.favoriteButton}
          >
            <Text style={styles.favoriteButtonText}>
              {isFavorite(stop.id, 'stop') ? '⭐' : '☆'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Alerts Section */}
        {relevantAlerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ {t('alerts.title')} ({relevantAlerts.length})</Text>
            {relevantAlerts.map(alert => (
              <AlertBanner key={alert.id} alert={alert} compact />
            ))}
          </View>
        )}

        {/* Lines Section */}
        {routes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('transit.lines')} ({routes.length})</Text>
            <View style={styles.linesContainer}>
              {routes.map((route) => (
                <TouchableOpacity
                  key={route.id}
                  style={[
                    styles.lineBadge,
                    { backgroundColor: `#${route.color}` },
                  ]}
                  onPress={() => onLinePress(route.id)}
                >
                  <Text
                    style={[
                      styles.lineBadgeText,
                      { color: `#${route.textColor || 'FFFFFF'}` },
                    ]}
                  >
                    {route.shortName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Departures Section */}
        <View style={styles.section}>
          <View style={styles.departuresHeader}>
            <Text style={styles.sectionTitle}>
              {t('transit.nextDepartures')}{' '}
              <Text style={styles.departureCount}>({departures.length})</Text>
            </Text>
            {departures.length > 0 && (
              <View
                style={[
                  styles.realtimeBadge,
                  hasRealtime
                    ? styles.realtimeBadgeActive
                    : styles.realtimeBadgeInactive,
                ]}
              >
                <Text style={styles.realtimeBadgeText}>
                  {hasRealtime ? `🔴 ${t('transit.realtime')}` : `⏱️ ${t('transit.theoretical')}`}
                </Text>
              </View>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066CC" />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          ) : departures.length === 0 ? (
            <View style={styles.emptyDeparturesContainer}>
              <Text style={styles.emptyDeparturesIcon}>🚫</Text>
              <Text style={styles.emptyDeparturesText}>
                {t('transit.noDepartures')}
              </Text>
            </View>
          ) : (
            <View style={styles.departuresList}>
              {departures.map((departure, index) => (
                <DepartureRow
                  key={`${departure.tripId}-${index}`}
                  departure={departure}
                  onPress={() => onLinePress(departure.routeId)}
                />
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  stopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  headerLinesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  headerLineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 36,
    alignItems: 'center',
  },
  headerLineBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  moreLines: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButtonText: {
    fontSize: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  departureCount: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#666',
  },
  linesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lineBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 48,
    alignItems: 'center',
  },
  lineBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  departuresHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  realtimeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  realtimeBadgeActive: {
    backgroundColor: '#FFE5E5',
  },
  realtimeBadgeInactive: {
    backgroundColor: '#F0F0F0',
  },
  realtimeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyDeparturesContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyDeparturesIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyDeparturesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  departuresList: {
    gap: 8,
    paddingBottom: 20,
  },
});
