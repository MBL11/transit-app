/**
 * Route Stack Navigator
 * Navigation stack for Route tab (RouteScreen)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RouteScreen } from '../screens/RouteScreen';

export type RouteStackParamList = {
  RouteCalculation: undefined;
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
    </Stack.Navigator>
  );
}
