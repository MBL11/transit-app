import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';
import { LineBadge, TransportType } from './LineBadge';

export interface Departure {
  routeShortName: string;
  routeColor?: string;
  routeTextColor?: string;
  routeType?: number; // GTFS route type
  headsign: string;
  departureTime: Date;
  isRealtime: boolean;
  delay: number;
}

/**
 * Get transport type from GTFS route type
 */
function getTransportTypeFromRouteType(routeType?: number, routeName?: string): TransportType {
  const name = (routeName || '').toUpperCase();

  switch (routeType) {
    case 0:
      return 'tram';
    case 1:
      return 'metro';
    case 2:
      if (['A', 'B', 'C', 'D', 'E'].includes(name)) {
        return 'rer';
      }
      return 'train';
    case 3:
      if (name.startsWith('N')) {
        return 'noctilien';
      }
      return 'bus';
    default:
      // Try to infer from name
      if (/^[1-9]$|^1[0-4]$|^[37]BIS$/i.test(name)) {
        return 'metro';
      }
      if (/^[A-E]$/i.test(name)) {
        return 'rer';
      }
      if (/^T\d/i.test(name)) {
        return 'tram';
      }
      return 'bus';
  }
}

export interface DepartureRowProps {
  departure: Departure;
  onPress?: () => void;
}

/**
 * Calculate relative time string from now to departure time
 */
function getRelativeTimeKey(diffMinutes: number): { key: string; params?: any } {
  if (diffMinutes < 1) {
    return { key: 'time.now' };
  } else if (diffMinutes < 60) {
    return { key: 'time.inMinutes', params: { count: diffMinutes } };
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    if (minutes === 0) {
      return { key: 'time.inHours', params: { count: hours } };
    }
    return { key: 'time.inHoursMinutes', params: { hours, minutes } };
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

export function DepartureRow({ departure, onPress }: DepartureRowProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    routeShortName,
    routeColor,
    routeTextColor,
    routeType,
    headsign,
    departureTime,
    isRealtime,
    delay,
  } = departure;

  const transportType = getTransportTypeFromRouteType(routeType, routeShortName);

  const now = new Date();
  const diffMs = departureTime.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const { key: timeKey, params: timeParams } = getRelativeTimeKey(diffMinutes);
  const relativeTime = t(timeKey, timeParams) as string;
  const formattedTime = formatTime(departureTime);

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Official Line Badge */}
      <View style={styles.lineBadgeWrapper}>
        <LineBadge
          lineNumber={routeShortName}
          type={transportType}
          color={routeColor}
          textColor={routeTextColor}
          size="medium"
        />
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
    </Container>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    lineBadgeWrapper: {
      marginRight: 12,
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    directionContainer: {
      flex: 1,
      marginRight: 12,
    },
    direction: {
      fontSize: 14,
      color: colors.text,
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
      color: colors.text,
    },
    relativeTime: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    delayLate: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.error,
      marginLeft: 4,
    },
    delayEarly: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.success,
      marginLeft: 4,
    },
  });
