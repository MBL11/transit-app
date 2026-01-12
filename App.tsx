import React from 'react';
import { View, Text, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import './global.css';

export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />
      <ScrollView className="flex-1">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-4xl font-bold text-transit-primary mb-2">
            Transit App
          </Text>
          <Text className="text-base text-foreground-secondary text-center mb-8">
            Application de transport portable pour marchés mal desservis
          </Text>

          {/* Transport mode color samples */}
          <View className="w-full max-w-md gap-3 mb-8">
            <View className="flex-row items-center p-4 bg-transit-metro rounded-lg">
              <Text className="text-white font-semibold text-lg">Métro</Text>
            </View>

            <View className="flex-row items-center p-4 bg-transit-bus rounded-lg">
              <Text className="text-white font-semibold text-lg">Bus</Text>
            </View>

            <View className="flex-row items-center p-4 bg-transit-tram rounded-lg">
              <Text className="text-white font-semibold text-lg">Tram</Text>
            </View>

            <View className="flex-row items-center p-4 bg-transit-rer rounded-lg">
              <Text className="text-white font-semibold text-lg">RER</Text>
            </View>

            <View className="flex-row items-center p-4 bg-transit-alert rounded-lg">
              <Text className="text-white font-semibold text-lg">Alerte</Text>
            </View>
          </View>

          <Text className="text-sm text-foreground-muted">
            NativeWind + Expo SDK 52 ✓
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
