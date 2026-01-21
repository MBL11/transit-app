import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const IS_DEV = __DEV__;
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

let isInitialized = false;

/**
 * Initialize Sentry crash reporting
 */
export function initCrashReporting(): void {
  if (isInitialized) {
    console.log('[Sentry] Already initialized');
    return;
  }

  // Skip in development unless explicitly enabled
  if (IS_DEV && !process.env.EXPO_PUBLIC_ENABLE_SENTRY_DEV) {
    console.log('[Sentry] Skipped in development mode');
    return;
  }

  // Skip if no DSN
  if (!SENTRY_DSN) {
    console.warn('[Sentry] No DSN found');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      debug: IS_DEV,
      environment: IS_DEV ? 'development' : 'production',
      release: Constants.expoConfig?.version || '1.0.0',
      dist: Constants.expoConfig?.android?.versionCode?.toString() || '1',

      // Enable automatic breadcrumbs
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,

      // Capture unhandled promise rejections
      enableNative: true,
      enableNativeNagger: false,

      // Performance monitoring (optional)
      tracesSampleRate: IS_DEV ? 1.0 : 0.2,

      // Filter out sensitive data
      beforeSend(event, hint) {
        // Don't send events in dev mode unless explicitly enabled
        if (IS_DEV && !process.env.EXPO_PUBLIC_ENABLE_SENTRY_DEV) {
          return null;
        }

        // Remove sensitive data from event
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
        }

        return event;
      },

      // Ignore certain errors
      ignoreErrors: [
        // Network errors
        'Network request failed',
        'Failed to fetch',
        'NetworkError',

        // React Navigation errors (usually harmless)
        'Non-Error promise rejection captured',

        // Expo Go specific errors
        'Unable to activate keep awake',
      ],
    });

    // Set user context
    Sentry.setUser({
      id: Constants.sessionId || 'anonymous',
    });

    // Set app context
    Sentry.setContext('app', {
      version: Constants.expoConfig?.version || '1.0.0',
      platform: Constants.platform?.ios ? 'ios' : 'android',
      deviceName: Constants.deviceName || 'Unknown',
      expoVersion: Constants.expoVersion,
    });

    isInitialized = true;
    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    console.error('[Sentry] Initialization failed:', error);
  }
}

/**
 * Capture an exception
 */
export function captureException(
  error: Error,
  context?: Record<string, any>
): void {
  if (!isInitialized) {
    console.error('[Sentry] Not initialized, logging error:', error);
    return;
  }

  try {
    Sentry.withScope((scope) => {
      // Add context
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      // Capture the exception
      Sentry.captureException(error);
    });

    console.log('[Sentry] Exception captured:', error.message);
  } catch (err) {
    console.error('[Sentry] Failed to capture exception:', err);
  }
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): void {
  if (!isInitialized) {
    console.log('[Sentry] Not initialized, logging message:', message);
    return;
  }

  try {
    Sentry.withScope((scope) => {
      scope.setLevel(level);

      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      Sentry.captureMessage(message);
    });

    console.log('[Sentry] Message captured:', message);
  } catch (err) {
    console.error('[Sentry] Failed to capture message:', err);
  }
}

/**
 * Add breadcrumb (trace of user actions)
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info'
): void {
  if (!isInitialized) return;

  try {
    Sentry.addBreadcrumb({
      category,
      message,
      data,
      level,
      timestamp: Date.now() / 1000,
    });
  } catch (error) {
    console.error('[Sentry] Failed to add breadcrumb:', error);
  }
}

/**
 * Set user context
 */
export function setUser(userId: string, email?: string, username?: string): void {
  if (!isInitialized) return;

  try {
    Sentry.setUser({
      id: userId,
      email,
      username,
    });
    console.log('[Sentry] User context set');
  } catch (error) {
    console.error('[Sentry] Failed to set user:', error);
  }
}

/**
 * Set custom tag
 */
export function setTag(key: string, value: string): void {
  if (!isInitialized) return;

  try {
    Sentry.setTag(key, value);
  } catch (error) {
    console.error('[Sentry] Failed to set tag:', error);
  }
}

/**
 * Set custom context
 */
export function setContext(
  name: string,
  context: Record<string, any> | null
): void {
  if (!isInitialized) return;

  try {
    Sentry.setContext(name, context);
  } catch (error) {
    console.error('[Sentry] Failed to set context:', error);
  }
}

/**
 * Wrap an async function with error tracking
 */
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: Record<string, any>
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof Error) {
        captureException(error, {
          function: fn.name,
          arguments: JSON.stringify(args).substring(0, 500),
          ...context,
        });
      }
      throw error;
    }
  }) as T;
}

/**
 * Log error to console and Sentry
 */
export function logError(
  message: string,
  error?: Error,
  context?: Record<string, any>
): void {
  console.error(`[Error] ${message}`, error, context);

  if (error) {
    captureException(error, { message, ...context });
  } else {
    captureMessage(message, 'error', context);
  }
}

/**
 * Track navigation event
 */
export function trackNavigation(screenName: string, params?: any): void {
  addBreadcrumb('navigation', `Navigated to ${screenName}`, {
    screen: screenName,
    params: params ? JSON.stringify(params).substring(0, 200) : undefined,
  });
}

/**
 * Track API call
 */
export function trackAPICall(
  endpoint: string,
  method: string = 'GET',
  success: boolean = true
): void {
  addBreadcrumb(
    'api',
    `API ${method} ${endpoint}`,
    {
      endpoint,
      method,
      success,
    },
    success ? 'info' : 'error'
  );
}

/**
 * Flush events (force send to Sentry)
 * Useful before app closes
 */
export async function flush(timeout: number = 2000): Promise<boolean> {
  if (!isInitialized) return false;

  try {
    return await Sentry.flush(timeout);
  } catch (error) {
    console.error('[Sentry] Failed to flush:', error);
    return false;
  }
}
