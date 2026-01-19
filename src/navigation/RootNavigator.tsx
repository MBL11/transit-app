/**
 * Root Navigator
 * Main navigation structure with bottom tabs
 */

import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { MapStackNavigator } from './MapStackNavigator';
import { LinesStackNavigator } from './LinesStackNavigator';
import { SearchStackNavigator } from './SearchStackNavigator';
import { RouteStackNavigator } from './RouteStackNavigator';
import { FavoritesStackNavigator } from './FavoritesStackNavigator';

const Tab = createBottomTabNavigator();

export function RootNavigator() {
  const { t } = useTranslation();

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
          component={MapStackNavigator}
          options={{
            title: t('tabs.map'),
            tabBarLabel: t('tabs.map'),
            tabBarIcon: ({ color }) => <TabIcon icon="🗺️" color={color} />,
            headerShown: false, // Let the stack handle its own headers
          }}
        />
        <Tab.Screen
          name="Lines"
          component={LinesStackNavigator}
          options={{
            title: t('tabs.lines'),
            tabBarLabel: t('tabs.lines'),
            tabBarIcon: ({ color }) => <TabIcon icon="🚇" color={color} />,
            headerShown: false, // Let the stack handle its own headers
          }}
        />
        <Tab.Screen
          name="SearchTab"
          component={SearchStackNavigator}
          options={{
            title: t('tabs.search'),
            tabBarLabel: t('tabs.search'),
            tabBarIcon: ({ color }) => <TabIcon icon="🔍" color={color} />,
            headerShown: false, // Let the stack handle its own headers
          }}
        />
        <Tab.Screen
          name="Route"
          component={RouteStackNavigator}
          options={{
            title: t('tabs.route'),
            tabBarLabel: t('tabs.route'),
            tabBarIcon: ({ color }) => <TabIcon icon="🚏" color={color} />,
            headerShown: false, // Let the stack handle its own headers
          }}
        />
        <Tab.Screen
          name="Favorites"
          component={FavoritesStackNavigator}
          options={{
            title: t('tabs.favorites'),
            tabBarLabel: t('tabs.favorites'),
            tabBarIcon: ({ color }) => <TabIcon icon="⭐" color={color} />,
            headerShown: false, // Let the stack handle its own headers
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
