/**
 * Route Details Screen
 * Displays detailed journey information with vertical timeline
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RouteStackParamList } from '../navigation/RouteStackNavigator';
import { deserializeJourney, JourneyResult } from '../core/types/routing-serialization';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScreenContainer } from '../components/ui/ScreenContainer';

type Props = NativeStackScreenProps<RouteStackParamList, 'RouteDetails'>;

export function RouteDetailsScreen({ route }: Props) {
  const { t } = useTranslation();
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

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
  };

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
    lines.push(`⏱️ ${formatTime(journey.departureTime)} → ${formatTime(journey.arrivalTime)} (${formatDuration(journey.totalDuration)})`);

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
      lines.push(`   ↓ ${t('route.walk')} ${journey.totalDuration} min (${Math.round(journey.totalWalkDistance)}m)`);
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
        console.log('[RouteDetails] Journey shared successfully');
      }
    } catch (error) {
      console.error('[RouteDetails] Share error:', error);
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
        <View style={styles.summaryRow}>
          <Text style={styles.summaryTime}>
            {formatTime(journey.departureTime)} → {formatTime(journey.arrivalTime)}
          </Text>
          <Text style={styles.summaryDuration}>{formatDuration(journey.totalDuration)}</Text>
        </View>
        {journey.numberOfTransfers > 0 && (
          <Text style={styles.summaryTransfers}>
            {t('transit.transfers', { count: journey.numberOfTransfers })}
          </Text>
        )}
        {journey.totalWalkDistance > 0 && (
          <Text style={styles.summaryWalk}>
            🚶 {Math.round(journey.totalWalkDistance)}m {t('transit.walkOnFoot')}
          </Text>
        )}
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
                  <Text style={styles.segmentAction}>{t('route.walk')} {journey.totalDuration} min</Text>
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
                    </View>
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.stepRight}>
                    {isWalk ? (
                      <View style={styles.walkDetails}>
                        <Text style={styles.segmentAction}>{t('route.walk')} {segment.duration} min</Text>
                        {segment.distance && (
                          <Text style={styles.segmentInfo}>≈ {Math.round(segment.distance)}m</Text>
                        )}
                      </View>
                    ) : (
                      <View style={styles.transitDetails}>
                        {/* Direction header like Citymapper */}
                        <View style={styles.directionHeader}>
                          <Text style={styles.directionLabel}>
                            {segment.trip?.headsign || segment.to?.name || t('transit.direction')}
                          </Text>
                        </View>

                        {/* Get off at station */}
                        <View style={styles.getOffContainer}>
                          <Text style={styles.getOffIcon}>Ⓜ</Text>
                          <Text style={styles.getOffText}>
                            {t('transit.getOffAt')} {segment.to.name}
                          </Text>
                        </View>

                        {/* Duration */}
                        <Text style={styles.segmentDuration}>{segment.duration} min</Text>
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
          {t('transit.totalDuration')} : {formatDuration(journey.totalDuration)}
        </Text>
        <Text style={styles.footerSubtext}>
          {t('transit.estimatedArrival')}
        </Text>
      </View>
    </ScrollView>
  </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTime: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  summaryDuration: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  summaryTransfers: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryWalk: {
    fontSize: 14,
    color: '#666',
  },
  timeline: {
    backgroundColor: '#fff',
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
    backgroundColor: '#0066CC',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 2,
  },
  timelineNodeLast: {
    backgroundColor: '#00CC66',
  },
  timelineLine: {
    position: 'absolute',
    top: 12,
    bottom: 0,
    width: 2,
    backgroundColor: '#ddd',
    zIndex: 1,
  },
  stepHeader: {
    marginBottom: 8,
  },
  stepTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 4,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
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
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  segmentInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  directionHeader: {
    marginBottom: 8,
  },
  directionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  getOffContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  getOffIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#0066CC',
  },
  getOffText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  segmentDuration: {
    fontSize: 13,
    color: '#999',
  },
  footer: {
    marginTop: 20,
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  shareButton: {
    padding: 4,
  },
  shareIcon: {
    fontSize: 22,
  },
});
