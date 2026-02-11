/**
 * Map Stack Navigator
 * Navigation stack for Map tab (MapScreen → StopDetailsScreen → AlertsScreen)
 */

import React from 'react';
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
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="MapView"
        component={MapScreen}
      />
      <Stack.Screen
        name="StopDetails"
        component={StopDetailsScreen}
      />
      <Stack.Screen
        name="Alerts"
        component={AlertsScreen}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen as React.ComponentType<any>}
      />
    </Stack.Navigator>
  );
}
