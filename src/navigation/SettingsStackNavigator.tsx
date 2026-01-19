/**
 * Settings Stack Navigator
 * Navigation stack for settings section
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsScreen } from '../screens/SettingsScreen';
import { DataManagementScreen } from '../screens/DataManagementScreen';

export type SettingsStackParamList = {
  SettingsList: undefined;
  DataManagement: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="SettingsList"
        component={SettingsScreen}
      />
      <Stack.Screen
        name="DataManagement"
        component={DataManagementScreen}
      />
    </Stack.Navigator>
  );
}
