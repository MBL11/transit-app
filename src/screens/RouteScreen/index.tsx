/**
 * Route Screen (Refactored with useReducer)
 * Allows users to search for routes between two stops with autocomplete
 *
 * This refactored version uses useReducer to manage complex state
 * instead of multiple useState hooks, making the code more maintainable.
 */

import React, { useEffect, useMemo, useReducer, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { BannerAdComponent } from '../../components/ads/BannerAd';
import { useNetwork } from '../../contexts/NetworkContext';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useInterstitialAd } from '../../hooks/useInterstitialAd';
import { useGTFSData } from '../../hooks/useGTFSData';
import { useStops } from '../../hooks/useAdapter';
import { useRecentSearches } from '../../hooks/useRecentSearches';
import { findMultipleRoutes } from '../../core/routing';
import type { Stop } from '../../core/types/models';
import type { JourneyResult } from '../../core/types/routing';
import type { RouteStackParamList } from '../../navigation/RouteStackNavigator';
import { serializeJourney } from '../../core/types/routing-serialization';
import type { GeocodingResult } from '../../core/geocoding';
import type { RoutingPreferences } from '../../types/routing-preferences';
import { routeReducer, initialState } from './routeReducer';
import { RouteScreenContent } from './RouteScreenContent';
import { logger } from '../../utils/logger';
import { trackEvent, AnalyticsEvents } from '../../services/analytics';
import { captureException } from '../../services/crash-reporting';

type NavigationProp = NativeStackNavigationProp<RouteStackParamList, 'RouteCalculation'>;

export function RouteScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { isOffline } = useNetwork();
  const { isRefreshing } = useGTFSData();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const { showAdIfNeeded } = useInterstitialAd();

  // Use the useStops hook which properly waits for adapter initialization
  const { stops: loadedStops, loading: stopsLoading, refresh: refreshStops } = useStops();

  // Recent searches
  const { recentStops, addRecentStop } = useRecentSearches();

  // Use reducer instead of multiple useState
  const [state, dispatch] = useReducer(routeReducer, initialState);

  // Debug logging
  useEffect(() => {
    logger.log(`[RouteScreen] stopsLoading: ${stopsLoading}, loadedStops: ${loadedStops.length}`);
  }, [stopsLoading, loadedStops.length]);

  // Refresh stops when screen comes into focus (reloads after data import)
  useFocusEffect(
    useCallback(() => {
      logger.log('[RouteScreen] useFocusEffect - refreshing stops');
      refreshStops();
    }, [refreshStops])
  );

  // Load preferences once on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  // Handle pre-filled stops from navigation params (e.g., from Favorites)
  useEffect(() => {
    const params = route.params;
    if (params?.fromStopId && params?.fromStopName) {
      const fromStop: Stop = {
        id: params.fromStopId,
        name: params.fromStopName,
        lat: 0,
        lon: 0,
        locationType: 0,
      };
      dispatch({ type: 'SET_FROM_MODE', payload: 'stop' });
      dispatch({ type: 'SELECT_FROM_STOP', payload: fromStop });
    }
    if (params?.toStopId && params?.toStopName) {
      const toStop: Stop = {
        id: params.toStopId,
        name: params.toStopName,
        lat: 0,
        lon: 0,
        locationType: 0,
      };
      dispatch({ type: 'SET_TO_MODE', payload: 'stop' });
      dispatch({ type: 'SELECT_TO_STOP', payload: toStop });
    }
  }, [route.params]);

  const loadPreferences = async () => {
    try {
      const saved = await AsyncStorage.getItem('@routing_preferences');
      if (saved) {
        const parsedPrefs = JSON.parse(saved);
        dispatch({ type: 'SET_PREFERENCES', payload: parsedPrefs });
        logger.log('[RouteScreen] Loaded saved preferences:', parsedPrefs.optimizeFor);
      }
    } catch (err) {
      logger.error('[RouteScreen] Error loading preferences:', err);
    }
  };

  const savePreferences = async (prefs: RoutingPreferences) => {
    try {
      await AsyncStorage.setItem('@routing_preferences', JSON.stringify(prefs));
      dispatch({ type: 'SET_PREFERENCES', payload: prefs });
      logger.log('[RouteScreen] Saved preferences:', prefs.optimizeFor);
    } catch (err) {
      logger.error('[RouteScreen] Error saving preferences:', err);
    }
  };

  const handleCalculateRoute = async () => {
    // Validate inputs
    const hasFromLocation = state.fromMode === 'stop' ? state.fromStop !== null : state.fromAddress !== null;
    const hasToLocation = state.toMode === 'stop' ? state.toStop !== null : state.toAddress !== null;

    if (!hasFromLocation || !hasToLocation) {
      Alert.alert(t('common.error'), t('route.selectDepartureArrival'));
      return;
    }

    try {
      dispatch({ type: 'SET_CALCULATING', payload: true });
      dispatch({ type: 'SET_HAS_SEARCHED', payload: false });
      dispatch({ type: 'SET_JOURNEYS', payload: [] }); // Clear previous results

      // Prepare from and to locations as GeocodingResult
      let fromLocation: GeocodingResult;
      let toLocation: GeocodingResult;

      if (state.fromMode === 'stop') {
        // Log selected stop details for debugging
        logger.log(`[RouteScreen] From stop: ${state.fromStop!.name} (ID: ${state.fromStop!.id}, lat: ${state.fromStop!.lat}, lon: ${state.fromStop!.lon})`);
        fromLocation = {
          lat: state.fromStop!.lat,
          lon: state.fromStop!.lon,
          displayName: state.fromStop!.name,
          shortAddress: state.fromStop!.name,
          type: 'stop',
          importance: 1,
        };
      } else {
        fromLocation = state.fromAddress!;
      }

      if (state.toMode === 'stop') {
        // Log selected stop details for debugging
        logger.log(`[RouteScreen] To stop: ${state.toStop!.name} (ID: ${state.toStop!.id}, lat: ${state.toStop!.lat}, lon: ${state.toStop!.lon})`);
        toLocation = {
          lat: state.toStop!.lat,
          lon: state.toStop!.lon,
          displayName: state.toStop!.name,
          shortAddress: state.toStop!.name,
          type: 'stop',
          importance: 1,
        };
      } else {
        toLocation = state.toAddress!;
      }

      logger.log('[RouteScreen] Calculating multiple routes with preferences:', state.preferences.optimizeFor);
      logger.log('[RouteScreen] Time mode:', state.timeMode);

      // Overall timeout: abort if route calculation takes too long
      const OVERALL_TIMEOUT_MS = 15000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('ROUTE_TIMEOUT')), OVERALL_TIMEOUT_MS)
      );

      let filteredResults: JourneyResult[];

      if (state.timeMode === 'arrival') {
        // Arrive-by mode: search from multiple earlier departure times
        // to find the latest departure that arrives on time
        const targetArrival = state.departureTime;
        logger.log('[RouteScreen] Arrive-by mode: target arrival', formatTime(targetArrival));

        // Search from 60 min before target arrival (covers most urban journeys)
        const searchTime = new Date(targetArrival.getTime() - 60 * 60000);
        const results = await Promise.race([
          findMultipleRoutes(
            fromLocation,
            toLocation,
            searchTime,
            state.preferences,
            5
          ),
          timeoutPromise,
        ]);

        // Keep only journeys arriving before target, sort by latest departure
        filteredResults = results
          .filter(j => j.arrivalTime <= targetArrival)
          .sort((a, b) => b.departureTime.getTime() - a.departureTime.getTime())
          .slice(0, 3);

        logger.log('[RouteScreen] Arrive-by: found', results.length, 'total,', filteredResults.length, 'arriving on time');
      } else {
        // Depart-at mode: standard search
        const results = await Promise.race([
          findMultipleRoutes(
            fromLocation,
            toLocation,
            state.departureTime,
            state.preferences,
            5
          ),
          timeoutPromise,
        ]);
        filteredResults = results;
      }

      dispatch({ type: 'SET_JOURNEYS', payload: filteredResults });
      dispatch({ type: 'SET_HAS_SEARCHED', payload: true });
      logger.log('[RouteScreen] Found', filteredResults.length, 'journeys');
      trackEvent(AnalyticsEvents.ROUTE_CALCULATED, { resultCount: filteredResults.length, optimizeFor: state.preferences.optimizeFor, fromMode: state.fromMode, toMode: state.toMode });

      // Show interstitial ad if needed (every 3 route calculations)
      await showAdIfNeeded();
    } catch (err: any) {
      logger.error('[RouteScreen] Error calculating route:', err);
      captureException(err, { tags: { screen: 'route', action: 'calculate' } });
      const msg = err.message || '';
      let userMessage = t('route.unableToCalculate');
      if (msg === 'ROUTE_TIMEOUT') {
        userMessage = t('route.searchTimeout', { defaultValue: 'La recherche a pris trop de temps. Essayez avec des arrêts plus proches.' });
      } else if (msg.startsWith('NO_STOPS_NEAR:')) {
        const location = msg.split(':')[1];
        userMessage = t('route.noStopsNear', { location });
      } else if (msg === 'NO_STOPS_NEAR_POSITION') {
        userMessage = t('route.noStopsNearPosition');
      } else if (msg === 'NO_ROUTE_FOUND') {
        userMessage = t('route.noRouteFound');
      }
      Alert.alert(t('common.error'), userMessage);
    } finally {
      dispatch({ type: 'SET_CALCULATING', payload: false });
    }
  };

  const handleJourneyPress = (journey: JourneyResult) => {
    trackEvent(AnalyticsEvents.ROUTE_SELECTED, { duration: journey.totalDuration, transfers: journey.numberOfTransfers, segments: journey.segments.length });
    navigation.navigate('RouteDetails', { journey: serializeJourney(journey) });
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Render using the separated content component
  return (
    <ScreenContainer>
      <ScreenHeader title={t('tabs.route')} />
      <OfflineBanner visible={isOffline} />

      <RouteScreenContent
        state={{
          ...state,
          stops: loadedStops,  // Use stops directly from hook, not reducer
          loading: stopsLoading  // Use loading directly from hook
        }}
        dispatch={dispatch}
        onCalculateRoute={handleCalculateRoute}
        onJourneyPress={handleJourneyPress}
        onSavePreferences={savePreferences}
        formatTime={formatTime}
        isDataRefreshing={isRefreshing}
        recentStops={recentStops}
        onStopSelect={addRecentStop}
      />

      <BannerAdComponent />
    </ScreenContainer>
  );
}

