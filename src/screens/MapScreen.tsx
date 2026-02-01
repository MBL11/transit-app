/**
 * Map Screen
 * Main screen displaying transit stops on an interactive map with bottom sheet
 * Optimized to load only stops around user's location for better performance
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Region } from 'react-native-maps';
import { TransitMap, TransitMapRef } from '../components/map';
import { MapLegend } from '../components/map/MapLegend';
import { BottomSheet } from '../components/ui/BottomSheet';
import { StopDetailsSheet } from '../components/transit/StopDetailsSheet';
import { AlertBanner } from '../components/transit/AlertBanner';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { BannerAdComponent } from '../components/ads/BannerAd';
import { useAlerts } from '../hooks';
import { useAdapter } from '../hooks/useAdapter';
import { useLocation } from '../hooks/useLocation';
import { useNetwork } from '../contexts/NetworkContext';
import { findNearbyStops, NearbyStop } from '../core/nearby-stops';
import type { Stop, Route } from '../core/types/models';
import type { NextDeparture } from '../core/types/adapter';
import type { MapStackParamList } from '../navigation/MapStackNavigator';
import * as db from '../core/database';
import { detectTransitType, transitTypeToRouteType } from '../utils/transport-detection';
import { logger } from '../utils/logger';
import { trackEvent, AnalyticsEvents } from '../services/analytics';
import { captureException } from '../services/crash-reporting';

// Note: İzmir rail/tram/ferry has ~50 stops - loaded all at once. Bus stops (11K+) are excluded from map.

type Props = NativeStackScreenProps<MapStackParamList, 'MapView'>;

export function MapScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Geolocation
  const { location, isLoading: locationLoading, permissionGranted, getCurrentLocation, requestPermission } = useLocation();

  const { adapter, loading: adapterLoading } = useAdapter();

  const { alerts } = useAlerts();

  const { isOffline } = useNetwork();

  // Local state for non-bus stops (rail/tram/ferry ~50 stops, bus excluded from map)
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
  const [stopRouteTypesMap, setStopRouteTypesMap] = useState<Map<string, number[]>>(new Map());
  const [stopRouteColorsMap, setStopRouteColorsMap] = useState<Map<string, string[]>>(new Map());
  const [underConstructionStops, setUnderConstructionStops] = useState<Set<string>>(new Set());
  const [loadingStops, setLoadingStops] = useState(true);
  const [stopsError, setStopsError] = useState<Error | null>(null);
  const [importing, setImporting] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  // Track current map region
  const currentRegionRef = useRef<Region | null>(null);
  const loadingRegionRef = useRef(false);

  // Ref to the map for animation
  const mapRef = useRef<TransitMapRef>(null);

  // Filter severe/warning alerts for badge (memoized to prevent unnecessary re-renders)
  const severeAlerts = useMemo(() =>
    alerts.filter(a => a.severity === 'severe' || a.severity === 'warning'),
    [alerts]
  );

  // Reset dismissed state when alerts change (new alerts should be shown)
  useEffect(() => {
    if (alerts.length > 0) {
      setAlertsDismissed(false);
    }
  }, [alerts.length]);

  // Alerts dismissed by user (resets when alerts change)
  const [alertsDismissed, setAlertsDismissed] = useState(false);

  // Bottom sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [stopRoutes, setStopRoutes] = useState<Route[]>([]);
  const [stopDepartures, setStopDepartures] = useState<NextDeparture[]>([]);
  const [loadingStopData, setLoadingStopData] = useState(false);

  // Load non-bus stops (rail/tram/ferry only, bus stops excluded to avoid 11K+ markers)
  const loadAllStops = useCallback(async () => {
    if (loadingRegionRef.current) {
      logger.log('[MapScreen] Already loading stops, skipping...');
      return;
    }

    try {
      loadingRegionRef.current = true;
      setLoadingStops(true);
      setStopsError(null);

      logger.log('[MapScreen] Loading all stops...');

      // Load all stops from database (exclude bus stops to avoid 11K+ markers crashing the map)
      const allStops = await db.getAllStops();
      const nonBusStops = allStops.filter(s => !s.id.startsWith('bus_'));

      // Convert to NearbyStop format (with distance = 0 since we're loading all)
      const stopsWithDistance: NearbyStop[] = nonBusStops.map(stop => ({
        ...stop,
        distance: 0,
      }));

      logger.log(`[MapScreen] Loaded ${stopsWithDistance.length} stops (excluded ${allStops.length - nonBusStops.length} bus stops)`);
      setNearbyStops(stopsWithDistance);

      // Load route types for map stops (for transport type icons on markers)
      if (nonBusStops.length > 0) {
        try {
          const stopIds = nonBusStops.map(s => s.id);
          const routesByStop = await db.getRoutesByStopIds(stopIds);

          // Convert to Map of stopId -> detected route types array (as GTFS numeric types)
          // Also build parallel colors map for per-line colors (e.g. T1 green, T2 orange, T3 purple)
          const routeTypesMap = new Map<string, number[]>();
          const routeColorsMap = new Map<string, string[]>();
          routesByStop.forEach((routes, stopId) => {
            routeTypesMap.set(
              stopId,
              routes.map(r => transitTypeToRouteType(
                detectTransitType(r.type, r.shortName, r.longName)
              ))
            );
            routeColorsMap.set(
              stopId,
              routes.map(r => r.color || '')
            );
          });

          // Robust ferry detection: use trip_id prefix to find ferry stops directly
          // During import, ferry trips get 'ferry_' prefix, so we can query stop_times
          // This is more reliable than name-based matching or JOIN chain
          const ferryStopIds = db.getStopIdsByTripPrefix('ferry_');
          if (ferryStopIds.size > 0) {
            let ferryAdded = 0;
            for (const stopId of ferryStopIds) {
              if (!routeTypesMap.has(stopId)) {
                routeTypesMap.set(stopId, [4]); // 4 = ferry
                ferryAdded++;
              } else {
                // Stop already has types (e.g., metro + ferry interchange) - add ferry if not present
                const existing = routeTypesMap.get(stopId)!;
                if (!existing.includes(4)) {
                  existing.push(4);
                  ferryAdded++;
                }
              }
            }
            logger.log(`[MapScreen] Ferry prefix detection: ${ferryStopIds.size} ferry stops found, ${ferryAdded} icons added`);
          }

          // Prefix-based fallback: detect transport type from stop ID prefix
          // Handles stops with incomplete stop_times data (e.g., Metro Narlıdere extension stops 18-24)
          // After import, all stop IDs are prefixed: metro_, tram_, rail_, ferry_
          const PREFIX_TYPE_MAP: Record<string, number> = {
            'metro_': 1,  // Metro → route_type 1
            'tram_': 0,   // Tram → route_type 0
            'rail_': 2,   // İZBAN → route_type 2
            'ferry_': 4,  // Ferry → route_type 4
          };
          let prefixFallbackCount = 0;
          const constructionStopIds = new Set<string>();
          for (const stop of nonBusStops) {
            if (!routeTypesMap.has(stop.id)) {
              for (const [prefix, routeType] of Object.entries(PREFIX_TYPE_MAP)) {
                if (stop.id.startsWith(prefix)) {
                  routeTypesMap.set(stop.id, [routeType]);
                  // Stops with no stop_times are under construction / not yet in service
                  constructionStopIds.add(stop.id);
                  prefixFallbackCount++;
                  break;
                }
              }
            }
          }
          if (prefixFallbackCount > 0) {
            logger.log(`[MapScreen] Prefix fallback: ${prefixFallbackCount} stops marked as under construction`);
          }
          setUnderConstructionStops(constructionStopIds);

          // Secondary fallback: detect ferry stops by name keywords (for any stops still missed)
          const FERRY_STOP_KEYWORDS = ['İSKELE', 'ISKELE', 'VAPUR', 'FERİBOT', 'FERIBOT', 'İZDENİZ', 'IZDENIZ'];
          for (const stop of nonBusStops) {
            if (!routeTypesMap.has(stop.id)) {
              const upperName = stop.name.toUpperCase();
              if (FERRY_STOP_KEYWORDS.some(kw => upperName.includes(kw))) {
                routeTypesMap.set(stop.id, [4]); // 4 = ferry
                logger.log(`[MapScreen] Ferry name fallback: "${stop.name}" detected as ferry`);
              }
            }
          }

          logger.log(`[MapScreen] Loaded route types for ${routeTypesMap.size} stops`);
          setStopRouteTypesMap(routeTypesMap);
          setStopRouteColorsMap(routeColorsMap);
        } catch (err) {
          logger.warn('[MapScreen] Failed to load route types (non-critical):', err);
          // Non-critical error - markers will show default icons
        }
      }
    } catch (err) {
      logger.error('[MapScreen] Failed to load stops:', err);
      captureException(err, { tags: { screen: 'map', action: 'load_stops' } });
      setStopsError(err instanceof Error ? err : new Error('Failed to load stops'));
    } finally {
      setLoadingStops(false);
      loadingRegionRef.current = false;
    }
  }, []);

  // Initial load - load ALL stops once (İzmir has ~50 stops only)
  useEffect(() => {
    const initLocation = async () => {
      logger.log('[MapScreen] Initializing...');

      // Load all stops immediately
      await loadAllStops();

      // If permission not granted, show prompt
      if (!permissionGranted) {
        logger.log('[MapScreen] Location permission not granted, showing prompt');
        setShowLocationPrompt(true);
        return;
      }

      // Get current location and animate to it
      const userLocation = await getCurrentLocation();
      if (userLocation) {
        logger.log('[MapScreen] Got user location:', userLocation.latitude, userLocation.longitude);
        // Animate map to user location with a small delay to ensure map is mounted
        setTimeout(() => {
          mapRef.current?.animateToLocation(userLocation.latitude, userLocation.longitude, 1000);
        }, 100);
      }
    };

    if (!adapterLoading) {
      initLocation();
    }
  }, [adapterLoading, permissionGranted, loadAllStops]);

  // Handle location permission request
  const handleEnableLocation = useCallback(async () => {
    setShowLocationPrompt(false);
    const granted = await requestPermission();
    if (granted) {
      const userLocation = await getCurrentLocation();
      if (userLocation) {
        // Animate map to user location
        mapRef.current?.animateToLocation(userLocation.latitude, userLocation.longitude, 1000);
      }
    }
  }, [requestPermission, getCurrentLocation]);

  // Handle map region change - just track the region, no reload needed
  // (we load all stops once since İzmir has only ~50 stops)
  const handleRegionChangeComplete = useCallback((region: Region) => {
    currentRegionRef.current = region;
  }, []);

  // Load stop details when a stop is selected
  useEffect(() => {
    if (selectedStop && adapter) {
      loadStopDetails(selectedStop.id);
    }
  }, [selectedStop, adapter]);

  const loadStopDetails = async (stopId: string) => {
    try {
      setLoadingStopData(true);
      logger.log('[MapScreen] Loading details for stop:', stopId);

      // Load routes for this stop
      const routes = await db.getRoutesByStopId(stopId);
      setStopRoutes(routes);

      // Load next departures
      const departures = await adapter!.getNextDepartures(stopId);
      setStopDepartures(departures);

      logger.log('[MapScreen] Loaded', routes.length, 'routes and', departures.length, 'departures');
    } catch (err) {
      logger.error('[MapScreen] Error loading stop details:', err);
      captureException(err, { tags: { screen: 'map', action: 'load_stop_details' } });
      Alert.alert(t('common.error'), t('common.unableToLoad') + ' ' + t('transit.stopDetails', { defaultValue: 'stop details' }));
    } finally {
      setLoadingStopData(false);
    }
  };

  const handleStopPress = useCallback((stop: Stop) => {
    setSelectedStop(stop);
    setSheetVisible(true);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSheetVisible(false);
    // Clear data after animation
    setTimeout(() => {
      setSelectedStop(null);
      setStopRoutes([]);
      setStopDepartures([]);
    }, 300);
  }, []);

  const handleLinePress = useCallback((routeId: string) => {
    // Close sheet and navigate to Lines tab with the selected route
    setSheetVisible(false);
    logger.log('[MapScreen] Line pressed:', routeId);
    // TODO: Navigate to Lines tab and show route details
  }, []);

  const handleImportData = useCallback(async () => {
    try {
      setImporting(true);
      logger.log('[MapScreen] Starting İzmir GTFS data import...');

      // Import İzmir GTFS data (ESHOT, Metro, İZBAN)
      const { downloadAndImportAllIzmir } = await import('../core/gtfs-downloader');

      await downloadAndImportAllIzmir((stage, progress, source) => {
        logger.log(`[MapScreen] Import: ${stage} - ${Math.round(progress * 100)}% (${source || ''})`);
      });

      Alert.alert(
        t('common.success'),
        t('common.dataImported', { defaultValue: 'İzmir transit data imported successfully!' })
      );

      // Reload all stops
      await loadAllStops();
    } catch (err) {
      logger.error('[MapScreen] Import error:', err);
      captureException(err, { tags: { screen: 'map', action: 'data_import' } });
      Alert.alert(t('common.error'), t('common.importFailed'));
    } finally {
      setImporting(false);
    }
  }, [t, loadAllStops]);

  // Calculate initial region based on user location or default to İzmir (memoized)
  // IMPORTANT: Must be before early returns to respect Rules of Hooks
  const initialRegion = useMemo(() =>
    location
      ? {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }
      : undefined,
    [location?.latitude, location?.longitude]
  );

  // Initial loading state
  if (adapterLoading || (loadingStops && nearbyStops.length === 0)) {
    return (
      <ScreenContainer edges={[]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>
            {locationLoading ? t('common.gettingLocation', { defaultValue: 'Getting your location...' }) : t('transit.loadingStops')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // Error state
  if (stopsError) {
    return (
      <ScreenContainer edges={[]}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{t('transit.loadingError')}</Text>
          <Text style={styles.errorMessage}>{stopsError.message}</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Empty state - no stops found (database might be empty)
  if (nearbyStops.length === 0 && !loadingStops) {
    return (
      <ScreenContainer edges={[]}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyText}>{t('transit.noStopsAvailable')}</Text>
          <Text style={styles.emptySubtext}>Import sample data to test the app</Text>
          <TouchableOpacity
            style={styles.importButton}
            onPress={handleImportData}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.importButtonText}>🔄 {t('data.downloadIzmir', { defaultValue: 'Download İzmir Data' })}</Text>
                <Text style={styles.importButtonSubtext}>ESHOT • Metro • İZBAN</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dataManagementLink}
            onPress={() => navigation.navigate('Settings', { screen: 'DataManagement' })}
          >
            <Text style={styles.dataManagementLinkText}>
              {t('data.manageData', { defaultValue: 'Manage data in settings →' })}
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // Map view
  return (
    <ScreenContainer edges={[]}>
      <View style={styles.container}>
        <TransitMap
          ref={mapRef}
          stops={nearbyStops}
          stopRouteTypes={stopRouteTypesMap}
          stopRouteColors={stopRouteColorsMap}
          underConstructionStops={underConstructionStops}
          onStopPress={handleStopPress}
          initialRegion={initialRegion}
          onRegionChangeComplete={handleRegionChangeComplete}
        />

        {/* Floating Header - İzmir Branding */}
        <View style={[styles.floatingHeader, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>İZMİR</Text>
            </View>
            <Text style={styles.headerTitle}>{t('tabs.map')}</Text>
          </View>
        </View>

        {/* Offline Banner */}
        {isOffline && (
          <View style={[styles.offlineBannerContainer, { top: insets.top + 52 }]}>
            <OfflineBanner visible={isOffline} />
          </View>
        )}

        {/* Location Permission Prompt */}
        {showLocationPrompt && (
          <View style={[styles.locationPromptContainer, { top: insets.top + 52 }]}>
            <View style={styles.locationPrompt}>
              <Text style={styles.locationPromptIcon}>📍</Text>
              <View style={styles.locationPromptTextContainer}>
                <Text style={styles.locationPromptTitle}>
                  {t('map.enableLocation', { defaultValue: 'Activer la localisation' })}
                </Text>
                <Text style={styles.locationPromptText}>
                  {t('map.locationDescription', { defaultValue: 'Pour afficher les arrêts autour de vous' })}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.locationPromptButton}
                onPress={handleEnableLocation}
              >
                <Text style={styles.locationPromptButtonText}>
                  {t('common.enable', { defaultValue: 'Activer' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.locationPromptCloseButton}
                onPress={() => setShowLocationPrompt(false)}
              >
                <Text style={styles.locationPromptCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      {/* Alerts Banner - only show if there are severe/warning alerts and not dismissed */}
      {severeAlerts.length > 0 && !alertsDismissed && (
        <View style={[styles.alertsContainer, { top: insets.top + 52 }]}>
          <View style={styles.alertsRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.alertsContent}
              style={styles.alertsScroll}
            >
              {severeAlerts.slice(0, 3).map(alert => (
                <View key={alert.id} style={styles.alertItem}>
                  <AlertBanner
                    alert={alert}
                    compact
                    onPress={() => navigation.navigate('Alerts')}
                  />
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.alertsDismissButton}
              onPress={() => setAlertsDismissed(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.alertsDismissText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Reimport button (floating) */}
      <View style={[styles.reimportContainer, { top: insets.top + 52 }]}>
        <TouchableOpacity
          style={styles.reimportButton}
          onPress={handleImportData}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.reimportButtonText}>🔄</Text>
          )}
        </TouchableOpacity>
        <View style={styles.reimportTooltip}>
          <Text style={styles.reimportTooltipText}>Reload data</Text>
        </View>
      </View>

      {/* Alerts Badge */}
      {severeAlerts.length > 0 && (
        <TouchableOpacity
          style={[styles.alertsBadge, { top: insets.top + 52 }]}
          onPress={() => navigation.navigate('Alerts')}
        >
          <Text style={styles.alertsBadgeText}>⚠️ {severeAlerts.length}</Text>
        </TouchableOpacity>
      )}

      {/* Map Legend */}
      <MapLegend />

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

      {/* Banner Ad */}
      <View style={styles.bannerAdContainer}>
        <BannerAdComponent />
      </View>
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
    paddingBottom: 10,
    backgroundColor: '#D61C1F', // İzmir Metro Red
    justifyContent: 'flex-end',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  logoText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#D61C1F',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  offlineBannerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  importButton: {
    backgroundColor: '#D61C1F', // İzmir Metro Red
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 240,
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
  importButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  importButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  dataManagementLink: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dataManagementLinkText: {
    color: '#D61C1F', // İzmir Metro Red
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  reimportContainer: {
    position: 'absolute',
    right: 16,
    alignItems: 'center',
  },
  reimportButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0066CC', // ESHOT Blue
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
  reimportTooltip: {
    marginTop: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  reimportTooltipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
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
  alertsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertsScroll: {
    flex: 1,
  },
  alertsContent: {
    paddingLeft: 12,
    paddingRight: 4,
  },
  alertItem: {
    width: 240,
    marginRight: 8,
  },
  alertsDismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginRight: 12,
  },
  alertsDismissText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bannerAdContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    zIndex: 5,
  },
  // Location permission prompt styles
  locationPromptContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 15,
  },
  locationPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A651', // Tram Green (accent color)
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationPromptIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  locationPromptTextContainer: {
    flex: 1,
  },
  locationPromptTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  locationPromptText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
  },
  locationPromptButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  locationPromptButtonText: {
    color: '#00A651', // Tram Green (accent color)
    fontSize: 13,
    fontWeight: 'bold',
  },
  locationPromptCloseButton: {
    marginLeft: 8,
    padding: 4,
  },
  locationPromptCloseText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Stops count badge
  stopsCountContainer: {
    position: 'absolute',
    left: 16,
    zIndex: 5,
  },
  stopsCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  stopsCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
});
