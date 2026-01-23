import './global.css';
import { i18nInitPromise } from './src/i18n';
import { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { RootNavigator } from './src/navigation';
import { ErrorBoundary } from './src/components/error/ErrorBoundary';
import { OnboardingScreen, isOnboardingCompleted } from './src/screens/OnboardingScreen';
import { SplashScreen } from './src/screens/SplashScreen';

type AppState = 'loading' | 'onboarding' | 'ready';

function AppContent() {
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    async function initialize() {
      try {
        // Wait for i18n to be ready
        await i18nInitPromise;

        // Check if onboarding is completed
        const onboardingCompleted = await isOnboardingCompleted();

        // Small delay to show splash screen (min 1.5s)
        await new Promise(resolve => setTimeout(resolve, 1500));

        setAppState(onboardingCompleted ? 'ready' : 'onboarding');
      } catch (error) {
        console.error('App initialization error:', error);
        // Still proceed to app even if there's an error
        setAppState('ready');
      }
    }

    initialize();
  }, []);

  // Show splash screen while loading
  if (appState === 'loading') {
    return <SplashScreen />;
  }

  // Show onboarding for first-time users
  if (appState === 'onboarding') {
    return (
      <OnboardingScreen onComplete={() => setAppState('ready')} />
    );
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
