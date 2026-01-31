/**
 * Retry Logic for API calls
 * Implements exponential backoff for failed requests
 */

import { logger } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number; // in milliseconds
  maxDelay?: number; // in milliseconds
  backoffMultiplier?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number, nextDelay: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  shouldRetry: (error: any) => {
    // Retry on network errors or 5xx server errors
    if (error?.message?.includes('Network request failed')) return true;
    if (error?.message?.includes('timeout')) return true;
    if (error?.status >= 500) return true;
    return false;
  },
  onRetry: () => {},
};

/**
 * Sleep function for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  // Exponential backoff: initialDelay * (backoffMultiplier ^ attempt)
  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt);

  // Add jitter (random variation ±20%) to avoid thundering herd
  const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);

  // Apply max delay cap
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Retry a function with exponential backoff
 *
 * @example
 * const data = await retry(() => fetch('https://api.example.com/data'), {
 *   maxRetries: 3,
 *   initialDelay: 1000,
 * });
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Try to execute the function
      return await fn();
    } catch (error) {
      lastError = error;

      // If this was the last attempt, throw the error
      if (attempt === opts.maxRetries) {
        logger.error(`[Retry] Failed after ${opts.maxRetries} retries:`, error);
        throw error;
      }

      // Check if we should retry this error
      if (!opts.shouldRetry(error, attempt)) {
        logger.warn(`[Retry] Not retrying error (attempt ${attempt + 1}):`, error);
        throw error;
      }

      // Calculate delay for next retry
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );

      logger.warn(
        `[Retry] Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`,
        error
      );

      // Call onRetry callback
      opts.onRetry(error, attempt + 1, delay);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Retry wrapper specifically for fetch requests
 *
 * @example
 * const response = await retryFetch('https://api.example.com/data', {
 *   method: 'POST',
 *   body: JSON.stringify({ key: 'value' }),
 * });
 */
export async function retryFetch(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return retry(async () => {
    const response = await fetch(url, init);

    // Check if response is OK
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as any;
      error.status = response.status;
      error.response = response;
      throw error;
    }

    return response;
  }, {
    ...options,
    shouldRetry: (error, attempt) => {
      // Always retry on network errors
      if (error?.message?.includes('Network request failed')) return true;
      if (error?.message?.includes('timeout')) return true;

      // Retry on 5xx errors
      if (error?.status >= 500 && error?.status < 600) return true;

      // Retry on 429 (Too Many Requests)
      if (error?.status === 429) return true;

      // Don't retry on 4xx client errors (except 429)
      if (error?.status >= 400 && error?.status < 500) return false;

      // Use custom shouldRetry if provided
      if (options?.shouldRetry) {
        return options.shouldRetry(error, attempt);
      }

      return false;
    },
  });
}

/**
 * Hook for using retry in React components
 */
export function useRetry() {
  return {
    retry,
    retryFetch,
  };
}
