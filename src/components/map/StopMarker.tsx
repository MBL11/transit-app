/**
 * Stop Marker Component
 * Custom marker for stops on the map
 * Uses professional TransitLogo components instead of emojis
 * Supports showing multiple transport type logos for stops serving multiple lines
 */

import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import type { Stop } from '../../core/types/models';
import { TransitLogo, routeTypeToTransitType, getTransitColor } from '../transit/TransitLogo';

interface StopMarkerProps {
  stop: Stop;
  isSelected?: boolean;
  routeTypes?: number[]; // Array of route types serving this stop
  underConstruction?: boolean; // Station not yet in service
  onPress: (stop: Stop) => void;
}

// Priority order for displaying transport types (lower = higher priority)
const TYPE_PRIORITY: Record<number, number> = {
  1: 1, // Metro - highest priority
  2: 2, // İZBAN
  0: 3, // Tram
  4: 4, // Ferry
  3: 5, // Bus - lowest priority
};

// Memoized marker component to prevent unnecessary re-renders
export const StopMarker = memo(function StopMarker({ stop, isSelected, routeTypes = [], underConstruction, onPress }: StopMarkerProps) {
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
    return getTransitColor(routeTypeToTransitType(uniqueTypes[0]));
  }, [isSelected, uniqueTypes]);

  return (
    <Marker
      coordinate={{
        latitude: stop.lat,
        longitude: stop.lon,
      }}
      onPress={handlePress}
    >
      <View style={styles.container}>
        {/* Multiple transport type logos */}
        {uniqueTypes.length > 0 ? (
          <View style={[styles.logosRow, isSelected && styles.logosRowSelected]}>
            {uniqueTypes.map((type, index) => (
              <View
                key={`${type}-${index}`}
                style={[
                  styles.logoBadge,
                  {
                    marginLeft: index > 0 ? -6 : 0, // Overlap for multiple logos
                    zIndex: 10 - index, // First logo on top
                  },
                ]}
              >
                <TransitLogo
                  type={routeTypeToTransitType(type)}
                  size="small"
                  bordered
                />
              </View>
            ))}
          </View>
        ) : (
          // Fallback marker when no route types detected
          <View
            style={[
              styles.fallbackMarker,
              {
                backgroundColor: primaryColor,
                width: isSelected ? 36 : 28,
                height: isSelected ? 36 : 28,
                borderRadius: isSelected ? 18 : 14,
              },
            ]}
          >
            <Text style={styles.fallbackDot}>•</Text>
          </View>
        )}

        {/* Construction badge for stations not yet in service */}
        {underConstruction && (
          <View style={styles.constructionBadge}>
            <Text style={styles.constructionText}>🚧</Text>
          </View>
        )}

        {/* Stop name label when selected */}
        {isSelected && (
          <View style={styles.labelContainer}>
            <Text style={styles.label} numberOfLines={1}>
              {stop.name}
            </Text>
            {underConstruction && (
              <Text style={styles.constructionLabel}>En construction</Text>
            )}
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
  logosRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logosRowSelected: {
    transform: [{ scale: 1.2 }],
  },
  logoBadge: {
    // Shadow for depth on map
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  fallbackMarker: {
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
  fallbackDot: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '900',
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
  constructionBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    zIndex: 20,
  },
  constructionText: {
    fontSize: 10,
  },
  constructionLabel: {
    fontSize: 9,
    color: '#E67E00',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 1,
  },
});
