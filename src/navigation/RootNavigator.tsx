/**
 * Root Navigator
 * Main navigation structure with bottom tabs
 */

import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { MapStackNavigator } from './MapStackNavigator';
import { LinesStackNavigator } from './LinesStackNavigator';
import { SearchStackNavigator } from './SearchStackNavigator';
import { RouteStackNavigator } from './RouteStackNavigator';
import { FavoritesStackNavigator } from './FavoritesStackNavigator';
import { SettingsStackNavigator } from './SettingsStackNavigator';

const Tab = createBottomTabNavigator();

// Custom light theme for navigation
const LightNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#000000',
    border: '#E5E5E5',
    primary: '#0066CC',
    notification: '#FF6600',
  },
};

// Custom dark theme for navigation
const DarkNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#121212',
    card: '#1E1E1E',
    text: '#FAFAFA',
    border: '#323232',
    primary: '#0066CC',
    notification: '#FF6600',
  },
};

export function RootNavigator() {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer theme={isDark ? DarkNavigationTheme : LightNavigationTheme}>
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
        <Tab.Screen
          name="Settings"
          component={SettingsStackNavigator}
          options={{
            title: t('settings.title'),
            tabBarLabel: t('settings.title'),
            tabBarIcon: ({ color }) => <TabIcon icon="⚙️" color={color} />,
            headerShown: false, // Let the stack handle its own headers
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
    </>
  );
}

// Simple tab icon component using emoji
function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 24, color }}>{icon}</Text>;
}
