/**
 * RouteResult Component
 * Displays a journey result in a card format with duration, transfers, and segments preview
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { JourneyResult } from '../../core/types/routing';

interface RouteResultProps {
  journey: JourneyResult;
  onPress: () => void;
}

/**
 * Format time as HH:MM
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function RouteResult({ journey, onPress }: RouteResultProps) {
  const departureTimeStr = formatTime(journey.departureTime);
  const arrivalTimeStr = formatTime(journey.arrivalTime);
  const hasTransfers = journey.numberOfTransfers > 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Header: Duration and Times */}
      <View style={styles.header}>
        <View style={styles.durationContainer}>
          <Text style={styles.duration}>{journey.totalDuration} min</Text>
          {hasTransfers && (
            <Text style={styles.transfers}>
              {journey.numberOfTransfers} correspondance{journey.numberOfTransfers > 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <View style={styles.timesContainer}>
          <Text style={styles.time}>{departureTimeStr}</Text>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.time}>{arrivalTimeStr}</Text>
        </View>
      </View>

      {/* Segments Preview */}
      <View style={styles.segmentsContainer}>
        {journey.segments.map((segment, index) => (
          <React.Fragment key={index}>
            {/* Segment Badge or Walk Icon */}
            {segment.type === 'walk' ? (
              <View style={styles.walkBadge}>
                <Text style={styles.walkIcon}>🚶</Text>
                <Text style={styles.walkDuration}>{segment.duration}min</Text>
              </View>
            ) : (
              <View
                style={[
                  styles.transitBadge,
                  { backgroundColor: segment.route?.color ? `#${segment.route.color}` : '#999' },
                ]}
              >
                <Text
                  style={[
                    styles.transitBadgeText,
                    { color: segment.route?.textColor ? `#${segment.route.textColor}` : '#FFF' },
                  ]}
                >
                  {segment.route?.shortName || '?'}
                </Text>
              </View>
            )}

            {/* Arrow between segments */}
            {index < journey.segments.length - 1 && (
              <Text style={styles.segmentArrow}>→</Text>
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Walk distance if present */}
      {journey.totalWalkDistance > 0 && (
        <Text style={styles.walkDistance}>
          🚶 {Math.round(journey.totalWalkDistance)}m à pied
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  durationContainer: {
    flex: 1,
  },
  duration: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  transfers: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  timesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  arrow: {
    fontSize: 16,
    color: '#999',
    marginHorizontal: 8,
  },
  segmentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  walkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  walkIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  walkDuration: {
    fontSize: 12,
    color: '#666',
  },
  transitBadge: {
    minWidth: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginRight: 4,
  },
  transitBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  segmentArrow: {
    fontSize: 14,
    color: '#CCC',
    marginHorizontal: 4,
  },
  walkDistance: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
});
