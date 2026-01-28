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

// Radius in meters for loading nearby stops
const NEARBY_STOPS_RADIUS = 1500; // 1.5km radius (reduced for performance)
const MAX_STOPS_ON_MAP = 50; // Maximum stops to display for performance
const MIN_DISTANCE_TO_RELOAD = 300; // Minimum distance in meters before reloading stops

type Props = NativeStackScreenProps<MapStackParamList, 'MapView'>;

export function MapScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Geolocation
  const { location, isLoading: locationLoading, permissionGranted, getCurrentLocation, requestPermission } = useLocation();

  const { adapter, loading: adapterLoading } = useAdapter();

  const { alerts } = useAlerts();

  const { isOffline } = useNetwork();

  // Local state for nearby stops (instead of all stops)
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
  const [loadingStops, setLoadingStops] = useState(true);
  const [stopsError, setStopsError] = useState<Error | null>(null);
  const [importing, setImporting] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [hasDataInDb, setHasDataInDb] = useState<boolean | null>(null); // null = unknown, true = has data, false = empty

  // Track current map center for loading stops
  const currentRegionRef = useRef<Region | null>(null);
  const loadingRegionRef = useRef(false);
  const lastLoadedPositionRef = useRef<{ lat: number; lon: number } | null>(null);

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

  // Load nearby stops around a given location
  const loadNearbyStops = useCallback(async (lat: number, lon: number) => {
    if (loadingRegionRef.current) {
      console.log('[MapScreen] Already loading stops, skipping...');
      return;
    }

    try {
      loadingRegionRef.current = true;
      setLoadingStops(true);
      setStopsError(null);

      console.log(`[MapScreen] Loading stops around (${lat.toFixed(4)}, ${lon.toFixed(4)})...`);

      const stops = await findNearbyStops(lat, lon, NEARBY_STOPS_RADIUS, MAX_STOPS_ON_MAP);

      console.log(`[MapScreen] Found ${stops.length} nearby stops`);
      setNearbyStops(stops);
      // Update last loaded position for distance check
      lastLoadedPositionRef.current = { lat, lon };
    } catch (err) {
      console.error('[MapScreen] Failed to load nearby stops:', err);
      setStopsError(err instanceof Error ? err : new Error('Failed to load stops'));
    } finally {
      setLoadingStops(false);
      loadingRegionRef.current = false;
    }
  }, []);

  // Initial location setup
  useEffect(() => {
    const initLocation = async () => {
      console.log('[MapScreen] Initializing location...');

      // If permission not granted, show prompt
      if (!permissionGranted) {
        console.log('[MapScreen] Location permission not granted, showing prompt');
        setShowLocationPrompt(true);
        // Load stops around İzmir center as fallback
        await loadNearbyStops(38.4237, 27.1428); // İzmir center (Konak)
        return;
      }

      // Get current location
      const userLocation = await getCurrentLocation();
      if (userLocation) {
        console.log('[MapScreen] Got user location:', userLocation.latitude, userLocation.longitude);
        await loadNearbyStops(userLocation.latitude, userLocation.longitude);
        // Animate map to user location with a small delay to ensure map is mounted
        setTimeout(() => {
          mapRef.current?.animateToLocation(userLocation.latitude, userLocation.longitude, 1000);
        }, 100);
      } else {
        // Fallback to İzmir center
        console.log('[MapScreen] No user location, using İzmir center');
        await loadNearbyStops(38.4237, 27.1428); // İzmir center (Konak)
      }
    };

    if (!adapterLoading) {
      initLocation();
    }
  }, [adapterLoading, permissionGranted]);

  // Handle location permission request
  const handleEnableLocation = useCallback(async () => {
    setShowLocationPrompt(false);
    const granted = await requestPermission();
    if (granted) {
      const userLocation = await getCurrentLocation();
      if (userLocation) {
        // Load stops around user location
        await loadNearbyStops(userLocation.latitude, userLocation.longitude);
        // Animate map to user location
        mapRef.current?.animateToLocation(userLocation.latitude, userLocation.longitude, 1000);
      }
    }
  }, [requestPermission, getCurrentLocation, loadNearbyStops]);

  // Handle map region change (debounced)
  const regionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    currentRegionRef.current = region;

    // Debounce the stop loading
    if (regionChangeTimeoutRef.current) {
      clearTimeout(regionChangeTimeoutRef.current);
    }

    regionChangeTimeoutRef.current = setTimeout(() => {
      // Check if we've moved enough to reload
      const lastPos = lastLoadedPositionRef.current;
      if (lastPos) {
        // Simple distance calculation (Haversine approximation)
        const R = 6371000; // Earth radius in meters
        const dLat = (region.latitude - lastPos.lat) * Math.PI / 180;
        const dLon = (region.longitude - lastPos.lon) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lastPos.lat * Math.PI / 180) * Math.cos(region.latitude * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        if (distance < MIN_DISTANCE_TO_RELOAD) {
          console.log(`[MapScreen] Moved only ${Math.round(distance)}m, skipping reload`);
          return;
        }
      }

      console.log('[MapScreen] Region changed, reloading stops...');
      lastLoadedPositionRef.current = { lat: region.latitude, lon: region.longitude };
      loadNearbyStops(region.latitude, region.longitude);
    }, 800); // Wait 800ms after user stops moving the map
  }, [loadNearbyStops]);

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

      // Reload stops around current location or İzmir center
      const lat = location?.latitude || 38.4237;
      const lon = location?.longitude || 27.1428;
      await loadNearbyStops(lat, lon);
    } catch (err) {
      console.error('[MapScreen] Import error:', err);
      Alert.alert(t('common.error'), t('common.importFailed'));
    } finally {
      setImporting(false);
    }
  }, [t, location?.latitude, location?.longitude, loadNearbyStops]);

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
