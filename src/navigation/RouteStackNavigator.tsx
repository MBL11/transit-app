/**
 * Route Stack Navigator
 * Navigation stack for Route tab (RouteScreen → RouteDetailsScreen)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RouteScreen } from '../screens/RouteScreen';
import { RouteDetailsScreen } from '../screens/RouteDetailsScreen';
import type { SerializableJourneyResult } from '../core/types/routing-serialization';

export type RouteStackParamList = {
  RouteCalculation: undefined;
  RouteDetails: {
    journey: SerializableJourneyResult;
  };
};

const Stack = createNativeStackNavigator<RouteStackParamList>();

export function RouteStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="RouteCalculation"
        component={RouteScreen}
      />
      <Stack.Screen
        name="RouteDetails"
        component={RouteDetailsScreen}
      />
    </Stack.Navigator>
  );
}
