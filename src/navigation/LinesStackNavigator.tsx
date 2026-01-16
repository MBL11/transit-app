/**
 * Lines Stack Navigator
 * Navigation stack for Lines tab (LinesScreen → LineDetailsScreen → StopDetailsScreen)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinesScreen } from '../screens/LinesScreen';
import { LineDetailsScreen } from '../screens/LineDetailsScreen';

export type LinesStackParamList = {
  LinesList: undefined;
  LineDetails: { routeId: string };
  StopDetails: { stopId: string };
};

const Stack = createNativeStackNavigator<LinesStackParamList>();

export function LinesStackNavigator() {
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
        name="LinesList"
        component={LinesScreen}
        options={{
          title: 'Lignes',
          headerShown: false, // Let the tab navigator handle the header
        }}
      />
      <Stack.Screen
        name="LineDetails"
        component={LineDetailsScreen}
        options={{
          title: 'Détails de la ligne',
        }}
      />
    </Stack.Navigator>
  );
}
