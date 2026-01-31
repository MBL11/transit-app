/**
 * useAlerts Hook
 * Fetches and manages transit alerts/disruptions
 */

import { useState, useEffect } from 'react';
import type { Alert } from '../core/types/adapter';
import { useAdapter } from './useAdapter';
import { logger } from '../utils/logger';

export function useAlerts() {
  const { adapter } = useAdapter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadAlerts = async () => {
    if (!adapter) return;

    try {
      setLoading(true);
      setError(null);
      const fetchedAlerts = await adapter.getAlerts();
      setAlerts(fetchedAlerts);
    } catch (err) {
      logger.error('[useAlerts] Error fetching alerts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch alerts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adapter) {
      loadAlerts();

      // Auto-refresh every 5 minutes
      const interval = setInterval(loadAlerts, 300000);

      return () => clearInterval(interval);
    }
  }, [adapter]);

  return { alerts, loading, error, refresh: loadAlerts };
}
