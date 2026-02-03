/**
 * Analytics Service
 * Track user events with Amplitude
 *
 * NOTE: Amplitude is disabled for now. The functions are kept as no-ops
 * so all call sites continue to work. To re-enable:
 * 1. npm install @amplitude/analytics-react-native
 * 2. Uncomment the import and implementation below
 * 3. Ensure Metro can resolve the package (may need metro.config.js tweak)
 */

// import * as Amplitude from '@amplitude/analytics-react-native';
// import Constants from 'expo-constants';
import { logger } from '../utils/logger';

// const AMPLITUDE_API_KEY = Constants.expoConfig?.extra?.amplitudeApiKey || process.env.EXPO_PUBLIC_AMPLITUDE_KEY || '';

/**
 * Initialize Amplitude analytics
 */
export async function initAnalytics(): Promise<void> {
  logger.log('[Analytics] Amplitude disabled - skipping init');
}

/**
 * Track a custom event
 */
export function trackEvent(_eventName: string, _properties?: Record<string, any>): void {
  // no-op while Amplitude is disabled
}

/**
 * Track screen view
 */
export function trackScreenView(_screenName: string, _properties?: Record<string, any>): void {
  // no-op while Amplitude is disabled
}

/**
 * Set user ID for tracking
 */
export function setUserId(_userId: string): void {
  // no-op while Amplitude is disabled
}

/**
 * Set user properties
 */
export function setUserProperties(_properties: Record<string, any>): void {
  // no-op while Amplitude is disabled
}

/**
 * Reset analytics (on logout)
 */
export function resetAnalytics(): void {
  // no-op while Amplitude is disabled
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
