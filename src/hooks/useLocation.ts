/**
 * Hook for accessing user's current location
 */

import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export interface LocationState {
  location: UserLocation | null;
  isLoading: boolean;
  error: string | null;
  permissionGranted: boolean;
}

/**
 * Hook to get user's current location
 * Handles permission requests and location updates
 */
export function useLocation() {
  const [state, setState] = useState<LocationState>({
    location: null,
    isLoading: false,
    error: null,
    permissionGranted: false,
  });

  // Request permission on mount
  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setState((prev) => ({
        ...prev,
        permissionGranted: status === 'granted',
      }));
    } catch (error) {
      console.error('Failed to check location permission:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';

      setState((prev) => ({
        ...prev,
        permissionGranted: granted,
        error: granted ? null : 'Location permission denied',
      }));

      return granted;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: 'Failed to request location permission',
      }));
      return false;
    }
  };

  const getCurrentLocation = async (): Promise<UserLocation | null> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check permission
      let hasPermission = state.permissionGranted;
      if (!hasPermission) {
        hasPermission = await requestPermission();
      }

      if (!hasPermission) {
        throw new Error('Location permission not granted');
      }

      // Get location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
      });

      const userLocation: UserLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };

      setState({
        location: userLocation,
        isLoading: false,
        error: null,
        permissionGranted: true,
      });

      return userLocation;
    } catch (error: any) {
      console.error('Failed to get location:', error);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to get location',
      }));

      return null;
    }
  };

  return {
    ...state,
    requestPermission,
    getCurrentLocation,
    refreshPermission: checkPermission,
  };
}

/**
 * Hook for watching location changes
 * Use this when you need real-time location updates
 */
export function useWatchLocation() {
  const [state, setState] = useState<LocationState>({
    location: null,
    isLoading: false,
    error: null,
    permissionGranted: false,
  });

  const [isWatching, setIsWatching] = useState(false);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      try {
        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setState((prev) => ({
            ...prev,
            error: 'Location permission denied',
            permissionGranted: false,
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          permissionGranted: true,
          isLoading: true,
        }));

        // Start watching
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000, // Update every 10 seconds
            distanceInterval: 50, // Or when moved 50 meters
          },
          (location) => {
            const userLocation: UserLocation = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy,
              timestamp: location.timestamp,
            };

            setState({
              location: userLocation,
              isLoading: false,
              error: null,
              permissionGranted: true,
            });
          }
        );
      } catch (error: any) {
        console.error('Failed to watch location:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to watch location',
        }));
      }
    };

    if (isWatching) {
      startWatching();
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isWatching]);

  const startWatching = () => setIsWatching(true);
  const stopWatching = () => setIsWatching(false);

  return {
    ...state,
    isWatching,
    startWatching,
    stopWatching,
  };
}
