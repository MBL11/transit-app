/**
 * Favorites Stack Navigator
 * Navigation stack for favorites section
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FavoritesScreen } from '../screens/FavoritesScreen';

export type FavoritesStackParamList = {
  FavoritesList: undefined;
};

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
    </Stack.Navigator>
  );
}
