import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Alert } from '../types/alert';
import { logger } from '../utils/logger';

const NOTIFICATION_SETTINGS_KEY = '@notifications_enabled';
const PUSH_TOKEN_KEY = '@push_token';

/**
 * Configure notification behavior
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get Expo push token
 * Returns the push token or null if registration fails
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Check if device is physical (push notifications don't work on simulator)
  if (!Device.isDevice) {
    logger.log('[Notifications] Push notifications only work on physical devices');
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // If permission denied, return null
    if (finalStatus !== 'granted') {
      logger.log('[Notifications] Permission not granted');
      return null;
    }

    // Get Expo push token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID || '',
    });

    logger.log('[Notifications] Push token:', token.data);

    // Save token to storage
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token.data);

    // Configure Android channel (required for Android 8+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alerts', {
        name: 'Traffic Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF0000',
        description: 'Notifications for traffic alerts on your favorite lines',
      });

      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    return token.data;
  } catch (error) {
    logger.error('[Notifications] Failed to register:', error);
    return null;
  }
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    return enabled === 'true';
  } catch (error) {
    logger.warn('[Notifications] Failed to check settings:', error);
    return false;
  }
}

/**
 * Enable notifications
 */
export async function enableNotifications(): Promise<boolean> {
  try {
    const token = await registerForPushNotifications();
    if (!token) {
      return false;
    }

    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, 'true');
    logger.log('[Notifications] Enabled');
    return true;
  } catch (error) {
    logger.error('[Notifications] Failed to enable:', error);
    return false;
  }
}

/**
 * Disable notifications
 */
export async function disableNotifications(): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, 'false');
    // Cancel all scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    logger.log('[Notifications] Disabled');
  } catch (error) {
    logger.error('[Notifications] Failed to disable:', error);
  }
}

/**
 * Get stored push token
 */
export async function getPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch (error) {
    logger.warn('[Notifications] Failed to get push token:', error);
    return null;
  }
}

/**
 * Schedule a local notification for an alert
 */
export async function scheduleAlertNotification(alert: Alert): Promise<string | null> {
  try {
    const enabled = await areNotificationsEnabled();
    if (!enabled) {
      return null;
    }

    // Determine severity emoji and channel
    let emoji = '⚠️';
    let channelId = 'alerts';

    if (alert.severity === 'SEVERE') {
      emoji = '🚨';
    } else if (alert.severity === 'MODERATE') {
      emoji = '⚠️';
    } else {
      emoji = 'ℹ️';
      channelId = 'default';
    }

    // Format the title
    const title = `${emoji} ${alert.header}`;

    // Schedule notification immediately
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: alert.description || 'Tap to view details',
        data: {
          alertId: alert.id,
          routeId: alert.affectedRoutes?.[0],
          severity: alert.severity,
          type: 'alert',
        },
        sound: alert.severity === 'SEVERE',
        badge: 1,
      },
      trigger: null, // null = immediate
    });

    logger.log('[Notifications] Scheduled alert notification:', notificationId);
    return notificationId;
  } catch (error) {
    logger.error('[Notifications] Failed to schedule alert notification:', error);
    return null;
  }
}

/**
 * Schedule a notification for upcoming departure
 */
export async function scheduleDepartureReminder(
  stopName: string,
  lineName: string,
  departureTime: Date,
  minutesBefore: number = 5
): Promise<string | null> {
  try {
    const enabled = await areNotificationsEnabled();
    if (!enabled) {
      return null;
    }

    const triggerTime = new Date(departureTime.getTime() - minutesBefore * 60 * 1000);
    const now = new Date();

    // Don't schedule if trigger time is in the past
    if (triggerTime <= now) {
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🚇 ${lineName} departing soon`,
        body: `From ${stopName} at ${departureTime.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })}`,
        data: {
          stopName,
          lineName,
          departureTime: departureTime.toISOString(),
          type: 'departure',
        },
        sound: true,
      },
      trigger: triggerTime,
    });

    logger.log('[Notifications] Scheduled departure reminder:', notificationId);
    return notificationId;
  } catch (error) {
    logger.error('[Notifications] Failed to schedule departure reminder:', error);
    return null;
  }
}

/**
 * Cancel a specific notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    logger.log('[Notifications] Cancelled notification:', notificationId);
  } catch (error) {
    logger.error('[Notifications] Failed to cancel notification:', error);
  }
}

/**
 * Cancel all notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    logger.log('[Notifications] Cancelled all notifications');
  } catch (error) {
    logger.error('[Notifications] Failed to cancel all notifications:', error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    logger.error('[Notifications] Failed to get scheduled notifications:', error);
    return [];
  }
}

/**
 * Clear notification badge
 */
export async function clearBadge(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    logger.error('[Notifications] Failed to clear badge:', error);
  }
}
