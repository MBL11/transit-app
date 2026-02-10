/**
 * RouteResult Component
 * Displays a journey result in a card format with duration, transfers, and segments preview
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { JourneyResult } from '../../core/types/routing';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';
import { LineBadge } from '../transit/LineBadge';
import type { TransportType } from '../transit/LineBadge';
import { formatIzmirTime } from '../../utils/time';

interface RouteResultProps {
  journey: JourneyResult;
  onPress: () => void;
}

// Format time in İzmir timezone (UTC+3)
function formatTime(date: Date): string {
  return formatIzmirTime(date);
}

// Calculate duration from actual times (ensures consistency with displayed times)
function calculateDuration(departureTime: Date, arrivalTime: Date): number {
  const diffMs = arrivalTime.getTime() - departureTime.getTime();
  return Math.round(diffMs / 60000);
}

function getTransportType(routeType?: number): TransportType {
  switch (routeType) {
    case 0: return 'tram';
    case 1: return 'metro';
    case 2: return 'train';
    case 3: return 'bus';
    case 4: return 'ferry';
    default: return 'bus';
  }
}

export function RouteResult({ journey, onPress }: RouteResultProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const departureTimeStr = formatTime(journey.departureTime);
  const arrivalTimeStr = formatTime(journey.arrivalTime);
  const hasTransfers = journey.numberOfTransfers > 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Header: Duration and Times */}
      <View style={styles.header}>
        <View style={styles.durationContainer}>
          <Text style={styles.duration}>{calculateDuration(journey.departureTime, journey.arrivalTime)} min</Text>
          {hasTransfers && (
            <Text style={styles.transfers}>
              {t('transit.transfers', { count: journey.numberOfTransfers })}
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
            {segment.type === 'walk' ? (
              <View style={styles.walkBadge}>
                <Text style={styles.walkIcon}>🚶</Text>
                <Text style={styles.walkDuration}>{segment.duration}min</Text>
              </View>
            ) : (
              <LineBadge
                lineNumber={segment.route?.shortName || '?'}
                type={getTransportType(segment.route?.type)}
                color={segment.route?.color || undefined}
                textColor={segment.route?.textColor || undefined}
                size="small"
              />
            )}

            {index < journey.segments.length - 1 && (
              <Text style={styles.segmentArrow}>→</Text>
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Walk distance if present */}
      {journey.totalWalkDistance > 0 && (
        <Text style={styles.walkDistance}>
          🚶 {Math.round(journey.totalWalkDistance)}m
        </Text>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
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
      color: colors.text,
    },
    transfers: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    timesContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    time: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    arrow: {
      fontSize: 16,
      color: colors.textMuted,
      marginHorizontal: 8,
    },
    segmentsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 4,
    },
    walkBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.buttonBackground,
      borderRadius: 16,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    walkIcon: {
      fontSize: 16,
      marginRight: 4,
    },
    walkDuration: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    segmentArrow: {
      fontSize: 14,
      color: colors.textMuted,
      marginHorizontal: 2,
    },
    walkDistance: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 8,
    },
  });
