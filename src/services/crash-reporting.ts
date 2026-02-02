/**
 * Crash Reporting Service
 * Track errors and crashes with Sentry (optional dependency)
 * All functions are safe to call even if @sentry/react-native is not installed.
 */

import { logger } from '../utils/logger';

let Sentry: any = null;
let isInitialized = false;

// Try to load Sentry - it's optional
try {
  Sentry = require('@sentry/react-native');
} catch {
  logger.log('[CrashReporting] @sentry/react-native not installed, crash reporting disabled');
}

const SENTRY_DSN = 'https://4bdcc0f70091cc94ba76e402440f3f5b@o4510816546914304.ingest.de.sentry.io/4510816549666896';

/**
 * Initialize Sentry crash reporting
 */
export function initCrashReporting(): void {
  if (isInitialized || !Sentry) return;

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      debug: __DEV__,
      environment: __DEV__ ? 'development' : 'production',
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
      tracesSampleRate: __DEV__ ? 1.0 : 0.2,
      attachScreenshot: true,
      attachViewHierarchy: true,
      beforeSend: (event: any) => {
        if (__DEV__) {
          logger.log('[CrashReporting] Would send event:', event.exception?.values?.[0]?.type);
          return null;
        }
        return event;
      },
    });

    isInitialized = true;
    logger.log('[CrashReporting] Sentry initialized successfully');
  } catch (error) {
    logger.error('[CrashReporting] Failed to initialize Sentry:', error);
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
    level?: string;
    fingerprint?: string[];
  }
): string | undefined {
  if (__DEV__) {
    logger.error('[CrashReporting] Exception:', error);
    if (context) {
      logger.error('[CrashReporting] Context:', context);
    }
  }

  if (!isInitialized || !Sentry) return undefined;

  try {
    return Sentry.captureException(error, {
      tags: context?.tags,
      extra: context?.extra,
      level: context?.level,
      fingerprint: context?.fingerprint,
    });
  } catch (err) {
    logger.error('[CrashReporting] Failed to capture exception:', err);
    return undefined;
  }
}

/**
 * Capture a message (for non-error events)
 */
export function captureMessage(
  message: string,
  level: string = 'info',
  context?: Record<string, any>
): string | undefined {
  if (__DEV__) {
    logger.log(`[CrashReporting] Message (${level}):`, message, context);
  }

  if (!isInitialized || !Sentry) return undefined;

  try {
    return Sentry.captureMessage(message, { level, extra: context });
  } catch (err) {
    logger.error('[CrashReporting] Failed to capture message:', err);
    return undefined;
  }
}

/**
 * Set user context for crash reports
 */
export function setUser(user: { id?: string; email?: string; username?: string } | null): void {
  if (!isInitialized || !Sentry) return;
  try {
    Sentry.setUser(user);
  } catch (error) {
    logger.error('[CrashReporting] Failed to set user:', error);
  }
}

/**
 * Add a breadcrumb for better context in crash reports
 */
export function addBreadcrumb(breadcrumb: {
  category?: string;
  message?: string;
  data?: Record<string, any>;
  level?: string;
}): void {
  if (!isInitialized || !Sentry) return;
  try {
    Sentry.addBreadcrumb({
      category: breadcrumb.category || 'app',
      message: breadcrumb.message,
      data: breadcrumb.data,
      level: breadcrumb.level || 'info',
      timestamp: Date.now() / 1000,
    });
  } catch (error) {
    logger.error('[CrashReporting] Failed to add breadcrumb:', error);
  }
}

/**
 * Set a tag that will be included in all future events
 */
export function setTag(key: string, value: string): void {
  if (!isInitialized || !Sentry) return;
  try {
    Sentry.setTag(key, value);
  } catch (error) {
    logger.error('[CrashReporting] Failed to set tag:', error);
  }
}

/**
 * Set extra data that will be included in all future events
 */
export function setExtra(key: string, value: any): void {
  if (!isInitialized || !Sentry) return;
  try {
    Sentry.setExtra(key, value);
  } catch (error) {
    logger.error('[CrashReporting] Failed to set extra:', error);
  }
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, op: string): any {
  if (!isInitialized || !Sentry) return undefined;
  try {
    return Sentry.startTransaction({ name, op });
  } catch (error) {
    logger.error('[CrashReporting] Failed to start transaction:', error);
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
 * React Error Boundary wrapper from Sentry (no-op if not available)
 */
export const SentryErrorBoundary = Sentry?.ErrorBoundary || null;

/**
 * HOC to wrap navigation screens with Sentry
 */
export const withSentryScreen = Sentry?.withScope || (() => {});
