/**
 * Root Navigator
 * Main navigation structure with bottom tabs
 */

import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useTheme } from '../contexts/ThemeContext';
import { MapStackNavigator } from './MapStackNavigator';
import { LinesStackNavigator } from './LinesStackNavigator';
import { SearchStackNavigator } from './SearchStackNavigator';
import { RouteStackNavigator } from './RouteStackNavigator';
import { FavoritesStackNavigator } from './FavoritesStackNavigator';
import { SettingsStackNavigator } from './SettingsStackNavigator';
import { useNotifications } from '../hooks/useNotifications';
import { startAlertMonitoring, stopAlertMonitoring } from '../services/alert-monitor';
import { getAdapter } from '../adapters';

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

/**
 * NavigationContent component - handles navigation setup inside NavigationContainer
 * This component must be inside NavigationContainer to use navigation hooks
 */
function NavigationContent() {
  const { t } = useTranslation();

  console.log('[NavigationContent] Rendering...');

  // Check if running in Expo Go
  const isExpoGo = Constants.appOwnership === 'expo';
  console.log('[NavigationContent] isExpoGo:', isExpoGo);

  // Setup notification handlers (must be inside NavigationContainer)
  // Hook will handle Expo Go detection internally
  useNotifications();
  console.log('[NavigationContent] useNotifications ENABLED');

  // Start alert monitoring
  // TEMPORARILY DISABLED FOR DEBUG
  /*
  useEffect(() => {
    console.log('[NavigationContent] Setting up alert monitoring...');

    // Skip alert monitoring in Expo Go since it depends on notifications
    if (isExpoGo) {
      console.log('[NavigationContent] Skipping alert monitoring (Expo Go)');
      return;
    }

    // Delay alert monitoring to not block initial render
    const timer = setTimeout(() => {
      try {
        console.log('[NavigationContent] Starting alert monitoring...');
        const adapter = getAdapter();

        // Start monitoring for alerts on favorite lines
        startAlertMonitoring((routeIds) => adapter.getAlerts(routeIds));
        console.log('[NavigationContent] Alert monitoring started');
      } catch (error) {
        console.warn('[NavigationContent] Failed to start alert monitoring:', error);
      }
    }, 5000); // Wait 5 seconds after app loads to avoid blocking

    // Cleanup on unmount
    return () => {
      clearTimeout(timer);
      stopAlertMonitoring();
    };
  }, [isExpoGo]);
  */

  console.log('[NavigationContent] Rendering Tab.Navigator...');

  return (
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
        lazy: false, // Disable lazy loading to prevent initial load issues
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
  );
}

export function RootNavigator() {
  console.log('[RootNavigator] Component called');

  let isDark = false;
  try {
    const theme = useTheme();
    isDark = theme.isDark;
    console.log('[RootNavigator] isDark:', isDark);
    console.log('[RootNavigator] useTheme succeeded');
  } catch (error) {
    console.error('[RootNavigator] useTheme failed:', error);
    throw error;
  }

  console.log('[RootNavigator] Rendering NavigationContainer...');

  try {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <NavigationContainer linking={undefined} theme={isDark ? DarkNavigationTheme : LightNavigationTheme}>
          <NavigationContent />
        </NavigationContainer>
      </>
    );
  } catch (error) {
    console.error('[RootNavigator] Rendering failed:', error);
    throw error;
  }
}

// Simple tab icon component using emoji
function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 24, color }}>{icon}</Text>;
}
