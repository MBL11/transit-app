import { StatusBar } from 'expo-status-bar';
import { Text, View, ScrollView } from 'react-native';
import './global.css';

export default function App() {
  return (
    <View className="flex-1 bg-white">
      <StatusBar style="auto" />
      <ScrollView className="flex-1">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-4xl font-bold text-transit-primary mb-4">
            Transit App
          </Text>
          <Text className="text-base text-gray-600 text-center mb-8">
            NativeWind + Tailwind CSS ✅
          </Text>

          {/* Palette de couleurs transit */}
          <View className="w-full max-w-md gap-3">
            <View className="p-4 bg-transit-metro rounded-lg">
              <Text className="text-white font-semibold text-lg">Métro</Text>
            </View>

            <View className="p-4 bg-transit-bus rounded-lg">
              <Text className="text-white font-semibold text-lg">Bus</Text>
            </View>

            <View className="p-4 bg-transit-tram rounded-lg">
              <Text className="text-white font-semibold text-lg">Tram</Text>
            </View>

            <View className="p-4 bg-transit-rer rounded-lg">
              <Text className="text-white font-semibold text-lg">RER</Text>
            </View>

            <View className="p-4 bg-transit-alert rounded-lg">
              <Text className="text-white font-semibold text-lg">Alerte</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
