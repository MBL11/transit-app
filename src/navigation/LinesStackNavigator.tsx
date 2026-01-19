/**
 * Lines Stack Navigator
 * Navigation stack for Lines tab (LinesScreen → LineDetailsScreen → StopDetailsScreen)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinesScreen } from '../screens/LinesScreen';
import { LineDetailsScreen } from '../screens/LineDetailsScreen';
import { StopDetailsScreen } from '../screens/StopDetailsScreen';
import type { LinesStackParamList } from './types';

const Stack = createNativeStackNavigator<LinesStackParamList>();

export function LinesStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="LinesList"
        component={LinesScreen}
      />
      <Stack.Screen
        name="LineDetails"
        component={LineDetailsScreen}
      />
      <Stack.Screen
        name="StopDetails"
        component={StopDetailsScreen}
      />
    </Stack.Navigator>
  );
}
