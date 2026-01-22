import './global.css';
import { i18nInitPromise } from './src/i18n';
import { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { RootNavigator } from './src/navigation';
import { ErrorBoundary } from './src/components/error/ErrorBoundary';
import { OnboardingScreen, isOnboardingCompleted } from './src/screens/OnboardingScreen';

// Init i18n at startup (fire and forget)
i18nInitPromise.catch(console.error);

function AppContent() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if onboarding is completed (only once on mount)
    isOnboardingCompleted().then((completed) => {
      setShowOnboarding(!completed);
    });
  }, []);

  // Still checking onboarding status
  if (showOnboarding === null) {
    return null; // Brief flash, could add a splash screen here
  }

  // Show onboarding for first-time users
  if (showOnboarding) {
    return (
      <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
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
