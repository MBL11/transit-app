import * as Amplitude from '@amplitude/analytics-react-native';
import Constants from 'expo-constants';

const IS_DEV = __DEV__;
const AMPLITUDE_API_KEY = process.env.EXPO_PUBLIC_AMPLITUDE_KEY || '';

let isInitialized = false;

/**
 * Initialize Amplitude analytics
 */
export async function initAnalytics(): Promise<void> {
  if (isInitialized) {
    console.log('[Analytics] Already initialized');
    return;
  }

  // Skip in development unless explicitly enabled
  if (IS_DEV && !process.env.EXPO_PUBLIC_ENABLE_ANALYTICS_DEV) {
    console.log('[Analytics] Skipped in development mode');
    return;
  }

  // Skip if no API key
  if (!AMPLITUDE_API_KEY) {
    console.warn('[Analytics] No Amplitude API key found');
    return;
  }

  try {
    await Amplitude.init(AMPLITUDE_API_KEY, undefined, {
      // Configure Amplitude
      trackingOptions: {
        ipAddress: false, // Don't track IP for privacy
      },
      minIdLength: 1,
    });

    // Set user properties
    const deviceInfo = {
      platform: Constants.platform?.ios ? 'ios' : 'android',
      appVersion: Constants.expoConfig?.version || '1.0.0',
      deviceName: Constants.deviceName || 'Unknown',
      osVersion: Constants.platform?.ios
        ? Constants.platform.ios.systemVersion
        : Constants.platform?.android?.versionName || 'Unknown',
    };

    await Amplitude.setDeviceId(Constants.sessionId || 'unknown');
    await Amplitude.identify(
      new Amplitude.Identify()
        .set('platform', deviceInfo.platform)
        .set('app_version', deviceInfo.appVersion)
        .set('device_name', deviceInfo.deviceName)
        .set('os_version', deviceInfo.osVersion)
    );

    isInitialized = true;
    console.log('[Analytics] Initialized successfully');
  } catch (error) {
    console.error('[Analytics] Initialization failed:', error);
  }
}

/**
 * Track an event
 */
export async function trackEvent(
  eventName: string,
  properties?: Record<string, any>
): Promise<void> {
  if (!isInitialized) {
    console.log('[Analytics] Not initialized, skipping event:', eventName);
    return;
  }

  try {
    await Amplitude.track(eventName, properties);
    console.log('[Analytics] Event tracked:', eventName, properties);
  } catch (error) {
    console.error('[Analytics] Failed to track event:', eventName, error);
  }
}

/**
 * Set user ID (e.g., after login or when getting push token)
 */
export async function setUserId(userId: string): Promise<void> {
  if (!isInitialized) return;

  try {
    await Amplitude.setUserId(userId);
    console.log('[Analytics] User ID set:', userId);
  } catch (error) {
    console.error('[Analytics] Failed to set user ID:', error);
  }
}

/**
 * Set user property
 */
export async function setUserProperty(
  key: string,
  value: any
): Promise<void> {
  if (!isInitialized) return;

  try {
    await Amplitude.identify(new Amplitude.Identify().set(key, value));
    console.log('[Analytics] User property set:', key, value);
  } catch (error) {
    console.error('[Analytics] Failed to set user property:', error);
  }
}

/**
 * Track screen view
 */
export async function trackScreenView(screenName: string): Promise<void> {
  await trackEvent('screen_view', { screen_name: screenName });
}

// ====================
// Predefined Events
// ====================

export const AnalyticsEvents = {
  // App lifecycle
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',
  APP_FOREGROUNDED: 'app_foregrounded',

  // Search
  SEARCH_PERFORMED: 'search_performed',
  SEARCH_RESULT_CLICKED: 'search_result_clicked',

  // Route planning
  ROUTE_SEARCHED: 'route_searched',
  ROUTE_CALCULATED: 'route_calculated',
  ROUTE_SELECTED: 'route_selected',
  ROUTE_FAILED: 'route_calculation_failed',

  // Favorites
  FAVORITE_ADDED: 'favorite_added',
  FAVORITE_REMOVED: 'favorite_removed',

  // Stops & Lines
  STOP_VIEWED: 'stop_viewed',
  LINE_VIEWED: 'line_viewed',
  NEXT_DEPARTURES_VIEWED: 'next_departures_viewed',

  // Alerts
  ALERTS_VIEWED: 'alerts_viewed',
  ALERT_CLICKED: 'alert_clicked',

  // Settings
  LANGUAGE_CHANGED: 'language_changed',
  THEME_CHANGED: 'theme_changed',
  NOTIFICATIONS_TOGGLED: 'notifications_toggled',

  // Data management
  DATA_IMPORTED: 'data_imported',
  DATA_CLEARED: 'data_cleared',
  DATA_UPDATE_CHECKED: 'data_update_checked',

  // Navigation
  NAVIGATION_TAB_CHANGED: 'navigation_tab_changed',
  BACK_BUTTON_PRESSED: 'back_button_pressed',

  // Errors
  ERROR_OCCURRED: 'error_occurred',
  NETWORK_ERROR: 'network_error',
  API_ERROR: 'api_error',
} as const;

// ====================
// Helper Functions
// ====================

/**
 * Track app opened
 */
export async function trackAppOpened(): Promise<void> {
  await trackEvent(AnalyticsEvents.APP_OPENED, {
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track search
 */
export async function trackSearch(
  query: string,
  type: 'stop' | 'line',
  resultCount: number
): Promise<void> {
  await trackEvent(AnalyticsEvents.SEARCH_PERFORMED, {
    query_length: query.length,
    search_type: type,
    result_count: resultCount,
  });
}

/**
 * Track route calculation
 */
export async function trackRouteCalculation(
  fromType: 'stop' | 'address',
  toType: 'stop' | 'address',
  duration: number,
  transfers: number,
  success: boolean
): Promise<void> {
  await trackEvent(
    success ? AnalyticsEvents.ROUTE_CALCULATED : AnalyticsEvents.ROUTE_FAILED,
    {
      from_type: fromType,
      to_type: toType,
      duration_minutes: duration,
      transfers,
      success,
    }
  );
}

/**
 * Track favorite action
 */
export async function trackFavorite(
  action: 'add' | 'remove',
  type: 'stop' | 'line' | 'journey'
): Promise<void> {
  await trackEvent(
    action === 'add' ? AnalyticsEvents.FAVORITE_ADDED : AnalyticsEvents.FAVORITE_REMOVED,
    { favorite_type: type }
  );
}

/**
 * Track error
 */
export async function trackError(
  errorType: string,
  errorMessage: string,
  context?: Record<string, any>
): Promise<void> {
  await trackEvent(AnalyticsEvents.ERROR_OCCURRED, {
    error_type: errorType,
    error_message: errorMessage.substring(0, 100), // Limit length
    ...context,
  });
}

/**
 * Track settings change
 */
export async function trackSettingsChange(
  setting: string,
  value: any
): Promise<void> {
  let eventName = AnalyticsEvents.THEME_CHANGED;

  if (setting === 'language') {
    eventName = AnalyticsEvents.LANGUAGE_CHANGED;
  } else if (setting === 'theme') {
    eventName = AnalyticsEvents.THEME_CHANGED;
  } else if (setting === 'notifications') {
    eventName = AnalyticsEvents.NOTIFICATIONS_TOGGLED;
  }

  await trackEvent(eventName, {
    setting,
    value: String(value),
  });
}
