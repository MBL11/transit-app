/**
 * Route Details Screen
 * Displays detailed journey information with vertical timeline
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RouteStackParamList } from '../navigation/RouteStackNavigator';
import { deserializeJourney } from '../core/types/routing-serialization';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScreenContainer } from '../components/ui/ScreenContainer';

type Props = NativeStackScreenProps<RouteStackParamList, 'RouteDetails'>;

export function RouteDetailsScreen({ route }: Props) {
  const { t } = useTranslation();
  const journey = deserializeJourney(route.params.journey);

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

  return (
    <ScreenContainer>
      <ScreenHeader title={t('route.title')} showBack />
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
        {journey.segments.map((segment, index) => {
          const isLast = index === journey.segments.length - 1;
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
                      <Text style={styles.segmentAction}>
                        {t('transit.takeLine')} {segment.route?.shortName}
                      </Text>
                      {segment.route?.longName && (
                        <Text style={styles.segmentInfo}>{segment.route.longName}</Text>
                      )}
                      {segment.trip?.headsign && (
                        <Text style={styles.segmentDirection}>
                          {t('transit.direction')} {segment.trip.headsign}
                        </Text>
                      )}
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
        })}
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
  segmentDirection: {
    fontSize: 13,
    color: '#0066CC',
    fontStyle: 'italic',
    marginBottom: 4,
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
});
