import './global.css';
import { i18nInitPromise } from './src/i18n';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { RootNavigator } from './src/navigation';
import { ErrorBoundary } from './src/components/error/ErrorBoundary';

// Init i18n at startup (fire and forget)
i18nInitPromise.catch(console.error);

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <NetworkProvider>
            <RootNavigator />
          </NetworkProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
