/**
 * App.tsx with Navigation (production version)
 */

import './global.css';
import { i18nInitPromise } from './src/i18n'; // Initialize i18n
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { RootNavigator } from './src/navigation';
import { ErrorBoundary } from './src/components/error/ErrorBoundary';
import Constants from 'expo-constants';

// Initialize Google Mobile Ads SDK only if not in Expo Go
// Expo Go doesn't support native modules like AdMob
const isExpoGo = Constants.appOwnership === 'expo';
if (!isExpoGo && !__DEV__) {
  // Only import and initialize in production builds or dev client
  try {
    const mobileAds = require('react-native-google-mobile-ads').default;
    mobileAds()
      .initialize()
      .then((adapterStatuses: any) => {
        console.log('[AdMob] Initialization complete:', adapterStatuses);
      })
      .catch((error: any) => {
        console.error('[AdMob] Initialization failed:', error);
      });
  } catch (error) {
    console.warn('[AdMob] Module not available (expected in Expo Go):', error);
  }
} else {
  console.log('[AdMob] Skipped initialization (Expo Go or dev mode)');
}

function AppContent() {
  const { isDark, loaded } = useTheme();
  const [i18nReady, setI18nReady] = useState(false);

  // Wait for i18n to initialize
  useEffect(() => {
    i18nInitPromise.then(() => {
      console.log('[App] i18n initialized');
      setI18nReady(true);
    }).catch((error) => {
      console.error('[App] i18n initialization failed:', error);
      // Set ready anyway to prevent blocking the app
      setI18nReady(true);
    });
  }, []);

  // Wait for theme and i18n to load to prevent flash
  if (!loaded || !i18nReady) {
    console.log('[App] Waiting... loaded:', loaded, 'i18nReady:', i18nReady);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#121212' : '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  console.log('[App] All ready, rendering RootNavigator');

  return (
    <View className={isDark ? 'dark' : ''} style={{ flex: 1 }}>
      <RootNavigator />
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <NetworkProvider>
            <AppContent />
          </NetworkProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
