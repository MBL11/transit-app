/**
 * GTFS Data Context
 * Provides GTFS data loading state to the app
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useGTFSData } from '../hooks/useGTFSData';

interface GTFSContextType {
  isRefreshing: boolean;
  refreshError: string | null;
  isLoaded: boolean | null;
  lastUpdate: Date | null;
  needsUpdate: () => boolean;
  triggerBackgroundRefresh: () => Promise<void>;
}

const GTFSContext = createContext<GTFSContextType>({
  isRefreshing: false,
  refreshError: null,
  isLoaded: null,
  lastUpdate: null,
  needsUpdate: () => false,
  triggerBackgroundRefresh: async () => {},
});

export function GTFSProvider({ children }: { children: ReactNode }) {
  const gtfsData = useGTFSData();

  return (
    <GTFSContext.Provider
      value={{
        isRefreshing: gtfsData.isRefreshing,
        refreshError: gtfsData.refreshError,
        isLoaded: gtfsData.isLoaded,
        lastUpdate: gtfsData.lastUpdate,
        needsUpdate: gtfsData.needsUpdate,
        triggerBackgroundRefresh: gtfsData.triggerBackgroundRefresh,
      }}
    >
      {children}
    </GTFSContext.Provider>
  );
}

export function useGTFS() {
  return useContext(GTFSContext);
}
