import React from 'react';
import { View, Text, Pressable, PressableProps, StyleSheet } from 'react-native';

export interface LineCardProps extends Omit<PressableProps, 'children'> {
  lineNumber: string;
  lineName: string;
  lineColor: string;
  direction?: string;
  type?: 'metro' | 'bus' | 'tram' | 'rer' | 'train';
}

const typeColors = {
  metro: '#003366', // Dark blue
  bus: '#00AA55', // Green
  tram: '#CC0000', // Red
  rer: '#7B68EE', // Purple
  train: '#0066CC', // Blue
};

const typeLabels = {
  metro: 'Métro',
  bus: 'Bus',
  tram: 'Tram',
  rer: 'RER',
  train: 'Train',
};

export function LineCard({
  lineNumber,
  lineName,
  lineColor,
  direction,
  type = 'bus',
  ...props
}: LineCardProps) {
  return (
    <Pressable {...props} style={styles.pressable}>
      <View style={[styles.card, { borderLeftColor: lineColor }]}>
        <View style={styles.content}>
          <View style={styles.leftSection}>
            {/* Line Number Badge */}
            <View style={[styles.badge, { backgroundColor: lineColor }]}>
              <Text style={styles.badgeText}>{lineNumber}</Text>
            </View>

            {/* Line Info */}
            <View style={styles.infoContainer}>
              <Text style={styles.lineName}>{lineName}</Text>
              {direction && (
                <Text style={styles.direction}>→ {direction}</Text>
              )}
            </View>
          </View>

          {/* Type Badge */}
          <View style={[styles.typeBadge, { backgroundColor: typeColors[type] }]}>
            <Text style={styles.typeBadgeText}>{typeLabels[type]}</Text>
          </View>
        </View>
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
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  lineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  direction: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
