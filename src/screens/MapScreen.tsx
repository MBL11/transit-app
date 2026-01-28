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

// Note: İzmir has only ~50 stops, so we load all stops at once instead of nearby stops

type Props = NativeStackScreenProps<MapStackParamList, 'MapView'>;

export function MapScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Geolocation
  const { location, isLoading: locationLoading, permissionGranted, getCurrentLocation, requestPermission } = useLocation();

  const { adapter, loading: adapterLoading } = useAdapter();

  const { alerts } = useAlerts();

  const { isOffline } = useNetwork();

  // Local state for all stops (İzmir has only ~50 stops)
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
  const [stopRouteTypesMap, setStopRouteTypesMap] = useState<Map<string, number[]>>(new Map());
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

  // Bottom sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [stopRoutes, setStopRoutes] = useState<Route[]>([]);
  const [stopDepartures, setStopDepartures] = useState<NextDeparture[]>([]);
  const [loadingStopData, setLoadingStopData] = useState(false);

  // Load ALL stops (İzmir has only ~50 stops, safe to load all)
  const loadAllStops = useCallback(async () => {
    if (loadingRegionRef.current) {
      console.log('[MapScreen] Already loading stops, skipping...');
      return;
    }

    try {
      loadingRegionRef.current = true;
      setLoadingStops(true);
      setStopsError(null);

      console.log('[MapScreen] Loading all stops...');

      // Load all stops from database
      const allStops = await db.getAllStops();

      // Convert to NearbyStop format (with distance = 0 since we're loading all)
      const stopsWithDistance: NearbyStop[] = allStops.map(stop => ({
        ...stop,
        distance: 0,
      }));

      console.log(`[MapScreen] Loaded ${stopsWithDistance.length} stops`);
      setNearbyStops(stopsWithDistance);

      // Load route types for all stops (for transport type icons on markers)
      if (allStops.length > 0) {
        try {
          const stopIds = allStops.map(s => s.id);
          const routesByStop = await db.getRoutesByStopIds(stopIds);

          // Helper to detect İzmir transport type from route data
          const detectTransportType = (route: Route): number => {
            const name = ((route.shortName || '') + ' ' + (route.longName || '')).toUpperCase();
            const shortUpper = (route.shortName || '').toUpperCase();

            let detected: number;

            // Metro: M1, M2, or contains "METRO"
            if (name.includes('METRO') || /^M\d/i.test(shortUpper)) {
              detected = 1;
            // İZBAN: contains İZBAN/IZBAN, or S1/S2
            } else if (name.includes('İZBAN') || name.includes('IZBAN') || /^S\d/i.test(shortUpper)) {
              detected = 2;
            // Tram: T1, T2, or contains TRAM/TRAMVAY
            } else if (name.includes('TRAM') || name.includes('TRAMVAY') || /^T\d/i.test(shortUpper)) {
              detected = 0;
            // Ferry: only if explicitly contains ferry-related words
            } else if (name.includes('VAPUR') || name.includes('FERİ') || name.includes('İZDENİZ') || name.includes('IZDENIZ')) {
              detected = 4;
            } else {
              // Default: use GTFS type, but never default to ferry (4) - treat as bus
              detected = route.type === 4 ? 3 : route.type;
            }

            // Debug: log non-bus detections
            if (detected !== 3) {
              console.log(`[MapScreen] Route "${route.shortName}" (${route.longName}) type=${route.type} -> detected=${detected}`);
            }

            return detected;
          };

          // Convert to Map of stopId -> detected route types array
          const routeTypesMap = new Map<string, number[]>();
          routesByStop.forEach((routes, stopId) => {
            routeTypesMap.set(stopId, routes.map(r => detectTransportType(r)));
          });

          console.log(`[MapScreen] Loaded route types for ${routeTypesMap.size} stops`);
          setStopRouteTypesMap(routeTypesMap);
        } catch (err) {
          console.warn('[MapScreen] Failed to load route types (non-critical):', err);
          // Non-critical error - markers will show default icons
        }
      }
    } catch (err) {
      console.error('[MapScreen] Failed to load stops:', err);
      setStopsError(err instanceof Error ? err : new Error('Failed to load stops'));
    } finally {
      setLoadingStops(false);
      loadingRegionRef.current = false;
    }
  }, []);

  // Initial load - load ALL stops once (İzmir has ~50 stops only)
  useEffect(() => {
    const initLocation = async () => {
      console.log('[MapScreen] Initializing...');

      // Load all stops immediately
      await loadAllStops();

      // If permission not granted, show prompt
      if (!permissionGranted) {
        console.log('[MapScreen] Location permission not granted, showing prompt');
        setShowLocationPrompt(true);
        return;
      }

      // Get current location and animate to it
      const userLocation = await getCurrentLocation();
      if (userLocation) {
        console.log('[MapScreen] Got user location:', userLocation.latitude, userLocation.longitude);
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
    console.log('[MapScreen] Line pressed:', routeId);
    // TODO: Navigate to Lines tab and show route details
  }, []);

  const handleImportData = useCallback(async () => {
    try {
      setImporting(true);
      console.log('[MapScreen] Starting İzmir GTFS data import...');

      // Import İzmir GTFS data (ESHOT, Metro, İZBAN)
      const { downloadAndImportAllIzmir } = await import('../core/gtfs-downloader');

      await downloadAndImportAllIzmir((stage, progress, source) => {
        console.log(`[MapScreen] Import: ${stage} - ${Math.round(progress * 100)}% (${source || ''})`);
      });

      Alert.alert(
        t('common.success'),
        t('common.dataImported', { defaultValue: 'İzmir transit data imported successfully!' })
      );

      // Reload all stops
      await loadAllStops();
    } catch (err) {
      console.error('[MapScreen] Import error:', err);
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
          <View style={[styles.offlineBannerContainer, { top: insets.top + 60 }]}>
            <OfflineBanner visible={isOffline} />
          </View>
        )}

        {/* Location Permission Prompt */}
        {showLocationPrompt && (
          <View style={[styles.locationPromptContainer, { top: insets.top + 68 }]}>
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
      <View style={[styles.reimportContainer, { top: insets.top + 68 }]}>
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
    height: 60,
    backgroundColor: '#E30613', // İzmir Metro Red
    justifyContent: 'center',
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
    color: '#E30613',
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
    backgroundColor: '#E30613', // İzmir Metro Red
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
    color: '#E30613', // İzmir Metro Red
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
  alertsContent: {
    paddingHorizontal: 16,
  },
  alertItem: {
    width: 300,
    marginRight: 12,
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
    backgroundColor: '#00A651', // İZBAN Green
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
    color: '#00A651', // İZBAN Green
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
