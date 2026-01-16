/**
 * Search Stack Navigator
 * Navigation stack for Search tab (SearchScreen → StopDetailsScreen)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SearchScreen } from '../screens/SearchScreen';
import { StopDetailsScreen } from '../screens/StopDetailsScreen';
import { LineDetailsScreen } from '../screens/LineDetailsScreen';
import type { LinesStackParamList } from './types';

// Reuse LinesStackParamList for StopDetails and LineDetails
export type SearchStackParamList = {
  Search: undefined;
} & Pick<LinesStackParamList, 'StopDetails' | 'LineDetails'>;

const Stack = createNativeStackNavigator<SearchStackParamList>();

export function SearchStackNavigator() {
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
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Recherche',
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
