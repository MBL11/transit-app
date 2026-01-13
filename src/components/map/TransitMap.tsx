/**
 * Transit Map Component
 * Displays stops on a map using react-native-maps
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useStops, useRoutes } from '../../hooks';
import type { Stop } from '../../core/types/models';

interface TransitMapProps {
  onStopPress?: (stop: Stop) => void;
}

export function TransitMap({ onStopPress }: TransitMapProps) {
  const { stops, loading: stopsLoading } = useStops();
  const { routes, loading: routesLoading } = useRoutes();
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);

  // Filter routes: only Metro (type 1) and some Bus lines (type 3)
  const filteredRoutes = useMemo(() => {
    if (!routes) return [];

    return routes.filter(route => {
      // Metro (type 1)
      if (route.type === 1) return true;

      // Bus (type 3) - only lines with numbers < 100 (main lines)
      if (route.type === 3) {
        const lineNumber = parseInt(route.shortName);
        return !isNaN(lineNumber) && lineNumber < 100;
      }

      return false;
    });
  }, [routes]);

  // Filter stops: only those served by filtered routes
  // For now, show all stops (we'll filter by route later if needed)
  const filteredStops = useMemo(() => {
    // Limit to 500 stops max to avoid performance issues
    return stops.slice(0, 500);
  }, [stops]);

  const handleMarkerPress = (stop: Stop) => {
    setSelectedStop(stop);
    onStopPress?.(stop);
  };

  if (stopsLoading || routesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement de la carte...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 48.8566,
          longitude: 2.3522,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        }}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        showsScale
      >
        {filteredStops.map((stop) => (
          <Marker
            key={stop.id}
            coordinate={{
              latitude: stop.lat,
              longitude: stop.lon,
            }}
            onPress={() => handleMarkerPress(stop)}
            pinColor={selectedStop?.id === stop.id ? '#0066CC' : '#FF6600'}
          >
            <View style={styles.markerContainer}>
              <View
                style={[
                  styles.marker,
                  selectedStop?.id === stop.id && styles.markerSelected,
                ]}
              >
                <Text style={styles.markerText}>🚇</Text>
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Info overlay */}
      <View style={styles.infoContainer}>
        <View style={styles.infoBadge}>
          <Text style={styles.infoText}>
            {filteredStops.length} arrêts
          </Text>
        </View>
        <View style={styles.infoBadge}>
          <Text style={styles.infoText}>
            {filteredRoutes.filter(r => r.type === 1).length} lignes métro
          </Text>
        </View>
        <View style={styles.infoBadge}>
          <Text style={styles.infoText}>
            {filteredRoutes.filter(r => r.type === 3).length} lignes bus
          </Text>
        </View>
      </View>

      {/* Selected stop info */}
      {selectedStop && (
        <View style={styles.selectedStopContainer}>
          <Text style={styles.selectedStopName}>{selectedStop.name}</Text>
          <Text style={styles.selectedStopCoords}>
            {selectedStop.lat.toFixed(4)}, {selectedStop.lon.toFixed(4)}
          </Text>
        </View>
      )}
    </View>
  );
}

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
