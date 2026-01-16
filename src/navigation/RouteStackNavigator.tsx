/**
 * Route Stack Navigator
 * Navigation stack for Route tab (RouteScreen → RouteDetailsScreen)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RouteScreen } from '../screens/RouteScreen';
import { RouteDetailsScreen } from '../screens/RouteDetailsScreen';
import type { JourneyResult } from '../core/types/routing';

export type RouteStackParamList = {
  RouteCalculation: undefined;
  RouteDetails: {
    journey: JourneyResult;
  };
};

const Stack = createNativeStackNavigator<RouteStackParamList>();

export function RouteStackNavigator() {
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
        name="RouteCalculation"
        component={RouteScreen}
        options={{
          title: 'Itinéraire',
          headerShown: false, // Let the tab navigator handle the header
        }}
      />
      <Stack.Screen
        name="RouteDetails"
        component={RouteDetailsScreen}
        options={{
          title: 'Détails de l\'itinéraire',
        }}
      />
    </Stack.Navigator>
  );
}
