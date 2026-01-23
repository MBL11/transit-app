/**
 * Analytics Service
 * Track user events with Amplitude
 */

import * as Amplitude from '@amplitude/analytics-react-native';
import Constants from 'expo-constants';

const AMPLITUDE_API_KEY = Constants.expoConfig?.extra?.amplitudeApiKey || process.env.EXPO_PUBLIC_AMPLITUDE_KEY || '';

let isInitialized = false;

/**
 * Initialize Amplitude analytics
 */
export async function initAnalytics(): Promise<void> {
  if (isInitialized) {
    console.log('[Analytics] Already initialized');
    return;
  }

  if (!AMPLITUDE_API_KEY) {
    console.warn('[Analytics] No Amplitude API key found, analytics disabled');
    return;
  }

  try {
    await Amplitude.init(AMPLITUDE_API_KEY, undefined, {
      logLevel: __DEV__ ? Amplitude.Types.LogLevel.Verbose : Amplitude.Types.LogLevel.None,
      defaultTracking: {
        sessions: true,
        appLifecycles: true,
        deepLinks: true,
        screenViews: false, // We'll track manually for more control
      },
    });

    isInitialized = true;
    console.log('[Analytics] Amplitude initialized successfully');
  } catch (error) {
    console.error('[Analytics] Failed to initialize Amplitude:', error);
  }
}

/**
 * Track a custom event
 */
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  if (!isInitialized) {
    if (__DEV__) {
      console.log(`[Analytics] (disabled) ${eventName}`, properties);
    }
    return;
  }

  try {
    Amplitude.track(eventName, properties);
    if (__DEV__) {
      console.log(`[Analytics] Tracked: ${eventName}`, properties);
    }
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
  }
}

/**
 * Track screen view
 */
export function trackScreenView(screenName: string, properties?: Record<string, any>): void {
  trackEvent('screen_view', {
    screen_name: screenName,
    ...properties,
  });
}

/**
 * Set user ID for tracking
 */
export function setUserId(userId: string): void {
  if (!isInitialized) return;

  try {
    Amplitude.setUserId(userId);
    console.log('[Analytics] User ID set:', userId);
  } catch (error) {
    console.error('[Analytics] Failed to set user ID:', error);
  }
}

/**
 * Set user properties
 */
export function setUserProperties(properties: Record<string, any>): void {
  if (!isInitialized) return;

  try {
    const identify = new Amplitude.Identify();
    Object.entries(properties).forEach(([key, value]) => {
      identify.set(key, value);
    });
    Amplitude.identify(identify);
    console.log('[Analytics] User properties set:', properties);
  } catch (error) {
    console.error('[Analytics] Failed to set user properties:', error);
  }
}

/**
 * Reset analytics (on logout)
 */
export function resetAnalytics(): void {
  if (!isInitialized) return;

  try {
    Amplitude.reset();
    console.log('[Analytics] Analytics reset');
  } catch (error) {
    console.error('[Analytics] Failed to reset:', error);
  }
}

// ===== Predefined Events =====

export const AnalyticsEvents = {
  // App lifecycle
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',

  // Search
  SEARCH_PERFORMED: 'search_performed',
  SEARCH_RESULT_SELECTED: 'search_result_selected',
  ADDRESS_SEARCH_PERFORMED: 'address_search_performed',

  // Route
  ROUTE_CALCULATED: 'route_calculated',
  ROUTE_SELECTED: 'route_selected',
  ROUTE_DETAILS_VIEWED: 'route_details_viewed',
  ROUTE_FILTER_CHANGED: 'route_filter_changed',

  // Favorites
  FAVORITE_ADDED: 'favorite_added',
  FAVORITE_REMOVED: 'favorite_removed',

  // Stops & Lines
  STOP_VIEWED: 'stop_viewed',
  LINE_VIEWED: 'line_viewed',
  DEPARTURES_REFRESHED: 'departures_refreshed',

  // Alerts
  ALERT_VIEWED: 'alert_viewed',
  ALERTS_LIST_VIEWED: 'alerts_list_viewed',

  // Settings
  LANGUAGE_CHANGED: 'language_changed',
  THEME_CHANGED: 'theme_changed',
  NOTIFICATIONS_TOGGLED: 'notifications_toggled',

  // Data
  DATA_DOWNLOAD_STARTED: 'data_download_started',
  DATA_DOWNLOAD_COMPLETED: 'data_download_completed',
  DATA_DOWNLOAD_FAILED: 'data_download_failed',

  // Errors
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
} as const;

export type AnalyticsEventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];
