/**
 * Favorites Stack Navigator
 * Navigation stack for favorites section
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { StopDetailsScreen } from '../screens/StopDetailsScreen';
import { LineDetailsScreen } from '../screens/LineDetailsScreen';
import type { FavoritesStackParamList } from './types';

const Stack = createNativeStackNavigator<FavoritesStackParamList>();

export function FavoritesStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="FavoritesList"
        component={FavoritesScreen}
      />
      <Stack.Screen
        name="StopDetails"
        component={StopDetailsScreen}
      />
      <Stack.Screen
        name="LineDetails"
        component={LineDetailsScreen}
      />
    </Stack.Navigator>
  );
}
