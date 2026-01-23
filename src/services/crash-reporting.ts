/**
 * Crash Reporting Service
 * Track errors and crashes with Sentry
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SENTRY_DSN = Constants.expoConfig?.extra?.sentryDsn || process.env.EXPO_PUBLIC_SENTRY_DSN || '';

let isInitialized = false;

/**
 * Initialize Sentry crash reporting
 */
export function initCrashReporting(): void {
  if (isInitialized) {
    console.log('[CrashReporting] Already initialized');
    return;
  }

  if (!SENTRY_DSN) {
    console.warn('[CrashReporting] No Sentry DSN found, crash reporting disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      debug: __DEV__,
      environment: __DEV__ ? 'development' : 'production',
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
      tracesSampleRate: __DEV__ ? 1.0 : 0.2, // 20% of transactions in production
      attachScreenshot: true,
      attachViewHierarchy: true,
      // Don't send events in development unless explicitly testing
      beforeSend: (event) => {
        if (__DEV__) {
          console.log('[CrashReporting] Would send event:', event.exception?.values?.[0]?.type);
          // Return null to not send in development
          // Comment this line to test Sentry in dev
          return null;
        }
        return event;
      },
    });

    isInitialized = true;
    console.log('[CrashReporting] Sentry initialized successfully');
  } catch (error) {
    console.error('[CrashReporting] Failed to initialize Sentry:', error);
  }
}

/**
 * Capture an exception with optional context
 */
export function captureException(
  error: Error | unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    level?: Sentry.SeverityLevel;
    fingerprint?: string[];
  }
): string | undefined {
  // Always log in development
  if (__DEV__) {
    console.error('[CrashReporting] Exception:', error);
    if (context) {
      console.error('[CrashReporting] Context:', context);
    }
  }

  if (!isInitialized) {
    return undefined;
  }

  try {
    const eventId = Sentry.captureException(error, {
      tags: context?.tags,
      extra: context?.extra,
      level: context?.level,
      fingerprint: context?.fingerprint,
    });

    return eventId;
  } catch (err) {
    console.error('[CrashReporting] Failed to capture exception:', err);
    return undefined;
  }
}

/**
 * Capture a message (for non-error events)
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): string | undefined {
  if (__DEV__) {
    console.log(`[CrashReporting] Message (${level}):`, message, context);
  }

  if (!isInitialized) {
    return undefined;
  }

  try {
    return Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  } catch (err) {
    console.error('[CrashReporting] Failed to capture message:', err);
    return undefined;
  }
}

/**
 * Set user context for crash reports
 */
export function setUser(user: { id?: string; email?: string; username?: string } | null): void {
  if (!isInitialized) return;

  try {
    Sentry.setUser(user);
    console.log('[CrashReporting] User context set:', user?.id || 'cleared');
  } catch (error) {
    console.error('[CrashReporting] Failed to set user:', error);
  }
}

/**
 * Add a breadcrumb for better context in crash reports
 */
export function addBreadcrumb(breadcrumb: {
  category?: string;
  message?: string;
  data?: Record<string, any>;
  level?: Sentry.SeverityLevel;
}): void {
  if (!isInitialized) return;

  try {
    Sentry.addBreadcrumb({
      category: breadcrumb.category || 'app',
      message: breadcrumb.message,
      data: breadcrumb.data,
      level: breadcrumb.level || 'info',
      timestamp: Date.now() / 1000,
    });
  } catch (error) {
    console.error('[CrashReporting] Failed to add breadcrumb:', error);
  }
}

/**
 * Set a tag that will be included in all future events
 */
export function setTag(key: string, value: string): void {
  if (!isInitialized) return;

  try {
    Sentry.setTag(key, value);
  } catch (error) {
    console.error('[CrashReporting] Failed to set tag:', error);
  }
}

/**
 * Set extra data that will be included in all future events
 */
export function setExtra(key: string, value: any): void {
  if (!isInitialized) return;

  try {
    Sentry.setExtra(key, value);
  } catch (error) {
    console.error('[CrashReporting] Failed to set extra:', error);
  }
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, op: string): Sentry.Transaction | undefined {
  if (!isInitialized) return undefined;

  try {
    return Sentry.startTransaction({ name, op });
  } catch (error) {
    console.error('[CrashReporting] Failed to start transaction:', error);
    return undefined;
  }
}

/**
 * Wrap a function with Sentry error boundary
 */
export function wrapWithSentry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: { name?: string; tags?: Record<string, string> }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error, {
        tags: { function: context?.name || fn.name, ...context?.tags },
        extra: { args: JSON.stringify(args).slice(0, 1000) },
      });
      throw error;
    }
  }) as T;
}

/**
 * React Error Boundary wrapper from Sentry
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * HOC to wrap navigation screens with Sentry
 */
export const withSentryScreen = Sentry.withScope;
