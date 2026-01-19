/**
 * Route Stack Navigator
 * Navigation stack for Route tab (RouteScreen → RouteDetailsScreen)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

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
          title: t('tabs.route'),
          headerShown: false, // Let the tab navigator handle the header
        }}
      />
      <Stack.Screen
        name="RouteDetails"
        component={RouteDetailsScreen}
        options={{
          title: t('route.title'),
        }}
      />
    </Stack.Navigator>
  );
}
