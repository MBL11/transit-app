import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { shouldDisableAds } from '../../config/ads';

interface BannerAdComponentProps {
  size?: any; // BannerAdSize from react-native-google-mobile-ads
}

/**
 * Banner Ad Component
 *
 * Displays a banner ad at the bottom of the screen
 * Automatically hidden if ads are disabled (premium user, Expo Go, or dev mode)
 */
export function BannerAdComponent({ size }: BannerAdComponentProps) {
  const [adError, setAdError] = useState(false);
  const adsDisabled = shouldDisableAds();

  // Don't render if ads are disabled or there was an error
  if (adsDisabled || adError) {
    return null;
  }

  // Try to load AdMob module dynamically (will fail gracefully in Expo Go)
  try {
    const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads');
    const { AdMobConfig } = require('../../config/ads');
    const adSize = size || BannerAdSize.BANNER;

    return (
      <View style={styles.container}>
        <BannerAd
          unitId={AdMobConfig.bannerAdUnitId}
          size={adSize}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdFailedToLoad={(error: any) => {
            console.warn('Banner ad failed to load:', error);
            setAdError(true);
          }}
        />
      </View>
    );
  } catch (error) {
    console.log('[BannerAd] AdMob not available (expected in Expo Go)');
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
