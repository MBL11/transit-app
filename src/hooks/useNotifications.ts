import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/types';
import { clearBadge } from '../services/notifications';
import Constants from 'expo-constants';

type NavigationProp = StackNavigationProp<RootStackParamList>;

/**
 * Hook to handle notification lifecycle and user interactions
 * - Listens for notification taps
 * - Navigates to appropriate screen based on notification data
 * - Manages notification badge
 */
export function useNotifications() {
  const navigation = useNavigation<NavigationProp>();
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Check if running in Expo Go
  const isExpoGo = Constants.appOwnership === 'expo';

  useEffect(() => {
    // Skip notifications setup in Expo Go
    if (isExpoGo) {
      console.log('[useNotifications] Skipping setup (Expo Go)');
      return;
    }
    // Clear badge when app opens
    clearBadge().catch((error) => {
      console.warn('[useNotifications] Failed to clear badge:', error);
    });

    // Listener for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[useNotifications] Notification received:', notification);
      setNotification(notification);
    });

    // Listener for user tapping on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[useNotifications] Notification tapped:', response);
      handleNotificationTap(response);
    });

    // Check if app was opened from a notification
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          console.log('[useNotifications] App opened from notification');
          handleNotificationTap(response);
        }
      })
      .catch((error) => {
        console.warn('[useNotifications] Failed to get last notification:', error);
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isExpoGo]);

  /**
   * Handle user tapping on a notification
   */
  const handleNotificationTap = (response: Notifications.NotificationResponse) => {
    try {
      const data = response.notification.request.content.data;

      // Clear badge
      clearBadge().catch((error) => {
        console.warn('[useNotifications] Failed to clear badge:', error);
      });

      // Navigate based on notification type
      // Use setTimeout to ensure navigation is ready
      setTimeout(() => {
        try {
          if (data.type === 'alert') {
            // Navigate to alerts screen or specific line
            if (data.routeId) {
              // @ts-ignore - navigation types are complex with nested navigators
              navigation.navigate('LineDetails', { routeId: data.routeId as string });
            } else {
              // @ts-ignore
              navigation.navigate('Alerts');
            }
          } else if (data.type === 'departure') {
            // Navigate to stop details
            if (data.stopId) {
              // @ts-ignore
              navigation.navigate('StopDetails', { stopId: data.stopId as string });
            }
          }
        } catch (navError) {
          console.warn('[useNotifications] Navigation failed:', navError);
        }
      }, 500);
    } catch (error) {
      console.error('[useNotifications] Error handling notification tap:', error);
    }
  };

  return {
    notification,
  };
}

/**
 * Hook to manage notification permissions
 */
export function useNotificationPermissions() {
  const [permissionStatus, setPermissionStatus] = useState<Notifications.NotificationPermissionsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPermissionStatus();
  }, []);

  const loadPermissionStatus = async () => {
    try {
      const status = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
    } catch (error) {
      console.error('[useNotificationPermissions] Failed to get permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus({ status } as Notifications.NotificationPermissionsStatus);
      return status === 'granted';
    } catch (error) {
      console.error('[useNotificationPermissions] Failed to request permissions:', error);
      return false;
    }
  };

  return {
    permissionStatus,
    isLoading,
    isGranted: permissionStatus?.status === 'granted',
    requestPermissions,
    reload: loadPermissionStatus,
  };
}
