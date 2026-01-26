/**
 * RouteOptionCard Component
 * Displays a single route option with tags, duration, transfers, and walking distance
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { JourneyResult, RouteSegment } from '../../core/types/routing';
import { useThemeColors } from '../../hooks/useThemeColors';
import { LineBadge, TransportType } from '../transit/LineBadge';

interface RouteOptionCardProps {
  route: JourneyResult;
  onPress: () => void;
  isSelected?: boolean;
}

/**
 * Format time as HH:MM
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format duration in minutes
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
}

/**
 * Determine transport type from route type code (GTFS)
 */
function getTransportType(segment: RouteSegment): TransportType {
  const routeType = segment.route?.type;
  const routeName = (segment.route?.shortName || '').toUpperCase();

  // GTFS route types:
  // 0 = Tram, 1 = Metro, 2 = Rail, 3 = Bus, 4 = Ferry, 5 = Cable, 6 = Gondola, 7 = Funicular
  switch (routeType) {
    case 0:
      return 'tram';
    case 1:
      return 'metro';
    case 2:
      // RER or Transilien
      if (['A', 'B', 'C', 'D', 'E'].includes(routeName)) {
        return 'rer';
      }
      return 'train';
    case 3:
      // Check for Noctilien
      if (routeName.startsWith('N')) {
        return 'noctilien';
      }
      return 'bus';
    default:
      return 'bus';
  }
}

export function RouteOptionCard({ route, onPress, isSelected = false }: RouteOptionCardProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Get transit segments for badge display
  const transitSegments = route.segments
    .filter((leg) => leg.type === 'transit')
    .slice(0, 4); // Max 4 segments

  const hasMoreModes = route.segments.filter((leg) => leg.type === 'transit').length > 4;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, isSelected && styles.containerSelected]}
      activeOpacity={0.7}
    >
      {/* Tags */}
      {route.tags && route.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {route.tags.slice(0, 2).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{t(`routing.tags.${tag}`)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Times and Duration */}
      <View style={styles.headerRow}>
        <View style={styles.timesContainer}>
          <Text style={styles.timeText}>{formatTime(route.departureTime)}</Text>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.timeText}>{formatTime(route.arrivalTime)}</Text>
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(route.totalDuration)}</Text>
        </View>
      </View>

      {/* Transit Lines with Official Badges */}
      <View style={styles.modesRow}>
        {transitSegments.map((segment, index) => (
          <View key={index} style={styles.badgeWrapper}>
            <LineBadge
              lineNumber={segment.route?.shortName || '?'}
              type={getTransportType(segment)}
              color={segment.route?.color ? `#${segment.route.color}` : undefined}
              textColor={segment.route?.textColor ? `#${segment.route.textColor}` : undefined}
              size="small"
            />
          </View>
        ))}
        {hasMoreModes && (
          <Text style={styles.moreModesText}>
            +{route.segments.filter((l) => l.type === 'transit').length - 4}
          </Text>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {route.numberOfTransfers > 0 && (
          <View style={styles.stat}>
            <Text style={styles.statIcon}>🔄</Text>
            <Text style={styles.statText}>
              {route.numberOfTransfers} {t('routing.transfers')}
            </Text>
          </View>
        )}
        {route.totalWalkDistance > 0 && (
          <View style={styles.stat}>
            <Text style={styles.statIcon}>🚶</Text>
            <Text style={styles.statText}>{Math.round(route.totalWalkDistance)}m</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    containerSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.activeBackground,
    },
    tagsContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
      flexWrap: 'wrap',
    },
    tag: {
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    tagText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    timesContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    timeText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    arrow: {
      fontSize: 16,
      color: colors.textMuted,
    },
    durationBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    durationText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#fff',
    },
    modesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
      flexWrap: 'wrap',
    },
    badgeWrapper: {
      marginRight: 2,
    },
    moreModesText: {
      fontSize: 12,
      color: colors.textMuted,
      marginLeft: 4,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    stat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statIcon: {
      fontSize: 14,
    },
    statText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
  });
