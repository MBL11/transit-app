import React from 'react';
import { View, Text, Pressable, PressableProps, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export interface StopCardProps extends Omit<PressableProps, 'children'> {
  stopName: string;
  stopCode?: string;
  lines: string[];  // Array of line numbers/names
  distance?: number;
}

export function StopCard({
  stopName,
  stopCode,
  lines,
  distance,
  ...props
}: StopCardProps) {
  const { t } = useTranslation();

  return (
    <Pressable {...props} style={styles.pressable}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.stopName} numberOfLines={2}>
              {stopName}
            </Text>
            {stopCode && (
              <Text style={styles.stopCode}>{t('common.code')}: {stopCode}</Text>
            )}
          </View>
          {distance !== undefined && (
            <Text style={styles.distance}>
              {distance < 1000
                ? `${Math.round(distance)}m`
                : `${(distance / 1000).toFixed(1)}km`}
            </Text>
          )}
        </View>

        {/* Lines badges */}
        {lines.length > 0 && (
          <View style={styles.linesContainer}>
            {lines.map((line, index) => (
              <View key={index} style={styles.lineBadge}>
                <Text style={styles.lineBadgeText}>{line}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  stopCode: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  distance: {
    fontSize: 14,
    color: '#666',
  },
  linesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  lineBadge: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
