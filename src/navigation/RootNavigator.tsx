/**
 * Root Navigator
 * Main navigation structure with bottom tabs
 */

import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MapScreen, LinesScreen } from '../screens';

const Tab = createBottomTabNavigator();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0066CC',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          tabBarActiveTintColor: '#0066CC',
          tabBarInactiveTintColor: '#666',
        }}
      >
        <Tab.Screen
          name="Map"
          component={MapScreen}
          options={{
            title: 'Carte',
            tabBarLabel: 'Carte',
            tabBarIcon: ({ color }) => <TabIcon icon="🗺️" color={color} />,
          }}
        />
        <Tab.Screen
          name="Lines"
          component={LinesScreen}
          options={{
            title: 'Lignes',
            tabBarLabel: 'Lignes',
            tabBarIcon: ({ color }) => <TabIcon icon="🚇" color={color} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// Simple tab icon component using emoji
function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 24, color }}>{icon}</Text>;
}
