/**
 * Custom Error Classes and Error Handling Utilities
 * Provides structured error types with user-friendly messages
 */

import { logger } from './logger';

export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  API_ERROR = 'API_ERROR',

  // Data errors
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  INVALID_DATA = 'INVALID_DATA',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Location errors
  LOCATION_PERMISSION_DENIED = 'LOCATION_PERMISSION_DENIED',
  LOCATION_UNAVAILABLE = 'LOCATION_UNAVAILABLE',

  // GTFS errors
  GTFS_DOWNLOAD_FAILED = 'GTFS_DOWNLOAD_FAILED',
  GTFS_PARSE_ERROR = 'GTFS_PARSE_ERROR',
  GTFS_NOT_LOADED = 'GTFS_NOT_LOADED',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorContext {
  [key: string]: any;
}

/**
 * Base custom error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: ErrorContext;
  public readonly isRetryable: boolean;
  public readonly userMessage: string;

  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    isRetryable: boolean = false,
    context?: ErrorContext
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
    this.isRetryable = isRetryable;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Network Error
 */
export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', context?: ErrorContext) {
    super(
      ErrorCode.NETWORK_ERROR,
      message,
      'Unable to connect to the internet. Please check your connection and try again.',
      true,
      context
    );
    this.name = 'NetworkError';
  }
}

/**
 * API Error
 */
export class APIError extends AppError {
  public readonly status?: number;

  constructor(
    status: number,
    message: string = 'API request failed',
    context?: ErrorContext
  ) {
    const userMessage =
      status >= 500
        ? 'The service is temporarily unavailable. Please try again later.'
        : status === 429
        ? 'Too many requests. Please wait a moment and try again.'
        : status === 404
        ? 'The requested data was not found.'
        : 'An error occurred while fetching data. Please try again.';

    super(ErrorCode.API_ERROR, message, userMessage, status >= 500 || status === 429, context);
    this.name = 'APIError';
    this.status = status;
  }
}

/**
 * Database Error
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', context?: ErrorContext) {
    super(
      ErrorCode.DATABASE_ERROR,
      message,
      'An error occurred while accessing local data. Please restart the app.',
      false,
      context
    );
    this.name = 'DatabaseError';
  }
}

/**
 * Data Not Found Error
 */
export class DataNotFoundError extends AppError {
  constructor(resource: string, context?: ErrorContext) {
    super(
      ErrorCode.DATA_NOT_FOUND,
      `${resource} not found`,
      `The requested ${resource.toLowerCase()} was not found. It may have been removed or does not exist.`,
      false,
      context
    );
    this.name = 'DataNotFoundError';
  }
}

/**
 * Location Permission Error
 */
export class LocationPermissionError extends AppError {
  constructor(context?: ErrorContext) {
    super(
      ErrorCode.LOCATION_PERMISSION_DENIED,
      'Location permission denied',
      'Location permission is required to use this feature. Please enable location access in your device settings.',
      false,
      context
    );
    this.name = 'LocationPermissionError';
  }
}

/**
 * Location Unavailable Error
 */
export class LocationUnavailableError extends AppError {
  constructor(context?: ErrorContext) {
    super(
      ErrorCode.LOCATION_UNAVAILABLE,
      'Location unavailable',
      'Unable to get your current location. Please ensure location services are enabled.',
      true,
      context
    );
    this.name = 'LocationUnavailableError';
  }
}

/**
 * GTFS Error
 */
export class GTFSError extends AppError {
  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    isRetryable: boolean = false,
    context?: ErrorContext
  ) {
    super(code, message, userMessage, isRetryable, context);
    this.name = 'GTFSError';
  }
}

/**
 * Parse any error into an AppError
 */
export function parseError(error: any): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Network errors
  if (
    error?.message?.includes('Network request failed') ||
    error?.message?.includes('Failed to fetch')
  ) {
    return new NetworkError(error.message);
  }

  // Timeout errors
  if (error?.message?.includes('timeout')) {
    return new AppError(
      ErrorCode.TIMEOUT,
      error.message,
      'The request took too long. Please try again.',
      true
    );
  }

  // API errors (fetch response)
  if (error?.status || error?.response?.status) {
    const status = error.status || error.response.status;
    return new APIError(status, error.message);
  }

  // Database errors
  if (error?.message?.includes('SQLite') || error?.message?.includes('database')) {
    return new DatabaseError(error.message);
  }

  // Unknown error
  return new AppError(
    ErrorCode.UNKNOWN_ERROR,
    error?.message || 'An unknown error occurred',
    'Something went wrong. Please try again.',
    false,
    { originalError: error }
  );
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(error: any): string {
  const appError = parseError(error);
  return appError.userMessage;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  const appError = parseError(error);
  return appError.isRetryable;
}

/**
 * Log error with context
 */
export function logError(error: any, context?: ErrorContext) {
  const appError = parseError(error);

  logger.error(`[${appError.code}] ${appError.message}`);

  if (appError.context || context) {
    logger.error('Context:', { ...appError.context, ...context });
  }

  if (__DEV__) {
    logger.error('Stack:', appError.stack);
  }

  // TODO: Send to crash reporting service (Sentry)
  // Example:
  // Sentry.captureException(appError, { contexts: { custom: { ...appError.context, ...context } } });
}
