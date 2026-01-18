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
        name="FavoritesList"
        component={FavoritesScreen}
        options={{
          title: 'Favoris',
        }}
      />
    </Stack.Navigator>
  );
}
