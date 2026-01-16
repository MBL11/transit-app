/**
 * Stop Marker Component
 * Custom marker for stops on the map
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import type { Stop } from '../../core/types/models';

interface StopMarkerProps {
  stop: Stop;
  isSelected?: boolean;
  routeType?: number; // 1=metro, 3=bus, etc.
  onPress: () => void;
}

export function StopMarker({ stop, isSelected, routeType, onPress }: StopMarkerProps) {
  // Icon based on route type
  const getIcon = () => {
    switch (routeType) {
      case 0: return '🚊'; // Tram
      case 1: return '🚇'; // Metro
      case 2: return '🚆'; // RER/Train
      case 3: return '🚌'; // Bus
      default: return '📍';
    }
  };

  // Color based on route type
  const getColor = () => {
    if (isSelected) return '#0066CC';

    switch (routeType) {
      case 0: return '#CC0000'; // Tram - red
      case 1: return '#003366'; // Metro - dark blue
      case 2: return '#7B68EE'; // RER - purple
      case 3: return '#00AA55'; // Bus - green
      default: return '#FF6600'; // Default - orange
    }
  };

  return (
    <Marker
      coordinate={{
        latitude: stop.lat,
        longitude: stop.lon,
      }}
      onPress={onPress}
    >
      <View style={styles.container}>
        <View
          style={[
            styles.marker,
            {
              backgroundColor: getColor(),
              width: isSelected ? 40 : 32,
              height: isSelected ? 40 : 32,
              borderRadius: isSelected ? 20 : 16,
            },
          ]}
        >
          <Text style={styles.icon}>{getIcon()}</Text>
        </View>

        {isSelected && (
          <View style={styles.labelContainer}>
            <Text style={styles.label} numberOfLines={1}>
              {stop.name}
            </Text>
          </View>
        )}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
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
  icon: {
    fontSize: 16,
  },
  labelContainer: {
    marginTop: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});
