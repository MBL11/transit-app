/**
 * App.tsx with Navigation (production version)
 */

import './global.css';
import './src/i18n'; // Initialize i18n
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { RootNavigator } from './src/navigation';

function AppContent() {
  const { isDark, loaded } = useTheme();

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
    <SafeAreaProvider>
      <ThemeProvider>
        <NetworkProvider>
          <AppContent />
        </NetworkProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
