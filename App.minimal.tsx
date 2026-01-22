/**
 * Minimal App for debugging
 */

import './global.css';
import { View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  console.log('[MinimalApp] Rendering...');

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>✅ App Works!</Text>
        <Text style={{ fontSize: 16, marginTop: 10 }}>If you see this, the basic setup is fine.</Text>
      </View>
    </SafeAreaProvider>
  );
}
