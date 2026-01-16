import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface Departure {
  routeShortName: string;
  routeColor: string;
  headsign: string;
  departureTime: Date;
  isRealtime: boolean;
  delay: number;
}

export interface DepartureRowProps {
  departure: Departure;
}

/**
 * Calculate relative time string from now to departure time
 */
function getRelativeTime(departureTime: Date): string {
  const now = new Date();
  const diffMs = departureTime.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return 'Maintenant';
  } else if (diffMinutes < 60) {
    return `dans ${diffMinutes} min`;
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    if (minutes === 0) {
      return `dans ${hours}h`;
    }
    return `dans ${hours}h${minutes}`;
  }
}

/**
 * Format time as HH:MM
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function DepartureRow({ departure }: DepartureRowProps) {
  const {
    routeShortName,
    routeColor,
    headsign,
    departureTime,
    isRealtime,
    delay,
  } = departure;

  const relativeTime = getRelativeTime(departureTime);
  const formattedTime = formatTime(departureTime);

  return (
    <View style={styles.container}>
      {/* Line badge */}
      <View style={[styles.lineBadge, { backgroundColor: routeColor }]}>
        <Text style={styles.lineBadgeText}>{routeShortName}</Text>
      </View>

      {/* Direction */}
      <View style={styles.directionContainer}>
        <Text style={styles.direction} numberOfLines={1}>
          → {headsign}
        </Text>
      </View>

      {/* Time info */}
      <View style={styles.timeContainer}>
        {/* Realtime/Theoretical icon */}
        <Text style={styles.icon}>{isRealtime ? '🔴' : '⏱️'}</Text>

        {/* Time */}
        <View style={styles.timeInfo}>
          <Text style={styles.departureTime}>{formattedTime}</Text>
          <Text style={styles.relativeTime}>({relativeTime})</Text>
        </View>

        {/* Delay (if significant) */}
        {delay > 120 && (
          <Text style={styles.delayLate}>+{Math.round(delay / 60)} min</Text>
        )}
        {delay < -60 && (
          <Text style={styles.delayEarly}>-{Math.abs(Math.round(delay / 60))} min</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lineBadge: {
    minWidth: 40,
    height: 40,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lineBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  directionContainer: {
    flex: 1,
    marginRight: 12,
  },
  direction: {
    fontSize: 14,
    color: '#111',
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  departureTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  relativeTime: {
    fontSize: 12,
    color: '#666',
  },
  delayLate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CC0000',
    marginLeft: 4,
  },
  delayEarly: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00AA00',
    marginLeft: 4,
  },
});
