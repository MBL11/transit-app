/**
 * Stop Marker Component
 * Custom marker for stops on the map
 * Supports showing multiple transport type icons for stops serving multiple lines
 */

import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import type { Stop } from '../../core/types/models';

interface StopMarkerProps {
  stop: Stop;
  isSelected?: boolean;
  routeTypes?: number[]; // Array of route types serving this stop
  onPress: (stop: Stop) => void;
}

// İzmir official colors for transport types
const TRANSPORT_COLORS: Record<number, string> = {
  0: '#00A651', // Tram - Green (official)
  1: '#E30613', // Metro - Red (official)
  2: '#0066B3', // İZBAN - Blue (official)
  3: '#0066CC', // Bus - ESHOT Blue
  4: '#003366', // Ferry - Dark Blue
};

// Transport icons
const TRANSPORT_ICONS: Record<number, string> = {
  0: '🚊', // Tram
  1: '🚇', // Metro
  2: '🚆', // İZBAN/Rail
  3: '🚌', // Bus
  4: '⛴️', // Ferry
};

// Priority order for displaying transport types (lower = higher priority)
const TYPE_PRIORITY: Record<number, number> = {
  1: 1, // Metro - highest priority
  2: 2, // İZBAN
  0: 3, // Tram
  4: 4, // Ferry
  3: 5, // Bus - lowest priority
};

// Memoized marker component to prevent unnecessary re-renders
export const StopMarker = memo(function StopMarker({ stop, isSelected, routeTypes = [], onPress }: StopMarkerProps) {
  // Memoize the press handler
  const handlePress = useCallback(() => {
    onPress(stop);
  }, [stop, onPress]);

  // Get unique transport types, sorted by priority (show most important first)
  const uniqueTypes = useMemo(() => {
    const types = [...new Set(routeTypes)].sort((a, b) =>
      (TYPE_PRIORITY[a] || 99) - (TYPE_PRIORITY[b] || 99)
    );
    // Limit to 3 types max to avoid overcrowding
    return types.slice(0, 3);
  }, [routeTypes]);

  // Get primary color (first/highest priority type)
  const primaryColor = useMemo(() => {
    if (isSelected) return '#0066CC';
    if (uniqueTypes.length === 0) return '#FF6600'; // Default orange
    return TRANSPORT_COLORS[uniqueTypes[0]] || '#FF6600';
  }, [isSelected, uniqueTypes]);

  // Render a single transport type icon with background
  const renderTransportIcon = (type: number, index: number) => {
    const icon = TRANSPORT_ICONS[type] || '📍';
    const color = TRANSPORT_COLORS[type] || '#666666';

    return (
      <View
        key={`${type}-${index}`}
        style={[
          styles.iconBadge,
          {
            backgroundColor: color,
            marginLeft: index > 0 ? -6 : 0, // Overlap for multiple icons
            zIndex: 10 - index, // First icon on top
          },
        ]}
      >
        <Text style={styles.iconText}>{icon}</Text>
      </View>
    );
  };

  return (
    <Marker
      coordinate={{
        latitude: stop.lat,
        longitude: stop.lon,
      }}
      onPress={handlePress}
    >
      <View style={styles.container}>
        {/* Multiple transport type icons */}
        {uniqueTypes.length > 0 ? (
          <View style={[styles.iconsRow, isSelected && styles.iconsRowSelected]}>
            {uniqueTypes.map((type, index) => renderTransportIcon(type, index))}
          </View>
        ) : (
          // Fallback to single marker if no route types
          <View
            style={[
              styles.marker,
              {
                backgroundColor: primaryColor,
                width: isSelected ? 36 : 28,
                height: isSelected ? 36 : 28,
                borderRadius: isSelected ? 18 : 14,
              },
            ]}
          >
            <Text style={styles.defaultIcon}>📍</Text>
          </View>
        )}

        {/* Stop name label when selected */}
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
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconsRowSelected: {
    transform: [{ scale: 1.15 }],
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
  iconText: {
    fontSize: 13,
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
  defaultIcon: {
    fontSize: 14,
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
