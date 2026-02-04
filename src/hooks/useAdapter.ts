/**
 * React Hook to use the Transit Adapter
 * Provides easy access to the İzmir adapter in React components
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { IzmirAdapter, izmirAdapter } from '../adapters/izmir';
import * as db from '../core/database';
import { logger } from '../utils/logger';

let adapterInstance: IzmirAdapter | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Hook to access the İzmir Transit Adapter
 * Automatically initializes the database and adapter
 * Uses a singleton pattern to avoid duplicate initialization
 */
export function useAdapter() {
  const [adapter, setAdapter] = useState<IzmirAdapter | null>(adapterInstance);
  const [loading, setLoading] = useState(!adapterInstance);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    logger.log(`[useAdapter] useEffect - adapterInstance: ${!!adapterInstance}`);

    // Already initialized, skip
    if (adapterInstance) {
      logger.log('[useAdapter] Already initialized, setting adapter');
      setAdapter(adapterInstance);
      setLoading(false);
      return;
    }

    async function init() {
      try {
        // Use shared promise to avoid duplicate initialization
        if (!initPromise) {
          initPromise = (async () => {
            logger.log('[useAdapter] Initializing database and adapter...');
            await db.initializeDatabase();
            adapterInstance = izmirAdapter;
            await adapterInstance.initialize();
            logger.log('[useAdapter] ✅ İzmir adapter ready');
          })();
        }

        await initPromise;
        logger.log('[useAdapter] Init complete, setting adapter');
        setAdapter(adapterInstance);
        setLoading(false);
      } catch (err) {
        logger.error('[useAdapter] ❌ Failed to initialize:', err);
        initPromise = null; // Reset so it can be retried
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
    }

    init();
  }, []);

  // Memoize return value to prevent unnecessary re-renders in consumers
  return useMemo(() => ({ adapter, loading, error }), [adapter, loading, error]);
}

/**
 * Hook to check if the adapter has data
 * Useful to show initial import screen
 *
 * @example
 * ```tsx
 * function App() {
 *   const { hasData, loading } = useAdapterData();
 *
 *   if (loading) return <LoadingScreen />;
 *   if (!hasData) return <ImportDataScreen />;
 *
 *   return <MainApp />;
 * }
 * ```
 */
export function useAdapterData() {
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkData() {
      try {
        await db.initializeDatabase();
        const isEmpty = db.isDatabaseEmpty();
        setHasData(!isEmpty);
      } catch (err) {
        logger.error('[useAdapterData] Failed to check data:', err);
        setHasData(false);
      } finally {
        setLoading(false);
      }
    }

    checkData();
  }, []);

  return { hasData, loading };
}

/**
 * Hook to load stops from the adapter
 *
 * @example
 * ```tsx
 * function StopsScreen() {
 *   const { stops, loading, error, refresh } = useStops();
 *
 *   return (
 *     <FlatList
 *       data={stops}
 *       renderItem={({ item }) => <StopCard stop={item} />}
 *       onRefresh={refresh}
 *       refreshing={loading}
 *     />
 *   );
 * }
 * ```
 */
export function useStops() {
  const { adapter, loading: adapterLoading } = useAdapter();
  const [stops, setStops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadStops = useCallback(async () => {
    logger.log(`[useStops] loadStops called - adapter: ${!!adapter}, adapterLoading: ${adapterLoading}`);
    if (!adapter) {
      logger.log('[useStops] No adapter, returning early');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      logger.log('[useStops] Calling adapter.loadStops()...');
      const data = await adapter.loadStops();
      logger.log(`[useStops] Got ${data.length} stops from adapter`);
      setStops(data);
    } catch (err) {
      logger.error('[useStops] Failed to load stops:', err);
      setError(err instanceof Error ? err : new Error('Failed to load stops'));
    } finally {
      setLoading(false);
    }
  }, [adapter, adapterLoading]);

  useEffect(() => {
    logger.log(`[useStops] useEffect - adapter: ${!!adapter}, adapterLoading: ${adapterLoading}`);
    if (adapter && !adapterLoading) {
      loadStops();
    }
  }, [adapter, adapterLoading, loadStops]);

  logger.log(`[useStops] Returning - stops: ${stops.length}, loading: ${loading || adapterLoading}`);

  return {
    stops,
    loading: loading || adapterLoading,
    error,
    refresh: loadStops,
  };
}

/**
 * Hook to load routes from the adapter
 */
export function useRoutes() {
  const { adapter, loading: adapterLoading } = useAdapter();
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadRoutes = useCallback(async () => {
    if (!adapter) return;

    try {
      setLoading(true);
      setError(null);
      const data = await adapter.loadRoutes();
      setRoutes(data);
    } catch (err) {
      logger.error('[useRoutes] Failed to load routes:', err);
      setError(err instanceof Error ? err : new Error('Failed to load routes'));
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => {
    if (adapter && !adapterLoading) {
      loadRoutes();
    }
  }, [adapter, adapterLoading, loadRoutes]);

  return {
    routes,
    loading: loading || adapterLoading,
    error,
    refresh: loadRoutes,
  };
}

/**
 * Hook to get next departures for a stop
 *
 * @example
 * ```tsx
 * function StopDetailsScreen({ stopId }) {
 *   const { departures, loading, error } = useDepartures(stopId);
 *
 *   return (
 *     <View>
 *       {departures.map(dep => (
 *         <Text key={dep.tripId}>
 *           {dep.routeShortName} → {dep.headsign} at {dep.departureTime}
 *         </Text>
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useDepartures(stopId: string | null) {
  const { adapter, loading: adapterLoading } = useAdapter();
  const [departures, setDepartures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadDepartures = useCallback(async () => {
    if (!adapter || !stopId) {
      setDepartures([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await adapter.getNextDepartures(stopId);
      setDepartures(data);
    } catch (err) {
      logger.error('[useDepartures] Failed to load departures:', err);
      setError(err instanceof Error ? err : new Error('Failed to load departures'));
    } finally {
      setLoading(false);
    }
  }, [adapter, stopId]);

  useEffect(() => {
    if (adapter && !adapterLoading && stopId) {
      loadDepartures();
    }
  }, [adapter, adapterLoading, stopId, loadDepartures]);

  return {
    departures,
    loading: loading || adapterLoading,
    error,
    refresh: loadDepartures,
  };
}
