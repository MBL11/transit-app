/**
 * Transit Map Component
 * Displays stops on a map using react-native-maps
 */

import React, { useState, useRef, useCallback, useImperativeHandle, forwardRef, memo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { StopMarker } from './StopMarker';
import type { Stop } from '../../core/types/models';

interface TransitMapProps {
  stops: Stop[];
  onStopPress: (stop: Stop) => void;
  initialRegion?: Region;
  onRegionChange?: (region: Region) => void;
  onRegionChangeComplete?: (region: Region) => void;
}

export interface TransitMapRef {
  animateToRegion: (region: Region, duration?: number) => void;
  animateToLocation: (latitude: number, longitude: number, duration?: number) => void;
}

const DEFAULT_REGION: Region = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const TransitMap = memo(forwardRef<TransitMapRef, TransitMapProps>(function TransitMap(
  { stops, onStopPress, initialRegion, onRegionChange, onRegionChangeComplete },
  ref
) {
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    animateToRegion: (region: Region, duration = 500) => {
      mapRef.current?.animateToRegion(region, duration);
    },
    animateToLocation: (latitude: number, longitude: number, duration = 500) => {
      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, duration);
    },
  }));

  const handleMarkerPress = useCallback((stop: Stop) => {
    setSelectedStopId(stop.id);
    onStopPress(stop);
  }, [onStopPress]);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    onRegionChangeComplete?.(region);
  }, [onRegionChangeComplete]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={initialRegion || DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        showsScale
        onRegionChange={onRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {stops.map((stop) => (
          <StopMarker
            key={stop.id}
            stop={stop}
            isSelected={selectedStopId === stop.id}
            onPress={handleMarkerPress}
          />
        ))}
      </MapView>
    </View>
  );
}));

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6600',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  markerSelected: {
    backgroundColor: '#0066CC',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  markerText: {
    fontSize: 16,
  },
  infoContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  infoBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  selectedStopContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  selectedStopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 4,
  },
  selectedStopCoords: {
    fontSize: 12,
    color: '#666',
  },
});
