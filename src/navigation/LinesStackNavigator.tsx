/**
 * Lines Stack Navigator
 * Navigation stack for Lines tab (LinesScreen → LineDetailsScreen → StopDetailsScreen)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { LinesScreen } from '../screens/LinesScreen';
import { LineDetailsScreen } from '../screens/LineDetailsScreen';
import { StopDetailsScreen } from '../screens/StopDetailsScreen';
import type { LinesStackParamList } from './types';

console.log('[LinesStackNavigator] StopDetailsScreen imported:', !!StopDetailsScreen);

const Stack = createNativeStackNavigator<LinesStackParamList>();

export function LinesStackNavigator() {
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
        name="LinesList"
        component={LinesScreen}
        options={{
          title: t('tabs.lines'),
          headerShown: false, // Let the tab navigator handle the header
        }}
      />
      <Stack.Screen
        name="LineDetails"
        component={LineDetailsScreen}
        options={{
          title: t('transit.lines'),
        }}
      />
      <Stack.Screen
        name="StopDetails"
        component={StopDetailsScreen}
        options={{
          title: t('transit.stops'),
        }}
      />
    </Stack.Navigator>
  );
}
