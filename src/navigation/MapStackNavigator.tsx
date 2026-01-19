/**
 * Map Stack Navigator
 * Navigation stack for Map tab (MapScreen → StopDetailsScreen → AlertsScreen)
 */

import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MapScreen } from '../screens/MapScreen';
import { StopDetailsScreen } from '../screens/StopDetailsScreen';
import { AlertsScreen } from '../screens/AlertsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type { LinesStackParamList } from './types';

// Reuse LinesStackParamList since StopDetails is the same
export type MapStackParamList = {
  MapView: undefined;
  Alerts: undefined;
  Settings: undefined;
} & Pick<LinesStackParamList, 'StopDetails'>;

const Stack = createNativeStackNavigator<MapStackParamList>();

export function MapStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0066CC',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="MapView"
        component={MapScreen}
        options={({ navigation }) => ({
          title: 'Carte',
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={{ paddingRight: 16 }}
            >
              <Text style={{ fontSize: 24 }}>⚙️</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="StopDetails"
        component={StopDetailsScreen}
        options={{
          title: 'Détails de l\'arrêt',
        }}
      />
      <Stack.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          title: 'Perturbations en cours',
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Paramètres',
        }}
      />
    </Stack.Navigator>
  );
}
