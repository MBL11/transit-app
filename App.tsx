import './global.css';
import { i18nInitPromise } from './src/i18n';
import { useState, useEffect, useRef } from 'react';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Suppress known harmless warnings from Amplitude SDK (cookie API not available in RN)
LogBox.ignoreLogs(['Amplitude Logger [Error]: Failed to set cookie']);
import { ThemeProvider } from './src/contexts/ThemeContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { RootNavigator } from './src/navigation';
import { ErrorBoundary } from './src/components/error/ErrorBoundary';
import { OnboardingScreen, isOnboardingCompleted } from './src/screens/OnboardingScreen';
import { SplashScreen } from './src/screens/SplashScreen';
import { DataLoadingScreen } from './src/screens/DataLoadingScreen';
import { initAnalytics, trackEvent, AnalyticsEvents } from './src/services/analytics';
import { initCrashReporting, captureException } from './src/services/crash-reporting';
import { logger } from './src/utils/logger';
import { useGTFSData } from './src/hooks/useGTFSData';
import { useAdapter } from './src/hooks/useAdapter';

// Initialize crash reporting as early as possible
initCrashReporting();

type AppState = 'loading' | 'onboarding' | 'check_data' | 'data_loading' | 'ready';

function AppContent() {
  const [appState, setAppState] = useState<AppState>('loading');
  const { isLoaded: hasGTFSData, checking: checkingGTFS, markAsLoaded, triggerBackgroundRefresh, needsUpdate } = useGTFSData();
  const { adapter, loading: adapterLoading } = useAdapter();
  const hasTriggeredAutoRefresh = useRef(false);

  useEffect(() => {
    async function initialize() {
      try {
        // Initialize analytics
        await initAnalytics();

        // Wait for i18n to be ready
        await i18nInitPromise;

        // Check if onboarding is completed
        const onboardingCompleted = await isOnboardingCompleted();

        // Small delay to show splash screen (min 1.5s)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Track app opened
        trackEvent(AnalyticsEvents.APP_OPENED, {
          first_launch: !onboardingCompleted,
        });

        setAppState(onboardingCompleted ? 'check_data' : 'onboarding');
      } catch (error) {
        logger.error('App initialization error:', error);
        captureException(error, { tags: { location: 'app_init' } });
        // Still proceed to app even if there's an error
        setAppState('check_data');
      }
    }

    initialize();
  }, []);

  // Check GTFS data after onboarding/initial check
  // Wait for both GTFS data AND adapter to be ready
  useEffect(() => {
    if (appState === 'check_data' && !checkingGTFS) {
      if (hasGTFSData) {
        // Data exists, but wait for adapter to be ready before showing app
        if (!adapterLoading && adapter) {
          logger.log('[App] GTFS data loaded and adapter ready, showing app');
          setAppState('ready');
        } else {
          logger.log('[App] Waiting for adapter to initialize...');
        }
      } else {
        setAppState('data_loading');
      }
    }
  }, [appState, checkingGTFS, hasGTFSData, adapterLoading, adapter]);

  // Auto-refresh GTFS data in background when app is ready AND data is stale
  // Only refresh if data is > 7 days old to avoid clearing stops during normal use
  useEffect(() => {
    if (appState === 'ready' && !hasTriggeredAutoRefresh.current) {
      hasTriggeredAutoRefresh.current = true;

      // Only refresh if data is stale (> 7 days old)
      if (needsUpdate()) {
        // Delay to let the app UI settle before refreshing
        const timer = setTimeout(() => {
          logger.log('[App] Data is stale (> 7 days), triggering background GTFS refresh...');
          triggerBackgroundRefresh();
        }, 3000);
        return () => clearTimeout(timer);
      } else {
        logger.log('[App] Data is fresh (< 7 days), skipping background refresh');
      }
    }
  }, [appState, triggerBackgroundRefresh, needsUpdate]);

  const handleOnboardingComplete = () => {
    trackEvent(AnalyticsEvents.ONBOARDING_COMPLETED);
    setAppState('check_data');
  };

  const handleDataLoadingComplete = async (sourceName: string) => {
    await markAsLoaded(sourceName);
    setAppState('ready');
  };

  // Show splash screen while loading
  if (appState === 'loading' || appState === 'check_data') {
    return <SplashScreen />;
  }

  // Show onboarding for first-time users
  if (appState === 'onboarding') {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // Show data loading screen when GTFS data is needed
  if (appState === 'data_loading') {
    return <DataLoadingScreen onComplete={handleDataLoadingComplete} />;
  }

  // Normal app flow
  return <RootNavigator />;
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
