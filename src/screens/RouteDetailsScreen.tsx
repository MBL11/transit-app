/**
 * Route Details Screen
 * Displays detailed journey information with vertical timeline
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RouteStackParamList } from '../navigation/RouteStackNavigator';
import { deserializeJourney, JourneyResult } from '../core/types/routing-serialization';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { LineBadge, TransportType } from '../components/transit/LineBadge';
import { useThemeColors } from '../hooks/useThemeColors';
import { logger } from '../utils/logger';
import { formatIzmirTime } from '../utils/time';

// Helper to determine transport type from route type
const getTransportType = (routeType?: number): TransportType => {
  switch (routeType) {
    case 1: return 'metro';
    case 2: return 'rer';
    case 0: return 'tram';
    case 3: return 'bus';
    default: return 'bus';
  }
};

type Props = NativeStackScreenProps<RouteStackParamList, 'RouteDetails'>;

export function RouteDetailsScreen({ route }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const journey = deserializeJourney(route.params.journey);

  // Filter out useless segments (walking 0 min or duplicate stops)
  const filteredSegments = journey.segments.filter((segment) => {
    const isWalk = segment.type === 'walk';
    // Skip walking segments with 0 or less duration
    if (isWalk && segment.duration <= 0) {
      return false;
    }
    return true;
  });

  // Safety check: if no segments after filtering, use original segments
  const displaySegments = filteredSegments.length > 0 ? filteredSegments : journey.segments;

  // Check if it's a walking-only journey (and has segments)
  const isWalkingOnly = displaySegments.length > 0 && displaySegments.every(s => s.type === 'walk');

  // Use İzmir timezone for display (UTC+3)
  const formatTime = (date: Date): string => {
    return formatIzmirTime(date);
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
  };

  // Calculate duration from actual times (ensures consistency with displayed times)
  const calculateDuration = (departureTime: Date, arrivalTime: Date): number => {
    const diffMs = arrivalTime.getTime() - departureTime.getTime();
    return Math.round(diffMs / 60000);
  };

  // Get the actual journey duration from the times
  const journeyDuration = calculateDuration(journey.departureTime, journey.arrivalTime);

  const generateShareText = (): string => {
    const lines: string[] = [];

    // Header
    const firstSegment = displaySegments[0];
    const lastSegment = displaySegments[displaySegments.length - 1];
    const fromName = firstSegment?.from.name || '';
    const toName = lastSegment?.to.name || '';

    lines.push(`🚇 ${t('route.title')}: ${fromName} → ${toName}`);
    lines.push('');

    // Summary
    lines.push(`⏱️ ${formatTime(journey.departureTime)} → ${formatTime(journey.arrivalTime)} (${formatDuration(journeyDuration)})`);

    if (journey.numberOfTransfers > 0) {
      lines.push(`🔄 ${t('transit.transfers', { count: journey.numberOfTransfers })}`);
    }

    if (journey.totalWalkDistance > 0) {
      lines.push(`🚶 ${Math.round(journey.totalWalkDistance)}m ${t('transit.walkOnFoot')}`);
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    // Steps - use filtered segments and skip 0-duration walks
    if (isWalkingOnly) {
      // Simplified for walking-only
      lines.push(`${formatTime(journey.departureTime)} 🚶 ${fromName}`);
      lines.push(`   ↓ ${t('route.walk')} ${journeyDuration} min (${Math.round(journey.totalWalkDistance)}m)`);
      lines.push(`${formatTime(journey.arrivalTime)} 🏁 ${toName}`);
    } else {
      displaySegments.forEach((segment, index) => {
        const isWalk = segment.type === 'walk';
        const time = segment.departureTime ? formatTime(segment.departureTime) : '';

        if (isWalk) {
          lines.push(`${time} 🚶 ${segment.from.name}`);
          lines.push(`   ↓ ${t('route.walk')} ${segment.duration} min (${Math.round(segment.distance || 0)}m)`);
        } else {
          lines.push(`${time} 📍 ${segment.from.name}`);
          const routeName = segment.route?.shortName || '?';
          const headsign = segment.trip?.headsign ? ` → ${segment.trip.headsign}` : '';
          lines.push(`   ↓ ${routeName}${headsign} (${segment.duration} min)`);
        }

        // Add final destination for last segment
        if (index === displaySegments.length - 1) {
          const arrivalTime = segment.arrivalTime ? formatTime(segment.arrivalTime) : '';
          lines.push(`${arrivalTime} 🏁 ${segment.to.name}`);
        }
      });
    }

    lines.push('');
    lines.push('---');
    lines.push(`📱 ${t('share.sentFrom')}`);

    return lines.join('\n');
  };

  const handleShare = async () => {
    try {
      const shareText = generateShareText();
      const result = await Share.share({
        message: shareText,
      });

      if (result.action === Share.sharedAction) {
        logger.log('[RouteDetails] Journey shared successfully');
      }
    } catch (error) {
      logger.error('[RouteDetails] Share error:', error);
      Alert.alert(t('common.error'), t('share.error'));
    }
  };

  const ShareButton = () => (
    <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
      <Text style={styles.shareIcon}>📤</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <ScreenHeader title={t('route.title')} showBack rightElement={<ShareButton />} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Journey Summary */}
      <View style={styles.summaryCard}>
        {/* Departure / Arrival locations */}
        <View style={styles.summaryLocations}>
          <View style={styles.summaryLocation}>
            <Text style={styles.summaryLocationLabel}>{t('route.departure').toUpperCase()}</Text>
            <Text style={styles.summaryLocationName} numberOfLines={1}>
              {displaySegments[0]?.from.name || ''}
            </Text>
          </View>
          <View style={styles.summaryLocationArrow}>
            <Text style={styles.arrowText}>→</Text>
          </View>
          <View style={styles.summaryLocation}>
            <Text style={styles.summaryLocationLabel}>{t('route.arrival').toUpperCase()}</Text>
            <Text style={styles.summaryLocationName} numberOfLines={1}>
              {displaySegments[displaySegments.length - 1]?.to.name || ''}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.summaryExtras}>
          {journey.numberOfTransfers > 0 && (
            <Text style={styles.summaryTransfers}>
              🔄 {t('transit.transfers', { count: journey.numberOfTransfers })}
            </Text>
          )}
          {journey.totalWalkDistance > 0 && (
            <Text style={styles.summaryWalk}>
              🚶 {Math.round(journey.totalWalkDistance)}m {t('transit.walkOnFoot')}
            </Text>
          )}
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {isWalkingOnly ? (
          // Simplified view for walking-only journeys
          <>
            {/* Start point */}
            <View style={styles.stepContainer}>
              <View style={styles.stepLeft}>
                <View style={styles.timelineNode} />
                <View style={styles.timelineLine} />
              </View>
              <View style={styles.stepRight}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTime}>{formatTime(journey.departureTime)}</Text>
                  <Text style={styles.stopName}>{displaySegments[0]?.from.name}</Text>
                </View>
              </View>
            </View>

            {/* Walking segment */}
            <View style={styles.segmentDetails}>
              <View style={styles.stepLeft}>
                <View style={styles.segmentIconContainer}>
                  <Text style={styles.walkIcon}>🚶</Text>
                </View>
                <View style={styles.timelineLine} />
              </View>
              <View style={styles.stepRight}>
                <View style={styles.walkDetails}>
                  <Text style={styles.segmentAction}>{t('route.walk')} {journeyDuration} min</Text>
                  {journey.totalWalkDistance > 0 && (
                    <Text style={styles.segmentInfo}>≈ {Math.round(journey.totalWalkDistance)}m</Text>
                  )}
                </View>
              </View>
            </View>

            {/* End point */}
            <View style={styles.stepContainer}>
              <View style={styles.stepLeft}>
                <View style={[styles.timelineNode, styles.timelineNodeLast]} />
              </View>
              <View style={styles.stepRight}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTime}>{formatTime(journey.arrivalTime)}</Text>
                  <Text style={styles.stopName}>{displaySegments[displaySegments.length - 1]?.to.name}</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          // Normal view for transit journeys
          displaySegments.map((segment, index) => {
            const isLast = index === displaySegments.length - 1;
            const isWalk = segment.type === 'walk';

            return (
              <View key={index} style={styles.segmentContainer}>
                {/* Departure Stop */}
                <View style={styles.stepContainer}>
                  <View style={styles.stepLeft}>
                    <View style={styles.timelineNode} />
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.stepRight}>
                    <View style={styles.stepHeader}>
                      {segment.departureTime && (
                        <Text style={styles.stepTime}>{formatTime(segment.departureTime)}</Text>
                      )}
                      <Text style={styles.stopName}>{segment.from.name}</Text>
                    </View>
                  </View>
                </View>

                {/* Segment Details */}
                <View style={styles.segmentDetails}>
                  <View style={styles.stepLeft}>
                    <View style={styles.segmentIconContainer}>
                      {isWalk ? (
                        <Text style={styles.walkIcon}>🚶</Text>
                      ) : (
                        <LineBadge
                          lineNumber={segment.route?.shortName || '?'}
                          type={getTransportType(segment.route?.type)}
                          color={segment.route?.color}
                          textColor={segment.route?.textColor}
                          size="medium"
                        />
                      )}
                    </View>
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.stepRight}>
                    {isWalk ? (
                      <View style={styles.walkDetails}>
                        <Text style={styles.segmentAction}>
                          <Text style={styles.segmentActionBold}>{t('route.walk')}</Text> {segment.duration} min
                        </Text>
                        {segment.distance != null && segment.distance > 0 && (
                          <Text style={styles.segmentInfo}>≈ {Math.round(segment.distance)}m</Text>
                        )}
                      </View>
                    ) : (
                      <View style={styles.transitDetails}>
                        {/* Direction - show headsign as direction */}
                        {segment.trip?.headsign && (
                          <Text style={styles.directionText}>
                            {t('transit.direction')} {segment.trip.headsign}
                          </Text>
                        )}

                        {/* Duration and intermediate stops */}
                        <Text style={styles.segmentDuration}>
                          {segment.duration} min
                          {segment.intermediateStopsCount !== undefined && (
                            <Text style={styles.stopsCountText}>
                              {' '}({segment.intermediateStopsCount === 0
                                ? t('transit.noIntermediateStops', { defaultValue: 'aucun arrêt' })
                                : t('transit.intermediateStopsCount', {
                                    count: segment.intermediateStopsCount,
                                    defaultValue: '{{count}} arrêt(s)'
                                  })
                              })
                            </Text>
                          )}
                        </Text>

                        {/* Get off at station */}
                        <View style={styles.getOffContainer}>
                          <Text style={styles.getOffText}>
                            {t('transit.getOffAt')} {segment.to.name}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                {/* Arrival Stop */}
                {isLast && (
                  <View style={styles.stepContainer}>
                    <View style={styles.stepLeft}>
                      <View style={[styles.timelineNode, styles.timelineNodeLast]} />
                    </View>
                    <View style={styles.stepRight}>
                      <View style={styles.stepHeader}>
                        {segment.arrivalTime && (
                          <Text style={styles.stepTime}>{formatTime(segment.arrivalTime)}</Text>
                        )}
                        <Text style={styles.stopName}>{segment.to.name}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t('transit.totalDuration')} : {formatDuration(journeyDuration)}
        </Text>
        <Text style={styles.footerSubtext}>
          {t('transit.estimatedArrival')}
        </Text>
      </View>
    </ScrollView>
  </ScreenContainer>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    content: {
      padding: 16,
    },
    summaryCard: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
    summaryTransfers: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    summaryWalk: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    summaryLocations: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    summaryLocation: {
      flex: 1,
    },
    summaryLocationLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '600',
      marginBottom: 2,
    },
    summaryLocationName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    summaryLocationArrow: {
      paddingHorizontal: 8,
    },
    arrowText: {
      fontSize: 18,
      color: colors.textMuted,
    },
    summaryExtras: {
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row',
      gap: 16,
    },
    timeline: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
    segmentContainer: {
      marginBottom: 0,
    },
    stepContainer: {
      flexDirection: 'row',
    },
    stepLeft: {
      width: 40,
      alignItems: 'center',
      position: 'relative',
    },
    stepRight: {
      flex: 1,
      paddingLeft: 12,
    },
    timelineNode: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.background,
      zIndex: 2,
    },
    timelineNodeLast: {
      backgroundColor: colors.success,
    },
    timelineLine: {
      position: 'absolute',
      top: 12,
      bottom: 0,
      width: 2,
      backgroundColor: colors.border,
      zIndex: 1,
    },
    stepHeader: {
      marginBottom: 8,
    },
    stepTime: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 4,
    },
    stopName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    segmentDetails: {
      flexDirection: 'row',
      marginVertical: 8,
    },
    segmentIconContainer: {
      width: 40,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      backgroundColor: colors.background,
      zIndex: 2,
    },
    walkIcon: {
      fontSize: 24,
    },
    transitBadge: {
      minWidth: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    transitBadgeText: {
      fontSize: 14,
      fontWeight: 'bold',
    },
    rerBadge: {
      minWidth: 44,
      height: 44,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    rerBadgeText: {
      fontSize: 11,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    walkDetails: {
      paddingLeft: 12,
      paddingVertical: 8,
    },
    transitDetails: {
      paddingLeft: 12,
      paddingVertical: 8,
    },
    segmentAction: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 4,
    },
    segmentActionBold: {
      fontWeight: '700',
    },
    segmentInfo: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    directionText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    getOffContainer: {
      marginBottom: 8,
      backgroundColor: colors.backgroundSecondary,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    getOffText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    segmentDuration: {
      fontSize: 13,
      color: colors.textMuted,
    },
    stopsCountText: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    footer: {
      marginTop: 20,
      padding: 16,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    footerSubtext: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
    },
    shareButton: {
      padding: 4,
    },
    shareIcon: {
      fontSize: 22,
    },
  });
