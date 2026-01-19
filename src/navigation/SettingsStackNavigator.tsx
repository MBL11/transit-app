/**
 * Settings Stack Navigator
 * Navigation stack for settings section
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SettingsScreen } from '../screens/SettingsScreen';

export type SettingsStackParamList = {
  SettingsList: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStackNavigator() {
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
        name="SettingsList"
        component={SettingsScreen}
        options={{
          title: t('settings.title'),
        }}
      />
    </Stack.Navigator>
  );
}
