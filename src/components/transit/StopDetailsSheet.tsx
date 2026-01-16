/**
 * StopDetailsSheet Component
 * Bottom sheet content for displaying stop details (compact format)
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { Stop, Route } from '../../core/types/models';
import type { NextDeparture } from '../../core/types/adapter';
import { DepartureRow } from './DepartureRow';

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
  if (!stop) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Sélectionnez un arrêt sur la carte</Text>
      </View>
    );
  }

  const hasRealtime = departures.some(d => d.isRealtime);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.stopName} numberOfLines={2}>
            {stop.name}
          </Text>
          <Text style={styles.coordinates}>
            {stop.lat.toFixed(4)}°, {stop.lon.toFixed(4)}°
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Lines Section */}
        {routes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lignes ({routes.length})</Text>
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
              Prochains passages{' '}
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
                  {hasRealtime ? '🔴 Temps réel' : '⏱️ Théorique'}
                </Text>
              </View>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066CC" />
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          ) : departures.length === 0 ? (
            <View style={styles.emptyDeparturesContainer}>
              <Text style={styles.emptyDeparturesIcon}>🚫</Text>
              <Text style={styles.emptyDeparturesText}>
                Aucun passage prévu pour le moment
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
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 12,
    color: '#666',
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
