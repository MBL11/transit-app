/**
 * Route Screen (Refactored with useReducer)
 * Allows users to search for routes between two stops with autocomplete
 *
 * This refactored version uses useReducer to manage complex state
 * instead of multiple useState hooks, making the code more maintainable.
 */

import React, { useEffect, useMemo, useReducer, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { BannerAdComponent } from '../../components/ads/BannerAd';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useInterstitialAd } from '../../hooks/useInterstitialAd';
import { findMultipleRoutes } from '../../core/routing';
import type { Stop } from '../../core/types/models';
import type { JourneyResult } from '../../core/types/routing';
import type { RouteStackParamList } from '../../navigation/RouteStackNavigator';
import { serializeJourney } from '../../core/types/routing-serialization';
import * as db from '../../core/database';
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
  const navigation = useNavigation<NavigationProp>();
  const { showAdIfNeeded } = useInterstitialAd();

  // Use reducer instead of multiple useState
  const [state, dispatch] = useReducer(routeReducer, initialState);

  // Load stops when screen comes into focus (reloads after data import)
  useFocusEffect(
    useCallback(() => {
      loadStops();
    }, [])
  );

  // Load preferences once on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadStops = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const allStops = await db.getAllStops();
      dispatch({ type: 'SET_STOPS', payload: allStops });
    } catch (err) {
      logger.error('[RouteScreen] Error loading stops:', err);
      Alert.alert(t('common.error'), t('route.unableToCalculate'));
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

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

      // Calculate departure time based on mode
      let searchTime = state.departureTime;
      if (state.timeMode === 'arrival') {
        // For arrival mode, subtract estimated journey time (30 min by default)
        searchTime = new Date(state.departureTime.getTime() - 30 * 60000);
        logger.log('[RouteScreen] Arrival mode: searching from', formatTime(searchTime));
      }

      // Prepare from and to locations as GeocodingResult
      let fromLocation: GeocodingResult;
      let toLocation: GeocodingResult;

      if (state.fromMode === 'stop') {
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

      // Use findMultipleRoutes to get optimized routes
      const results = await findMultipleRoutes(
        fromLocation,
        toLocation,
        searchTime,
        state.preferences,
        5 // Get up to 5 route options
      );

      // Filter results for arrival mode
      const filteredResults = state.timeMode === 'arrival'
        ? results.filter(j => j.arrivalTime <= state.departureTime)
        : results;

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
      if (msg.startsWith('NO_STOPS_NEAR:')) {
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

      <RouteScreenContent
        state={state}
        dispatch={dispatch}
        onCalculateRoute={handleCalculateRoute}
        onJourneyPress={handleJourneyPress}
        onSavePreferences={savePreferences}
        formatTime={formatTime}
      />

      <BannerAdComponent />
    </ScreenContainer>
  );
}

