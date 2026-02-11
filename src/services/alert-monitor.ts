import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Alert } from '../core/types/adapter';
import { scheduleAlertNotification, areNotificationsEnabled } from './notifications';
import * as favoritesStorage from '../core/favorites';
import { logger } from '../utils/logger';

const ALERT_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes
const SENT_ALERTS_KEY = '@sent_alert_ids';

let monitorInterval: NodeJS.Timeout | null = null;

/**
 * Get list of alert IDs that have already been sent as notifications
 */
async function getSentAlertIds(): Promise<Set<string>> {
  try {
    const stored = await AsyncStorage.getItem(SENT_ALERTS_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (error) {
    logger.warn('[AlertMonitor] Failed to load sent alerts:', error);
  }
  return new Set();
}

/**
 * Save alert ID to prevent duplicate notifications
 */
async function markAlertAsSent(alertId: string): Promise<void> {
  try {
    const sentIds = await getSentAlertIds();
    sentIds.add(alertId);

    // Keep only last 100 alerts to prevent storage growth
    const idsArray = Array.from(sentIds).slice(-100);
    await AsyncStorage.setItem(SENT_ALERTS_KEY, JSON.stringify(idsArray));
  } catch (error) {
    logger.warn('[AlertMonitor] Failed to mark alert as sent:', error);
  }
}

/**
 * Clear old sent alert IDs (older than 24 hours)
 */
async function clearOldSentAlerts(): Promise<void> {
  try {
    // For now, just reset - in production you'd track timestamps
    await AsyncStorage.setItem(SENT_ALERTS_KEY, JSON.stringify([]));
  } catch (error) {
    logger.warn('[AlertMonitor] Failed to clear old alerts:', error);
  }
}

/**
 * Check for new alerts on favorite lines
 */
async function checkFavoriteAlertsInternal(
  fetchAlerts: (routeIds?: string[]) => Promise<Alert[]>
): Promise<void> {
  try {
    // Check if notifications are enabled
    const notificationsEnabled = await areNotificationsEnabled();
    if (!notificationsEnabled) {
      logger.log('[AlertMonitor] Notifications disabled, skipping check');
      return;
    }

    // Get favorite lines
    const favoriteLines = await favoritesStorage.getFavoritesByType('route');
    if (favoriteLines.length === 0) {
      logger.log('[AlertMonitor] No favorite lines to monitor');
      return;
    }

    // Extract route IDs from favorites
    const routeIds = favoriteLines.map((fav) => fav.id);

    // Fetch current alerts for these routes
    const alerts = await fetchAlerts(routeIds);

    // Filter severe and warning alerts only
    const importantAlerts = alerts.filter(
      (alert) => alert.severity === 'severe' || alert.severity === 'warning'
    );

    if (importantAlerts.length === 0) {
      logger.log('[AlertMonitor] No important alerts found');
      return;
    }

    // Get already-sent alert IDs
    const sentIds = await getSentAlertIds();

    // Send notifications for new alerts
    let newAlertCount = 0;
    for (const alert of importantAlerts) {
      if (!sentIds.has(alert.id)) {
        const notificationId = await scheduleAlertNotification(alert);
        if (notificationId) {
          await markAlertAsSent(alert.id);
          newAlertCount++;
          logger.log('[AlertMonitor] Sent notification for alert:', alert.id);
        }
      }
    }

    if (newAlertCount > 0) {
      logger.log(`[AlertMonitor] Sent ${newAlertCount} new alert notifications`);
    }
  } catch (error) {
    logger.error('[AlertMonitor] Error checking alerts:', error);
  }
}

/**
 * Start monitoring alerts for favorite lines
 *
 * @param fetchAlerts - Function to fetch alerts, takes optional route IDs
 */
export function startAlertMonitoring(
  fetchAlerts: (routeIds?: string[]) => Promise<Alert[]>
): void {
  if (monitorInterval) {
    logger.log('[AlertMonitor] Already monitoring');
    return;
  }

  logger.log('[AlertMonitor] Starting alert monitoring');

  // Check immediately
  checkFavoriteAlertsInternal(fetchAlerts);

  // Then check periodically
  monitorInterval = setInterval(() => {
    checkFavoriteAlertsInternal(fetchAlerts);
  }, ALERT_CHECK_INTERVAL);

  // Clear old alerts once per day
  const clearInterval = setInterval(() => {
    clearOldSentAlerts();
  }, 24 * 60 * 60 * 1000);

  // Store clearInterval reference for cleanup
  (monitorInterval as any)._clearInterval = clearInterval;
}

/**
 * Stop monitoring alerts
 */
export function stopAlertMonitoring(): void {
  if (monitorInterval) {
    logger.log('[AlertMonitor] Stopping alert monitoring');
    clearInterval(monitorInterval);

    // Clear the daily cleanup interval
    if ((monitorInterval as any)._clearInterval) {
      clearInterval((monitorInterval as any)._clearInterval);
    }

    monitorInterval = null;
  }
}

/**
 * Manually trigger an alert check (useful for testing or after favorites change)
 */
export async function checkNow(
  fetchAlerts: (routeIds?: string[]) => Promise<Alert[]>
): Promise<void> {
  logger.log('[AlertMonitor] Manual alert check triggered');
  await checkFavoriteAlertsInternal(fetchAlerts);
}
