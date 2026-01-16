/**
 * Map Stack Navigator
 * Navigation stack for Map tab (MapScreen → StopDetailsScreen)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MapScreen } from '../screens/MapScreen';
import { StopDetailsScreen } from '../screens/StopDetailsScreen';
import type { LinesStackParamList } from './types';

// Reuse LinesStackParamList since StopDetails is the same
export type MapStackParamList = {
  MapView: undefined;
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
        options={{
          title: 'Carte',
          headerShown: false, // Let the tab navigator handle the header
        }}
      />
      <Stack.Screen
        name="StopDetails"
        component={StopDetailsScreen}
        options={{
          title: 'Détails de l\'arrêt',
        }}
      />
    </Stack.Navigator>
  );
}
