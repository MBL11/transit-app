/**
 * Network Context
 * Provides network status throughout the app
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useNetworkStatus, type NetworkStatus } from '../hooks/useNetworkStatus';

interface NetworkContextType {
  networkStatus: NetworkStatus;
  isOffline: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

interface NetworkProviderProps {
  children: ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  const networkStatus = useNetworkStatus();
  const isOffline = !networkStatus.isConnected || networkStatus.isInternetReachable === false;

  return (
    <NetworkContext.Provider value={{ networkStatus, isOffline }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}
