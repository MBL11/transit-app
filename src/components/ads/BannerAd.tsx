import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { AdMobConfig, shouldDisableAds } from '../../config/ads';

interface BannerAdComponentProps {
  size?: BannerAdSize;
}

/**
 * Banner Ad Component
 *
 * Displays a banner ad at the bottom of the screen
 * Automatically hidden if ads are disabled (premium user or Expo Go)
 */
export function BannerAdComponent({ size = BannerAdSize.BANNER }: BannerAdComponentProps) {
  const [adError, setAdError] = useState(false);
  const adsDisabled = shouldDisableAds();

  // Don't render if ads are disabled or there was an error
  if (adsDisabled || adError) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AdMobConfig.bannerAdUnitId}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdFailedToLoad={(error) => {
          console.warn('Banner ad failed to load:', error);
          setAdError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
