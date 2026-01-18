/**
 * useAlerts Hook
 * Fetches and manages transit alerts/disruptions
 */

import { useState, useEffect } from 'react';
import type { Alert } from '../core/types/adapter';
import { fetchAlerts } from '../adapters/paris/alerts';

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedAlerts = await fetchAlerts();
      setAlerts(fetchedAlerts);
    } catch (err) {
      console.error('[useAlerts] Error fetching alerts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch alerts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();

    // Rafraîchissement auto toutes les 5 minutes
    const interval = setInterval(loadAlerts, 300000);

    return () => clearInterval(interval);
  }, []);

  return { alerts, loading, error, refresh: loadAlerts };
}
