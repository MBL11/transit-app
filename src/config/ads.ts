import { Platform } from 'react-native';
import Constants from 'expo-constants';

const IS_DEV = __DEV__;

/**
 * AdMob Configuration
 *
 * Test IDs provided by Google:
 * - Use these during development to avoid invalid traffic
 * - Replace with your real Ad Unit IDs in production
 *
 * Get your real IDs from: https://apps.admob.com
 */

export const AdMobConfig = {
  // App IDs (required for initialization)
  appId: Platform.select({
    ios: IS_DEV
      ? 'ca-app-pub-3940256099942544~1458002511'  // Test App ID iOS
      : process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS || 'ca-app-pub-3940256099942544~1458002511',
    android: IS_DEV
      ? 'ca-app-pub-3940256099942544~3347511713'  // Test App ID Android
      : process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID || 'ca-app-pub-3940256099942544~3347511713',
  }) as string,

  // Banner Ad Unit IDs
  bannerAdUnitId: Platform.select({
    ios: IS_DEV
      ? 'ca-app-pub-3940256099942544/2934735716'  // Test Banner iOS
      : process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS || 'ca-app-pub-3940256099942544/2934735716',
    android: IS_DEV
      ? 'ca-app-pub-3940256099942544/6300978111'  // Test Banner Android
      : process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID || 'ca-app-pub-3940256099942544/6300978111',
  }) as string,

  // Interstitial Ad Unit IDs
  interstitialAdUnitId: Platform.select({
    ios: IS_DEV
      ? 'ca-app-pub-3940256099942544/4411468910'  // Test Interstitial iOS
      : process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS || 'ca-app-pub-3940256099942544/4411468910',
    android: IS_DEV
      ? 'ca-app-pub-3940256099942544/1033173712'  // Test Interstitial Android
      : process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID || 'ca-app-pub-3940256099942544/1033173712',
  }) as string,
};

/**
 * Check if ads should be disabled
 * Ads are disabled if:
 * - User has premium subscription (TODO: implement)
 * - Running in Expo Go (can't show ads - native modules not available)
 * - Running in development mode (TEMPORARY: until we use expo-dev-client)
 */
export function shouldDisableAds(): boolean {
  // Check if running in Expo Go
  const isExpoGo = Constants.appOwnership === 'expo';

  // TEMPORARY: Disable in dev mode to work with Expo Go
  // Remove this line when using expo-dev-client or production builds
  const isDevMode = IS_DEV;

  // TODO: Check if user has premium subscription
  // const hasPremium = await checkPremiumStatus();

  return isExpoGo || isDevMode;
}
