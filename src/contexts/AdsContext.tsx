/**
 * Ads Context
 * Manages ad display and premium subscription status
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

interface AdsContextType {
  adsEnabled: boolean;
  isPremium: boolean;
  disableAds: () => Promise<void>;
  enableAds: () => Promise<void>;
}

const AdsContext = createContext<AdsContextType>({
  adsEnabled: true,
  isPremium: false,
  disableAds: async () => {},
  enableAds: async () => {},
});

const PREMIUM_KEY = '@user_premium';

export function AdsProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);

  // Load premium status on mount
  useEffect(() => {
    loadPremiumStatus();
  }, []);

  const loadPremiumStatus = async () => {
    try {
      const value = await AsyncStorage.getItem(PREMIUM_KEY);
      setIsPremium(value === 'true');
    } catch (error) {
      logger.error('[AdsContext] Failed to load premium status:', error);
    }
  };

  /**
   * Disable ads (called after premium purchase)
   */
  const disableAds = async () => {
    try {
      await AsyncStorage.setItem(PREMIUM_KEY, 'true');
      setIsPremium(true);
      logger.log('[AdsContext] Ads disabled (Premium activated)');
    } catch (error) {
      logger.error('[AdsContext] Failed to disable ads:', error);
    }
  };

  /**
   * Enable ads (for testing or subscription cancellation)
   */
  const enableAds = async () => {
    try {
      await AsyncStorage.setItem(PREMIUM_KEY, 'false');
      setIsPremium(false);
      logger.log('[AdsContext] Ads enabled');
    } catch (error) {
      logger.error('[AdsContext] Failed to enable ads:', error);
    }
  };

  return (
    <AdsContext.Provider
      value={{
        adsEnabled: !isPremium,
        isPremium,
        disableAds,
        enableAds,
      }}
    >
      {children}
    </AdsContext.Provider>
  );
}

/**
 * Hook to access ads context
 */
export function useAds() {
  const context = useContext(AdsContext);
  if (!context) {
    throw new Error('useAds must be used within AdsProvider');
  }
  return context;
}
