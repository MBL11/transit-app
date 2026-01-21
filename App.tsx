/**
 * App.tsx with Navigation (production version)
 */

import './global.css';
import './src/i18n'; // Initialize i18n
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { RootNavigator } from './src/navigation';
import { ErrorBoundary } from './src/components/error/ErrorBoundary';
import { useNotifications } from './src/hooks/useNotifications';
import { startAlertMonitoring, stopAlertMonitoring } from './src/services/alert-monitor';
import { getAdapter } from './src/adapters';
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

  // Setup notification handlers
  useNotifications();

  // Start alert monitoring
  useEffect(() => {
    const adapter = getAdapter();

    // Start monitoring for alerts on favorite lines
    startAlertMonitoring((routeIds) => adapter.getAlerts(routeIds));

    // Cleanup on unmount
    return () => {
      stopAlertMonitoring();
    };
  }, []);

  // Wait for theme to load to prevent flash
  if (!loaded) {
    return null;
  }

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
