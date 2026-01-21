import { useEffect, useState, useRef } from 'react';
import { shouldDisableAds } from '../config/ads';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ROUTE_CALCULATIONS_KEY = '@route_calculations_count';
const INTERSTITIAL_FREQUENCY = 3; // Show ad every 3 route calculations

/**
 * Hook to manage interstitial ads
 *
 * Shows a full-screen ad every N route calculations
 * Usage: call showAdIfNeeded() after each route calculation
 *
 * Note: Gracefully degrades in Expo Go (ads disabled)
 */
export function useInterstitialAd() {
  const [loaded, setLoaded] = useState(false);
  const [routeCount, setRouteCount] = useState(0);
  const interstitialRef = useRef<any>(null); // InterstitialAd type
  const adsDisabled = shouldDisableAds();

  // Initialize interstitial ad
  useEffect(() => {
    if (adsDisabled) return;

    // Try to load AdMob module dynamically (fails gracefully in Expo Go)
    try {
      const { InterstitialAd, AdEventType } = require('react-native-google-mobile-ads');
      const { AdMobConfig } = require('../config/ads');

      const interstitial = InterstitialAd.createForAdRequest(AdMobConfig.interstitialAdUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
        setLoaded(true);
        console.log('Interstitial ad loaded');
      });

      const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        setLoaded(false);
        // Reload ad for next time
        interstitial.load();
      });

      const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.warn('Interstitial ad error:', error);
        setLoaded(false);
      });

      interstitialRef.current = interstitial;
      interstitial.load();

      return () => {
        unsubscribeLoaded();
        unsubscribeClosed();
        unsubscribeError();
      };
    } catch (error) {
      console.log('[useInterstitialAd] AdMob not available (expected in Expo Go)');
      return undefined;
    }
  }, [adsDisabled]);

  // Load route calculations count
  useEffect(() => {
    loadRouteCount();
  }, []);

  const loadRouteCount = async () => {
    try {
      const count = await AsyncStorage.getItem(ROUTE_CALCULATIONS_KEY);
      setRouteCount(count ? parseInt(count, 10) : 0);
    } catch (error) {
      console.warn('Failed to load route count:', error);
    }
  };

  const incrementRouteCount = async () => {
    try {
      const newCount = routeCount + 1;
      await AsyncStorage.setItem(ROUTE_CALCULATIONS_KEY, newCount.toString());
      setRouteCount(newCount);
      return newCount;
    } catch (error) {
      console.warn('Failed to save route count:', error);
      return routeCount;
    }
  };

  const resetRouteCount = async () => {
    try {
      await AsyncStorage.setItem(ROUTE_CALCULATIONS_KEY, '0');
      setRouteCount(0);
    } catch (error) {
      console.warn('Failed to reset route count:', error);
    }
  };

  /**
   * Show ad if conditions are met:
   * - Ads are enabled
   * - Ad is loaded
   * - User has calculated enough routes
   */
  const showAdIfNeeded = async (): Promise<boolean> => {
    if (adsDisabled) return false;

    const newCount = await incrementRouteCount();

    // Show ad every N calculations
    if (newCount % INTERSTITIAL_FREQUENCY === 0 && loaded && interstitialRef.current) {
      try {
        await interstitialRef.current.show();
        return true;
      } catch (error) {
        console.warn('Failed to show interstitial ad:', error);
        return false;
      }
    }

    return false;
  };

  return {
    loaded,
    showAdIfNeeded,
    routeCount,
    resetRouteCount,
  };
}
